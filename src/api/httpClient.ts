import axios from "axios";
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from "../constants/api";

export const httpClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
});

// Render the app immediately, but hold API requests until the MSW worker starts.
let ready: Promise<unknown> = Promise.resolve();

export function holdRequestsUntil(promise: Promise<unknown>): void {
  ready = promise;
  promise.catch(() => undefined);
}

httpClient.interceptors.request.use(async (config) => {
  await ready;
  return config;
});
