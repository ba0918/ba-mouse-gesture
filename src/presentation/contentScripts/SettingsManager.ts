/**
 * 設定管理
 * Single Responsibility: アプリケーション設定の読み込みと管理
 */

import { Settings } from '../../domain/entities/Settings';
import { SettingsManagementUseCase } from '../../application/usecases/SettingsManagementUseCase';
import { ChromeStorageAdapter } from '../../infrastructure/adapters/ChromeStorageAdapter';
import { SettingsRepository } from '../../infrastructure/repositories/SettingsRepository';

export class SettingsManager {
  private settingsUseCase: SettingsManagementUseCase | null = null;
  private settings: Settings;

  constructor() {
    this.settings = new Settings();
  }

  /**
   * 設定初期化
   */
  async initialize(): Promise<void> {
    await this.initializeUseCases();
    await this.loadSettings();
  }

  /**
   * UseCase初期化
   */
  private async initializeUseCases(): Promise<void> {
    const storageAdapter = new ChromeStorageAdapter();
    const settingsRepository = new SettingsRepository(storageAdapter);
    
    this.settingsUseCase = new SettingsManagementUseCase(
      settingsRepository
    );
  }

  /**
   * 設定読み込み
   */
  private async loadSettings(): Promise<void> {
    if (!this.settingsUseCase) {
      throw new Error('SettingsUseCase not initialized');
    }

    this.settings = await this.settingsUseCase.getCurrentSettings();
  }



  /**
   * 除外サイトチェック
   */
  isExcludedSite(): boolean {
    const currentUrl = window.location.href;
    return this.settings.excludeList.some(pattern => {
      try {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(currentUrl);
      } catch {
        return currentUrl.includes(pattern);
      }
    });
  }

  /**
   * ジェスチャーが有効かチェック
   */
  isGestureEnabled(gestureId: string): boolean {
    if (!this.settings.defaultGestureStates) {
      return true; // デフォルトで有効
    }
    
    // 設定があればそれを使用、なければデフォルトで有効
    return this.settings.defaultGestureStates[gestureId] !== false;
  }

  /**
   * 現在の設定取得
   */
  getSettings(): Settings {
    return this.settings;
  }

  /**
   * 設定が有効かチェック
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }
}