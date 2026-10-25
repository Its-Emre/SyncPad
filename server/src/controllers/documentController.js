import Document from "../models/Document.js";

// Content cap for the plain-text snapshot (Sprint 1). ~1M characters is
// far beyond any real editing session and keeps a single document sane.
const MAX_CONTENT_CHARS = 1_000_000;

const ownedDocument = async (req) =>
  Document.findOne({ _id: req.params.id, owner: req.user._id });

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
    });
    res.status(201).json(doc);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents — my documents (metadata only, no content)
export const getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ owner: req.user._id })
      .select("-content")
      .sort({ updatedAt: -1 });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/documents/:id — one document, including content
export const getDocument = async (req, res) => {
  try {
    const doc = await ownedDocument(req);
    if (!doc) return res.status(404).json({ message: "Document not found" });
    res.json(doc);
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
    res.json({ message: "Document deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
