import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setupInstallPromptCapture } from "./pwa/installPrompt";
import { registerServiceWorker } from "./pwa/registerSW";

setupInstallPromptCapture();

createRoot(document.getElementById("root")!).render(<App />);

registerServiceWorker();
