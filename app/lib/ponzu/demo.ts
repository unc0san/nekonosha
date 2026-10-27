import { draftQuestions, ruleBasedInterpreter } from "../../components/requests/intake";
import { assignCats } from "../../components/requests/assignment";
import { type PonzuProposal, type ProposalInput, isProposalInput, isPonzuProposal } from "./contracts";

export function demoProposal(input: ProposalInput): PonzuProposal {
  if (!isProposalInput(input)) throw new Error("Invalid input");
  const draft = ruleBasedInterpreter.interpret(input.text, input.department);
  const proposal: PonzuProposal = {
    summary: draft.subject, questions: draftQuestions(draft).map(q => ({ field: q.field as "subject" | "department" | "dueDate" | "details", question: q.text })),
    department: draft.department || null, kind: draft.kind,
    recommendedStaff: assignCats(draft.kind, draft.text, draft.details, draft.department).lead,
    dueDate: draft.dueDate || null, details: draft.details, explanation: draft.explanation,
  };
  if (!isPonzuProposal(proposal)) throw new Error("Invalid demo proposal");
  return proposal;
}
