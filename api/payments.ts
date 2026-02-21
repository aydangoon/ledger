import type { VercelRequest, VercelResponse } from "@vercel/node";
import { kv } from "@vercel/kv";

const KV_KEY = "payments";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const pin = req.headers["x-pin"];
  if (!pin || pin !== process.env.PIN) {
    return res.status(401).json({ error: "Invalid PIN" });
  }

  if (req.method === "GET") {
    const data = await kv.get<Record<string, number>>(KV_KEY);
    return res.status(200).json(data ?? {});
  }

  if (req.method === "POST") {
    const body = req.body as Record<string, number>;
    await kv.set(KV_KEY, body);
    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method not allowed" });
}
