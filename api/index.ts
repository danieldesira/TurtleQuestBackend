import { Context, Hono } from "hono";
import { handle } from "hono/vercel";
import { version, author } from "../package.json";
import { cors } from "hono/cors";
import { env } from "hono/adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { logger } from "hono/logger";
import {
  checkAndRegisterPlayerGoogle,
  fetchGoogleUser,
} from "../services/authService";
import {
  getHighScores,
  saveScore,
  SaveScorePayload,
} from "../services/scoreService";
import { validator } from "hono/validator";
import { z } from "zod";

export const config = {
  runtime: "edge",
};

const app = new Hono().basePath("/api");

neonConfig.webSocketConstructor = WebSocket;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

app.use(cors());
app.use(logger());

app.get("/about", (c) =>
  c.json({ project: "Turtle Quest API", version, author })
);

const verifyGoogleToken = async (
  c: Context,
  next: () => Promise<void>
): Promise<Response | void> => {
  const token = c.req.header("Authorization");
  if (!token) {
    return c.json({ error: "Token missing" }, 401);
  }

  try {
    const payload = await fetchGoogleUser(token);

    const { id: playerId, isNewPlayer } = await checkAndRegisterPlayerGoogle(
      prisma,
      payload
    );

    env(c).externalId = payload.sub;
    env(c).ssoPlatform = "google";
    env(c).isNewPlayer = isNewPlayer;
    env(c).playerId = playerId as number;

    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};

app.post("/login", verifyGoogleToken, async (c) => {
  const externalId = env(c).externalId as string;
  const ssoPlatform = env(c).ssoPlatform as string;
  const isNewPlayer = env(c).isNewPlayer as boolean;

  return c.json({
    message: "Login successful",
    externalId,
    ssoPlatform,
    isNewPlayer,
  });
});

app.post(
  "/points",
  verifyGoogleToken,
  validator("json", (value, c) => {
    const schema = z.object({
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
    const parsed = schema.safeParse(value);
    if (!parsed.success) {
      return c.json({ error: parsed.error }, 422);
    }
    return parsed.data;
  }),
  async (c) => {
    const playerId = parseInt(env(c).playerId as string);

    const body = (await c.req.json()) as SaveScorePayload;

    await saveScore(prisma, playerId, body);
    return c.json({ message: "Score saved successfully" });
  }
);

app.get("/points", async (c) => {
  const highScores = await getHighScores(prisma);
  return c.json(highScores);
});

export default handle(app);
