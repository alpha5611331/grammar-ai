import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "@/App";
import { BootstrapProvider } from "@/hooks/useBootstrap";
import { AlertConfirmProvider } from "@/hooks/useAlertConfirm";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BootstrapProvider>
      <AlertConfirmProvider>
        <App />
      </AlertConfirmProvider>
    </BootstrapProvider>
  </StrictMode>
);
