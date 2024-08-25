import { Hono } from "hono";
import { handle } from "hono/vercel";
import { version, author } from "../package.json";

export const config = {
  runtime: "edge",
};

const app = new Hono().basePath("/api");

app.get("/about", (c) =>
  c.json({ project: "Turtle Quest API", version, author })
);

export default handle(app);
