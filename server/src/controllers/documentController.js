import crypto from "node:crypto";
import Document from "../models/Document.js";
import { YUpdate, YSnapshot } from "../models/YDocStore.js";

// Content cap for the plain-text snapshot (Sprint 1). ~1M characters is
// far beyond any real editing session and keeps a single document sane.
const MAX_CONTENT_CHARS = 1_000_000;

const newShareId = () => crypto.randomBytes(9).toString("hex");

const ownedDocument = async (req) =>
  Document.findOne({ _id: req.params.id, owner: req.user._id });

// Readable by the owner and by anyone who joined via the share link.
const accessibleDocument = async (req) =>
  Document.findOne({
    _id: req.params.id,
    $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
  });

// POST /api/documents — create an empty document
export const createDocument = async (req, res) => {
  try {
    const { title, language } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: "A title is required" });
    }
    const doc = await Document.create({
      owner: req.user._id,
      title: title.trim(),
      language: language || "javascript",
      shareId: newShareId(),
    });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents — documents I own or collaborate on (metadata only)
export const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({
      $or: [{ owner: req.user._id }, { collaborators: req.user._id }],
    })
      .select("-content")
      .sort({ updatedAt: -1 })
      .lean();
    res.json(
      docs.map((d) => ({
        ...d,
        isOwner: String(d.owner) === String(req.user._id),
        collaboratorCount: (d.collaborators || []).length,
      }))
    );
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents/:id — one document, including content
export const getDocument = async (req, res) => {
  try {
    const doc = await accessibleDocument(req);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents/:id/share — the owner's share link data
export const getShareLink = async (req, res) => {
  try {
    const doc = await ownedDocument(req);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    if (!doc.shareId) {
      doc.shareId = newShareId();
      await doc.save();
    }
    res.json({ shareId: doc.shareId, path: `/join/${doc.shareId}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/documents/join/:shareId — join a shared document
export const joinByShareId = async (req, res) => {
  try {
    const doc = await Document.findOne({ shareId: req.params.shareId });
    if (!doc) return res.status(404).json({ message: "Invalid share link" });
    const isOwner = String(doc.owner) === String(req.user._id);
    if (!isOwner && !doc.collaborators.some((c) => String(c) === String(req.user._id))) {
      doc.collaborators.push(req.user._id);
      await doc.save();
    }
    res.json({ _id: doc._id, title: doc.title, language: doc.language });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/documents/:id — rename and/or change language
export const updateDocument = async (req, res) => {
  try {
    const doc = await ownedDocument(req);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    const { title, language } = req.body;
    if (title && title.trim()) doc.title = title.trim();
    if (language) doc.language = language;
    await doc.save();
    res.json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/documents/:id/content — save the plain-text content (autosave)
export const saveContent = async (req, res) => {
  try {
    const { content } = req.body;
    if (typeof content !== "string") {
      return res.status(400).json({ message: "Content must be text" });
    }
    if (content.length > MAX_CONTENT_CHARS) {
      return res.status(400).json({ message: "Document is too large" });
    }
    const doc = await ownedDocument(req);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    doc.content = content;
    await doc.save();
    res.json({ _id: doc._id, updatedAt: doc.updatedAt });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE /api/documents/:id
export const deleteDocument = async (req, res) => {
  try {
    const doc = await ownedDocument(req);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    await doc.deleteOne();
    // Remove the room's CRDT history too — no orphaned logs/snapshots.
    await YUpdate.deleteMany({ docId: String(doc._id) });
    await YSnapshot.deleteOne({ docId: String(doc._id) });
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
