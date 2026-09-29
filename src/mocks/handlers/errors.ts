import { HttpResponse } from "msw";
import type { ApiError } from "../../api/contracts";

export function badRequest(message: string) {
  return HttpResponse.json<ApiError>(
    { code: "BAD_REQUEST", message },
    { status: 400 },
  );
}
