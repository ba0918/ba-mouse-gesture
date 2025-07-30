/**
 * MessagingService Interface
 * Application層のメッセージング抽象化
 */

export interface ActionMessage {
  type: 'executeAction'
  action: string
}

export interface ActionResult {
  success: boolean
  action?: string
  error?: string
}

/**
 * メッセージングサービスのインターフェース
 */
export interface MessagingService {
  /**
   * アクションメッセージを送信
   */
  sendMessage(message: ActionMessage): Promise<ActionResult>

  /**
   * メッセージリスナーを設定
   */
  addMessageListener(callback: (message: unknown) => void): void

  /**
   * メッセージリスナーを削除
   */
  removeMessageListener(): void
}