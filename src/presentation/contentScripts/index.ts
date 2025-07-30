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
      gestureManager.destroy();
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