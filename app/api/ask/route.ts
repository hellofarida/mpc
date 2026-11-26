import { answerQuestion } from "@/lib/chat";
import { makeAi } from "@/lib/chat-ai";
import { getSightingsFile, getSites } from "@/lib/content";

const MAX_BODY_CHARS = 1000;
const HOUR_MS = 60 * 60 * 1000;
// Best-effort spend guard: one counter per server instance (serverless instances don't share it).
// Beyond the cap the answer comes from the template, with no AI call.
const AI_CAP_PER_HOUR = 200;
let windowStart = Date.now();
let used = 0;

function aiAllowed(): boolean {
  if (Date.now() - windowStart > HOUR_MS) {
    windowStart = Date.now();
    used = 0;
  }
  return used++ < AI_CAP_PER_HOUR;
}

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  // Same-origin only (the browser sends Origin on fetch POSTs).
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host")) return json({ kind: "invalid", message: "Not allowed." }, 403);

  const text = await request.text();
  if (text.length > MAX_BODY_CHARS) return json({ kind: "invalid", message: "That's too long." }, 413);
  let body: { siteId?: unknown; question?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return json({ kind: "invalid", message: "Something went wrong." }, 400);
  }
  if (typeof body.siteId !== "string") return json({ kind: "invalid", message: "Unknown garden." }, 400);

  const [sites, file] = await Promise.all([getSites(), getSightingsFile()]);
  const reply = await answerQuestion(
    body.siteId,
    body.question,
    aiAllowed() ? makeAi() : null,
    file,
    (msg) => console.warn(`[ask] ${msg}`),
    sites,
  );
  return json(reply, reply.kind === "invalid" ? 400 : 200);
}
