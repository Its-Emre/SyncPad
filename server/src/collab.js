import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import ywsUtils from "y-websocket/bin/utils";
import Document from "./models/Document.js";

const { setupWSConnection, getYDoc } = ywsUtils;

// One Yjs document per room (= one SyncPad document). Rooms live in
// memory on this server; the plain-text content is mirrored back into
// MongoDB so a room can be re-seeded after a restart. (Sprint 3 replaces
// this snapshot bridge with a proper CRDT update log + snapshots.)
const rooms = new Map(); // docId -> Y.Doc instance we seeded/observed
const saveTimers = new Map(); // docId -> debounce timer

const snapshotNow = async (docId, ytext) => {
  try {
    await Document.findByIdAndUpdate(docId, { content: ytext.toString() });
  } catch (error) {
    console.error(`[collab] snapshot save failed for ${docId}: ${error.message}`);
  }
};

const scheduleSnapshot = (docId, ytext) => {
  clearTimeout(saveTimers.get(docId));
  saveTimers.set(
    docId,
    setTimeout(() => snapshotNow(docId, ytext), 1500)
  );
};

// Synchronous on purpose: two simultaneous first-joins must not race.
// Seeds the room from the stored text (once per live room instance) and
// wires the write-back observer.
const seedRoom = (docId, storedContent) => {
  const ydoc = getYDoc(docId);
  if (rooms.get(docId) === ydoc) return;
  rooms.set(docId, ydoc);

  const ytext = ydoc.getText("monaco");
  if (ytext.length === 0 && storedContent) {
    ytext.insert(0, storedContent);
  }
  ytext.observe(() => scheduleSnapshot(docId, ytext));
  ydoc.on("destroy", () => {
    if (rooms.get(docId) === ydoc) rooms.delete(docId);
    clearTimeout(saveTimers.get(docId));
  });
};

// WebSocket endpoint: ws://<host>/collab/<documentId>?token=<JWT>
// Only the owner and joined collaborators may enter a room.
export const attachCollab = (server) => {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", async (req, socket, head) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const match = url.pathname.match(/^\/collab\/([a-f0-9]{24})$/);
      if (!match) {
        socket.destroy();
        return;
      }
      const token = url.searchParams.get("token");
      if (!token) throw new Error("Missing token");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const docId = match[1];
      const doc = await Document.findById(docId).select(
        "owner collaborators content"
      );
      if (!doc) throw new Error("Document not found");

      const userId = String(decoded.id);
      const allowed =
        String(doc.owner) === userId ||
        doc.collaborators.some((c) => String(c) === userId);
      if (!allowed) throw new Error("Not a member of this document");

      seedRoom(docId, doc.content || "");

      wss.handleUpgrade(req, socket, head, (ws) => {
        setupWSConnection(ws, req, { docName: docId, gc: true });
      });
    } catch {
      try {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      } catch {
        /* socket already gone */
      }
      socket.destroy();
    }
  });

  console.log("Collab WebSocket ready at /collab/<documentId>");
};
