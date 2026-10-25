import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The /api proxy forwards frontend requests to the Express server in dev,
// so we don't hit CORS issues while developing. The collab WebSocket
// connects straight to the backend (ws://localhost:5000/collab — see
// WS_BASE in src/lib/api.js); WebSockets don't need the proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});
