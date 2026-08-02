/**
 * ============================================================
 *  REACT ENTRY POINT — main.jsx
 * ============================================================
 *  This is the entry point for the React frontend.
 *  It's the first file that runs when the app loads in the browser.
 *
 *  WHAT IT DOES:
 *  1. Imports React and ReactDOM
 *  2. Imports the root App component
 *  3. Imports the global CSS styles
 *  4. Mounts the App into the DOM at the element with id="root"
 *
 *  KEY CONCEPTS TO LEARN:
 *  - ReactDOM.createRoot(): the modern way to mount React (React 18+)
 *  - StrictMode: a development-only wrapper that helps catch bugs
 *    by double-invoking certain functions
 *  - The #root div is defined in index.html
 * ============================================================
 */

// React: the core library for building UI components
import React from "react";
// ReactDOM: bridges React with the browser's DOM
import ReactDOM from "react-dom/client";
// App: the root component that contains the entire application
import App from "./App.jsx";
// Global CSS styles (all component styles are in here)
import "./index.css";

// Find the #root element in index.html and create a React root
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode helps identify potential problems in development
  <React.StrictMode>
    <App />
  </React.StrictMode>
);