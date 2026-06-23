import "@fontsource/geist-sans";
import "@fontsource/geist-mono";
import "@/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
