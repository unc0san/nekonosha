"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import OfficeMap from "./components/office/office-map";
import { OFFICE_AREAS } from "./components/office/office-areas";
import RequestDesk from "./components/requests/request-desk";
import { KIND_LABEL, approve, dueShort, advanceRequest, phaseLabel, hurry, isFinished, progressOf, revise, staffOf, statusLabel, STATUS_LABEL, startRequest, type Status, type Department, type WorkRequest } from "./components/requests/requests";
import { loadWorkspace, STORAGE_KEY } from "./components/requests/storage";
import RequestIntake from "./components/requests/request-intake";
import { requestOfficeTasks } from "./components/requests/workflow-office";
import { emptyIntake, confirmDraft, draftQuestions, isRequestDraft } from "./components/requests/intake";
import rq from "./components/requests/requests.module.css";

type Task = { id: number; title: string; project: string; owner: string; due: string; status: Status; priority: boolean; job?: WorkRequest };
// A line from ぽんず; `request` links it to that request, `department` offers to switch to where the work went.
type Message = { text: string; scope?: Department; request?: number; department?: Department };
type Notice = { department: Department; id: number; title: string; body: string; time: string };
const initialTasks: Record<Department, Task[]> = {
  広告事業部: [
    { id: 1, title: "秋のキャンペーン企画をまとめる", project: "ねこ日和 / SNS広告", owner: "ぽんず", due: "今日", status: "pending", priority: true },
    { id: 2, title: "バナーのデザイン案を確認", project: "ねこ日和 / クリエイティブ", owner: "しらす", due: "今日", status: "pending", priority: false },
    { id: 3, title: "先週の広告レポートを作成", project: "社内 / レポーティング", owner: "ぽんず", due: "10/26", status: "pending", priority: false },
    { id: 4, title: "競合アカウントのリサーチ", project: "社内 / マーケティング", owner: "ぽんず", due: "完了", status: "completed", priority: false },
  ],
  EC事業部: [
    { id: 5, title: "新作ねこグッズの商品ページを準備", project: "ねこ商店 / 商品登録", owner: "ぽんず", due: "今日", status: "pending", priority: true },
    { id: 6, title: "秋のギフトセットを確認", project: "ねこ商店 / 商品企画", owner: "しらす", due: "10/26", status: "pending", priority: false },
    { id: 7, title: "今週の在庫リストを整理", project: "ねこ商店 / 在庫管理", owner: "ぽんず", due: "10/27", status: "pending", priority: false },
    { id: 8, title: "ストアの売上レポートを作成", project: "社内 / レポーティング", owner: "ぽんず", due: "完了", status: "completed", priority: false },
  ],
};

const clock = (t: number) => new Date(t).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });

function Cat({ orange = false, small = false }: { orange?: boolean; small?: boolean }) {
  return <svg className={small ? "cat-icon" : "pixel-cat"} viewBox="0 0 32 36" aria-label={orange ? "茶トラ猫のぽんず" : "白とグレーの猫のしらす"} role="img" shapeRendering="crispEdges">
    <path fill="#30312f" d="M5 1h6v3h10V1h6v6h3v14h-3v3h-2v3h3v6h-3v3H7v-3H4v-9h3v-3H2V7h3z"/>
    <path fill={orange ? "#da8a43" : "#a3a5a0"} d="M5 4h5v3h12V4h5v6h3v8h-3v3H5v-3H2v-8h3z"/>
    <path fill={orange ? "#f0b56f" : "#f8f7ed"} d="M11 7h10v4h6v10h-5v3h-2v3h5v6H7v-6h5v-3H5V11h6z"/>
    <path fill={orange ? "#ad622e" : "#777d78"} d="M13 7h3v6h-3zm5 0h3v6h-3z"/>
    <path fill="#30312f" d="M8 14h3v3H8zm13 0h3v3h-3zm-7 5h4v2h-4zm1 2h2v2h-2zM9 30h3v3H9zm12 0h3v3h-3z"/>
    <path fill="#ec7955" d="M6 18h4v2H6zm16 0h4v2h-4z"/>
    <path fill={orange ? "#ad622e" : "#a3a5a0"} d="M25 25h4v-5h3v9h-7z"/>
  </svg>;
}

export default function Home() {
  const [department, setDepartment] = useState<Department>("広告事業部");
  const [tasks, setTasks] = useState(initialTasks);
  const [intake, setIntake] = useState(emptyIntake);
  const [messages, setMessages] = useState<Message[]>([{ text: "おはようございます、社長！ 今日もいっしょに、いい仕事をしましょう。何かあれば、ぽんずにおまかせください。" }]);
  const [read, setRead] = useState(false);
  const [officeView, setOfficeView] = useState("suite");
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [now, setNow] = useState(0);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const saved = loadWorkspace(window.localStorage.getItem(STORAGE_KEY), initialTasks);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Restore browser-only data after hydration.
      setTasks(saved.tasks);
      setRequests(saved.requests);
      setIntake(saved.intake);
      setNow(Date.now());
    } catch {
      setStorageError("保存データを読み込めませんでした。元の保存データは保持しています。");
      return;
    }
    setStorageReady(true);
  }, []);
  useEffect(() => {
    if (!storageReady) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 4, tasks, requests, intake }));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Surface the result of writing to browser storage.
      setStorageError("");
    } catch {
      setStorageError("ブラウザに保存できません。現在の変更は再読み込みすると失われる可能性があります。");
    }
  }, [storageReady, tasks, requests, intake]);
  // Requests show up as tasks of their department; the office sees a requested task as open only while its cat works on it.
  const requestTasks: Task[] = requests.filter(r => r.department === department).map(r => ({ id: r.id, title: r.subject, project: `ぽんず経由の依頼 / ${KIND_LABEL[r.kind]}`, owner: staffOf(r.staff).name, due: dueShort(r.due), status: r.status, priority: r.urgent, job: r }));
  const current = [...tasks[department], ...requestTasks];
  const officeTasks = useMemo(() => [...tasks[department].map(task => ({ ...task, done: task.status !== "working" })), ...requests.filter(r => r.department === department).flatMap(requestOfficeTasks)], [tasks, requests, department]);
  const OfficeView = OFFICE_AREAS.find(area => area.id === officeView)?.Component;
  const completed = current.filter(task => task.status === "completed").length;
  const waiting = requests.filter(r => r.department === department && r.status === "review").length;
  const say = (message: Message) => setMessages(previous => [...previous, message]);

  // While any cat is working, a clock moves the progress bars; finished work is handed in for review.
  const latest = useRef(requests);
  useEffect(() => { latest.current = requests; }, [requests]);
  const busy = requests.some(r => r.status === "working");
  useEffect(() => {
    if (!busy) return;
    const timer = window.setInterval(() => {
      const t = Date.now(), finished = latest.current.filter(r => isFinished(r, t));
      setNow(t);
      if (!finished.length) return;
      const transitions = finished.map(r => ({ before: r, after: advanceRequest(r, t) }));
      setRequests(previous => previous.map(r => {
        const transition = transitions.find(item => item.before.id === r.id);
        return transition && r === transition.before ? transition.after : r;
      }));
      for (const { after: r } of transitions) {
        const phase = r.workflow?.phase;
        const text = phase === "president_review" ? `担当チームが「${r.subject}」を提出しました。しらす社長が品質を確認しています。` : phase === "internal_revision" ? `しらす社長から「${r.subject}」に具体的な修正指示が出ました。ぽんずが担当チームへ伝え、社内で修正しています。` : `「${r.subject}」の成果物をご報告します、にゃ！ ${r.workflow?.reviews.at(-1)?.verdict === "changes" ? "社長の指摘が残っています。" : r.workflow ? "しらす社長のチェックを通過しました。" : ""}ユーザーご自身で内容を確認し、修正依頼または最終承認をお願いします。`;
        say({ scope: r.department, text, request: r.id });
        setNotices(previous => [{ department: r.department, id: t + r.id, title: phaseLabel(r), body: `「${r.subject}」 · ${r.department}`, time: clock(t) }, ...previous]);
      }
      setRead(false);
    }, 500);
    return () => window.clearInterval(timer);
  }, [busy]);

  function registerRequest() {
    if (!storageReady) return;
    const draft = intake.drafts[department];
    if (!isRequestDraft(draft) || draftQuestions(draft).length || intake.inputs[department].trim() !== draft.text) return;
    // Only an explicit UI approval constructs a task; proposals cannot supply approval or workflow state.
    const r = confirmDraft(draft, Math.max(Date.now(), ...requests.map(item => item.id + 1)));
    const request = startRequest(r, Date.now());
    setRequests(previous => [...previous, request]);
    setSelectedRequest(r.id);
    setNow(Date.now());
    setIntake(previous => ({ inputs: { ...previous.inputs, [department]: "" }, drafts: { ...previous.drafts, [department]: null } }));
    setDepartment(r.department);
    say({ scope: r.department, text: `「${r.subject}」を${r.department}のタスクとして登録しました、にゃ！ ${staffOf(r.staff).name}が担当します。ぽんずが担当チームへ伝え、作業を開始しました。提出後はしらす社長が品質をレビューします。期限は${r.due.label}です。`, request: r.id });
  }
  const update = (id: number, change: (r: WorkRequest) => WorkRequest) => setRequests(previous => previous.map(r => (r.id === id ? change(r) : r)));
  function beginRequest(id: number) {
    const t = Date.now();
    update(id, r => startRequest(r, t));
    setNow(t);
  }
  function approveRequest(id: number) {
    const r = requests.find(item => item.id === id);
    if (!r || r.status !== "review" || !r.versions.length) return;
    update(id, approve);
    say({ scope: r.department, text: `承認ありがとうございます！ ${staffOf(r.staff).name}に伝えておきます。外部への送信や投稿はしていませんので、必要に応じて社長からお使いください。`, request: id });
  }
  function reviseRequest(id: number, note: string) {
    const r = requests.find(item => item.id === id), t = Date.now();
    if (!r || r.status !== "review" || !note.trim()) return;
    update(id, item => revise(item, note, t));
    setNow(t);
    say({ scope: r.department, text: `ぽんずが修正メモを担当チームに渡しました。v${r.versions.length + 1}ができるまで、少しお待ちください。`, request: id });
  }
  function hurryRequest(id: number) {
    const t = Date.now();
    update(id, r => hurry(r, t));
    setNow(t);
  }
  function showDepartment(name: Department) {
    setDepartment(name);
    document.getElementById("office")?.scrollIntoView({ behavior: "smooth" });
  }
  const lastMessage = messages.filter(message => !message.scope || message.scope === department).at(-1)!;
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-cat"><Cat small/></span><span>猫脳社<small>NEKONOSHA</small></span></a>
      <div className="workspace-label">YOUR WORKSPACE <span>01</span></div>
      <nav aria-label="メインナビゲーション"><a className="nav-item active" href="#dashboard"><span>▦</span> ダッシュボード <b>↗</b></a><a className="nav-item" href="#office"><span>▤</span> オフィス</a><a className="nav-item" href="#tasks"><span>☑</span> タスク一覧 <em>{current.filter(task => task.status !== "completed").length}</em></a><a className="nav-item" href="#team"><span>♧</span> 社員紹介</a><a className="nav-item" href="#requests"><span>✎</span> 依頼・成果物 {waiting > 0 && <em>{waiting}</em>}</a><a className="nav-item" href="#notifications"><span>♧</span> 通知 <i className={read ? "" : "notification-dot"}/></a></nav>
      <div className="sidebar-bottom"><div className="demo-note"><span>✦ SMALL TEAM, BIG IDEAS.</span><p>猫の手も、AIの力も。</p><small>今日も、ちょっといい仕事を。</small></div><div className="user"><Cat small/><div>しらす社長<small>代表取締役 / CEO</small></div><span>⌘</span></div></div>
    </aside>
    <main id="dashboard">
      <header className="topbar"><div>WORKSPACE <span>/</span> ダッシュボード</div><span className="demo-badge">● DEMO MODE</span></header>
      <div className="main-content">
        {storageError && <p role="alert">{storageError}</p>}
        <section className="page-heading"><div className="eyebrow">LET’S MAKE SOMETHING GOOD.</div><div className="heading-row"><div><h1>おはようございます、社長<span>✳</span></h1><p>猫たちは今日も、いいアイデアをあたためています。</p></div><div className="date-label">2026.10.25 <span>SUN</span><small><i/> オフィスは営業中</small></div></div></section>
        <div className="department-bar"><div role="tablist" aria-label="事業部切り替え">{(["広告事業部", "EC事業部"] as Department[]).map((name, index) => <button key={name} role="tab" aria-selected={department === name} onClick={() => setDepartment(name)} className={department === name ? "selected" : ""}><span>0{index + 1}</span>{name}</button>)}</div><span className="sample-label">サンプルワークスペース</span></div>
        <section className="stats" aria-label="進捗状況"><article><span>進行中のタスク <i>↗</i></span><strong>{current.length - completed}<small>件</small></strong><p>ひとつずつ、着実に。</p></article><article><span>タスク完了率 <i>◴</i></span><strong>{Math.round(completed / current.length * 100)}<small>%</small></strong><div className="progress-track"><div style={{ width: `${completed / current.length * 100}%` }}/></div></article><article><span>出勤中の猫社員 <i>♧</i></span><strong>07<small>匹</small></strong><p><b className="green-dot"/> 全員、元気にはたらいています</p></article></section>
        <div className="dashboard-grid"><div className="left-column">
          <section className="panel office-panel" id="office"><div className="panel-heading"><h2><span>01 /</span> 猫脳社オフィス</h2><span className="live-label"><i/> LIVE <small>サンプル</small></span></div><div className="office-view-switch" role="group" aria-label="オフィスの表示切り替え">{OFFICE_AREAS.map(area => <button key={area.id} aria-pressed={officeView === area.id} onClick={() => setOfficeView(area.id)}>{area.label}（新デザイン試作）</button>)}<button aria-pressed={officeView === "map"} onClick={() => setOfficeView("map")}>全体マップ</button></div>{OfficeView ? <OfficeView department={department} tasks={officeTasks}/> : <OfficeMap department={department} tasks={officeTasks} onOpenRoom={setOfficeView}/>}<div className="office-footer"><span><i/> {department}のようす</span><span>ときどき休憩。それも仕事。</span></div></section>
          <section className="panel tasks-panel" id="tasks"><div className="panel-heading"><h2><span>02 /</span> 今日のタスク</h2><span className="count-label">{completed} / {current.length} 完了</span></div><div className="task-list">{current.map(task => <div className={`task-row ${(task.status === "completed") ? "done" : ""}`} key={task.id}>{task.job ? <span className={`checkbox ${rq.taskMark}`} aria-hidden="true">{(task.status === "completed") ? "✓" : task.job.status === "review" ? "!" : "…"}</span> : <select aria-label={`${task.title}の状態`} disabled={!storageReady} value={task.status} onChange={e => { const status = e.target.value as Status; setTasks(previous => ({ ...previous, [department]: previous[department].map(item => item.id === task.id ? { ...item, status } : item) })); }}>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}<div className="task-copy">{task.job ? <a className={rq.taskLink} href="#requests" onClick={() => setSelectedRequest(task.id)}><strong>{task.title}</strong></a> : <strong>{task.title}</strong>}<small>{task.project}{task.job && <> · <b className={rq.taskStatus}>{statusLabel(task.job, now)}{task.job.workflow && <> · {phaseLabel(task.job)}</>}{task.job.status === "working" && !progressOf(task.job, now).routing ? ` ${Math.round(progressOf(task.job, now).ratio * 100)}%` : ""}</b></>}</small></div><span className="task-owner">{task.owner}</span><span className={`due ${task.priority && !(task.status === "completed") ? "urgent" : ""}`}>{(task.status === "completed") ? "完了" : task.due}</span></div>)}</div><div className="task-footer">小さな一歩が、大きな仕事になる。<span>KEEP IT GOING ↗</span></div></section>
        </div><div className="right-column">
          <section className="panel secretary-panel"><div className="panel-heading"><h2><span>03 /</span> 秘書のデスク</h2><span>✳</span></div><div className="secretary-profile"><div className="avatar"><Cat orange/></div><div><h3>ぽんず<small>秘書 / ASSISTANT</small></h3><span><i/> お手伝いできます</span></div></div><div className="message" aria-live="polite"><span>PONZU SAYS</span><p>{lastMessage.text}</p>{(lastMessage.request || lastMessage.department) && <div className={rq.messageLinks}>{lastMessage.request && <a href="#requests" onClick={() => setSelectedRequest(lastMessage.request ?? null)}>依頼の状況を見る ↓</a>}{lastMessage.department && <button type="button" onClick={() => showDepartment(lastMessage.department as Department)}>{lastMessage.department}を表示</button>}</div>}</div><RequestIntake department={department} ready={storageReady} input={intake.inputs[department]} draft={intake.drafts[department]} onInput={text => setIntake(previous => ({ ...previous, inputs: { ...previous.inputs, [department]: text } }))} onDraft={draft => setIntake(previous => ({ ...previous, drafts: { ...previous.drafts, [department]: draft } }))} onConfirm={registerRequest}/></section>
          <section className="panel notifications-panel" id="notifications"><div className="panel-heading"><h2><span>04 /</span> お知らせ</h2><button onClick={() => setRead(true)} disabled={read}>{read ? "既読" : "すべて既読"}</button></div>{notices.filter(notice => notice.department === department).map(notice => <div className={`notice ${read ? "read" : ""}`} key={notice.id}><span className="notice-symbol orange">✎</span><div><strong>{notice.title}</strong><p>{notice.body}</p><small>{notice.time} · <a className={rq.taskLink} href="#requests">確認する</a></small></div></div>)}<div className={`notice ${read ? "read" : ""}`}><span className="notice-symbol">✓</span><div><strong>{department === "広告事業部" ? "リサーチが完了しました" : "売上レポートができました"}</strong><p>ぽんずがタスクを完了しました。</p><small>10分前 · サンプル</small></div></div><div className={`notice ${read ? "read" : ""}`}><span className="notice-symbol orange">☀</span><div><strong>本日も全員、出勤しました</strong><p>猫脳社の一日がはじまります。</p><small>1時間前 · サンプル</small></div></div></section>
          <div className="team-note" id="team"><div><Cat small/><Cat small orange/></div><p>いい仕事には、<br/>いい昼寝が必要だ。</p><span>THE NEKONOSHA WAY.</span></div>
        </div></div>
        <div className={rq.deskWrap}><RequestDesk requests={requests.filter(r => r.department === department)} now={now} department={department} selected={selectedRequest} onSelect={setSelectedRequest} onStart={beginRequest} onApprove={approveRequest} onRevise={reviseRequest} onHurry={hurryRequest} onShowDepartment={showDepartment}/></div>
        <footer className="page-footer"><span>© 2026 NEKONOSHA</span><span>MADE WITH PAWS & POSSIBILITIES.</span><span>v0.1.0 / サンプルデータ</span></footer>
      </div>
    </main>
  </div>;
}
