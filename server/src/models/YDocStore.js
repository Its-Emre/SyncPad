import mongoose from "mongoose";

// CRDT persistence for live rooms (Sprint 3).
//
// ydoc_updates is an append-only log: every Yjs update a room produces
// is stored here, in order. ydoc_snapshots holds one compacted full
// state per document, written when a room closes (and when a log grows
// very large), after which the logged updates it covers are deleted.
//
// On room open: apply snapshot, then replay the log on top — the
// document is rebuilt exactly, even after a full server restart.

const yUpdateSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true, index: true },
    update: { type: Buffer, required: true },
  },
  { timestamps: true }
);

const ySnapshotSchema = new mongoose.Schema(
  {
    docId: { type: String, required: true, unique: true, index: true },
    state: { type: Buffer, required: true },
  },
  { timestamps: true }
);

export const YUpdate =
  mongoose.models.YUpdate || mongoose.model("YUpdate", yUpdateSchema);
export const YSnapshot =
  mongoose.models.YSnapshot || mongoose.model("YSnapshot", ySnapshotSchema);
