import { HttpResponse } from "msw";
import type { ApiError } from "../../schemas/match";

export function badRequest(message: string) {
  return HttpResponse.json<ApiError>(
    { code: "BAD_REQUEST", message },
    { status: 400 },
  );
}
