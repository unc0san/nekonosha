import type { WorkRequest } from "./requests";

// Sample deliverables, filled in from fixed templates on this page (no AI). Every version is a draft for the president
// to read: nothing is ever sent or posted from here.

export type Section = { heading: string; lines: string[] };
export type Deliverable = { version: number; title: string; lead: string; sections: Section[]; caution?: string };

const BRAND = { 広告事業部: "ねこ日和", EC事業部: "ねこ商店" } as const;
const CAUTION_SEND = "これは下書きです。猫脳社から自動で送信・投稿・公開することはありません。内容を確認のうえ、社長ご自身の操作でお使いください。";

// How a change request reads: shorter, warmer or more formal, with numbers, with more options, for a different audience.
type Ask = { short: boolean; casual: boolean; polite: boolean; numbers: boolean; more: boolean; audience?: string };
function readNote(note = ""): Ask {
  return {
    short: /短く|簡潔|コンパクト|減らして|シンプル/.test(note),
    casual: /カジュアル|親しみ|やわらか|柔らか|くだけ|ポップ|かわいく|可愛く/.test(note),
    polite: /丁寧|フォーマル|かたく|硬く|ビジネス/.test(note),
    numbers: /数字|数値|データ|根拠|KPI/i.test(note),
    more: /別案|他の案|ほかの案|案を追加|追加して|増やして|もう一案|もっと案/.test(note),
    audience: note.match(/(若い人|若者|10代|20代|30代|40代|50代|ファミリー|子育て|シニア|女性|男性|学生|社会人|初めての方|リピーター)/)?.[1],
  };
}

// The same sentence, a little friendlier.
const warm = (line: string) => line.replace(/ご覧ください。/g, "見てみてね。").replace(/なじみます。/g, "なじむよ。").replace(/します。/g, "するよ。").replace(/です。/g, "だよ。").replace(/ください。/g, "してね。");
// What the work is about, without the kind of work: "新作ねこグッズの商品ページの文章" → "新作ねこグッズ".
const topicOf = (subject: string) => subject.replace(/(への|の|を)?(商品ページ|商品説明|商品紹介|キャッチコピー|コピー|文章|文案|投稿文|投稿|SNS|インスタ|お礼メール|メール|下書き|レポート|企画|記事|ブログ|告知文|説明文|紹介文).*$/, "").replace(/[のをへ]+$/, "") || subject;
const pick = <T,>(list: T[], seed: number, count: number) => Array.from({ length: Math.min(count, list.length) }, (_, i) => list[(seed + i) % list.length]);

function body(r: WorkRequest, v: number, ask: Ask): { lead: string; sections: Section[]; caution?: string } {
  const brand = BRAND[r.department], subject = r.subject, topic = topicOf(subject), seed = r.id % 7 + v * 2;
  const audience = ask.audience ?? (r.department === "広告事業部" ? "20〜30代の猫好きの社会人" : "猫と暮らす30〜40代の方");
  switch (r.kind) {
    case "plan": return {
      lead: `「${subject}」の企画案です。${brand}らしい、やさしくて少し遊び心のある方向でまとめました。`,
      sections: [
        { heading: "目的", lines: [`${brand}の名前を、季節の話題といっしょに思い出してもらう。`, "SNSでの「保存」と「シェア」を増やし、次の購入・相談につなげる。"] },
        { heading: "ターゲット", lines: [`${audience}。`, "忙しい毎日でも、猫との小さな時間を大切にしている人。"] },
        { heading: "コンセプト案", lines: pick(["「ねこの手、かします。」― 毎日のちょっとした困りごとを猫が解決", "「ひなたぼっこ週間」― 1週間だけの、のんびり特集", "「うちの子自慢フォトコンテスト」― 参加型で盛り上げる", "「ねこ時間カレンダー」― 季節のおすすめを毎日ひとつ", "「おかえり、の一杯」― 帰り道に寄りたくなる小さなごほうび"], seed, ask.more ? 4 : 2) },
        { heading: "施策アイデア", lines: ["SNS：毎日1枚、猫社員の「今日のひとこと」画像を投稿（投稿は担当者が確認後に手動で）", "特設ページ：コンセプトに合わせたミニ特集とクーポン案内", ...(ask.short ? [] : ["店頭・オフライン：ポスターとショップカードで同じビジュアルを展開"]), ...(ask.more ? ["コラボ：近所のカフェと期間限定メニュー"] : [])] },
        ...(ask.short ? [] : [{ heading: "スケジュール案", lines: [`準備：今日〜${r.due.label}まで（企画確定・素材づくり）`, "実施：確定から2週間", "振り返り：終了の翌週にレポート"] }]),
        ...(ask.numbers ? [{ heading: "数字で見る目安（サンプル値）", lines: ["SNS保存数：前回比 +30%（目標・仮）", "特設ページ訪問：5,000回（目標・仮）", "クーポン利用：300件（目標・仮）"] }] : []),
        { heading: "社長に確認したいこと", lines: ["予算の上限", "コンセプト案のどれで進めるか", "外部（クライアント・取引先）への共有タイミング"] },
      ],
    };
    case "copy": {
      const lines = pick([`${brand}で、ちょっといい一日を。`, "その「ちょうどいい」、猫が見つけておきました。", "ひなたみたいに、あたたかい毎日へ。", "がんばる日も、ゆるむ日も、となりに。", "ふわっと軽く、ちゃんと届く。", "今日の小さな「うれしい」を、あなたに。"], seed, ask.more ? 5 : 3);
      const text = [`${brand}から、${topic}のお知らせです。`, "猫社員たちが、毎日の暮らしがすこし楽しくなる工夫を考えました。", "くわしくはページでご覧ください。"];
      return {
        lead: `「${subject}」の文章案です。キャッチコピー${lines.length}案と本文案をご用意しました。`,
        sections: [
          { heading: "キャッチコピー案", lines: lines.map((l, i) => `案${i + 1}：${l}`) },
          { heading: "本文案", lines: (ask.short ? text.slice(0, 2) : text).map(l => (ask.casual ? warm(l) : l)) },
          { heading: "使い方メモ", lines: ["案1は落ち着いた印象、案2以降は親しみやすい印象です。", "表記ゆれ（ねこ／猫）は最終版でそろえます。"] },
        ],
      };
    }
    case "sns": {
      const posts = pick([
        `【お知らせ】${topic}🐾 猫社員たちが準備しました。くわしくはプロフィールのリンクから。`,
        `今日の猫脳社：${topic}の準備中。こはくは企画、むぎは写真、おもちはお昼寝担当です。`,
        `${brand}から、ちょっといいお知らせ。${topic}、はじまります。保存しておくと見返せます✨`,
        `みなさんの「うちの子」のお気に入りも教えてください。${topic}の参考にします🐈`,
      ], seed, ask.more ? 4 : ask.short ? 2 : 3);
      return {
        lead: `「${subject}」のSNS投稿案です。投稿はされていません。下書きとしてご確認ください。`,
        sections: [
          ...posts.map((p, i) => ({ heading: `投稿案${String.fromCharCode(65 + i)}`, lines: [ask.casual ? warm(p) : p, `#${brand} #猫のいる暮らし #ねこ部`] })),
          { heading: "おすすめの投稿時間", lines: ["平日 12:00〜13:00（お昼休み）", "平日 20:00〜22:00（くつろぎ時間）"] },
        ],
        caution: CAUTION_SEND,
      };
    }
    case "email": {
      const politeLine = ask.casual ? "いつもありがとうございます！" : "いつも大変お世話になっております。";
      const purpose = /お礼/.test(subject) ? ["先日は〇〇いただき、誠にありがとうございました。", "猫社員一同、とてもうれしく拝見しました。"] : /お詫び/.test(subject) ? ["このたびは〇〇の件で、ご迷惑をおかけし申し訳ございません。", "現在、〇〇の対応を進めております。"] : ["このたびは〇〇の件でご連絡いたしました。"];
      const subjects = /お礼/.test(subject) ? [`【${brand}】〇〇のお礼`, "ありがとうございました（猫脳社）"] : /お詫び/.test(subject) ? [`【${brand}】〇〇についてのお詫び`, "〇〇の件につきまして（猫脳社）"] : [`【${brand}】〇〇のご案内`, "〇〇について（猫脳社）", "【ご確認のお願い】〇〇"];
      return {
        lead: `「${subject}」のメール文案です。宛名・日付など〇〇の部分を書きかえてお使いください。`,
        sections: [
          { heading: "件名案", lines: pick(subjects, seed, 2) },
          { heading: "本文", lines: ["〇〇様", "", politeLine, "猫脳社の〇〇でございます。", "", ...purpose, "", ...(ask.short || purpose.length > 1 ? [] : ["詳細は下記のとおりです。", "", "・日時：〇月〇日（〇）", "・内容：〇〇〇〇", ""]), "ご不明な点がございましたら、お気軽にお知らせください。", "今後ともどうぞよろしくお願いいたします。", "", "猫脳社　〇〇"] },
        ],
        caution: CAUTION_SEND,
      };
    }
    case "report": return {
      lead: `「${subject}」のレポートです。数値はすべてデモ用のサンプルで、実データは使っていません。`,
      sections: [
        { heading: "サマリー", lines: ["全体として前回より好調。とくに週末の反応が伸びました。", "一方で、平日夜の反応はやや落ちています。"] },
        { heading: "主な数字（サンプル）", lines: r.department === "広告事業部"
          ? ["表示回数：128,400回（前回比 +12%）", "クリック数：3,210回（クリック率 2.5%）", "保存数：860件（前回比 +31%）"]
          : ["売上：1,284,000円（前週比 +8%）", "注文数：412件（客単価 3,116円）", "在庫切れ：2商品（ねこじゃらしセット・肉球マグ）"] },
        ...(ask.short ? [] : [{ heading: "よかった点", lines: ["猫社員の写真を使った投稿・ページの反応が高い", "週末にまとめて見られている"] }, { heading: "課題", lines: ["平日夜の反応が弱い", "詳細ページからの離脱がやや多い"] }]),
        ...(ask.numbers ? [{ heading: "補足データ（サンプル）", lines: ["曜日別：土 24% / 日 21% / 平日平均 11%", "時間帯別：20〜22時 32% / 12〜13時 18%"] }] : []),
        { heading: "次のアクション案", lines: ["平日夜向けの短い投稿をテスト", "詳細ページの最初の画面に要点をまとめる"] },
      ],
    };
    case "product": return {
      lead: `「${subject}」の商品ページ案です。価格・サイズなど〇〇の部分は確認してから埋めてください。`,
      sections: [
        { heading: "商品名案", lines: pick(["ひなたねこ ブランケット", "肉球ふわふわ マグ", "ねこの手 ペンスタンド", "おひるね クッション", "しっぽゆらゆら キーホルダー"], seed, ask.more ? 4 : 2) },
        { heading: "キャッチ", lines: [ask.casual ? "猫も人も、思わずごろん。" : "暮らしに、猫のいるぬくもりを。"] },
        { heading: "商品説明", lines: [`${topic}として登場する、${brand}オリジナルのアイテムです。`, "猫社員たちが毎日使って、使い心地を確かめました。", ...(ask.short ? [] : ["やわらかな色合いで、どんなお部屋にもなじみます。"])].map(l => (ask.casual ? warm(l) : l)) },
        { heading: "おすすめポイント", lines: ["毎日使いやすいサイズ", "ギフトにも選びやすい、やさしいデザイン", "猫モチーフが小さく入った、さりげない遊び心"] },
        { heading: "仕様（要確認）", lines: ["価格：〇〇円（税込）", "サイズ：〇〇 × 〇〇 cm", "素材：〇〇"] },
      ],
    };
    default: return {
      lead: `「${subject}」の作業メモです。進め方の案と、確認したいことをまとめました。`,
      sections: [
        { heading: "進め方の案", lines: ["1. 必要な情報を集める（社内資料・過去の事例）", "2. たたき台をつくる", "3. 社長に確認していただき、仕上げる"] },
        ...(ask.short ? [] : [{ heading: "確認したいこと", lines: ["ゴール（何ができたら完了か）", "関わる人・共有先", "使ってよい予算・時間"] }]),
        { heading: "次の一歩", lines: [`${r.due.label}までに、たたき台をお見せします。`] },
      ],
    };
  }
}

// Which kinds each change request actually changes, so the notes on a new version only claim what was done.
const CAN: Record<"casual" | "numbers" | "more", WorkRequest["kind"][]> = {
  casual: ["copy", "sns", "email", "product"],
  numbers: ["plan", "report"],
  more: ["plan", "copy", "sns", "product"],
};

export function makeDeliverable(r: WorkRequest, version: number, note?: string): Deliverable {
  const ask = readNote(note), made = body(r, version, ask), sections = [...made.sections];
  const done: string[] = [], skipped: string[] = [];
  if (ask.short) done.push("全体を短くまとめました。");
  if (ask.polite) done.push("ていねいな言い回しでそろえています。");
  for (const [asked, kind, line, what] of [[ask.casual, "casual", "語り口をやわらかくしました。", "語り口の変更"], [ask.numbers, "numbers", "数字の目安を追加しました（サンプル値）。", "数字の追加"], [ask.more, "more", "案を増やしました。", "案の追加"]] as const) {
    if (asked) (CAN[kind].includes(r.kind) ? done : skipped).push(CAN[kind].includes(r.kind) ? line : what);
  }
  if (ask.audience && r.kind === "plan") done.push(`ターゲットを「${ask.audience}」に合わせました。`);
  else if (ask.audience) { done.push(`想定する読み手「${ask.audience}」を明記しました。`); sections.push({ heading: "想定する読み手", lines: [ask.audience] }); }
  if (note && !done.length && !skipped.length) done.push("ご指示をふまえて表現を見直しました（デモのため定型の調整です）。");
  if (skipped.length) done.push(`※ ${skipped.join("・")}は、この種類の下書きではまだ反映できません（デモの定型処理のため）。`);
  return { version, title: `${r.subject}｜${version > 1 ? `修正版 v${version}` : "初版"}`, lead: made.lead, sections: note ? [{ heading: "修正メモへの対応", lines: [`ご指示：「${note}」`, ...done] }, ...sections] : sections, caution: made.caution };
}

export const plainText = (d: Deliverable) => [d.title, "", d.lead, ...d.sections.flatMap(s => ["", `■ ${s.heading}`, ...s.lines]), ...(d.caution ? ["", `※ ${d.caution}`] : [])].join("\n");
