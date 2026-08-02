/**
 * ============================================================
 *  VITE CONFIG — vite.config.js
 * ============================================================
 *  Configuration for Vite (the frontend build tool and dev server).
 *
 *  WHAT IT DOES:
 *  1. Uses the React plugin for JSX support
 *  2. Runs the dev server on port 3000
 *  3. Proxies /api requests to the backend server (port 5000)
 *
 *  KEY CONCEPTS TO LEARN:
 *  - Dev Server Proxy: the frontend runs on port 3000, the backend on
 *    port 5000. The proxy forwards any request starting with /api
 *    from the frontend to the backend. This avoids CORS issues in dev.
 * ============================================================
 */

// defineConfig: Vite's helper for type-safe config
import { defineConfig } from "vite";
// React plugin: enables JSX and fast refresh
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Enable the React plugin
  plugins: [react()],
  server: {
    // The frontend dev server runs on port 3000
    port: 3000,
    // Proxy configuration: forward /api requests to the backend
    proxy: {
      "/api": {
        target: "http://localhost:5000", // the Express backend
        changeOrigin: true, // change the Origin header to match the target
      },
    },
  },
});