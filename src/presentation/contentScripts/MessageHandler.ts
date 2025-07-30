/**
 * メッセージ処理
 * Single Responsibility: Chrome拡張メッセージの処理
 */

import type { ScrollMessage } from './types';

export class MessageHandler {
  /**
   * 初期化
   */
  initialize(): void {
    this.setupMessageListener();
  }

  /**
   * メッセージリスナー設定
   */
  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((
      message: ScrollMessage, 
      _sender: chrome.runtime.MessageSender, 
      sendResponse: (response: { success: boolean }) => void
    ) => {
      if (message.type === 'scroll') {
        this.handleScrollMessage(message.direction);
        sendResponse({ success: true });
      }
      return true; // 非同期応答を示す
    });
  }

  /**
   * スクロールメッセージ処理
   */
  private handleScrollMessage(direction: 'top' | 'bottom'): void {
    try {
      if (direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (direction === 'bottom') {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      }
    } catch (error) {
      console.warn('Scroll action failed:', error);
    }
  }

  /**
   * リソース解放
   */
  dispose(): void {
    // chrome.runtime.onMessage.removeListener は直接的な方法がないため
    // 必要に応じてフラグベースの無効化を検討
  }
}