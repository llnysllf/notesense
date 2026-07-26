import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "raviger";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { installRuntimeFailureReporting } from "./observability";
import "./styles.css";

installRuntimeFailureReporting();

// The Pages build is served from a sub-path, so routes resolve relative to it.
// BASE_URL is "/" in development and "/notesense/" for the deployed site.
const basePath = import.meta.env.BASE_URL.replace(/\/+$/, "");

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("content-preview")) {
  void import("./dev/mountContentPreview").then(({ mountContentPreview }) => mountContentPreview());
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider basePath={basePath}>
        <App />
      </RouterProvider>
    </ErrorBoundary>
  </StrictMode>,
);

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // SW registration is optional; silently ignore failures.
    });
  });
}
