import { isProposalResponse, proposalToDraft, type ProposalInput } from "./contracts";
import { ERROR_MESSAGES, PonzuError, type ErrorCode } from "./errors";

export async function requestProposal(input: ProposalInput, signal?: AbortSignal, fetcher: typeof fetch = fetch) {
  try {
    const response = await fetcher("/api/ponzu/analyze", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input), cache: "no-store", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
    if (!response.ok) {
      let data: unknown;
      try { data = await response.json(); } catch { /* Never show raw response text. */ }
      const code = data && typeof data === "object" && "code" in data ? data.code : undefined;
      throw new PonzuError(typeof code === "string" && Object.hasOwn(ERROR_MESSAGES, code) ? code as ErrorCode : "unavailable");
    }
    let data: unknown;
    try { data = await response.json(); } catch { throw new PonzuError("invalid_response"); }
    if (!isProposalResponse(data)) throw new PonzuError("invalid_response");
    if (signal?.aborted) throw new Error("Cancelled");
    return { draft: proposalToDraft(input, data.proposal, data.mode), mode: data.mode };
  } catch (error) {
    if (signal?.aborted) throw new Error("Cancelled");
    if (error instanceof PonzuError) throw error;
    throw new PonzuError("unavailable");
  }
}
