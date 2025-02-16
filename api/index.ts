import { Context, Hono } from "hono";
import { handle } from "hono/vercel";
import { version, author } from "../package.json";
import { cors } from "hono/cors";
import { env } from "hono/adapter";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { logger } from "hono/logger";
import { checkAndRegisterPlayerGoogle } from "../services/authService";

export const config = {
  runtime: "edge",
};

const app = new Hono().basePath("/api");

neonConfig.webSocketConstructor = WebSocket;
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);
const prisma = new PrismaClient({ adapter });

app.use("/api/*", cors());
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
    const response = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    );
    const payload = await response.json();

    if (payload) {
      if (
        payload.iss !== "https://accounts.google.com" &&
        payload.iss !== "accounts.google.com"
      ) {
        throw new Error("Invalid issuer");
      }

      if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
        throw new Error("Invalid audience");
      }

      await checkAndRegisterPlayerGoogle(prisma, payload);

      env(c).externalId = payload.sub;
      env(c).ssoPlatform = "google";
      await next();
    } else {
      return c.json({ error: "Invalid token payload" }, 401);
    }
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};

app.post("/login", verifyGoogleToken, async (c) => {
  const externalId = env(c).externalId as string;
  const ssoPlatform = env(c).ssoPlatform as string;

  return c.json({ message: "Login successful", externalId, ssoPlatform });
});

app.get("/points", verifyGoogleToken, (c) => {
  const user = env(c).user;
  return c.json({ message: "points to be shown here", user });
});

export default handle(app);
