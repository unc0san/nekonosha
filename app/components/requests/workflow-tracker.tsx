import { staffOf, phaseLabel, type WorkRequest } from "./requests";
import { CAT_ROLES } from "./assignment";
import s from "./requests.module.css";

export default function WorkflowTracker({ request: r }: { request: WorkRequest }) {
  if (!r.workflow) return <p className={s.reason}>以前の依頼です。既存の成果物と承認状態を維持しています。修正依頼の窓口はぽんずです。</p>;
  const phase = r.workflow.phase;
  const labels = ["ぽんず受付・自動選定", "依頼内容の承認", "担当チーム作業", "しらす社長レビュー", "必要に応じて社内修正", "ぽんず報告・ユーザー確認", "ユーザー最終承認"];
  const active = { assigned: 1, staff_work: 2, president_review: 3, internal_revision: 4, user_review: 5, completed: 6 }[phase];
  return <section className={s.workflow} aria-label="仕事の進行と品質レビュー">
    <h4>現在の段階：{phaseLabel(r)}</h4>
    <ol className={s.flowStages}>{labels.map((label, i) => <li key={label} aria-current={i === active ? "step" : undefined}>{label}{i === active ? " ← 現在" : ""}</li>)}</ol>
    <p>ぽんずが依頼・担当調整・修正依頼・成果物報告の窓口です。しらす社長のチェック後も、最終決定はユーザーが行います。</p>
    {r.team && <ul>{r.team.map((member, i) => <li key={member.staff}><b>{i ? "協力" : "主担当"}：{staffOf(member.staff).name}（{CAT_ROLES[member.staff]}）</b> — {member.responsibility}</li>)}</ul>}
    <section aria-label="しらす社長の品質レビュー">
      <h4>しらす社長の品質レビュー</h4>
      <p>「雰囲気だけでは合格にできません。完成条件と確認すべき情報を、はっきり書くこと。」</p>
      <small>サンプル成果物へのルールベースの定型チェックです。実務品質の保証や外部操作は行いません。</small>
      {r.workflow.reviews.length ? <ol>{r.workflow.reviews.map((review, i) => <li key={i}>
        <b>v{review.version}：{review.verdict === "passed" ? "チェック通過" : "修正指示"}</b>
        <ul>{review.comments.map((comment, j) => <li key={j}>{comment}</li>)}</ul>
      </li>)}</ol> : <p>{phase === "president_review" ? "提出された成果物をチェック中です。" : "担当チームの提出後にレビューします。"}</p>}
    </section>
    {(phase === "user_review" || phase === "completed") && <p className={s.done}><b>ぽんずからの報告：</b>{r.workflow.reviews.at(-1)?.verdict === "changes" ? "社内修正後も指摘が残っています。コメントを確認し、修正依頼または最終承認をご判断ください。" : "社長の定型チェックを通過した成果物です。"}{phase === "user_review" ? " 最終承認はまだ行っていません。内容をご確認ください、にゃ！" : " ユーザーが最終承認しました。"}</p>}
  </section>;
}
