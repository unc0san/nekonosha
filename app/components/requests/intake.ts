import { STAFF } from "../office/staff";
import { assignCats, CAT_ROLES } from "./assignment";
import { createRequest, DEPARTMENTS, DEPARTMENT_WORDS, DURATION, KIND_LABEL, TODAY, type Department, type Kind, type WorkRequest } from "./requests";

export type RequestDraft = {
  text: string; subject: string; department: Department | ""; kind: Kind; staff: string;
  dueDate: string; details: string; explanation: string; clarifications?: DraftQuestion[]; analysisSource?: "demo" | "openai";
};
export type IntakeState = { inputs: Record<Department, string>; drafts: Record<Department, RequestDraft | null> };
export const emptyIntake = (): IntakeState => ({ inputs: { 広告事業部: "", EC事業部: "" }, drafts: { 広告事業部: null, EC事業部: null } });
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export function validDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number), parsed = new Date(y, m - 1, d);
  return iso(parsed) === date;
}

// A local interpreter boundary: a later AI adapter can return the same editable draft.
// It never creates a task, saves data, or executes the requested work.
export interface RequestInterpreter { interpret(text: string, context: Department): RequestDraft }
export function readDeadline(text: string, base = TODAY): { date: string; explanation: string } {
  const t = text.normalize("NFKC");
  const add = (n: number) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + n);
  const explicit = t.match(/(?:(\d{4})[年/-])?(\d{1,2})[月/\-](\d{1,2})日?/);
  if (explicit) {
    let y = explicit[1] ? Number(explicit[1]) : base.getFullYear();
    const m = Number(explicit[2]), d = Number(explicit[3]);
    if (!explicit[1] && new Date(y, m - 1, d) < base) y++;
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return validDate(date) ? { date, explanation: "指定日を読み取りました。" } : { date: "", explanation: "日付が存在しません。正しい期限を教えてください。" };
  }
  let date: Date | undefined;
  const after = t.match(/(\d+)日後/), weekday = t.match(/([月火水木金土日])曜(?:日)?/);
  const mondayOffset = (base.getDay() + 6) % 7;
  if (/明後日|あさって/.test(t)) date = add(2);
  else if (/明日|あした/.test(t)) date = add(1);
  else if (/今日|本日|至急|急ぎ|ASAP/i.test(t)) date = add(0);
  else if (after && Number(after[1]) <= 3650) date = add(Number(after[1]));
  else if (/再来週|来週|今週/.test(t)) {
    const week = /再来週/.test(t) ? 2 : /来週/.test(t) ? 1 : 0;
    const day = weekday ? ("月火水木金土日".indexOf(weekday[1])) : /週末/.test(t) ? 6 : 4;
    date = add(-mondayOffset + week * 7 + day);
  } else if (weekday) date = add(("日月火水木金土".indexOf(weekday[1]) - base.getDay() + 7) % 7);
  else if (/週末/.test(t)) date = add(6 - mondayOffset);
  else if (/月末/.test(t)) date = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  if (!date || date < base || !Number.isFinite(date.getTime())) return { date: "", explanation: "期限を日付で指定してください。" };
  return { date: iso(date), explanation: /週/.test(t) && !weekday ? "曜日のない「今週・来週」は金曜日、週末は日曜日を候補にしています。変更できます。" : "指定された期限を読み取りました。" };
}

const CONTENT: Record<Kind, string> = {
  plan: "目的・対象者・施策案・スケジュールを整理し、企画案をまとめる。",
  copy: "伝えたい内容を整理し、見出しと本文の下書きを作成する。",
  sns: "投稿文とハッシュタグの候補を下書きとして作成する。投稿は行わない。",
  email: "用件を整理し、件名とメール本文の下書きを作成する。送信は行わない。",
  report: "サンプルデータを使い、集計結果・課題・次の施策案をまとめる。",
  product: "商品の特徴・紹介文・ページ構成の下書きを作成する。公開は行わない。",
  memo: "",
};
export const ruleBasedInterpreter: RequestInterpreter = {
  interpret(text, context) {
    const t = text.normalize("NFKC").toUpperCase(), base = createRequest(text, context, Date.now());
    const explicit = DEPARTMENTS.filter(d => t.includes(d) || t.includes(d.replace("事業", "")));
    const matches = DEPARTMENTS.filter(d => DEPARTMENT_WORDS[d].some(word => t.includes(word)));
    const brands = DEPARTMENTS.filter(d => t.includes(d === "広告事業部" ? "ねこ日和" : "ねこ商店"));
    const conflict = explicit.length > 1 || brands.length > 1 || (explicit.length === 1 && brands.some(d => d !== explicit[0]));
    const department = conflict ? "" : explicit[0] ?? brands[0] ?? (matches.length === 1 ? matches[0] : "");
    const deadline = readDeadline(text);
    return {
      text: text.trim(), subject: base.subject, department, kind: base.kind,
      staff: assignCats(base.kind, text, "", department).lead,
      dueDate: deadline.date, details: CONTENT[base.kind] ? `「${base.subject}」について、${CONTENT[base.kind]}` : "",
      explanation: `${department ? `${department}の仕事と推定しました。` : conflict ? "複数の部署が指定されています。1件につき1部署を選び、他部署の仕事は分けて依頼してください。" : "どちらの部署の仕事か教えてください。"}${deadline.explanation} 基準日はデモ日付の2026/10/25です。`,
    };
  },
};
export type DraftQuestion = { field: "subject" | "department" | "dueDate" | "details"; text: string };
export function draftQuestions(draft: RequestDraft): DraftQuestion[] {
  const questions: DraftQuestion[] = [];
  if (!draft.subject.trim()) questions.push({ field: "subject", text: "仕事の名前を教えてください。" });
  if (!draft.department) questions.push({ field: "department", text: "広告事業部とEC事業部、どちらの仕事ですか？" });
  if (!validDate(draft.dueDate)) questions.push({ field: "dueDate", text: "いつまでに仕上げますか？期限を日付で教えてください。" });
  if (!draft.details.trim()) questions.push({ field: "details", text: "具体的に何を作る・調べる仕事ですか？作業内容を教えてください。" });
  return questions.map(q => draft.clarifications?.find(item => item.field === q.field) ?? q);
}
export function assignDraftCats(draft: RequestDraft) {
  const base = assignCats(draft.kind, draft.text, draft.details, draft.department);
  if (draft.analysisSource !== "openai" || !Object.hasOwn(CAT_ROLES, draft.staff)) return base;
  const team = [draft.staff, ...base.team.map(member => member.staff).filter(id => id !== draft.staff)]
    .map((staff, i) => ({ staff, responsibility: `${i ? "協力" : "主担当"}：${CAT_ROLES[staff]}の観点で${i ? "内容を補助・確認します" : "成果物を取りまとめます"}。` }));
  return { lead: draft.staff, team, explanation: `ぽんずAIが${CAT_ROLES[draft.staff]}の専門性から主担当を推奨しました。必要な分野の猫が同じ事業部のチームとして協力します。` };
}
export function confirmDraft(draft: RequestDraft, id: number): WorkRequest {
  if (draftQuestions(draft).length || !draft.department) throw new Error("確認事項への回答が必要です。");
  const base = createRequest(draft.text, draft.department, id);
  const [y, m, d] = draft.dueDate.split("-").map(Number), date = new Date(y, m - 1, d);
  const assignment = assignDraftCats(draft);
  const cat = STAFF.find(s => s.id === assignment.lead)!;
  return { ...base, subject: draft.subject.trim(), department: draft.department, kind: draft.kind, staff: assignment.lead, team: assignment.team, workflow: { phase: "assigned", reviews: [], autoRevisions: 0 },
    details: draft.details.trim(), duration: DURATION[draft.kind],
    due: { date: draft.dueDate, label: `${m}/${d}（${"日月火水木金土"[date.getDay()]}）`, said: true },
    urgent: date <= TODAY || base.urgent,
    reason: `社長が登録前に確認した内容です。${draft.department}の${KIND_LABEL[draft.kind]}を、${CAT_ROLES[assignment.lead]}担当の${cat.name}に割り当てました。` };
}

export function isRequestDraft(value: unknown): value is RequestDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  return [d.text, d.subject, d.staff, d.dueDate, d.details, d.explanation].every(v => typeof v === "string")
    && (d.department === "" || DEPARTMENTS.includes(d.department as Department))
    && typeof d.kind === "string" && Object.hasOwn(KIND_LABEL, d.kind)
    && (d.analysisSource === undefined || d.analysisSource === "demo" || d.analysisSource === "openai")
    && (d.clarifications === undefined || (Array.isArray(d.clarifications) && d.clarifications.length <= 8 && d.clarifications.every(q => q && typeof q === "object" && ["subject", "department", "dueDate", "details"].includes(q.field) && typeof q.text === "string" && q.text.length <= 300)));
}
