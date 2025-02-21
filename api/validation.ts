import { z } from "zod";

export const pointInsertSchema = z.object({
  points: z.number({
    invalid_type_error: "points should be a number",
    required_error: "points is required",
  }),
  level: z.number({
    invalid_type_error: "level should be a number",
    required_error: "level is required",
  }),
  hasWon: z
    .boolean({ invalid_type_error: "hasWon should be a boolean" })
    .optional(),
});

export const settingsSchema = z.object({
  settings: z.object({
    controlPosition: z.enum(["left", "right"]),
  }),
});
