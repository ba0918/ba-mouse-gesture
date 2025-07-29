/**
 * Background script entry point - Clean Architecture
 * ジェスチャーアクション実行を担当
 */

// ログレベル定義
const LOG_LEVELS = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

type LogLevel = (typeof LOG_LEVELS)[keyof typeof LOG_LEVELS];

// デバッグ設定
const debugEnabled = true;
const debugLogLevel: LogLevel = 2;

// メッセージ型定義
interface SimpleGestureMessage {
  type: 'simpleGesture';
  direction: string;
}

interface ComplexGestureMessage {
  type: 'complexGesture';
  gestureType: string;
}

interface DebugMessage {
  type: 'clearStorage' | 'getStorageInfo';
}

type MessageRequest = SimpleGestureMessage | ComplexGestureMessage | DebugMessage;

interface MessageResponse {
  success: boolean;
  action?: string;
  error?: string;    
  data?: any;
}

interface ScrollMessage {
  type: 'scroll';
  direction: 'top' | 'bottom';
}

// 条件付きログ関数
function debugLog(level: LogLevel, message: string, ...args: any[]): void {
  if (!debugEnabled || level > debugLogLevel) return;
  
  switch (level) {
  case LOG_LEVELS.ERROR:
    console.error('🚨 [ERROR]', message, ...args);
    break;
  case LOG_LEVELS.WARN:
    console.warn('⚠️ [WARN]', message, ...args);
    break;
  case LOG_LEVELS.INFO:
    console.log('ℹ️ [INFO]', message, ...args);
    break;
  case LOG_LEVELS.DEBUG:
    console.log('🔧 [DEBUG]', message, ...args);
    break;
  default:
    console.log(message, ...args);
  }
}

console.log('🏗️ Clean Architecture - Background loaded');

// 拡張機能インストール時
chrome.runtime.onInstalled.addListener(function (details: chrome.runtime.InstalledDetails) {
  debugLog(LOG_LEVELS.INFO, 'Extension installed:', details.reason);
});

// メッセージ受信処理
chrome.runtime.onMessage.addListener(function (
  request: MessageRequest, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response: MessageResponse) => void
): boolean | void {
  debugLog(LOG_LEVELS.DEBUG, 'Message received:', request);
  debugLog(LOG_LEVELS.DEBUG, 'Sender tab ID:', sender.tab?.id);
    
  if (request.type === 'simpleGesture') {
    const direction = request.direction;
    const tabId = sender.tab?.id;
        
    debugLog(LOG_LEVELS.INFO, `Processing gesture: ${direction} for tab ${tabId}`);
        
    if (!tabId) {
      debugLog(LOG_LEVELS.ERROR, 'No tab ID available');
      sendResponse({ success: false, error: 'No tab ID' });
      return;
    }
        
    // シンプルなアクション実行
    executeSimpleAction(direction, tabId)
      .then(result => {
        debugLog(LOG_LEVELS.INFO, 'Action completed:', result);
        sendResponse({ success: true, action: result });
      })
      .catch(error => {
        debugLog(LOG_LEVELS.ERROR, 'Action failed:', error);
        sendResponse({ success: false, error: (error as Error).message });
      });
        
    return true; // 非同期レスポンス
  } else if (request.type === 'complexGesture') {
    const gestureType = request.gestureType;
    const tabId = sender.tab?.id;
        
    debugLog(LOG_LEVELS.INFO, `Processing complex gesture: ${gestureType} for tab ${tabId}`);
        
    if (!tabId) {
      debugLog(LOG_LEVELS.ERROR, 'No tab ID available');
      sendResponse({ success: false, error: 'No tab ID' });
      return;
    }
        
    // 複合ジェスチャーアクション実行
    executeComplexAction(gestureType, tabId)
      .then(result => {
        debugLog(LOG_LEVELS.INFO, 'Complex action completed:', result);
        sendResponse({ success: true, action: result });
      })
      .catch(error => {
        debugLog(LOG_LEVELS.ERROR, 'Complex action failed:', error);
        sendResponse({ success: false, error: (error as Error).message });
      });
        
    return true; // 非同期レスポンス
  } else if (request.type === 'clearStorage') {
    // ストレージクリア
    debugLog(LOG_LEVELS.INFO, 'Clearing extension storage...');
    
    Promise.all([
      chrome.storage.sync.clear(),
      chrome.storage.local.clear()
    ])
      .then(() => {
        debugLog(LOG_LEVELS.INFO, 'Storage cleared successfully');
        sendResponse({ success: true, action: 'Storage cleared' });
      })
      .catch(error => {
        debugLog(LOG_LEVELS.ERROR, 'Failed to clear storage:', error);
        sendResponse({ success: false, error: (error as Error).message });
      });
    
    return true; // 非同期レスポンス
  } else if (request.type === 'getStorageInfo') {
    // ストレージ情報取得
    debugLog(LOG_LEVELS.INFO, 'Getting storage info...');
    
    Promise.all([
      chrome.storage.sync.get(null),
      chrome.storage.local.get(null)
    ])
      .then(([syncData, localStorage]) => {
        const info = {
          sync: syncData,
          local: localStorage,
          syncKeys: Object.keys(syncData),
          localKeys: Object.keys(localStorage)
        };
        debugLog(LOG_LEVELS.INFO, 'Storage info:', info);
        sendResponse({ success: true, action: 'Storage info retrieved', data: info });
      })
      .catch(error => {
        debugLog(LOG_LEVELS.ERROR, 'Failed to get storage info:', error);
        sendResponse({ success: false, error: (error as Error).message });
      });
    
    return true; // 非同期レスポンス
  }
    
  debugLog(LOG_LEVELS.WARN, 'Unknown message type:', (request as any).type);
  sendResponse({ success: false, error: 'Unknown message type' });
});

// シンプルアクション実行
async function executeSimpleAction(direction: string, tabId: number): Promise<string> {
  debugLog(LOG_LEVELS.DEBUG, `Executing ${direction} action for tab ${tabId}`);
    
  try {
    switch (direction) {
    case 'LEFT':
      debugLog(LOG_LEVELS.DEBUG, 'Going back');
      await chrome.tabs.goBack(tabId);
      return 'Navigated back';
                
    case 'RIGHT':
      debugLog(LOG_LEVELS.DEBUG, 'Going forward');
      await chrome.tabs.goForward(tabId);
      return 'Navigated forward';
                
    case 'UP':
      debugLog(LOG_LEVELS.DEBUG, 'Scrolling to top');
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'top'
      } as ScrollMessage);
      return 'Scrolled to top';
                
    case 'DOWN':
      debugLog(LOG_LEVELS.DEBUG, 'Scrolling to bottom');
      await chrome.tabs.sendMessage(tabId, {
        type: 'scroll',
        direction: 'bottom'
      } as ScrollMessage);
      return 'Scrolled to bottom';
                
    default:
      throw new Error(`Unknown direction: ${direction}`);
    }
  } catch (error) {
    debugLog(LOG_LEVELS.ERROR, `${direction} action failed:`, error);
    throw error;
  }
}

// 複合アクション実行
async function executeComplexAction(gestureType: string, tabId: number): Promise<string> {
  debugLog(LOG_LEVELS.DEBUG, `Executing complex gesture: ${gestureType} for tab ${tabId}`);
    
  try {
    switch (gestureType) {
    case 'downright':
      debugLog(LOG_LEVELS.DEBUG, 'Closing tab (↓→)');
      await chrome.tabs.remove(tabId);
      return 'Tab closed';
                
    case 'upright':
      debugLog(LOG_LEVELS.DEBUG, 'Opening new tab (↑→)');
      await chrome.tabs.create({});
      return 'New tab opened';
                
    case 'rightdown': {
      debugLog(LOG_LEVELS.DEBUG, 'Duplicating tab (→↓)');
      const currentTab = await chrome.tabs.get(tabId);
      await chrome.tabs.create({ url: currentTab.url });
      return 'Tab duplicated';
    }
                
    case 'updown':
      debugLog(LOG_LEVELS.DEBUG, 'Reloading tab (↑↓)');
      await chrome.tabs.reload(tabId);
      return 'Tab reloaded';

    case 'super_refresh':
      debugLog(LOG_LEVELS.DEBUG, 'Super reloading tab (↑↓↑)');
      await chrome.tabs.reload(tabId, {bypassCache: true});
      return 'Tab super reloaded (cache cleared)';

    case 'prev_tab': {
      debugLog(LOG_LEVELS.DEBUG, 'Switching to previous tab (←→)');
      const tabs = await chrome.tabs.query({currentWindow: true});
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
      if (tabs[prevIndex]?.id) {
        await chrome.tabs.update(tabs[prevIndex].id, {active: true});
      }
      return 'Switched to previous tab';
    }

    case 'next_tab': {
      debugLog(LOG_LEVELS.DEBUG, 'Switching to next tab (→←)');
      const tabs = await chrome.tabs.query({currentWindow: true});
      const currentIndex = tabs.findIndex(tab => tab.id === tabId);
      const nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
      if (tabs[nextIndex]?.id) {
        await chrome.tabs.update(tabs[nextIndex].id, {active: true});
      }
      return 'Switched to next tab';
    }
                
    default:
      throw new Error(`Unknown gesture type: ${gestureType}`);
    }
  } catch (error) {
    debugLog(LOG_LEVELS.ERROR, `Complex gesture ${gestureType} failed:`, error);
    throw error;
  }
}