/**
 * Clean Architecture - Content Scripts エントリーポイント
 * GestureManagerベースの実装（Clean Architecture準拠）
 */

import { CanvasRendererAdapter } from '../../infrastructure/adapters/CanvasRendererAdapter';
import { ChromeMessagingAdapter } from '../../infrastructure/adapters/ChromeMessagingAdapter';
import { ChromeSettingsAdapter } from '../../infrastructure/adapters/ChromeSettingsAdapter';
import { GestureManager } from '../controllers/GestureManager';

// グローバルインスタンス
let gestureManager: GestureManager | null = null;

/**
 * 初期化関数（Clean Architecture準拠）
 */
async function initializeGestureManager(): Promise<void> {
  try {
    // 既存のインスタンスがあれば解放
    if (gestureManager) {
      gestureManager.destroy();
    }

    // 依存性注入でサービス層を構築
    const messagingService = new ChromeMessagingAdapter();
    const renderingService = new CanvasRendererAdapter();
    const settingsService = new ChromeSettingsAdapter();

    // Clean Architecture準拠でGestureManagerを初期化
    gestureManager = new GestureManager(messagingService, renderingService, settingsService);

    const initialized = await gestureManager.initialize();

    if (initialized) {
      console.log('✅ GestureManager initialized successfully');
    } else {
      console.log('⚠️ GestureManager initialization skipped (excluded site or disabled)');
    }
  } catch (error) {
    console.error('❌ GestureManager initialization failed:', error);
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
