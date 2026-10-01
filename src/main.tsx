import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { holdRequestsUntil } from "./api/httpClient";
import { App } from "./app/App";
import { AppProviders } from "./app/providers/AppProviders";
import { startMocks } from "./mocks/browser";
import "./app/styles/cursor.css";

const mocks = startMocks();
holdRequestsUntil(mocks);
mocks.then(
  () => {
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
