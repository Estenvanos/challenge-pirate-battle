import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

export function startMocks() {
  return worker.start({
    onUnhandledFrame: "bypass",
    quiet: !import.meta.env.DEV,
    serviceWorker: {
      url: `${import.meta.env.BASE_URL}mockServiceWorker.js`,
    },
  });
}
