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

export const playerSchema = z.object({
  name: z.string({
    invalid_type_error: "name should be a string",
    required_error: "name is required",
  }),
  dob: z.coerce.date({
    invalid_type_error: "dob should be a date",
    required_error: "dob is required",
  }),
});

export const gameSchema = z.object({
  game: z.object({
    characters: z.array(
      z.object({
        x: z.number(),
        y: z.number(),
        direction: z.number(),
        type: z.string(),
      })
    ),
    levelNo: z.number(),
    turtle: z.object({
      x: z.number(),
      y: z.number(),
      direction: z.number(),
      food: z.number(),
      health: z.number(),
      oxygen: z.number(),
      stomachCapacity: z.number(),
    }),
    xp: z.number(),
  }),
});
