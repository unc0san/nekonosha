# 猫脳社（NEKONOSHA）

猫たちが AI 社員として働く、レトロなピクセルアートのオフィス管理アプリです。

## はじめ方

Node.js 20.9 以上（推奨：Node.js 24 LTS）を用意し、ターミナルでこのフォルダを開いて実行します。

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開きます。停止するときはターミナルで `Control + C` を押します。

iPhone で見る場合は Mac と同じ Wi-Fi に接続し、起動ログの `Network` に表示される URL を Safari で開いてください。必要に応じて Mac のファイアウォールでローカル接続を許可します。

## できること

- 広告事業部・EC 事業部の切り替え
- 社長猫「しらす」と秘書猫「ぽんず」がいるドット絵オフィス
- タスクの完了・未完了切り替えと進捗表示
- ぽんずへの指示を、選択中の事業部のサンプルタスクに追加
- サンプル通知の既読操作
- Mac・iPhone 向けのレスポンシブ表示

すべてサンプルデータです。外部 AI API、データベース、メール送信、課金サービスは接続していません。指示への返信は定型文で、実際の AI 処理は行いません。変更内容は画面内のメモリにのみ保持され、再読み込みすると初期状態に戻ります。表示日付・通知時刻・出勤状況もデモ用です。

## 開発用コマンド

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

`npm start` はビルド後の本番用サーバーを起動します。通常の編集には `npm run dev` を使います。

## 構成

- `app/page.tsx`：画面、サンプルデータ、操作
- `app/globals.css`：Tailwind CSS の読み込みと画面・家具のスタイル
- `app/layout.tsx`：日本語設定とページ情報

Next.js App Router・TypeScript・Tailwind CSS v4 を使用しています。猫はインライン SVG、家具は CSS で描画しているため、画像配信サービスや外部フォントへの接続も必要ありません。
