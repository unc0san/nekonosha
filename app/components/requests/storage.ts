import { createRequest, DEPARTMENTS, STATUS_LABEL, type Department, type Status, type WorkRequest } from "./requests";
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
export function loadWorkspace(raw: string | null, defaults: Tasks): { tasks: Tasks; requests: WorkRequest[] } {
  if (raw === null) return { tasks: defaults, requests: [] };
  const data: unknown = JSON.parse(raw);
  if (!object(data) || (data.version !== undefined && data.version !== 1 && data.version !== 2) || !object(data.tasks) || !Array.isArray(data.requests)) throw new Error("Invalid workspace");
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
    return { ...base, subject: typeof r.subject === "string" ? r.subject : base.subject,
      kind: typeof r.kind === "string" && ["plan", "copy", "sns", "email", "report", "product", "memo"].includes(r.kind) ? r.kind as WorkRequest["kind"] : base.kind,
      staff: typeof r.staff === "string" && ["kohaku", "mitsumame", "mugi", "kurogoma", "omochi"].includes(r.staff) ? r.staff : base.staff,
      reason: typeof r.reason === "string" ? r.reason : base.reason,
      due: { date: due.date, label: due.label, said: due.said }, urgent: r.urgent === true, external: base.external || r.external === true,
      status: state, startedAt: r.startedAt, duration: r.duration, versions: r.versions, revisions: r.revisions };
  });
  if (new Set(requests.map(r => r.id)).size !== requests.length) throw new Error("Duplicate request IDs");
  return { tasks, requests };
}
