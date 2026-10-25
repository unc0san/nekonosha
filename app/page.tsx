"use client";

import { useState } from "react";
import OfficeMap from "./components/office/office-map";
import { OFFICE_AREAS } from "./components/office/office-areas";

type Department = "広告事業部" | "EC事業部";
type Task = { id: number; title: string; project: string; owner: string; due: string; done: boolean; priority: boolean };
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
  const [messages, setMessages] = useState(["おはようございます、社長！ 今日もいっしょに、いい仕事をしましょう。何かあれば、ぽんずにおまかせください。"]);
  const [read, setRead] = useState(false);
  const [officeView, setOfficeView] = useState("suite");
  const current = tasks[department];
  const OfficeView = OFFICE_AREAS.find(area => area.id === officeView)?.Component;
  const completed = current.filter(task => task.done).length;
  function submitInstruction(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!instruction.trim()) return;
    setMessages(previous => [...previous, `「${instruction.trim()}」を受け付けました、にゃ！ デモ用のタスク一覧に追加しました。`]);
    setTasks(previous => ({ ...previous, [department]: [...previous[department], { id: Date.now(), title: instruction.trim(), project: "社長からの指示 / サンプル", owner: "ぽんず", due: "今日", done: false, priority: false }] }));
    setInstruction("");
  }
  return <div className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#"><span className="brand-cat"><Cat small/></span><span>猫脳社<small>NEKONOSHA</small></span></a>
      <div className="workspace-label">YOUR WORKSPACE <span>01</span></div>
      <nav aria-label="メインナビゲーション"><a className="nav-item active" href="#dashboard"><span>▦</span> ダッシュボード <b>↗</b></a><a className="nav-item" href="#office"><span>▤</span> オフィス</a><a className="nav-item" href="#tasks"><span>☑</span> タスク一覧 <em>{current.filter(task => !task.done).length}</em></a><a className="nav-item" href="#team"><span>♧</span> 社員紹介</a><a className="nav-item" href="#notifications"><span>♧</span> 通知 <i className={read ? "" : "notification-dot"}/></a></nav>
      <div className="sidebar-bottom"><div className="demo-note"><span>✦ SMALL TEAM, BIG IDEAS.</span><p>猫の手も、AIの力も。</p><small>今日も、ちょっといい仕事を。</small></div><div className="user"><Cat small/><div>しらす社長<small>代表取締役 / CEO</small></div><span>⌘</span></div></div>
    </aside>
    <main id="dashboard">
      <header className="topbar"><div>WORKSPACE <span>/</span> ダッシュボード</div><span className="demo-badge">● DEMO MODE</span></header>
      <div className="main-content">
        <section className="page-heading"><div className="eyebrow">LET’S MAKE SOMETHING GOOD.</div><div className="heading-row"><div><h1>おはようございます、社長<span>✳</span></h1><p>猫たちは今日も、いいアイデアをあたためています。</p></div><div className="date-label">2026.10.25 <span>SUN</span><small><i/> オフィスは営業中</small></div></div></section>
        <div className="department-bar"><div role="tablist" aria-label="事業部切り替え">{(["広告事業部", "EC事業部"] as Department[]).map((name, index) => <button key={name} role="tab" aria-selected={department === name} onClick={() => setDepartment(name)} className={department === name ? "selected" : ""}><span>0{index + 1}</span>{name}</button>)}</div><span className="sample-label">サンプルワークスペース</span></div>
        <section className="stats" aria-label="進捗状況"><article><span>進行中のタスク <i>↗</i></span><strong>{current.length - completed}<small>件</small></strong><p>ひとつずつ、着実に。</p></article><article><span>タスク完了率 <i>◴</i></span><strong>{Math.round(completed / current.length * 100)}<small>%</small></strong><div className="progress-track"><div style={{ width: `${completed / current.length * 100}%` }}/></div></article><article><span>出勤中の猫社員 <i>♧</i></span><strong>07<small>匹</small></strong><p><b className="green-dot"/> 全員、元気にはたらいています</p></article></section>
        <div className="dashboard-grid"><div className="left-column">
          <section className="panel office-panel" id="office"><div className="panel-heading"><h2><span>01 /</span> 猫脳社オフィス</h2><span className="live-label"><i/> LIVE <small>サンプル</small></span></div><div className="office-view-switch" role="group" aria-label="オフィスの表示切り替え">{OFFICE_AREAS.map(area => <button key={area.id} aria-pressed={officeView === area.id} onClick={() => setOfficeView(area.id)}>{area.label}（新デザイン試作）</button>)}<button aria-pressed={officeView === "map"} onClick={() => setOfficeView("map")}>全体マップ</button></div>{OfficeView ? <OfficeView department={department} tasks={current}/> : <OfficeMap department={department} tasks={current} onOpenRoom={setOfficeView}/>}<div className="office-footer"><span><i/> {department}のようす</span><span>ときどき休憩。それも仕事。</span></div></section>
          <section className="panel tasks-panel" id="tasks"><div className="panel-heading"><h2><span>02 /</span> 今日のタスク</h2><span className="count-label">{completed} / {current.length} 完了</span></div><div className="task-list">{current.map(task => <div className={`task-row ${task.done ? "done" : ""}`} key={task.id}><button className="checkbox" aria-label={`${task.title}を${task.done ? "未完了" : "完了"}にする`} aria-pressed={task.done} onClick={() => setTasks(previous => ({ ...previous, [department]: previous[department].map(item => item.id === task.id ? { ...item, done: !item.done } : item) }))}>{task.done ? "✓" : ""}</button><div className="task-copy"><strong>{task.title}</strong><small>{task.project}</small></div><span className="task-owner">{task.owner}</span><span className={`due ${task.priority && !task.done ? "urgent" : ""}`}>{task.done ? "完了" : task.due}</span></div>)}</div><div className="task-footer">小さな一歩が、大きな仕事になる。<span>KEEP IT GOING ↗</span></div></section>
        </div><div className="right-column">
          <section className="panel secretary-panel"><div className="panel-heading"><h2><span>03 /</span> 秘書のデスク</h2><span>✳</span></div><div className="secretary-profile"><div className="avatar"><Cat orange/></div><div><h3>ぽんず<small>秘書 / ASSISTANT</small></h3><span><i/> お手伝いできます</span></div></div><div className="message" aria-live="polite"><span>PONZU SAYS</span><p>{messages[messages.length - 1]}</p></div><form onSubmit={submitInstruction}><label htmlFor="instruction">ぽんずへの指示</label><textarea id="instruction" placeholder="例：明日の会議の準備をお願い" value={instruction} onChange={e => setInstruction(e.target.value)} maxLength={200}/><button type="submit" disabled={!instruction.trim()}>ぽんずにお願いする <span>↗</span></button><small>デモ機能：指示はサンプルタスクに追加されます</small></form></section>
          <section className="panel notifications-panel" id="notifications"><div className="panel-heading"><h2><span>04 /</span> お知らせ</h2><button onClick={() => setRead(true)} disabled={read}>{read ? "既読" : "すべて既読"}</button></div><div className={`notice ${read ? "read" : ""}`}><span className="notice-symbol">✓</span><div><strong>{department === "広告事業部" ? "リサーチが完了しました" : "売上レポートができました"}</strong><p>ぽんずがタスクを完了しました。</p><small>10分前 · サンプル</small></div></div><div className={`notice ${read ? "read" : ""}`}><span className="notice-symbol orange">☀</span><div><strong>本日も全員、出勤しました</strong><p>猫脳社の一日がはじまります。</p><small>1時間前 · サンプル</small></div></div></section>
          <div className="team-note" id="team"><div><Cat small/><Cat small orange/></div><p>いい仕事には、<br/>いい昼寝が必要だ。</p><span>THE NEKONOSHA WAY.</span></div>
        </div></div>
        <footer className="page-footer"><span>© 2026 NEKONOSHA</span><span>MADE WITH PAWS & POSSIBILITIES.</span><span>v0.1.0 / サンプルデータ</span></footer>
      </div>
    </main>
  </div>;
}
