/**
 * Clean Architecture - Popup/Options エントリーポイント（Svelte統合）
 * Svelteアプリケーションの初期化とClean Architecture統合
 */

// Svelteアプリのインポート
import OptionsApp from '../../../popup/OptionsApp.svelte';

/**
 * Svelteアプリケーションの初期化
 */
function initializeSvelteApp() {
  try {
    // body要素を取得してSvelteアプリをマウント
    const target = document.body;
    
    // 既存のHTMLコンテンツをクリア
    target.innerHTML = '';
    
    // Svelteアプリを初期化
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
    document.body.innerHTML = `
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
  initializeSvelteApp();
});

// ES6 Module export（テスト用）
export { initializeSvelteApp };