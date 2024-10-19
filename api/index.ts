import { Context, Hono } from "hono";
import { handle } from "hono/vercel";
import { version, author } from "../package.json";
import { cors } from "hono/cors";
import { OAuth2Client } from "google-auth-library";
import { env } from "hono/adapter";

export const config = {
  runtime: "edge",
};

const app = new Hono().basePath("/api");

app.use("/api/*", cors());

app.get("/about", (c) =>
  c.json({ project: "Turtle Quest API", version, author })
);

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const verifyGoogleToken = async (
  c: Context,
  next: () => Promise<void>
): Promise<Response | void> => {
  const token = c.req.header("Authorization")?.split("Bearer ")[1];

  if (!token) {
    return c.json({ error: "Token missing" }, 401);
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (payload) {
      env(c).user = payload;
      await next();
    } else {
      return c.json({ error: "Invalid token payload" }, 401);
    }
  } catch (error) {
    return c.json({ error: "Invalid token" }, 401);
  }
};

app.get("/points", verifyGoogleToken, (c) => {
  const user = env(c).user;
  return c.json({ message: "points to be shown here", user });
});

export default handle(app);
