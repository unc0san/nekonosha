import { isProposalInput } from "../../../lib/ponzu/contracts";
import { analyzeProposal } from "../../../lib/ponzu/server";
import { ERROR_MESSAGES, PonzuError, type ErrorCode } from "../../../lib/ponzu/errors";

export const runtime = "nodejs";
const MAX_BYTES = 8192;
const headers = { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const error = (status: number, code: ErrorCode = "invalid_request", retryAfter?: number) => Response.json({ error: ERROR_MESSAGES[code], code }, { status, headers: { ...headers, ...(retryAfter ? { "Retry-After": String(Math.max(1, Math.min(120, Math.ceil(retryAfter)))) } : {}) } });

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") return error(403);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error(415);
  if (Number(request.headers.get("content-length")) > MAX_BYTES) return error(413);
  let input: unknown;
  try {
    if (!request.body) return error(400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let bytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > MAX_BYTES) { await reader.cancel(); return error(413); }
        chunks.push(value);
      }
    } finally { reader.releaseLock(); }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
    input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(body));
  } catch { return error(400); }
  if (!isProposalInput(input)) return error(400);
  try {
    // Analysis only. This route cannot write tasks or invoke workflow actions.
    return Response.json(await analyzeProposal(input, { signal: request.signal }), { headers });
  } catch (cause) {
    // Never serialize exceptions, request contents, environment values or provider errors.
    if (cause instanceof PonzuError) {
      const status = { rate_limited: 429, timeout: 504, refused: 422, configuration: 503, invalid_response: 502, unavailable: 502, invalid_request: 400 }[cause.code];
      return error(status, cause.code, cause.retryAfter);
    }
    return error(500, "unavailable");
  }
}
