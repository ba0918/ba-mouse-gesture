/**
 * Clean Architecture - Popup/Options エントリーポイント（Svelte統合）
 * Svelteアプリケーションの初期化とClean Architecture統合
 */

// Svelteアプリのインポート
import OptionsApp from './OptionsApp.svelte';
import { ServiceFactory } from '../../application/services/ServiceFactory';

/**
 * Svelteアプリケーションの初期化
 */
function initializeSvelteApp() {
  try {
    // アプリケーションコンテナを取得
    const target = document.getElementById('app');
    
    if (!target) {
      throw new Error('App container not found');
    }
    
    // Svelteアプリを初期化（互換性のある方法）
    const app = new OptionsApp({
      target: target
    });
    
    console.log('✅ Svelte Options App initialized successfully');
    
    // グローバルアクセス用（デバッグ目的）
    (window as any).optionsApp = app;
    
    return app;
  } catch (error) {
    console.error('❌ Svelte Options App initialization failed:', error);
    
    // フォールバックエラー表示
    const errorContainer = document.getElementById('app') || document.body;
    errorContainer.innerHTML = `
      <div style="padding: 20px; color: red; text-align: center;">
        <h2>設定画面の初期化に失敗しました</h2>
        <p>エラー: ${(error as Error).message}</p>
        <p>ページを再読み込みしてください。</p>
      </div>
    `;
    
    return null;
  }
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', () => {
  // ServiceFactoryをグローバルに公開
  (window as any).ServiceFactory = new ServiceFactory();
  
  initializeSvelteApp();
});

// ES6 Module export（テスト用）
export { initializeSvelteApp };