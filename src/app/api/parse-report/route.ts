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

  // Forward the multipart body directly to the Python service
  const formData = await req.formData();

  const upstream = await fetch(`${parserUrl}/parse`, {
    method: "POST",
    body: formData,
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "upstream error");
    return new Response(
      `data: ${JSON.stringify({ type: "error", message: text })}\n\n`,
      { status: 200, headers: { "Content-Type": "text/event-stream" } }
    );
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
