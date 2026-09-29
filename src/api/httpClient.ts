import axios from "axios";

const REQUEST_TIMEOUT_MS = 8000;

export const httpClient = axios.create({
  baseURL: "/api",
  timeout: REQUEST_TIMEOUT_MS,
});
