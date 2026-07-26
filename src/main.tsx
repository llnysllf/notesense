import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./components/ErrorBoundary";
import { installRuntimeFailureReporting } from "./observability";
import "./styles.css";

installRuntimeFailureReporting();

if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("content-preview")) {
  void import("./dev/mountContentPreview").then(({ mountContentPreview }) => mountContentPreview());
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
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
