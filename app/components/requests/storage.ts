import { createRequest, DEPARTMENTS, STATUS_LABEL, PHASE_LABEL, type Workflow, type Department, type Status, type WorkRequest } from "./requests";
import { CAT_ROLES, type TeamMember } from "./assignment";
import { emptyIntake, isRequestDraft, type IntakeState } from "./intake";
import type { Deliverable } from "./deliverables";

export const STORAGE_KEY = "nekonosha.workspace";
export type StoredTask = { id: number; title: string; project: string; owner: string; due: string; status: Status; priority: boolean };
type Tasks = Record<Department, StoredTask[]>;
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(v => typeof v === "string");
function status(value: unknown, done?: unknown): Status {
  if (value === "approved" || done === true) return "completed";
  if (typeof value === "string" && Object.hasOwn(STATUS_LABEL, value)) return value as Status;
  if (value === undefined && typeof done === "boolean") return "pending";
  throw new Error("Invalid task status");
}
function deliverable(value: unknown): value is Deliverable {
  return object(value) && number(value.version) && typeof value.title === "string" && typeof value.lead === "string"
    && (value.caution === undefined || typeof value.caution === "string") && Array.isArray(value.sections)
    && value.sections.every(s => object(s) && typeof s.heading === "string" && strings(s.lines));
}

// Never overwrite an unreadable or newer snapshot. Older done/approved values are migrated here.
export function loadWorkspace(raw: string | null, defaults: Tasks): { tasks: Tasks; requests: WorkRequest[]; intake: IntakeState } {
  if (raw === null) return { tasks: defaults, requests: [], intake: emptyIntake() };
  const data: unknown = JSON.parse(raw);
  if (!object(data) || (data.version !== undefined && data.version !== 1 && data.version !== 2 && data.version !== 3 && data.version !== 4) || !object(data.tasks) || !Array.isArray(data.requests)) throw new Error("Invalid workspace");
  const tasks = { ...defaults };
  for (const department of DEPARTMENTS) {
    const list = data.tasks[department];
    if (list === undefined) continue;
    if (!Array.isArray(list)) throw new Error("Invalid tasks");
    tasks[department] = list.map(t => {
      if (!object(t) || !number(t.id) || ![t.title, t.project, t.owner, t.due].every(v => typeof v === "string")) throw new Error("Invalid task");
      return { id: t.id, title: t.title as string, project: t.project as string, owner: t.owner as string, due: t.due as string, priority: t.priority === true, status: status(t.status, t.done) };
    });
  }
  const requests = data.requests.map((r): WorkRequest => {
    if (!object(r) || !number(r.id) || typeof r.text !== "string" || !DEPARTMENTS.includes(r.department as Department)) throw new Error("Invalid request");
    const base = createRequest(r.text, r.department as Department, r.id);
    if (!Array.isArray(r.versions) || !r.versions.every(deliverable) || !strings(r.revisions)) throw new Error("Invalid deliverables");
    const state = status(r.status);
    if ((state === "review" || state === "completed") && !r.versions.length) throw new Error("Missing deliverable");
    if (!number(r.startedAt) || !number(r.duration) || r.duration <= 2500) throw new Error("Invalid progress");
    const due = r.due;
    if (!object(due) || typeof due.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(due.date) || !Number.isFinite(Date.parse(due.date)) || typeof due.label !== "string" || typeof due.said !== "boolean") throw new Error("Invalid deadline");
    if (r.details !== undefined && typeof r.details !== "string") throw new Error("Invalid work details");
    let team: TeamMember[] | undefined;
    if (r.team !== undefined) {
      if (!Array.isArray(r.team) || !r.team.length || !r.team.every(member => object(member) && typeof member.staff === "string" && Object.hasOwn(CAT_ROLES, member.staff) && typeof member.responsibility === "string")) throw new Error("Invalid team");
      team = r.team as TeamMember[];
      if (team[0].staff !== r.staff || new Set(team.map(m => m.staff)).size !== team.length) throw new Error("Invalid team lead");
    }
    let workflow: Workflow | undefined;
    if (r.workflow !== undefined) {
      const w = r.workflow;
      if (!object(w) || typeof w.phase !== "string" || !Object.hasOwn(PHASE_LABEL, w.phase) || !Array.isArray(w.reviews) || (w.autoRevisions !== 0 && w.autoRevisions !== 1)) throw new Error("Invalid workflow");
      if (!w.reviews.every(review => object(review) && number(review.version) && Number.isInteger(review.version) && review.version >= 1 && review.version <= (r.versions as Deliverable[]).length && number(review.reviewedAt) && (review.verdict === "changes" || review.verdict === "passed") && strings(review.comments))) throw new Error("Invalid quality reviews");
      const expected = w.phase === "assigned" ? "pending" : w.phase === "completed" ? "completed" : w.phase === "user_review" ? "review" : "working";
      if (state !== expected || ((w.phase === "president_review" || w.phase === "internal_revision" || w.phase === "user_review" || w.phase === "completed") && !r.versions.length)) throw new Error("Inconsistent workflow");
      workflow = w as Workflow;
    }
    return { ...base, ...(team ? { team } : {}), ...(workflow ? { workflow } : {}), ...(typeof r.details === "string" ? { details: r.details } : {}), subject: typeof r.subject === "string" ? r.subject : base.subject,
      kind: typeof r.kind === "string" && ["plan", "copy", "sns", "email", "report", "product", "memo"].includes(r.kind) ? r.kind as WorkRequest["kind"] : base.kind,
      staff: typeof r.staff === "string" && ["kohaku", "mitsumame", "mugi", "kurogoma", "omochi"].includes(r.staff) ? r.staff : base.staff,
      reason: typeof r.reason === "string" ? r.reason : base.reason,
      due: { date: due.date, label: due.label, said: due.said }, urgent: r.urgent === true, external: base.external || r.external === true,
      status: state, startedAt: r.startedAt, duration: r.duration, versions: r.versions, revisions: r.revisions };
  });
  if (new Set(requests.map(r => r.id)).size !== requests.length) throw new Error("Duplicate request IDs");
  const intake = emptyIntake();
  if (data.intake !== undefined) {
    if (!object(data.intake) || !object(data.intake.inputs) || !object(data.intake.drafts)) throw new Error("Invalid intake");
    for (const department of DEPARTMENTS) {
      const input = data.intake.inputs[department], draft = data.intake.drafts[department];
      if (typeof input !== "string" || (draft !== null && !isRequestDraft(draft))) throw new Error("Invalid draft");
      intake.inputs[department] = input;
      intake.drafts[department] = draft;
    }
  }
  return { tasks, requests, intake };
}
