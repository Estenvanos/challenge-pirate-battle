import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppProviders } from "./app/providers/AppProviders";
import { startMocks } from "./mocks/browser";
import "./app/styles/cursor.css";

// Inicia o MSW antes de qualquer acesso à rede.
void startMocks().then(() => {
  // Cursor customizado só entra depois que o worker está ativo.
  document.documentElement.dataset.cursor = "custom";
  createRoot(document.getElementById("app")!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
});
