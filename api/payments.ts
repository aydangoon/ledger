import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Redis } from "@upstash/redis";

const KV_KEY = "payments";

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pin = req.headers["x-pin"];
  if (!pin || pin !== process.env.PIN) {
    return res.status(401).json({ error: "Invalid PIN" });
  }

  if (req.method === "GET") {
    const data = await redis.get<Record<string, number>>(KV_KEY);
    return res.status(200).json(data ?? {});
  }

  if (req.method === "POST") {
    const body = req.body as Record<string, number>;
    await redis.set(KV_KEY, JSON.stringify(body));
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
