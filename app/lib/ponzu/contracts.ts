import { DEPARTMENTS, KIND_LABEL, type Department, type Kind } from "../../components/requests/requests";
import { CAT_ROLES } from "../../components/requests/assignment";
import { validDate, type RequestDraft } from "../../components/requests/intake";

export const QUESTION_FIELDS = ["subject", "department", "dueDate", "details"] as const;
export type QuestionField = typeof QUESTION_FIELDS[number];
export type ProposalInput = { text: string; department: Department };
export type PonzuProposal = {
  summary: string; questions: { field: QuestionField; question: string }[];
  department: Department | null; kind: Kind; recommendedStaff: string;
  dueDate: string | null; details: string; explanation: string;
};
export type AnalysisMode = "demo" | "openai";
export type ProposalResponse = { mode: AnalysisMode; proposal: PonzuProposal };
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exactKeys = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const string = (v: unknown, max: number): v is string => typeof v === "string" && v.length <= max;

export function isProposalInput(value: unknown): value is ProposalInput {
  return object(value) && exactKeys(value, ["text", "department"]) && string(value.text, 1000)
    && !!value.text.trim() && DEPARTMENTS.includes(value.department as Department);
}
export function isPonzuProposal(value: unknown): value is PonzuProposal {
  if (!object(value) || !exactKeys(value, ["summary", "questions", "department", "kind", "recommendedStaff", "dueDate", "details", "explanation"])) return false;
  return string(value.summary, 100) && string(value.details, 2000) && string(value.explanation, 600)
    && (value.department === null || DEPARTMENTS.includes(value.department as Department))
    && typeof value.kind === "string" && Object.hasOwn(KIND_LABEL, value.kind)
    && typeof value.recommendedStaff === "string" && Object.hasOwn(CAT_ROLES, value.recommendedStaff)
    && (value.dueDate === null || (typeof value.dueDate === "string" && validDate(value.dueDate)))
    && Array.isArray(value.questions) && value.questions.length <= 8
    && value.questions.every(q => object(q) && exactKeys(q, ["field", "question"]) && QUESTION_FIELDS.includes(q.field as QuestionField) && string(q.question, 300) && !!q.question.trim());
}
export function isProposalResponse(value: unknown): value is ProposalResponse {
  return object(value) && exactKeys(value, ["mode", "proposal"]) && (value.mode === "demo" || value.mode === "openai") && isPonzuProposal(value.proposal);
}
// Project only allowlisted suggestion fields. The original input is authoritative;
// no proposal can supply a task ID, approval, status, workflow, tool, or executable action.
export function proposalToDraft(input: ProposalInput, proposal: PonzuProposal, mode: AnalysisMode = "demo"): RequestDraft {
  if (!isProposalInput(input) || !isPonzuProposal(proposal)) throw new Error("Invalid proposal");
  const draft: RequestDraft = { text: input.text.trim(), subject: proposal.summary, department: proposal.department ?? "",
    kind: proposal.kind, staff: proposal.recommendedStaff, dueDate: proposal.dueDate ?? "", details: proposal.details,
    explanation: proposal.explanation, analysisSource: mode, clarifications: proposal.questions.map(q => ({ field: q.field, text: q.question })) };
  // A question must be answered explicitly in the corresponding preview field.
  for (const q of proposal.questions) {
    if (q.field === "subject") draft.subject = "";
    else if (q.field === "department") draft.department = "";
    else if (q.field === "dueDate") draft.dueDate = "";
    else draft.details = "";
  }
  return draft;
}

// OpenAI Responses API Structured Outputs contract; no task/action properties.
export const PROPOSAL_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    summary: { type: "string", maxLength: 100 },
    questions: { type: "array", maxItems: 8, items: { type: "object", additionalProperties: false,
      properties: { field: { type: "string", enum: [...QUESTION_FIELDS] }, question: { type: "string", minLength: 1, maxLength: 300 } }, required: ["field", "question"] } },
    department: { type: ["string", "null"], enum: [...DEPARTMENTS, null] },
    kind: { type: "string", enum: Object.keys(KIND_LABEL) },
    recommendedStaff: { type: "string", enum: Object.keys(CAT_ROLES) },
    dueDate: { type: ["string", "null"], description: "YYYY-MM-DD. Unknown or invalid dates must be null." },
    details: { type: "string", maxLength: 2000 }, explanation: { type: "string", maxLength: 600 },
  }, required: ["summary", "questions", "department", "kind", "recommendedStaff", "dueDate", "details", "explanation"],
} as const;
