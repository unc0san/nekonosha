import type { Department, Kind } from "./requests";

export const CAT_ROLES: Record<string, string> = { kohaku: "営業企画", mitsumame: "制作・デザイン", mugi: "メディア・PR", kurogoma: "リサーチ", omochi: "事務サポート" };
export type TeamMember = { staff: string; responsibility: string };
export type Assignment = { lead: string; team: TeamMember[]; explanation: string };
const PRIMARY: Record<Kind, string> = { plan: "kohaku", copy: "mitsumame", sns: "mugi", email: "omochi", report: "kurogoma", product: "mitsumame", memo: "omochi" };
const SPECIALTIES: Record<string, RegExp> = {
  kohaku: /企画|戦略|営業|提案|施策/,
  mitsumame: /デザイン|バナー|制作|画像|商品ページ|文章|コピー|原稿/,
  mugi: /SNS|PR|メディア|投稿|広報|インスタ/,
  kurogoma: /調査|リサーチ|分析|集計|レポート|競合|在庫|データ/,
  omochi: /メール|事務|問い合わせ|お礼|顧客対応|チェックリスト/,
};
// Assignment is independent of the UI and can later be replaced by an AI planner.
// Cat names mentioned by the user are not a manual assignment instruction.
export function assignCats(kind: Kind, text: string, details: string, department: Department | ""): Assignment {
  const source = `${text}\n${details}`.normalize("NFKC").toUpperCase();
  const matched = Object.keys(SPECIALTIES).filter(id => SPECIALTIES[id].test(source));
  const lead = kind === "memo" ? matched[0] ?? PRIMARY[kind] : PRIMARY[kind];
  const team = [lead, ...matched.filter(id => id !== lead)].map((staff, i) => ({ staff, responsibility: `${i ? "協力" : "主担当"}：${CAT_ROLES[staff]}の観点で${i ? "内容を補助・確認します" : "成果物を取りまとめます"}。` }));
  return { lead, team, explanation: `${department || "事業部の確認後"}の仕事を、${CAT_ROLES[lead]}の専門性で選定しました。${team.length > 1 ? "必要な専門分野の猫が同じ事業部のチームとして協力します。" : "主担当が作業を進めます。"}` };
}
