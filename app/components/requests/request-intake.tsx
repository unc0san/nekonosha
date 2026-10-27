"use client";

import { useEffect, useRef, useState } from "react";
import { requestProposal } from "../../lib/ponzu/client";
import { demoProposal } from "../../lib/ponzu/demo";
import { proposalToDraft } from "../../lib/ponzu/contracts";
import { ERROR_MESSAGES, PonzuError } from "../../lib/ponzu/errors";
import { STAFF } from "../office/staff";
import { DEPARTMENTS, KIND_LABEL, type Department, type Kind } from "./requests";
import { draftQuestions, assignDraftCats, type RequestDraft } from "./intake";
import { CAT_ROLES } from "./assignment";
import s from "./requests.module.css";

type Props = {
  department: Department; input: string; draft: RequestDraft | null; ready: boolean;
  onInput: (text: string) => void; onDraft: (draft: RequestDraft | null) => void;
  onConfirm: () => void;
};
const EXAMPLES: Record<Department, string[]> = {
  広告事業部: ["来週までに秋のキャンペーン企画をまとめて", "ねこ日和のSNS投稿案を明日までに作って", "先週の広告の結果を金曜日までにレポートにまとめて"],
  EC事業部: ["新作ねこグッズの商品ページを明日までに作って", "ねこ商店のお客様へのお礼メールを今日中に作って", "今週の在庫を来週月曜日までに集計して"],
};
export default function RequestIntake({ department, input, draft, ready, onInput, onDraft, onConfirm }: Props) {
  const active = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<Department | null>(null);
  const [failures, setFailures] = useState<Partial<Record<Department, string>>>({});
  const analyzing = pending === department;
  const failure = failures[department];
  const failed = !!failure;
  useEffect(() => () => { active.current?.abort(); }, [department]);
  async function analyze() {
    if (!input.trim() || !ready || analyzing) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setPending(department);
    setFailures(previous => ({ ...previous, [department]: undefined }));
    try {
      const result = await requestProposal({ text: input, department }, controller.signal);
      if (!controller.signal.aborted) {
        onDraft(result.draft);
      }
    } catch (error) {
      if (!controller.signal.aborted) setFailures(previous => ({ ...previous, [department]: error instanceof PonzuError ? error.message : ERROR_MESSAGES.unavailable }));
    }
    finally { if (active.current === controller) setPending(null); }
  }
  function useDemo() {
    if (!ready || analyzing || !input.trim()) return;
    const request = { text: input, department };
    onDraft(proposalToDraft(request, demoProposal(request), "demo"));
    setFailures(previous => ({ ...previous, [department]: undefined }));
  }
  const questions = draft ? draftQuestions(draft) : [];
  const assignment = draft ? assignDraftCats(draft) : null;
  function patch(change: Partial<RequestDraft>) {
    if (!draft) return;
    const affectsAssignment = ["subject", "department", "kind", "details"].some(key => key in change);
    onDraft({ ...draft, ...change, ...(affectsAssignment ? { analysisSource: "demo" as const } : {}) });
  }
  function register() {
    if (!draft || !ready || analyzing || failed || questions.length) return;
    if (input.trim() !== draft.text) return;
    onConfirm();
  }
  return <div className={s.intake}>
    <form onSubmit={e => { e.preventDefault(); void analyze(); }}>
      <label htmlFor="instruction">ぽんずへの指示（{department}の受付）</label>
      <textarea id="instruction" placeholder="例：来週までに秋のキャンペーン企画をまとめて" value={input} onChange={e => onInput(e.target.value)} maxLength={1000} disabled={!ready || analyzing}/>
      <div className={s.examples} aria-label="指示の例">{EXAMPLES[department].map(example => <button key={example} type="button" disabled={!ready || analyzing} onClick={() => onInput(example)}>{example}</button>)}</div>
      <button type="submit" disabled={!ready || analyzing || !input.trim()}>{analyzing ? "ぽんずが内容を整理しています…" : failed ? "もう一度解析する" : draft ? "入力内容からプレビューを作り直す" : "ぽんずにお願いする・内容を確認"}<span>↗</span></button>
      <small>キー未設定時はデモ解析、設定時はOpenAIで依頼を整理します。成果物の作成・品質レビューは従来のサンプル動作です。</small>
      {failed && <div role="alert" className={s.warn}>
        <p>{failure}</p><p>タスクは登録していません。以前のプレビューは承認できません。再試行するか、デモ解析を選んでください。</p>
        <button type="button" disabled={!ready || analyzing} onClick={useDemo}>デモ解析を使う（外部通信なし）</button>
      </div>}
      {draft?.analysisSource && !failed && <small role="status">{draft.analysisSource === "openai" ? "OpenAIによる提案です。内容をご確認ください。" : "デモ解析、または内容編集後のルールによる提案です。"}</small>}
      <small>承認するまでタスクには登録されません。入力・プレビューは部署ごとに保存します。</small>
      {draft && <small>入力欄を変えた場合は、プレビューを作り直してから承認してください。</small>}
    </form>
    {draft && <section className={s.preview} aria-label="登録前の依頼プレビュー">
      <h3>ぽんずの依頼プレビュー <small>未登録</small></h3>
      <p className={s.reason}>{draft.explanation}</p>
      {questions.length > 0 ? <div className={s.questions} role="status"><b>社長、こちらを教えてください、にゃ。</b><ul>{questions.map(q => <li key={q.field}><a href={`#draft-${q.field}`}>{q.text}</a></li>)}</ul><p>下の項目で回答・修正できます。</p></div> : <p className={s.reason}>内容を整理しました。以下を確認・修正して、登録を承認してください。</p>}
      <label htmlFor="draft-subject">仕事名</label>
      <input id="draft-subject" value={draft.subject} maxLength={100} onChange={e => patch({ subject: e.target.value })}/>
      <label htmlFor="draft-department">事業部</label>
      <select id="draft-department" value={draft.department} onChange={e => patch({ department: e.target.value as Department | "" })}>
        <option value="">事業部を選んでください</option>{DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
      </select>
      <label htmlFor="draft-kind">成果物の種類</label>
      <select id="draft-kind" value={draft.kind} onChange={e => patch({ kind: e.target.value as Kind })}>{Object.entries(KIND_LABEL).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <small>担当猫はぽんずが自動選定します。仕事内容を編集した場合は、変更後の内容からルールで再選定します。</small>
      {assignment && <section className={s.assignment} aria-label="ぽんずの自動振り分け">
        <h4>ぽんずが選んだ担当チーム</h4>
        <p>{assignment.explanation}</p>
        <ul>{assignment.team.map((member, i) => <li key={member.staff}><b>{i ? "協力" : "主担当"}：{STAFF.find(cat => cat.id === member.staff)?.name}（{CAT_ROLES[member.staff]}）</b><br/>{member.responsibility}</li>)}</ul>
      </section>}
      <label htmlFor="draft-dueDate">期限</label>
      <input id="draft-dueDate" type="date" value={draft.dueDate} onChange={e => patch({ dueDate: e.target.value })}/>
      <small>日付の解析基準は画面のデモ日付（2026/10/25）です。</small>
      <label htmlFor="draft-details">具体的な作業内容・確認事項への回答</label>
      <textarea id="draft-details" value={draft.details} maxLength={2000} onChange={e => patch({ details: e.target.value })}/>
      <p className={s.warn}>成果物はサンプルの下書きです。登録・承認してもメール送信・SNS投稿・外部公開は行いません。</p>
      <div className={s.previewActions}>
        <button className={s.primary} type="button" disabled={!ready || analyzing || failed || questions.length > 0 || input.trim() !== draft.text} onClick={register}>依頼内容を承認して作業開始</button>
        <button className={s.ghost} type="button" onClick={() => onDraft(null)}>プレビューを取り消す</button>
      </div>
    </section>}
  </div>;
}
