import { NextRequest } from "next/server";

export const runtime = "nodejs";
// Allow large PDF uploads (up to 50 MB)
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const parserUrl = process.env.PARSER_URL;
  if (!parserUrl) {
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: "PARSER_URL is not configured" })}\n\n`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const sse = (msg: object) =>
    new Response(`data: ${JSON.stringify(msg)}\n\n`, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });

  // Parse the incoming multipart body
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return sse({ type: "error", message: `Failed to read upload: ${e}` });
  }

  // Forward to the Python service
  let upstream: Response;
  try {
    const base = parserUrl.replace(/\/$/, "");
    const url = /^https?:\/\//.test(base) ? base : `https://${base}`;
    upstream = await fetch(`${url}/parse`, {
      method: "POST",
      body: formData,
    });
  } catch (e) {
    return sse({ type: "error", message: `Parser service unreachable: ${e}` });
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "upstream error");
    return sse({ type: "error", message: `Parser returned ${upstream.status}: ${text}` });
  }

  // Stream SSE from Python service straight through to the browser
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
    },
  });
}
