import "server-only";
import { demoProposal } from "./demo";
import { isProposalInput, type ProposalInput, type ProposalResponse } from "./contracts";
import { requestOpenAIProposal, type OpenAIDependencies } from "./openai";
import { PonzuError } from "./errors";

export async function analyzeProposal(input: ProposalInput, dependencies: OpenAIDependencies = {}): Promise<ProposalResponse> {
  if (!isProposalInput(input)) throw new PonzuError("invalid_request");
  if (!process.env.OPENAI_API_KEY?.trim()) return { mode: "demo", proposal: demoProposal(input) };
  return { mode: "openai", proposal: await requestOpenAIProposal(input, dependencies) };
}
