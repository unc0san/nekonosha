import { STAFF, deskLabel } from "../office/staff";
import { makeDeliverable, type Deliverable } from "./deliverables";

// Work requests to ぽんず, handled entirely on this page: ぽんず reads the request, picks the department and the cat,
// the cat works for a short demo time and hands in a sample deliverable, and the president approves it or asks for
// changes. Nothing here talks to an outside service: no AI API, no email, no social media.

export type Department = "広告事業部" | "EC事業部";
export const DEPARTMENTS: Department[] = ["広告事業部", "EC事業部"];

export type Kind = "plan" | "copy" | "sns" | "email" | "report" | "product" | "memo";
export const KIND_LABEL: Record<Kind, string> = { plan: "企画案", copy: "文章案", sns: "SNS投稿案", email: "メール文案", report: "レポート", product: "商品ページ案", memo: "作業メモ" };

// The same four states are used by sample tasks and requests.
export type Status = "pending" | "working" | "review" | "completed";
export const STATUS_LABEL: Record<Status, string> = { pending: "未着手", working: "作業中", review: "確認待ち", completed: "完了" };
export type Due = { date: string; label: string; said: boolean };
export type WorkRequest = {
  id: number; text: string; subject: string; department: Department; kind: Kind; staff: string; reason: string;
  due: Due; urgent: boolean; external: boolean; status: Status; startedAt: number; duration: number;
  versions: Deliverable[]; revisions: string[];
};

// The dashboard's demo date (shown in its header); deadlines count from it.
export const TODAY = new Date(2026, 9, 25);
const WEEKDAYS = "日月火水木金土";

// ---------- Reading a request ----------
const DEPARTMENT_WORDS: Record<Department, string[]> = {
  広告事業部: ["広告", "バナー", "キャンペーン", "PR", "プレス", "媒体", "集客", "クライアント", "ねこ日和", "出稿", "認知", "ブランド", "CM", "LP", "動画", "インフルエンサー", "代理店", "コピー"],
  EC事業部: ["EC", "商品", "在庫", "ストア", "ショップ", "通販", "ねこ商店", "ギフト", "注文", "発送", "レビュー", "売上", "セール", "カート", "グッズ", "購入", "お客様", "顧客", "入荷", "価格"],
};
const KIND_WORDS: [Kind, string[]][] = [
  ["email", ["メール", "お礼状", "案内状", "返信文", "お詫び"]],
  ["sns", ["SNS", "インスタ", "INSTAGRAM", "ツイート", "TWITTER", "TIKTOK", "投稿文", "投稿案", "ハッシュタグ"]],
  ["product", ["商品ページ", "商品説明", "商品紹介", "商品名", "商品登録"]],
  ["report", ["レポート", "報告", "分析", "集計", "調査", "リサーチ", "振り返り", "効果測定"]],
  ["plan", ["企画", "アイデア", "施策", "イベント", "プラン", "戦略", "キャンペーン"]],
  ["copy", ["コピー", "文章", "文案", "説明文", "紹介文", "キャッチ", "告知", "原稿", "見出し", "ブログ", "記事", "キャプション", "LP"]],
];
// Who takes each kind of work, by department (desk roles are in work-studio.json).
const DESK: Record<Kind, string> = { plan: "kohaku", copy: "mitsumame", product: "mitsumame", sns: "mugi", report: "kurogoma", email: "omochi", memo: "omochi" };
// Asking to send, post or publish: ぽんず only ever prepares a draft.
const EXTERNAL = /送信|送って|送付|メールして|投稿して|ポストして|公開して|配信して|アップして|DMして|出稿して|ツイートして/;
const DURATION: Record<Kind, number> = { memo: 14000, copy: 18000, sns: 16000, email: 16000, product: 22000, report: 26000, plan: 28000 };
// ぽんず reads the request and hands it out before the cat starts.
export const ROUTING_MS = 2500;
const REWORK = 0.6;

const normalize = (text: string) => text.normalize("NFKC").toUpperCase();
const hits = (text: string, words: string[]) => words.filter(word => text.includes(word));

function routeDepartment(text: string, fallback: Department): { department: Department; words: string[] } {
  if (/広告(事業)?部/.test(text)) return { department: "広告事業部", words: ["広告事業部"] };
  if (/EC(事業)?部/.test(text)) return { department: "EC事業部", words: ["EC事業部"] };
  const [ad, ec] = DEPARTMENTS.map(d => hits(text, DEPARTMENT_WORDS[d]));
  if (ad.length === ec.length) return { department: fallback, words: [] };
  return ad.length > ec.length ? { department: "広告事業部", words: ad } : { department: "EC事業部", words: ec };
}

function kindOf(text: string): Kind {
  let best: Kind = "memo", score = 0;
  for (const [kind, words] of KIND_WORDS) { const n = hits(text, words).length; if (n > score) { best = kind; score = n; } }
  return best;
}

// ---------- Deadlines ----------
const DEFAULT_DAYS: Record<Kind, number> = { memo: 1, copy: 1, sns: 1, email: 1, product: 2, report: 2, plan: 3 };
const addDays = (days: number) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + days);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysUntil = (d: Date) => Math.round((d.getTime() - TODAY.getTime()) / 86400000);
const nextWeekday = (weekday: number, weeks = 0) => addDays(((weekday - TODAY.getDay() + 7) % 7) + weeks * 7);

function dueOf(text: string, kind: Kind): Due {
  let date: Date | null = null;
  const md = text.match(/(\d{1,2})\s*[/月]\s*(\d{1,2})/), after = text.match(/(\d+)\s*日後/);
  if (md) { date = new Date(TODAY.getFullYear(), Number(md[1]) - 1, Number(md[2])); if (date < TODAY) date.setFullYear(date.getFullYear() + 1); }
  else if (after) date = addDays(Number(after[1]));
  else if (/明後日|あさって/.test(text)) date = addDays(2);
  else if (/明日|あした/.test(text)) date = addDays(1);
  else if (/今日|本日|至急|急ぎ|ASAP/.test(text)) date = addDays(0);
  else if (/来週/.test(text)) date = nextWeekday(5, 1);
  else if (/週末/.test(text)) date = nextWeekday(6);
  else if (/今週/.test(text)) date = nextWeekday(5);
  else if (/月末/.test(text)) date = new Date(TODAY.getFullYear(), TODAY.getMonth() + 1, 0);
  const said = !!date;
  date ??= addDays(DEFAULT_DAYS[kind]);
  return { date: isoOf(date), label: `${date.getMonth() + 1}/${date.getDate()}（${WEEKDAYS[date.getDay()]}）`, said };
}

const dateOf = (due: Due) => { const [y, m, d] = due.date.split("-").map(Number); return new Date(y, m - 1, d); };
export function dueShort(due: Due) {
  const date = dateOf(due), days = daysUntil(date), m = date.getMonth() + 1, d = date.getDate();
  return days <= 0 ? "今日" : days === 1 ? "明日" : `${m}/${d}`;
}
export function dueRemaining(due: Due) {
  const days = daysUntil(dateOf(due));
  return days < 0 ? "期限を過ぎています" : days === 0 ? "今日まで" : `あと${days}日`;
}

// What the request is about: the request with the asking and the deadline taken off.
function subjectOf(text: string) {
  const s = text.trim()
    .replace(/[。．.！!？?\s]+$/, "")
    .replace(/(大至急|至急|急ぎで|ASAP)/gi, "")
    .replace(/(今日|本日|明日|あした|明後日|あさって|今週|来週|週末|月末|\d{1,2}\s*[/月]\s*\d{1,2}日?|\d+\s*日後)(中|まで)(に|で)?/g, "")
    .replace(/[、,]?\s*(を|で|に)?(作って|つくって|考えて|まとめて|書いて|準備して|用意して|作成して|出して|整理して|送って|送信して|お願い|ください|下さい|ほしい|欲しい|もらえ|くれ|いただけ|頼む|たのむ|よろしく).*$/, "")
    .replace(/(を|に)?(投稿|公開|送信|配信|共有)?して(おいて|ください|ほしい|ね)?$/, "")
    .replace(/(を|に)?(投稿|公開|送信|配信|共有)?して(おいて|ください|ほしい|ね)?$/, "")
    .replace(/^[のをにでと、,\s]+|[、,をのにで\s]+$/g, "")
    .trim();
  return (s || text.trim()).slice(0, 40);
}

const nameOf = (id: string) => STAFF.find(s => s.id === id)?.name ?? id;
export const staffOf = (id: string) => STAFF.find(s => s.id === id) ?? STAFF[0];

export function createRequest(text: string, fallback: Department, now: number): WorkRequest {
  const t = normalize(text), kind = kindOf(t), { department, words } = routeDepartment(t, fallback), staff = DESK[kind];
  const why = words.length ? `「${words.slice(0, 3).join("」「")}」から${department}の仕事と判断しました。` : `どちらの事業部とも取れるため、表示中の${department}に振り分けました。`;
  const reason = `${why}${KIND_LABEL[kind]}なので、${deskLabel(staff, department)}担当の${nameOf(staff)}が担当します。`;
  const due = dueOf(t, kind);
  return {
    id: now, text: text.trim(), subject: subjectOf(text), department, kind, staff, reason, due,
    urgent: daysUntil(dateOf(due)) <= 0 || /至急|急ぎ|ASAP/.test(t), external: EXTERNAL.test(text),
    status: "pending", startedAt: now, duration: DURATION[kind], versions: [], revisions: [],
  };
}

// ---------- Progress ----------
const STEPS: Record<Kind, string[]> = {
  plan: ["過去の施策を見返しています", "アイデアを出しています", "企画書にまとめています", "最後の見直し中です"],
  copy: ["伝えたいことを整理しています", "言葉を書き出しています", "読みやすく整えています", "最後の見直し中です"],
  sns: ["最近の投稿を見返しています", "投稿文を書いています", "ハッシュタグを選んでいます", "最後の見直し中です"],
  email: ["用件を整理しています", "文面を書いています", "敬語をチェックしています", "最後の見直し中です"],
  report: ["サンプルデータを集めています", "数字を集計しています", "レポートにまとめています", "最後の見直し中です"],
  product: ["商品の特長を整理しています", "商品説明を書いています", "ページ構成を整えています", "最後の見直し中です"],
  memo: ["内容を確認しています", "進め方を考えています", "メモにまとめています", "最後の見直し中です"],
};

export function progressOf(r: WorkRequest, now: number) {
  if (r.status === "pending") return { routing: false, ratio: 0, step: "作業開始を待っています", left: 0 };
  if (r.status !== "working") return { routing: false, ratio: 1, step: "", left: 0 };
  const elapsed = Math.max(0, now - r.startedAt), routing = r.revisions.length === 0 && elapsed < ROUTING_MS;
  const start = r.revisions.length ? 0 : ROUTING_MS, ratio = routing ? 0 : Math.min(1, (elapsed - start) / (r.duration - start));
  const steps = STEPS[r.kind];
  const step = routing ? "ぽんずが内容を読んで、担当を決めています" : r.revisions.length && ratio < 0.25 ? "修正メモを読んでいます" : steps[Math.min(steps.length - 1, Math.floor(ratio * steps.length))];
  return { routing, ratio, step, left: Math.max(0, Math.ceil((r.startedAt + r.duration - now) / 1000)) };
}

export const isFinished = (r: WorkRequest, now: number) => r.status === "working" && now >= r.startedAt + r.duration;

// The cat hands in the next version (taking the latest change request into account).
export const handIn = (r: WorkRequest): WorkRequest => ({ ...r, status: "review", versions: [...r.versions, makeDeliverable(r, r.versions.length + 1, r.revisions.at(-1))] });
export const approve = (r: WorkRequest): WorkRequest => ({ ...r, status: "completed" });
export const revise = (r: WorkRequest, note: string, now: number): WorkRequest => ({ ...r, status: "working", startedAt: now, duration: Math.round(DURATION[r.kind] * REWORK), revisions: [...r.revisions, note.trim()] });
// Demo shortcut: finish now.
export const hurry = (r: WorkRequest, now: number): WorkRequest => ({ ...r, startedAt: now - r.duration });

export function statusLabel(r: WorkRequest, _now: number) {
  void _now;
  return STATUS_LABEL[r.status];
}

export const startRequest = (r: WorkRequest, now: number): WorkRequest => r.status === "pending" ? { ...r, status: "working", startedAt: now } : r;
