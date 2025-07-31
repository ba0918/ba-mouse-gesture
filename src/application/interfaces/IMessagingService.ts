/**
 * IMessagingService - Messaging Service Interface
 * Clean Architecture - Application層のインターフェース定義
 * Chrome Runtime Messagingの抽象化
 */

export interface IMessagingService {
  /**
   * メッセージリスナーを設定
   * @param handler メッセージハンドラー
   */
  addMessageListener(
    handler: (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => boolean | void
  ): void;

  /**
   * メッセージを送信
   * @param message 送信するメッセージ
   * @returns Promise<unknown>
   */
  sendMessage(message: unknown): Promise<unknown>;
}