import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupInstallPromptCapture } from "./pwa/installPrompt";
import { registerServiceWorker } from "./pwa/registerSW";

const CANONICAL_ORIGIN = "https://cfs.actividadfisica.app";
const LEGACY_AUTH_HOSTS = new Set(["fit-stride-stats.lovable.app"]);

function redirectLegacyAuthHost() {
  if (!LEGACY_AUTH_HOSTS.has(window.location.hostname)) return;

  const authParams = `${window.location.search}${window.location.hash}`;
  const hasRecoveryToken = authParams.includes("type=recovery");
  const path = window.location.pathname === "/"
    ? hasRecoveryToken ? "/reset-password" : "/app"
    : window.location.pathname;

  window.location.replace(`${CANONICAL_ORIGIN}${path}${window.location.search}${window.location.hash}`);
}

redirectLegacyAuthHost();
setupInstallPromptCapture();

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
