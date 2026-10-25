import mongoose from "mongoose";

// Sprint 1 stores the document as plain text. From Sprint 2 the live
// content moves into a Yjs CRDT document synced over WebSocket; this
// `content` field then becomes the last-saved plain-text snapshot.
const documentSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    language: { type: String, default: "javascript", trim: true },
    content: { type: String, default: "" },
    // Sprint 2: anyone with the share link can join as a collaborator.
    shareId: { type: String, unique: true, sparse: true },
    collaborators: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

const Document = mongoose.model("Document", documentSchema);
export default Document;
