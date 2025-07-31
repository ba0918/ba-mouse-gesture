/**
 * Background script entry point - Clean Architecture
 * ジェスチャーアクション実行を担当
 */

import { ActionName } from "../../domain/types";
import { DebugLogger, type DebugSettings, type LogLevel } from "../../infrastructure/adapters/DebugLogger";

// デバッグ設定
const debugSettings: DebugSettings = {
  logLevel: 2,
  shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  },
};

// DebugLoggerインスタンス作成
const logger = new DebugLogger(debugSettings);

// メッセージ型定義
interface ActionMessage {
  type: "executeAction";
  action: ActionName;
}

interface DebugMessage {
  type: "clearStorage" | "getStorageInfo";
}

type MessageRequest = ActionMessage | DebugMessage;

interface MessageResponse {
  success: boolean;
  action?: string;
  error?: string;
  data?: any;
}

interface ScrollMessage {
  type: "scroll";
  direction: "top" | "bottom";
}

logger.info("Clean Architecture - Background loaded");

// 拡張機能インストール時
chrome.runtime.onInstalled.addListener(function(details: chrome.runtime.InstalledDetails) {
  logger.info("Extension installed:", details.reason);
});

// メッセージ受信処理
chrome.runtime.onMessage.addListener(function(
  request: MessageRequest,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: MessageResponse) => void,
): boolean | void {
  logger.debug("Message received:", request);
  logger.debug("Sender tab ID:", sender.tab?.id);

  if (request.type === "executeAction") {
    const actionName = request.action;
    const tabId = sender.tab?.id;

    logger.info(`Processing action: ${actionName} for tab ${tabId}`);

    if (!tabId) {
      logger.error("No tab ID available");
      sendResponse({ success: false, error: "No tab ID" });
      return;
    }

    // 統一されたアクション実行
    executeAction(actionName, tabId)
      .then(result => {
        logger.info("Action completed:", result);
        sendResponse({ success: true, action: result });
      })
      .catch(error => {
        logger.error("Action failed:", error);
        sendResponse({ success: false, error: (error as Error).message });
      });

    return true; // 非同期レスポンス
  } else if (request.type === "clearStorage") {
    // ストレージクリア
    logger.info("Clearing extension storage...");

    Promise.all([
      chrome.storage.sync.clear(),
      chrome.storage.local.clear(),
    ])
      .then(() => {
        logger.info("Storage cleared successfully");
        sendResponse({ success: true, action: "Storage cleared" });
      })
      .catch(error => {
        logger.error("Failed to clear storage:", error);
        sendResponse({ success: false, error: (error as Error).message });
      });

    return true; // 非同期レスポンス
  } else if (request.type === "getStorageInfo") {
    // ストレージ情報取得
    logger.info("Getting storage info...");

    Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get(null),
    ])
      .then(([syncData, localStorage]) => {
        const info = {
          sync: syncData,
          local: localStorage,
          syncKeys: Object.keys(syncData),
          localKeys: Object.keys(localStorage),
        };
        logger.info("Storage info:", info);
        sendResponse({ success: true, action: "Storage info retrieved", data: info });
      })
      .catch(error => {
        logger.error("Failed to get storage info:", error);
        sendResponse({ success: false, error: (error as Error).message });
      });

    return true; // 非同期レスポンス
  }

  logger.warn("Unknown message type:", (request as any).type);
  sendResponse({ success: false, error: "Unknown message type" });
});

// 統一されたアクション実行
async function executeAction(actionName: ActionName, tabId: number): Promise<string> {
  logger.debug(`Executing action: ${actionName} for tab ${tabId}`);

  try {
    switch (actionName) {
      // ナビゲーション
      case "back":
        logger.debug("Going back");
        await chrome.tabs.goBack(tabId);
        return "Navigated back";

      case "forward":
        logger.debug("Going forward");
        await chrome.tabs.goForward(tabId);
        return "Navigated forward";

      // スクロール
      case "scroll_top":
        logger.debug("Scrolling to top");
        await chrome.tabs.sendMessage(tabId, {
          type: "scroll",
          direction: "top",
        } as ScrollMessage);
        return "Scrolled to top";

      case "scroll_bottom":
        logger.debug("Scrolling to bottom");
        await chrome.tabs.sendMessage(tabId, {
          type: "scroll",
          direction: "bottom",
        } as ScrollMessage);
        return "Scrolled to bottom";

      // タブ操作
      case "close_tab":
        logger.debug("Closing tab");
        await chrome.tabs.remove(tabId);
        return "Tab closed";

      case "new_tab":
        logger.debug("Opening new tab");
        await chrome.tabs.create({});
        return "New tab opened";

      case "duplicate_tab": {
        logger.debug("Duplicating tab");
        const currentTab = await chrome.tabs.get(tabId);
        await chrome.tabs.create({ url: currentTab.url });
        return "Tab duplicated";
      }

      case "prev_tab": {
        logger.debug("Switching to previous tab");
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const currentIndex = tabs.findIndex(tab => tab.id === tabId);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
        if (tabs[prevIndex]?.id) {
          await chrome.tabs.update(tabs[prevIndex].id, { active: true });
        }
        return "Switched to previous tab";
      }

      case "next_tab": {
        logger.debug("Switching to next tab");
        const tabs = await chrome.tabs.query({ currentWindow: true });
        const currentIndex = tabs.findIndex(tab => tab.id === tabId);
        const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
        if (tabs[nextIndex]?.id) {
          await chrome.tabs.update(tabs[nextIndex].id, { active: true });
        }
        return "Switched to next tab";
      }

      // ページ操作
      case "refresh":
        logger.debug("Reloading tab");
        await chrome.tabs.reload(tabId);
        return "Tab reloaded";

      case "super_refresh":
        logger.debug("Super reloading tab (cache cleared)");
        await chrome.tabs.reload(tabId, { bypassCache: true });
        return "Tab super reloaded (cache cleared)";

      default:
        throw new Error(`Unknown action: ${actionName}`);
    }
  } catch (error) {
    logger.error(`Action ${actionName} failed:`, error);
    throw error;
  }
}
