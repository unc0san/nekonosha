import type { Deliverable, Section } from "./deliverables";
import type { Kind, WorkRequest } from "./requests";

export type QualityReview = { version: number; reviewedAt: number; verdict: "changes" | "passed"; comments: string[] };
export const QUALITY_CRITERIA: Record<Kind, string> = {
  plan: "目的・対象者・施策案・実施判断の基準を明記する",
  copy: "読み手・伝えたい内容・表記の確認点を明記する",
  sns: "対象者・投稿案・投稿前の確認点を明記する",
  email: "用件・宛先などの未確定事項・送信前の確認点を明記する",
  report: "データの出所・サンプルであること・結論の確認点を明記する",
  product: "商品の特徴・未確認の仕様・公開前の確認点を明記する",
  memo: "作業の目的・進め方・完了条件を明記する",
};
export function qualitySection(r: WorkRequest): Section {
  return { heading: "品質確認メモ", lines: [
    `依頼との対応：${r.details || r.text}`,
    `提出期限：${r.due.label}`,
    `確認基準：${QUALITY_CRITERIA[r.kind]}。`,
    "数値・固有情報はサンプルまたは未確認です。実際の利用前にユーザーの確認が必要です。",
    "メール送信・SNS投稿・外部公開は行っていません。",
  ] };
}
// A transparent sample checklist, not an AI quality guarantee. Review the actual submitted version.
export function reviewQuality(r: WorkRequest, submitted: Deliverable, now: number): QualityReview {
  const memo = submitted.sections.find(s => s.heading === "品質確認メモ");
  const comments: string[] = [];
  if (!memo?.lines.some(l => l.includes(QUALITY_CRITERIA[r.kind]))) comments.push(`完成条件が曖昧です。${QUALITY_CRITERIA[r.kind]}こと。品質確認メモに追記してください。`);
  if (!memo?.lines.some(l => l === `提出期限：${r.due.label}`)) comments.push(`期限「${r.due.label}」と依頼への対応を品質確認メモに明記してください。期限と成果物が結び付いていません。`);
  if (!memo?.lines.includes(`依頼との対応：${r.details || r.text}`)) comments.push("依頼された具体的な作業内容との対応を明記してください。何を引き受けた成果物なのか、受付メモだけでなく品質確認メモでも確認できるようにすること。");
  if (!memo?.lines.some(l => l.includes("サンプル") && l.includes("未確認"))) comments.push("サンプル値と未確認情報を区別してください。事実として扱える表現にはしないこと。");
  if (r.external && !memo?.lines.some(l => l.includes("外部公開は行っていません"))) comments.push("外部操作は下書きまでです。送信・投稿・公開を行っていないことを明記してください。");
  return { version: submitted.version, reviewedAt: now, verdict: comments.length ? "changes" : "passed", comments: comments.length ? comments : ["完成条件・期限・サンプル表記のチェックを通過しました。ただし、定型チェックで実務品質を保証するものではありません。最後はユーザーが内容を確認して判断してください。"] };
}
