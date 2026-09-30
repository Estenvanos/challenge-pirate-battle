import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { holdRequestsUntil } from "./api/httpClient";
import { App } from "./app/App";
import { AppProviders } from "./app/providers/AppProviders";
import { startMocks } from "./mocks/browser";
import "./app/styles/cursor.css";

// O jogo abre na hora; o MSW sobe em paralelo e segura só os pedidos à API.
const mocks = startMocks();
holdRequestsUntil(mocks);
mocks.then(
  () => {
    // Cursor customizado só entra depois que o worker está ativo.
    document.documentElement.dataset.cursor = "custom";
  },
  (error: unknown) => console.warn("Mock API unavailable", error),
);

createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </StrictMode>,
);
