/**
 * Clean Architecture - Content Scripts エントリーポイント
 * 元の動作していたGestureManagerベースの実装に復旧
 */

import { GestureManager } from '../controllers/GestureManager';

// グローバルインスタンス
let gestureManager: GestureManager | null = null;

/**
 * 初期化関数
 */
async function initializeGestureManager(): Promise<void> {
  try {
    // 既存のインスタンスがあれば解放
    if (gestureManager) {
      gestureManager.dispose();
    }

    // 新しいインスタンス作成と初期化
    gestureManager = new GestureManager();
    const initialized = await gestureManager.initialize();

    if (initialized) {
      console.log('✅ Gesture Manager initialized successfully');
    } else {
      console.log('⚠️ Gesture Manager initialization skipped (excluded site or disabled)');
    }

  } catch (error) {
    console.error('❌ Gesture Manager initialization failed:', error);
  }
}

/**
 * グローバル関数の公開 (後方互換性のため)
 */
if (typeof window !== 'undefined') {
  // デバッグ用関数
  (window as any).clearExtensionStorage = async () => {
    try {
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      console.log('✅ Extension storage cleared');
      return { success: true };
    } catch (error) {
      console.error('❌ Failed to clear storage:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };

  (window as any).getStorageInfo = async () => {
    try {
      const syncData = await chrome.storage.sync.get(null);
      const localData = await chrome.storage.local.get(null);
      
      const info = {
        sync: {
          keys: Object.keys(syncData),
          bytesInUse: await chrome.storage.sync.getBytesInUse(),
          data: syncData
        },
        local: {
          keys: Object.keys(localData),
          bytesInUse: await chrome.storage.local.getBytesInUse(),
          data: localData
        }
      };
      
      console.log('📊 Storage info:', info);
      return info;
    } catch (error) {
      console.error('❌ Failed to get storage info:', error);
      return { error: error instanceof Error ? error.message : String(error) };
    }
  };

  // 設定再読み込み関数
  (window as any).reloadGestureSettings = async () => {
    try {
      if (gestureManager) {
        await gestureManager.updateSettings({});
        console.log('✅ Settings reloaded');
        return { success: true };
      } else {
        console.warn('⚠️ Gesture manager not initialized');
        return { success: false, error: 'Not initialized' };
      }
    } catch (error) {
      console.error('❌ Failed to reload settings:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  };
}

// DOMContentLoaded時の初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeGestureManager);
} else {
  // 既にDOMが読み込まれている場合
  initializeGestureManager();
}

// ページ遷移時の再初期化対応
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // URL変更時に再初期化
    setTimeout(initializeGestureManager, 100);
  }
}).observe(document, { subtree: true, childList: true });

export { GestureManager };