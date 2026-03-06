import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConcertinaModeProvider } from "@/context/concertina-mode";
import { App } from "@/App";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConcertinaModeProvider>
      <App />
    </ConcertinaModeProvider>
  </StrictMode>,
);
