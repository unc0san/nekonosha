import { type OfficeTask } from "../office/staff";
import { staffOf, type WorkRequest } from "./requests";

// Adapt workflow state to existing office inputs, without changing artwork or animation code.
export function requestOfficeTasks(r: WorkRequest): OfficeTask[] {
  if (r.workflow?.phase === "president_review") return [{ title: `品質レビュー：${r.subject}`, owner: "しらす", staff: "shirasu", done: false }];
  const team = r.team?.length ? r.team : [{ staff: r.staff, responsibility: "主担当" }];
  return team.map(member => ({ title: `${r.workflow?.phase === "internal_revision" ? "社長の指摘を修正：" : ""}${r.subject}`, owner: staffOf(member.staff).name, staff: member.staff, done: r.status !== "working", request: true }));
}
