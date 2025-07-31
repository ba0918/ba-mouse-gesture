/**
 * Clean Architecture - Popup/Options エントリーポイント（Svelte統合）
 * Svelteアプリケーションの初期化とClean Architecture統合
 */

// Svelteアプリのインポート
import OptionsApp from './OptionsApp.svelte';
import { mount } from 'svelte';

// Clean Architecture - DI
import { ChromeStorageAdapter } from '../../infrastructure/adapters/ChromeStorageAdapter';
import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository';
import { GestureRepository } from '../../infrastructure/storage/repositories/GestureRepository';
import { SettingsManagementUseCase } from '../../application/usecases/SettingsManagementUseCase';
import { CustomGestureManagementUseCase } from '../../application/usecases/CustomGestureManagementUseCase';
import { GestureListUseCase } from '../../application/usecases/GestureListUseCase';

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
    
    // Svelte 5の mount 関数を使用
    const app = mount(OptionsApp, {
      target: target
    });
    
    console.log('✅ Svelte Options App initialized successfully');
    
    // グローバルアクセス用（デバッグ目的）
    (window as unknown as Record<string, unknown>).optionsApp = app;
    
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

/**
 * Clean Architecture - DI コンテナ
 */
function createServices() {
  // Infrastructure層
  const storageAdapter = new ChromeStorageAdapter();
  
  // Repository層
  const settingsRepository = new SettingsRepository(storageAdapter);
  const gestureRepository = new GestureRepository(storageAdapter);
  
  // UseCase層
  const settingsManagementUseCase = new SettingsManagementUseCase(settingsRepository);
  const customGestureManagementUseCase = new CustomGestureManagementUseCase(gestureRepository);
  const gestureListUseCase = new GestureListUseCase(gestureRepository);
  
  return {
    settingsManagementUseCase,
    customGestureManagementUseCase,
    gestureListUseCase,
  };
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Clean Architecture - DI
    const services = createServices();
    
    // グローバルサービス公開
    (window as unknown as Record<string, unknown>).services = services;
    
    console.log('✅ Services initialized successfully');
    
    // Svelteアプリを初期化
    initializeSvelteApp();
  } catch (error) {
    console.error('❌ Services initialization failed:', error);
    
    // フォールバックエラー表示
    const errorContainer = document.getElementById('app') || document.body;
    errorContainer.innerHTML = `
      <div style="padding: 20px; color: red; text-align: center;">
        <h2>サービスの初期化に失敗しました</h2>
        <p>エラー: ${(error as Error).message}</p>
        <p>ページを再読み込みしてください。</p>
      </div>
    `;
  }
});

// ES6 Module export（テスト用）
export { initializeSvelteApp };