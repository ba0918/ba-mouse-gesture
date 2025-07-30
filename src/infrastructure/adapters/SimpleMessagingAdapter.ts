/**
 * SimpleMessagingAdapter
 * Chromeランタイムメッセージングのシンプルなラッパー
 */

// 型定義
interface MessageResponse {
  success: boolean;
  error?: string;
  [key: string]: any;
}

interface DebugInfo {
  isAvailable: boolean;
  hasTabsAPI: boolean;
  defaultTimeout: number;
  className: string;
}

export class SimpleMessagingAdapter {
  private defaultTimeout: number = 5000;

  constructor() { }

  /**
   * backgroundスクリプトにメッセージを送信
   * @param message - 送信メッセージ
   * @param timeout - タイムアウト（ms）
   * @returns レスポンス
   */
  sendMessage(message: any, timeout: number = this.defaultTimeout): Promise<MessageResponse> {
    return new Promise((resolve) => {
      if (!this.isAvailable()) {
        resolve({
          success: false,
          error: 'Chrome runtime not available'
        });
        return;
      }

      // タイムアウト設定
      const timer = setTimeout(() => {
        resolve({
          success: false,
          error: 'Message timeout'
        });
      }, timeout);

      chrome.runtime.sendMessage(message, (response: any) => {
        clearTimeout(timer);

        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response || {
            success: false,
            error: 'No response'
          });
        }
      });
    });
  }

  /**
   * content scriptsにメッセージを送信
   * @param tabId - タブID
   * @param message - 送信メッセージ
   * @param timeout - タイムアウト（ms）
   * @returns レスポンス
   */
  sendMessageToTab(
    tabId: number,
    message: any,
    timeout: number = this.defaultTimeout
  ): Promise<MessageResponse> {
    return new Promise((resolve) => {
      if (!this.isAvailable() || !chrome.tabs) {
        resolve({
          success: false,
          error: 'Chrome tabs API not available'
        });
        return;
      }

      // タイムアウト設定
      const timer = setTimeout(() => {
        resolve({
          success: false,
          error: 'Message timeout'
        });
      }, timeout);

      chrome.tabs.sendMessage(tabId, message, (response: any) => {
        clearTimeout(timer);

        if (chrome.runtime.lastError) {
          resolve({
            success: false,
            error: chrome.runtime.lastError.message
          });
        } else {
          resolve(response || {
            success: true
          });
        }
      });
    });
  }

  /**
   * メッセージリスナーを設定
   * @param handler - メッセージハンドラー
   */
  onMessage(
    handler: (
      message: any,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => boolean | void
  ): void {
    if (this.isAvailable() && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
          const result = handler(message, sender, sendResponse);
          // 非同期処理の場合は true を返す
          return Boolean(result);
        } catch (error) {
          console.error('Message handler error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return false;
        }
      });
    }
  }

  /**
   * Chrome runtime APIが利用可能かチェック
   * @returns 利用可能性
   */
  isAvailable(): boolean {
    return typeof chrome !== 'undefined' &&
      Boolean(chrome.runtime) &&
      Boolean(chrome.runtime.sendMessage);
  }

  /**
   * デフォルトタイムアウトを設定
   * @param timeout タイムアウト時間
   */
  setDefaultTimeout(timeout: number): void {
    this.defaultTimeout = timeout;
  }

  /**
   * デバッグ情報を取得
   * @returns デバッグ情報
   */
  getDebugInfo(): DebugInfo {
    return {
      isAvailable: this.isAvailable(),
      hasTabsAPI: Boolean(chrome?.tabs),
      defaultTimeout: this.defaultTimeout,
      className: 'SimpleMessagingAdapter'
    };
  }
}
