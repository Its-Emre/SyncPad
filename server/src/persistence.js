import * as Y from "yjs";
import Document from "./models/Document.js";
import { YUpdate, YSnapshot } from "./models/YDocStore.js";

// Persistence for live CRDT rooms, plugged into y-websocket through
// setPersistence({ bindState, writeState }):
//
// - bindState runs once when a room's Y.Doc is created: it rebuilds the
//   document from the stored snapshot + update log, then records every
//   new update into the log.
// - writeState runs when the last collaborator leaves: it compacts the
//   room into a single snapshot and clears the log it covers.
//
// The store interface is deliberately small so the layer can be tested
// with an in-memory store; mongoStore below is the real one.

// Updates applied while loading carry this origin so the update
// recorder doesn't store them a second time.
const LOAD_ORIGIN = "syncpad-persistence-load";
// If a room replays more than this many logged updates on open, the
// loaded state is compacted into a snapshot immediately.
const COMPACT_AFTER_REPLAY = 500;

export const mongoStore = {
  async loadSnapshot(docId) {
    const snap = await YSnapshot.findOne({ docId }).select("state").lean();
    return snap ? snap.state : null;
  },
  async loadUpdates(docId) {
    const rows = await YUpdate.find({ docId })
      .sort({ createdAt: 1, _id: 1 })
      .select("update")
      .lean();
    return rows.map((r) => ({ id: String(r._id), update: r.update }));
  },
  async appendUpdate(docId, update) {
    await YUpdate.create({ docId, update });
  },
  async saveSnapshot(docId, state) {
    await YSnapshot.findOneAndUpdate(
      { docId },
      { state },
      { upsert: true, new: true }
    );
  },
  // ids === null clears the whole log for the document.
  async deleteUpdates(docId, ids) {
    if (ids === null) {
      await YUpdate.deleteMany({ docId });
    } else if (ids.length > 0) {
      await YUpdate.deleteMany({ docId, _id: { $in: ids } });
    }
  },
  async getPlainContent(docId) {
    const doc = await Document.findById(docId).select("content").lean();
    return doc ? doc.content || "" : "";
  },
  async savePlainContent(docId, text) {
    await Document.findByIdAndUpdate(docId, { content: text });
  },
};

export const createPersistence = (store) => ({
  bindState: async (docName, ydoc) => {
    let snapshot = null;
    let logged = [];
    try {
      // 1) Rebuild: snapshot first, then the update log on top.
      snapshot = await store.loadSnapshot(docName);
      if (snapshot) {
        Y.applyUpdate(ydoc, new Uint8Array(snapshot), LOAD_ORIGIN);
      }
      logged = await store.loadUpdates(docName);
      for (const entry of logged) {
        Y.applyUpdate(ydoc, new Uint8Array(entry.update), LOAD_ORIGIN);
      }

      // 2) A very long log gets compacted into a fresh snapshot here,
      //    while this room is the only writer.
      if (logged.length > COMPACT_AFTER_REPLAY) {
        await store.saveSnapshot(
          docName,
          Buffer.from(Y.encodeStateAsUpdate(ydoc))
        );
        await store.deleteUpdates(
          docName,
          logged.map((e) => e.id)
        );
      }
    } catch (error) {
      console.error(
        `[persistence] load failed for ${docName}: ${error.message}`
      );
    }

    // 3) Record every update the room produces from now on. (Attached
    //    after the replay, and replayed updates carry LOAD_ORIGIN, so
    //    history is never stored twice.)
    ydoc.on("update", (update, origin) => {
      if (origin === LOAD_ORIGIN) return;
      store
        .appendUpdate(docName, Buffer.from(update))
        .catch((error) =>
          console.error(
            `[persistence] append failed for ${docName}: ${error.message}`
          )
        );
    });

    // 4) One-time seed for documents created before CRDT persistence
    //    existed (Sprints 1–2 stored plain text only): insert the
    //    stored text as a normal update so it joins the CRDT history
    //    — the recorder above logs it like any other edit.
    try {
      if (!snapshot && logged.length === 0) {
        const plain = await store.getPlainContent(docName);
        if (plain) ydoc.getText("monaco").insert(0, plain);
      }
    } catch (error) {
      console.error(
        `[persistence] seed failed for ${docName}: ${error.message}`
      );
    }

    // 5) Keep the plain-text copy fresh — the REST API and Sprint 1
    //    clients read document content from the Document record.
    const ytext = ydoc.getText("monaco");
    let timer = null;
    ytext.observe(() => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        store
          .savePlainContent(docName, ytext.toString())
          .catch(() => {
            /* the CRDT log is the source of truth; mirror is best-effort */
          });
      }, 1500);
    });
  },

  writeState: async (docName, ydoc) => {
    // Room closed: compact everything into one snapshot, clear the log.
    try {
      await store.saveSnapshot(
        docName,
        Buffer.from(Y.encodeStateAsUpdate(ydoc))
      );
      await store.deleteUpdates(docName, null);
    } catch (error) {
      console.error(
        `[persistence] compaction failed for ${docName}: ${error.message}`
      );
    }
  },
});
