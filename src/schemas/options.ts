import { z } from "zod";
import { OPTIONS_LIMITS, type GameOptions } from "../config/options";

function optionSchema(key: keyof GameOptions) {
  const { min, max } = OPTIONS_LIMITS[key];
  return z.number().int().min(min).max(max);
}

export const gameOptionsSchema = z.object({
  sessionTimeSec: optionSchema("sessionTimeSec"),
  spawnIntervalSec: optionSchema("spawnIntervalSec"),
}) satisfies z.ZodType<GameOptions>;
