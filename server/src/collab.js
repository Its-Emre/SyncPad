import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import ywsUtils from "y-websocket/bin/utils";
import Document from "./models/Document.js";
import { createPersistence, mongoStore } from "./persistence.js";

const { setupWSConnection, setPersistence } = ywsUtils;

// Rooms are Yjs documents held in memory while collaborators are
// connected. Their CRDT history is persisted to MongoDB (update log +
// snapshots — see persistence.js), so a room is rebuilt exactly after
// a server restart, with nobody's edits lost.

// WebSocket endpoint: ws://<host>/collab/<documentId>?token=<JWT>
// Only the owner and joined collaborators may enter a room.
export const attachCollab = (server) => {
  setPersistence(createPersistence(mongoStore));

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
        "owner collaborators"
      );
      if (!doc) throw new Error("Document not found");

      const userId = String(decoded.id);
      const allowed =
        String(doc.owner) === userId ||
        doc.collaborators.some((c) => String(c) === userId);
      if (!allowed) throw new Error("Not a member of this document");

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
