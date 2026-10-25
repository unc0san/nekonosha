"use client";

import { useState } from "react";

type OfficeTask = { title: string; owner: string; done: boolean };
const crew = [
  { name: "しらす", role: "代表取締役 / 社長", coat: "白とグレー", colors: ["#f6f5ed", "#939a9d"], x: 115, y: 191 },
  { name: "ぽんず", role: "秘書 / 業務サポート", coat: "茶トラ", colors: ["#ffb366", "#bc5528"], x: 342, y: 226 },
  { name: "みつまめ", role: "デザイナー", coat: "三毛猫", colors: ["#fff4dd", "#ef7739"], x: 518, y: 226 },
  { name: "くろごま", role: "エンジニア", coat: "黒猫", colors: ["#34363d", "#1b1c22"], x: 342, y: 387 },
  { name: "むぎ", role: "マーケター", coat: "キジトラ", colors: ["#afa18b", "#5e554b"], x: 518, y: 387 },
  { name: "こはく", role: "プランナー", coat: "サビ猫", colors: ["#51413c", "#bf6a38"], x: 782, y: 194 },
  { name: "おもち", role: "品質管理", coat: "白猫", colors: ["#fffef5", "#e3e0d6"], x: 789, y: 422 },
];

function Sprite({ index }: { index: number }) {
  const cat = crew[index];
  return <svg viewBox="0 0 32 38" shapeRendering="crispEdges" aria-hidden="true">
    <path fill="#23252b" d="M4 1h7v4h10V1h7v7h3v14h-5v4h2v8h-3v4H7v-4H4v-8h3v-4H1V8h3z"/>
    <path fill={cat.colors[0]} d="M5 4h5v5h12V4h5v8h2v8h-5v5H9v-5H3v-8h2zM9 25h15v10H8v-7h1z"/>
    <path fill={cat.colors[1]} d={index === 6 ? "M6 5h3v4H6zm17 0h3v4h-3z" : "M5 4h5v5h6v7H4v-4h1zM22 5h5v7h2v6h-7zM9 26h5v6H9z"}/>
    {(index === 1 || index === 4) && <path fill={cat.colors[1]} d="M14 8h2v6h-2zm4 0h2v6h-2zM18 27h7v3h-7zm0 5h7v2h-7z"/>}
    {(index === 2 || index === 5) && <path fill="#28272b" d="M20 6h6v7h-6zM8 28h5v6H8z"/>}
    <path fill={index === 3 || index === 5 ? "#f5d881" : "#28292d"} d="M8 15h3v3H8zm13 0h3v3h-3z"/>
    <path fill="#e38889" d="M15 20h3v2h-3zM5 19h4v2H5zm19 0h3v2h-3z"/>
    <path className="sprite-paws" fill={cat.colors[1]} d="M6 27h5v4H6zm16 0h5v4h-5z"/>
    <path className="sprite-tail" fill={cat.colors[1]} d="M25 28h4v-5h3v9h-7z"/>
    <path fill="#28292d" d="M9 34h4v2H9zm12 0h4v2h-4z"/>
  </svg>;
}

function Workstation({ x, y, boss = false }: { x: number; y: number; boss?: boolean }) {
  return <g transform={`translate(${x} ${y})`}>
    <path fill="#9b9da1" d="M4 53h132v10H4zM9 62h8v42H9zm113 0h8v42h-8z"/>
    <path fill={boss ? "#ff732d" : "#fafaf3"} stroke="#30323a" strokeWidth="3" d="M0 20h140v38H0z"/>
    <path fill={boss ? "#c74c21" : "#c5c8c8"} d="M3 51h134v6H3z"/>
    <path fill="#242731" d="M43 0h58v37H43zM67 37h10v7H67z"/>
    <path fill="#d4dad7" d="M47 4h50v28H47z"/><path fill="#4a6064" d="M51 8h42v20H51z"/>
    <path fill="#cbf5da" d="M55 12h15v2H55zm0 5h29v2H55zm0 5h21v2H55z"/>
    <path fill="#777d82" d="M51 46h44v5H51z"/><path fill="#ff752d" stroke="#30323a" strokeWidth="2" d="M114 31h10v13h-10z"/>
    <path fill="#30323a" d="M48 91h48v10H48zM67 100h10v13H67z"/><path fill="#ff7835" stroke="#30323a" strokeWidth="3" d="M47 67h51v26H47z"/>
  </g>;
}

function Plant({ x, y }: { x: number; y: number }) {
  return <g transform={`translate(${x} ${y})`}><path fill="#656e68" d="M17 12h5v48h-5zM6 10h11v9H6zM0 0h12v12H0zm22 14h12v10H22zm8-9h12v13H30zM8 28h12v8H8z"/><path fill="#ff7933" stroke="#30323a" strokeWidth="3" d="M5 48h31v25H5z"/><path fill="#e4ddd2" d="M9 53h23v4H9z"/></g>;
}

export default function PixelOffice({ department, tasks }: { department: string; tasks: OfficeTask[] }) {
  const [selected, setSelected] = useState(0);
  const [paused, setPaused] = useState(false);
  const [overview, setOverview] = useState(false);
  const remaining = tasks.filter(task => !task.done);
  function activity(index: number) {
    const cat = crew[index];
    const owned = remaining.find(task => task.owner === cat.name);
    // Supporting cats collaborate on the same live task queue as the dashboard.
    const task = index < 2 ? owned : remaining[(index - 2) % Math.max(remaining.length, 1)];
    if (!task) return { mode: "rest", label: "休憩中", job: "担当タスクが完了。ラウンジでひと休みしています。" };
    const walking = index === 5 || (index === 1 && remaining.some(item => item.owner === "ぽんず" && item.title !== tasks[0]?.title));
    return { mode: walking ? "walk" : "type", label: walking ? "移動中" : "作業中", job: `${index > 1 ? "共同作業：" : ""}${task.title}` };
  }
  const active = activity(selected);
  return <section className="pixel-office" aria-label="インタラクティブな猫脳社オフィス">
    <div className="world-toolbar"><div><span className="world-status"/> {department} <b>7 CATS / 4 ROOMS</b></div><div><button aria-pressed={overview} onClick={() => setOverview(!overview)}>{overview ? "拡大表示" : "全体表示"}</button><button aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "▶ 再生" : "Ⅱ 一時停止"}</button></div></div>
    <p className="world-help">猫をタップしてお仕事をチェック。スマートフォンでは横にスワイプできます。</p>
    <div className={`world-scroll ${overview ? "overview" : ""}`} tabIndex={0} aria-label="オフィスマップ。左右にスクロールできます">
      <div className={`world-map ${paused ? "is-paused" : ""}`}>
        <svg className="world-background" viewBox="0 0 960 580" shapeRendering="crispEdges" role="img" aria-label="社長室、社員デスク、ガラス会議室、ラウンジを備えたスペースエイジのオフィス">
          <defs><pattern id="office-tiles" width="48" height="48" patternUnits="userSpaceOnUse"><path fill="#eeeFEB" d="M0 0h48v48H0z"/><path fill="#dedfdb" d="M0 0h24v24H0zm24 24h24v24H24z"/><path stroke="#d0d2ce" d="M0 48V0h48" fill="none"/></pattern><pattern id="office-rug" width="12" height="12" patternUnits="userSpaceOnUse"><path fill="#c5c7c6" d="M0 0h12v12H0z"/><path fill="#b9bcbb" d="M0 0h4v4H0z"/></pattern></defs>
          <path fill="#30323a" d="M0 0h960v580H0z"/><path fill="url(#office-tiles)" d="M14 72h932v494H14z"/>
          <path fill="#bfc3c5" d="M14 15h932v64H14z"/><path fill="#f6f6ef" d="M20 15h920v48H20z"/><path fill="#ff752e" d="M20 63h920v8H20z"/>
          {[60, 338, 615].map(x => <g key={x}><path fill="#3c424c" d={`M${x} 25h180v29H${x}z`}/><path fill="#cddfe2" d={`M${x + 5} 29h170v20H${x + 5}z`}/><path fill="#f8ffff" d={`M${x + 25} 29h6v20h-6zm70 0h6v20h-6z`}/></g>)}
          <text x="835" y="45" fill="#30323a" fontSize="15" fontFamily="monospace" fontWeight="bold">NEKO HQ</text>
          <path fill="#afb2b4" d="M22 91h228v226H22z"/><path fill="#e2e3df" d="M28 97h216v212H28z"/><path fill="#33363d" d="M247 78h7v172h-7zm0 212h7v35H20v-7h227z"/>
          <text className="room-title" x="40" y="118">01 / PRESIDENT</text>
          <path fill="#ff752e" d="M50 135h161v8H50z"/><Workstation x={64} y={155} boss/>
          <path fill="#35363e" d="M40 269h68v24H40z"/><path fill="#fafaf3" d="M45 273h58v5H45zm0 9h58v5H45z"/>
          <Plant x={199} y={236}/>
          <path fill="url(#office-rug)" d="M274 125h375v376H274z"/><text className="room-title" x="289" y="118">02 / TEAM STUDIO</text>
          <Workstation x={294} y={188}/><Workstation x={470} y={188}/><Workstation x={294} y={349}/><Workstation x={470} y={349}/>
          <path fill="#ff752e" d="M286 318h337v5H286z"/><path fill="#6f7478" d="M453 153h5v334h-5z"/>
          <path fill="#eef4f3" fillOpacity=".7" d="M683 89h244v208H683z"/><path fill="#555e66" d="M679 85h252v7H679zm0 0h7v133h-7zm0 183h7v34h-7zm0 211h252v7H679z"/>
          <path stroke="#9facb2" strokeWidth="4" d="M742 92v200m62-200v200m62-200v200"/><path fill="#fff" fillOpacity=".45" d="m697 108 25 0-25 110zm63 0h12l-12 72zm125 0h26l-26 126z"/>
          <text className="room-title" x="699" y="118">03 / MEETING</text>
          <path fill="#34363d" d="M730 158h157v83H730z"/><path fill="#f8f7ee" d="M720 153h176v64H720z"/><path fill="#ff752e" d="M716 163h7v43h-7zm180 0h7v43h-7zM745 135h31v16h-31zm65 0h31v16h-31zm-65 85h31v16h-31zm65 0h31v16h-31z"/>
          <path fill="#434a52" d="M779 159h43v26h-43z"/><path fill="#c2d4d4" d="M783 163h35v18h-35z"/><path fill="#ff752e" d="M849 168h15v15h-15z"/>
          <text className="room-title" x="699" y="342">04 / LOUNGE</text>
          <path fill="#b8bab9" d="M686 355h236v164H686z"/><path fill="#d0d1cc" d="M691 360h226v154H691z"/>
          {/* Stepped ball chairs, a tulip table, and a modular orange sofa. */}
          <g fill="#ff752e" stroke="#33363d" strokeWidth="3"><path d="M704 380h36v7h9v43h-9v7h-36v-7h-9v-43h9z"/><path d="M852 380h36v7h9v43h-9v7h-36v-7h-9v-43h9z"/></g>
          <path fill="#3c3d43" d="M705 390h29v29h-29zm149 0h29v29h-29z"/><path fill="#f9f9ef" d="M716 439h7v12h-7zm-9 12h26v4h-26zm158-12h7v12h-7zm-9 12h26v4h-26z"/>
          <path fill="#33363d" d="M769 405h60v20h-60zm26 20h7v28h-7zm-11 28h29v5h-29z"/><path fill="#fffef5" d="M764 397h70v19h-70z"/><path fill="#ff752e" d="M779 399h10v9h-10z"/>
          <path fill="#b94a21" d="M718 475h171v28H718z"/><path fill="#ff752e" d="M713 463h181v26H713z"/><path fill="#ff9a57" d="M722 467h49v15h-49zm56 0h49v15h-49zm56 0h49v15h-49z"/><path fill="#33363d" d="M726 503h7v9h-7zm148 0h7v9h-7z"/>
          <text className="room-title" x="40" y="358">COFFEE & IDEAS</text><path fill="#33363d" d="M40 378h176v77H40z"/><path fill="#f7f7ef" d="M36 376h184v10H36zM46 392h72v57H46zm80 0h84v57h-84z"/><path fill="#8c9297" d="M107 411h4v10h-4zm28 0h4v10h-4z"/>
          <path fill="#ff752e" d="M52 344h39v31H52z"/><path fill="#353841" d="M58 349h27v13H58z"/><path fill="#f9f7ef" d="M64 363h12v10H64z"/>
          <Plant x={31} y={475}/><Plant x={895} y={481}/><Plant x={593} y={82}/>
          <path fill="#ff752e" d="M100 509h116v31H100z"/><text x="112" y="530" fill="#fffaf2" fontSize="12" fontFamily="monospace">GOOD NAPS.</text>
          <path fill="#737980" d="M274 538h375v2H274z"/><text x="298" y="556" fill="#747a80" fontSize="9" fontFamily="monospace" letterSpacing="3">SMALL PAWS. BIG POSSIBILITIES.</text>
        </svg>
        {crew.map((cat, index) => {
          const state = activity(index);
          const resting = state.mode === "rest";
          const x = resting ? 706 + (index % 4) * 53 : cat.x;
          const y = resting ? 446 + Math.floor(index / 4) * 48 : cat.y;
          return <button key={cat.name} className={`world-cat ${state.mode} ${selected === index ? "is-selected" : ""}`} style={{ left: `${x / 9.6}%`, top: `${y / 5.8}%`, animationDelay: `${-index * .7}s` }} onClick={() => setSelected(index)} aria-label={`${cat.name}、${cat.coat}、${state.label}`} aria-pressed={selected === index}>
            <span className="cat-action" aria-hidden="true">{resting ? "z Z" : state.mode === "walk" ? "♪" : "···"}</span><Sprite index={index}/><span className="world-cat-name">{cat.name}</span>
          </button>;
        })}
      </div>
    </div>
    <div className="cat-roster" aria-label="猫社員を選択">{crew.map((cat, index) => <button key={cat.name} aria-pressed={selected === index} onClick={() => setSelected(index)}><Sprite index={index}/><span>{cat.name}</span></button>)}</div>
    <div className="cat-inspector" aria-live="polite"><div className="inspector-avatar"><Sprite index={selected}/></div><div><span className="inspector-kicker">EMPLOYEE FILE / 0{selected + 1} · {crew[selected].coat}</span><h3>{crew[selected].name}<small>{crew[selected].role}</small></h3><p>{active.job}</p></div><span className={`activity-badge ${active.mode}`}>{active.label}</span></div>
    <div className="world-legend"><span>● 作業中：タイピング</span><span>↔ 移動中：オフィスを散歩</span><span>z 休憩中：担当タスク完了</span><small>タスクの完了・指示追加に連動 / サンプル</small></div>
  </section>;
}
