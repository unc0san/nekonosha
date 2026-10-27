"use client";

import { useState } from "react";
import { deskLabel } from "../office/staff";
import { plainText } from "./deliverables";
import { KIND_LABEL, dueRemaining, progressOf, staffOf, statusLabel, type Department, type WorkRequest } from "./requests";
import s from "./requests.module.css";

type Actions = { onApprove: (id: number) => void; onRevise: (id: number, note: string) => void; onHurry: (id: number) => void; onShowDepartment: (department: Department) => void };
type Props = Actions & { requests: WorkRequest[]; now: number; department: Department; selected: number | null; onSelect: (id: number) => void };

const STEPS = ["受付", "作業中", "提出", "承認"];
const TONE = { working: s.working, review: s.review, approved: s.approved };

function stepOf(r: WorkRequest, now: number) {
  if (r.status === "approved") return 3;
  if (r.status === "review") return 2;
  return progressOf(r, now).routing ? 0 : 1;
}

export function CatFace({ id }: { id: string }) {
  return <span className={s.face} style={{ backgroundImage: `url(/office/cats/${id}/stand.png)` }} aria-hidden="true"/>;
}

// Requests to ぽんず across both departments (newest first), and the selected one in detail.
export default function RequestDesk({ requests, now, department, selected, onSelect, ...actions }: Props) {
  const list = [...requests].reverse(), current = requests.find(r => r.id === selected) ?? list[0];
  const waiting = requests.filter(r => r.status === "review").length;
  return <section className="panel" id="requests" aria-label="依頼と成果物">
    <div className="panel-heading"><h2><span>05 /</span> 依頼と成果物</h2><span className={s.count}>{waiting ? `確認待ち ${waiting} 件` : `${requests.length} 件`}</span></div>
    <p className={s.safety}><b>下書きのみ</b> メール送信・SNS投稿など外部への操作は自動で行いません。成果物は外部AIを使わず、サンプルの定型文から作っています。</p>
    {current ? <div className={s.layout}>
      <ul className={s.list} aria-label="依頼の一覧">
        {list.map(r => {
          const p = progressOf(r, now), cat = staffOf(r.staff);
          return <li key={r.id}><button type="button" className={s.item} aria-current={r.id === current.id} onClick={() => onSelect(r.id)}>
            <CatFace id={r.staff}/>
            <span className={s.itemText}>
              <strong>{r.subject}</strong>
              <small>{r.department} · {cat.name} · 期限 {r.due.label}</small>
              {r.status === "working" && <span className={s.bar} aria-hidden="true"><i style={{ width: `${p.ratio * 100}%` }}/></span>}
            </span>
            <span className={`${s.chip} ${TONE[r.status]}`}>{statusLabel(r, now)}</span>
          </button></li>;
        })}
      </ul>
      <Detail key={current.id} r={current} now={now} department={department} {...actions}/>
    </div> : <p className={s.empty}>まだ依頼はありません。右の「秘書のデスク」から、ぽんずに仕事をお願いしてみてください。内容に合わせて事業部と担当の猫社員を決め、作業が終わると成果物がここに届きます。</p>}
  </section>;
}

function Detail({ r, now, department, onApprove, onRevise, onHurry, onShowDepartment }: Actions & { r: WorkRequest; now: number; department: Department }) {
  // 0 follows the newest version; a number pins an older one the president picked.
  const [version, setVersion] = useState(0);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  const p = progressOf(r, now), cat = staffOf(r.staff), step = stepOf(r, now);
  const shown = (version && r.versions[version - 1]) || r.versions.at(-1), latest = r.versions.length;

  function copy() {
    if (!shown) return;
    navigator.clipboard?.writeText(plainText(shown)).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }, () => setCopied(false));
  }
  function submitRevision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!note.trim()) return;
    onRevise(r.id, note);
    setNote("");
    setVersion(0);
  }

  return <article className={s.detail} aria-live="polite">
    <header className={s.detailHead}>
      <span className={s.kind}>{KIND_LABEL[r.kind]}</span>
      <h3>{r.subject}</h3>
      <p className={s.quote}>依頼：「{r.text}」</p>
    </header>

    <dl className={s.meta}>
      <div><dt>担当</dt><dd className={s.owner}><CatFace id={r.staff}/><span>{cat.name}<small>{cat.coat} · {deskLabel(r.staff, r.department)}</small></span></dd></div>
      <div><dt>事業部</dt><dd>{r.department}{r.department !== department && <button type="button" className={s.link} onClick={() => onShowDepartment(r.department)}>オフィスを見る</button>}</dd></div>
      <div><dt>期限</dt><dd className={r.urgent && r.status !== "approved" ? s.urgent : ""}>{r.due.label}<small>{r.status === "approved" ? "完了" : dueRemaining(r.due)}{r.due.said ? "" : "（標準の期限）"}</small></dd></div>
      <div><dt>状態</dt><dd><span className={`${s.chip} ${TONE[r.status]}`}>{statusLabel(r, now)}</span></dd></div>
    </dl>
    <p className={s.reason}><b>ぽんずの振り分け</b>{r.reason}</p>
    {r.external && <p className={s.warn}>送信・投稿のご依頼でしたが、ぽんずたちは下書きまでを用意します。実際の送信・投稿は、内容をご確認のうえ社長ご自身でお願いします。</p>}

    <ol className={s.steps} aria-label="進行状況">
      {STEPS.map((label, i) => <li key={label} className={i < step ? s.past : i === step ? s.now : ""} aria-current={i === step ? "step" : undefined}>{i === 1 && r.revisions.length ? "修正" : label}</li>)}
    </ol>

    {r.status === "working" && <div className={s.progress}>
      <div className={s.progressRow}><span>{p.step}…</span><b>{Math.round(p.ratio * 100)}%</b></div>
      <span className={s.bar} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.ratio * 100)} aria-label="作業の進み具合"><i style={{ width: `${p.ratio * 100}%` }}/></span>
      <div className={s.progressRow}><small>{cat.name}がワークスペースのデスクで作業中です（あと約{p.left}秒・デモ用の短い作業時間）</small><button type="button" className={s.ghost} onClick={() => onHurry(r.id)}>すぐ仕上げる（デモ）</button></div>
    </div>}

    {shown && <section className={s.paper} aria-label="成果物">
      <div className={s.paperHead}>
        <span>成果物 · {cat.name}より提出</span>
        {latest > 1 && <div className={s.versions} role="group" aria-label="版の切り替え">{r.versions.map(v => <button key={v.version} type="button" aria-pressed={v.version === shown.version} onClick={() => setVersion(v.version)}>{v.version === 1 ? "初版" : `v${v.version}`}</button>)}</div>}
      </div>
      <h4>{shown.title}</h4>
      <p className={s.lead}>{shown.lead}</p>
      {shown.sections.map(section => <div key={section.heading} className={section.heading === "修正メモへの対応" ? `${s.section} ${s.changes}` : s.section}>
        <h5>{section.heading}</h5>
        {section.lines.map((line, i) => (line ? <p key={i}>{line}</p> : <br key={i}/>))}
      </div>)}
      {shown.caution && <p className={s.warn}>{shown.caution}</p>}
      <button type="button" className={s.ghost} onClick={copy}>{copied ? "コピーしました" : "テキストをコピー"}</button>
    </section>}

    {r.status === "review" && <div className={s.actions}>
      <button type="button" className={s.primary} onClick={() => onApprove(r.id)}>この内容で承認する</button>
      <form onSubmit={submitRevision}>
        <label htmlFor={`revise-${r.id}`}>修正を依頼する</label>
        <textarea id={`revise-${r.id}`} value={note} onChange={e => setNote(e.target.value)} maxLength={200} placeholder="例：もっと短く、親しみやすい感じで／20代向けに／数字の根拠も入れて"/>
        <button type="submit" className={s.secondary} disabled={!note.trim()}>{cat.name}に修正をお願いする</button>
      </form>
      <small>承認しても、メール送信やSNS投稿などは行われません。</small>
    </div>}
    {r.status === "approved" && <p className={s.done}>✓ 承認済みです。{cat.name}はひと仕事終えて休憩に入りました。成果物はコピーしてお使いください（外部への送信・投稿は行っていません）。</p>}

    {r.revisions.length > 0 && <details className={s.history}><summary>修正の履歴（{r.revisions.length}回）</summary><ol>{r.revisions.map((n, i) => <li key={i}>v{i + 2}への修正メモ：「{n}」</li>)}</ol></details>}
  </article>;
}
