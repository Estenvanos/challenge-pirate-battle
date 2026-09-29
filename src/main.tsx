import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { AppProviders } from "./app/providers/AppProviders";
import { startMocks } from "./mocks/browser";

// Inicia o MSW antes de qualquer acesso à rede.
void startMocks().then(() => {
  createRoot(document.getElementById("app")!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  );
});
