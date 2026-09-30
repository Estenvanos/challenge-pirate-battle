import axios from "axios";

const REQUEST_TIMEOUT_MS = 8000;

export const httpClient = axios.create({
  baseURL: "/api",
  timeout: REQUEST_TIMEOUT_MS,
});

// O app abre sem esperar o MSW; os pedidos, sim. Se o worker falhar, eles
// falham como uma API fora do ar (estado de erro nas abas), sem travar o jogo.
let ready: Promise<unknown> = Promise.resolve();

export function holdRequestsUntil(promise: Promise<unknown>): void {
  ready = promise;
  // O erro é tratado em cada pedido; isto só evita o aviso de rejeição solta.
  promise.catch(() => undefined);
}

httpClient.interceptors.request.use(async (config) => {
  await ready;
  return config;
});
