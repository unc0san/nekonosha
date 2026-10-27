"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import OfficeMap from "./components/office/office-map";
import { OFFICE_AREAS } from "./components/office/office-areas";
import { deskLabel } from "./components/office/staff";
import RequestDesk from "./components/requests/request-desk";
import { KIND_LABEL, approve, createRequest, dueShort, handIn, hurry, isFinished, progressOf, revise, staffOf, statusLabel, type Department, type WorkRequest } from "./components/requests/requests";
import rq from "./components/requests/requests.module.css";

type Task = { id: number; title: string; project: string; owner: string; due: string; done: boolean; priority: boolean; job?: WorkRequest };
// A line from ぽんず; `request` links it to that request, `department` offers to switch to where the work went.
type Message = { text: string; request?: number; department?: Department };
type Notice = { id: number; title: string; body: string; time: string };
const initialTasks: Record<Department, Task[]> = {
  広告事業部: [
    { id: 1, title: "秋のキャンペーン企画をまとめる", project: "ねこ日和 / SNS広告", owner: "ぽんず", due: "今日", done: false, priority: true },
    { id: 2, title: "バナーのデザイン案を確認", project: "ねこ日和 / クリエイティブ", owner: "しらす", due: "今日", done: false, priority: false },
    { id: 3, title: "先週の広告レポートを作成", project: "社内 / レポーティング", owner: "ぽんず", due: "10/26", done: false, priority: false },
    { id: 4, title: "競合アカウントのリサーチ", project: "社内 / マーケティング", owner: "ぽんず", due: "完了", done: true, priority: false },
  ],
  EC事業部: [
    { id: 5, title: "新作ねこグッズの商品ページを準備", project: "ねこ商店 / 商品登録", owner: "ぽんず", due: "今日", done: false, priority: true },
    { id: 6, title: "秋のギフトセットを確認", project: "ねこ商店 / 商品企画", owner: "しらす", due: "10/26", done: false, priority: false },
    { id: 7, title: "今週の在庫リストを整理", project: "ねこ商店 / 在庫管理", owner: "ぽんず", due: "10/27", done: false, priority: false },
    { id: 8, title: "ストアの売上レポートを作成", project: "社内 / レポーティング", owner: "ぽんず", due: "完了", done: true, priority: false },
  ],
};

const EXAMPLES = ["ねこ日和の秋キャンペーンの企画を明後日までにお願い", "新作ねこグッズの商品ページの文章を作って", "先週の広告の結果をレポートにまとめて", "お客様へのお礼メールの下書きを今日中に", "週末セールのSNS投稿文を考えて"];
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
  const [instruction, setInstruction] = useState("");
  const [messages, setMessages] = useState<Message[]>([{ text: "おはようございます、社長！ 今日もいっしょに、いい仕事をしましょう。何かあれば、ぽんずにおまかせください。" }]);
  const [read, setRead] = useState(false);
  const [officeView, setOfficeView] = useState("suite");
  const [requests, setRequests] = useState<WorkRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<number | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [now, setNow] = useState(0);
  // Requests show up as tasks of their department; the office sees a requested task as open only while its cat works on it.
  const requestTasks: Task[] = requests.filter(r => r.department === department).map(r => ({ id: r.id, title: r.subject, project: `ぽんず経由の依頼 / ${KIND_LABEL[r.kind]}`, owner: staffOf(r.staff).name, due: dueShort(r.due), done: r.status === "approved", priority: r.urgent, job: r }));
  const current = [...tasks[department], ...requestTasks];
  const officeTasks = useMemo(() => [...tasks[department], ...requests.filter(r => r.department === department).map(r => ({ title: r.subject, owner: staffOf(r.staff).name, done: r.status !== "working", staff: r.staff, request: true }))], [tasks, requests, department]);
  const OfficeView = OFFICE_AREAS.find(area => area.id === officeView)?.Component;
  const completed = current.filter(task => task.done).length;
  const waiting = requests.filter(r => r.status === "review").length;
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
      const ids = finished.map(r => r.id);
      setRequests(previous => previous.map(r => (ids.includes(r.id) && r.status === "working" ? handIn(r) : r)));
      for (const r of finished) {
        const cat = staffOf(r.staff).name, kind = KIND_LABEL[r.kind], again = r.revisions.length > 0;
        say({ text: `${cat}が「${r.subject}」の${kind}${again ? "（修正版）" : ""}を提出しました。内容をご確認ください、にゃ！`, request: r.id });
        setNotices(previous => [{ id: t + r.id, title: `${cat}が${kind}${again ? "の修正版" : ""}を提出しました`, body: `「${r.subject}」${again ? "の修正版" : ""} · ${r.department}`, time: clock(t) }, ...previous]);
      }
      setRead(false);
    }, 500);
    return () => window.clearInterval(timer);
  }, [busy]);

  function submitInstruction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = instruction.trim();
    if (!text) return;
    const t = Date.now(), r = createRequest(text, department, t), cat = staffOf(r.staff);
    setRequests(previous => [...previous, r]);
    setSelectedRequest(r.id);
    setNow(t);
    say({ text: `「${r.subject}」、承りました、にゃ！ ${r.department}の${KIND_LABEL[r.kind]}として、${deskLabel(r.staff, r.department)}担当の${cat.name}にお願いしました。期限は${r.due.label}です。${r.external ? "送信や投稿は自動では行わず、下書きまでを用意しますね。" : ""}`, request: r.id, department: r.department === department ? undefined : r.department });
    setInstruction("");
  }
  const update = (id: number, change: (r: WorkRequest) => WorkRequest) => setRequests(previous => previous.map(r => (r.id === id ? change(r) : r)));
  function approveRequest(id: number) {
    const r = requests.find(item => item.id === id);
    if (!r) return;
    update(id, approve);
    say({ text: `承認ありがとうございます！ ${staffOf(r.staff).name}に伝えておきます。外部への送信や投稿はしていませんので、必要に応じて社長からお使いください。`, request: id });
  }
  function reviseRequest(id: number, note: string) {
    const r = requests.find(item => item.id === id), t = Date.now();
    if (!r) return;
    update(id, item => revise(item, note, t));
    setNow(t);
    say({ text: `修正メモを${staffOf(r.staff).name}に渡しました。v${r.versions.length + 1}ができるまで、少しお待ちください。`, request: id });
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
  const lastMessage = messages[messages.length - 1];
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-cat"><Cat small/></span><span>猫脳社<small>NEKONOSHA</small></span></a>
      <div className="workspace-label">YOUR WORKSPACE <span>01</span></div>
      <nav aria-label="メインナビゲーション"><a className="nav-item active" href="#dashboard"><span>▦</span> ダッシュボード <b>↗</b></a><a className="nav-item" href="#office"><span>▤</span> オフィス</a><a className="nav-item" href="#tasks"><span>☑</span> タスク一覧 <em>{current.filter(task => !task.done).length}</em></a><a className="nav-item" href="#team"><span>♧</span> 社員紹介</a><a className="nav-item" href="#requests"><span>✎</span> 依頼・成果物 {waiting > 0 && <em>{waiting}</em>}</a><a className="nav-item" href="#notifications"><span>♧</span> 通知 <i className={read ? "" : "notification-dot"}/></a></nav>
      <div className="sidebar-bottom"><div className="demo-note"><span>✦ SMALL TEAM, BIG IDEAS.</span><p>猫の手も、AIの力も。</p><small>今日も、ちょっといい仕事を。</small></div><div className="user"><Cat small/><div>しらす社長<small>代表取締役 / CEO</small></div><span>⌘</span></div></div>
    </aside>
    <main id="dashboard">
      <header className="topbar"><div>WORKSPACE <span>/</span> ダッシュボード</div><span className="demo-badge">● DEMO MODE</span></header>
      <div className="main-content">
        <section className="page-heading"><div className="eyebrow">LET’S MAKE SOMETHING GOOD.</div><div className="heading-row"><div><h1>おはようございます、社長<span>✳</span></h1><p>猫たちは今日も、いいアイデアをあたためています。</p></div><div className="date-label">2026.10.25 <span>SUN</span><small><i/> オフィスは営業中</small></div></div></section>
        <div className="department-bar"><div role="tablist" aria-label="事業部切り替え">{(["広告事業部", "EC事業部"] as Department[]).map((name, index) => <button key={name} role="tab" aria-selected={department === name} onClick={() => setDepartment(name)} className={department === name ? "selected" : ""}><span>0{index + 1}</span>{name}</button>)}</div><span className="sample-label">サンプルワークスペース</span></div>
        <section className="stats" aria-label="進捗状況"><article><span>進行中のタスク <i>↗</i></span><strong>{current.length - completed}<small>件</small></strong><p>ひとつずつ、着実に。</p></article><article><span>タスク完了率 <i>◴</i></span><strong>{Math.round(completed / current.length * 100)}<small>%</small></strong><div className="progress-track"><div style={{ width: `${completed / current.length * 100}%` }}/></div></article><article><span>出勤中の猫社員 <i>♧</i></span><strong>07<small>匹</small></strong><p><b className="green-dot"/> 全員、元気にはたらいています</p></article></section>
        <div className="dashboard-grid"><div className="left-column">
          <section className="panel office-panel" id="office"><div className="panel-heading"><h2><span>01 /</span> 猫脳社オフィス</h2><span className="live-label"><i/> LIVE <small>サンプル</small></span></div><div className="office-view-switch" role="group" aria-label="オフィスの表示切り替え">{OFFICE_AREAS.map(area => <button key={area.id} aria-pressed={officeView === area.id} onClick={() => setOfficeView(area.id)}>{area.label}（新デザイン試作）</button>)}<button aria-pressed={officeView === "map"} onClick={() => setOfficeView("map")}>全体マップ</button></div>{OfficeView ? <OfficeView department={department} tasks={officeTasks}/> : <OfficeMap department={department} tasks={officeTasks} onOpenRoom={setOfficeView}/>}<div className="office-footer"><span><i/> {department}のようす</span><span>ときどき休憩。それも仕事。</span></div></section>
          <section className="panel tasks-panel" id="tasks"><div className="panel-heading"><h2><span>02 /</span> 今日のタスク</h2><span className="count-label">{completed} / {current.length} 完了</span></div><div className="task-list">{current.map(task => <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}>{task.job ? <span className={`checkbox ${rq.taskMark}`} aria-hidden="true">{task.done ? "✓" : task.job.status === "review" ? "!" : "…"}</span> : <button className="checkbox" aria-label={`${task.title}を${task.done ? "未完了" : "完了"}にする`} aria-pressed={task.done} onClick={() => setTasks(previous => ({ ...previous, [department]: previous[department].map(item => item.id === task.id ? { ...item, done: !item.done } : item) }))}>{task.done ? "✓" : ""}</button>}<div className="task-copy">{task.job ? <a className={rq.taskLink} href="#requests" onClick={() => setSelectedRequest(task.id)}><strong>{task.title}</strong></a> : <strong>{task.title}</strong>}<small>{task.project}{task.job && <> · <b className={rq.taskStatus}>{statusLabel(task.job, now)}{task.job.status === "working" && !progressOf(task.job, now).routing ? ` ${Math.round(progressOf(task.job, now).ratio * 100)}%` : ""}</b></>}</small></div><span className="task-owner">{task.owner}</span><span className={`due ${task.priority && !task.done ? "urgent" : ""}`}>{task.done ? "完了" : task.due}</span></div>)}</div><div className="task-footer">小さな一歩が、大きな仕事になる。<span>KEEP IT GOING ↗</span></div></section>
        </div><div className="right-column">
          <section className="panel secretary-panel"><div className="panel-heading"><h2><span>03 /</span> 秘書のデスク</h2><span>✳</span></div><div className="secretary-profile"><div className="avatar"><Cat orange/></div><div><h3>ぽんず<small>秘書 / ASSISTANT</small></h3><span><i/> お手伝いできます</span></div></div><div className="message" aria-live="polite"><span>PONZU SAYS</span><p>{lastMessage.text}</p>{(lastMessage.request || lastMessage.department) && <div className={rq.messageLinks}>{lastMessage.request && <a href="#requests" onClick={() => setSelectedRequest(lastMessage.request ?? null)}>依頼の状況を見る ↓</a>}{lastMessage.department && <button type="button" onClick={() => showDepartment(lastMessage.department as Department)}>{lastMessage.department}を表示</button>}</div>}</div><form onSubmit={submitInstruction}><label htmlFor="instruction">ぽんずへの指示</label><textarea id="instruction" placeholder="例：新作グッズの商品ページの文章を明日までに作って" value={instruction} onChange={e => setInstruction(e.target.value)} maxLength={200}/><div className={rq.examples} aria-label="指示の例">{EXAMPLES.map(example => <button key={example} type="button" onClick={() => setInstruction(example)}>{example}</button>)}</div><button type="submit" disabled={!instruction.trim()}>ぽんずにお願いする <span>↗</span></button><small>デモ機能：内容から事業部と担当の猫社員を決めます。外部AIやメール送信・SNS投稿は使いません</small></form></section>
          <section className="panel notifications-panel" id="notifications"><div className="panel-heading"><h2><span>04 /</span> お知らせ</h2><button onClick={() => setRead(true)} disabled={read}>{read ? "既読" : "すべて既読"}</button></div>{notices.map(notice => <div className={`notice ${read ? "read" : ""}`} key={notice.id}><span className="notice-symbol orange">✎</span><div><strong>{notice.title}</strong><p>{notice.body}</p><small>{notice.time} · <a className={rq.taskLink} href="#requests">確認する</a></small></div></div>)}<div className={`notice ${read ? "read" : ""}`}><span className="notice-symbol">✓</span><div><strong>{department === "広告事業部" ? "リサーチが完了しました" : "売上レポートができました"}</strong><p>ぽんずがタスクを完了しました。</p><small>10分前 · サンプル</small></div></div><div className={`notice ${read ? "read" : ""}`}><span className="notice-symbol orange">☀</span><div><strong>本日も全員、出勤しました</strong><p>猫脳社の一日がはじまります。</p><small>1時間前 · サンプル</small></div></div></section>
          <div className="team-note" id="team"><div><Cat small/><Cat small orange/></div><p>いい仕事には、<br/>いい昼寝が必要だ。</p><span>THE NEKONOSHA WAY.</span></div>
        </div></div>
        <div className={rq.deskWrap}><RequestDesk requests={requests} now={now} department={department} selected={selectedRequest} onSelect={setSelectedRequest} onApprove={approveRequest} onRevise={reviseRequest} onHurry={hurryRequest} onShowDepartment={showDepartment}/></div>
        <footer className="page-footer"><span>© 2026 NEKONOSHA</span><span>MADE WITH PAWS & POSSIBILITIES.</span><span>v0.1.0 / サンプルデータ</span></footer>
      </div>
    </main>
  </div>;
}
