import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const rootElement = document.getElementById("root")!;
const root = ReactDOM.createRoot(rootElement);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then(reg => {
        // Auto-prompt SW update check every hour so users on long-lived tabs
        // get fresh code without manual refresh
        setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
      })
      .catch(err => {
        // Log so we can diagnose if SW silently fails to install (HTTPS issue,
        // bad MIME, scope mismatch). Don't crash the app.
        console.warn("[SW] registration failed:", err?.message || err);
      });
  });
}
