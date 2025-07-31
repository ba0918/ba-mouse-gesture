/**
 * ChromeMessagingAdapter - Chrome Runtime Messaging Adapter
 * Clean Architecture - Infrastructure層
 * シンプルなChrome Runtime Messaging実装
 */

import { IMessagingService } from '../../application/interfaces/IMessagingService';

export class ChromeMessagingAdapter implements IMessagingService {
  /**
   * メッセージリスナーを設定
   */
  addMessageListener(
    handler: (
      message: unknown,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ) => boolean | void
  ): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
          const result = handler(message, sender, sendResponse);
          return Boolean(result);
        } catch (error) {
          console.error('Message handler error:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return false;
        }
      });
    }
  }

  /**
   * メッセージを送信
   */
  async sendMessage(message: unknown): Promise<unknown> {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });
    }
    throw new Error('Chrome runtime not available');
  }
}
