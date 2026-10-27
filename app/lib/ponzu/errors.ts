// Only these fixed messages may cross the server/client boundary. Never render raw exceptions.
export const ERROR_MESSAGES = {
  invalid_request: "依頼を解析できません。入力内容を確認してください。",
  configuration: "AIの接続設定を確認してください。APIキーまたはモデルの設定に問題があります。",
  rate_limited: "AIへの依頼が続いています。少し時間を置いてから再試行してください。",
  timeout: "AIの応答に時間がかかっています。少し時間を置いて再試行するか、デモ解析を使ってください。",
  refused: "この依頼のAI解析はできませんでした。内容を見直すか、デモ解析を使ってください。",
  invalid_response: "AIの回答を安全に読み取れませんでした。再試行するか、デモ解析を使ってください。",
  unavailable: "AIに接続できませんでした。接続状況を確認して再試行するか、デモ解析を使ってください。",
} as const;
export type ErrorCode = keyof typeof ERROR_MESSAGES;
export class PonzuError extends Error {
  constructor(public readonly code: ErrorCode, public readonly retryAfter?: number) { super(ERROR_MESSAGES[code]); }
}
