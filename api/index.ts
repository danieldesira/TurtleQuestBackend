import { Context, Hono } from "hono";
import { handle } from "hono/vercel";
import { version, author } from "../package.json";
import { cors } from "hono/cors";
import { env } from "hono/adapter";
import { player, PrismaClient } from "@prisma/client";
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
import {
  Player,
  updateJsonField,
  updatePlayer,
} from "../services/playerService";
import { gameSchema, playerSchema, pointInsertSchema, settingsSchema } from "./validation";

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

    const { player, isNewPlayer } = await checkAndRegisterPlayerGoogle(
      prisma,
      payload
    );

    env(c).externalId = payload.sub;
    env(c).ssoPlatform = "google";
    env(c).isNewPlayer = isNewPlayer;
    env(c).player = JSON.stringify(player);

    await next();
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};

const parseJsonBody = (schema: z.ZodObject<any>, value: object, c: Context) => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return c.json({ error: parsed.error }, 422);
  }
  return parsed.data;
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
  validator("json", (value, c) => parseJsonBody(pointInsertSchema, value, c)),
  async (c) => {
    const player = JSON.parse(env(c).player as string) as player;

    const body = await c.req.json<SaveScorePayload>();

    await saveScore(prisma, player.id, body);
    return c.json({ message: "Score saved successfully" });
  }
);

app.get("/points", async (c) => {
  const highScores = await getHighScores(prisma);
  return c.json(highScores);
});

app.get("/player", verifyGoogleToken, async (c) => {
  const player = JSON.parse(env(c).player as string) as player;
  return c.json({ player });
});

app.put(
  "/player",
  verifyGoogleToken,
  validator("json", (value, c) => parseJsonBody(playerSchema, value, c)),
  async (c) => {
    const player = JSON.parse(env(c).player as string) as player;
    const body = await c.req.json();
    await updatePlayer(prisma, player.id, body as Player);
    return c.json({ message: "Player updated successfully" });
  }
);

app.put(
  "/settings",
  verifyGoogleToken,
  validator("json", (value, c) => parseJsonBody(settingsSchema, value, c)),
  async (c) => {
    const player = JSON.parse(env(c).player as string) as player;
    const body = await c.req.json();
    await updateJsonField(prisma, player.id, 
      'settings', body.settings);
    return c.json({ message: "Settings updated successfully" });
  }
);

app.put(
  "/game",
  verifyGoogleToken,
  validator("json", (value, c) => parseJsonBody(gameSchema, value, c)),
  async (c) => {
    const player = JSON.parse(env(c).player as string) as player;
    const body = await c.req.json();
    await updateJsonField(prisma, player.id,'last_game', body.game);
    return c.json({ message: "Settings updated successfully" });
  }
);

export default handle(app);
