/**
 * 設定管理
 * Single Responsibility: アプリケーション設定の読み込みと管理
 */

import type { AppSettings } from './types';
import { SettingsManagementUseCase } from '../../application/usecases/SettingsManagementUseCase';
import { ChromeStorageAdapter } from '../../infrastructure/adapters/ChromeStorageAdapter';
import { SettingsRepository } from '../../infrastructure/storage/repositories/SettingsRepository';

export class SettingsManager {
  private settingsUseCase: SettingsManagementUseCase | null = null;
  private settings: AppSettings;

  constructor() {
    this.settings = this.getDefaultSettings();
  }

  /**
   * 設定初期化
   */
  async initialize(): Promise<void> {
    try {
      await this.initializeUseCases();
      await this.loadSettings();
    } catch (error) {
      console.warn('Settings initialization failed, using fallback:', error);
      await this.loadSettingsFallback();
    }
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

    const loadedSettings = await this.settingsUseCase.getCurrentSettings();
    this.settings = { ...this.settings, ...loadedSettings };
  }

  /**
   * フォールバック設定読み込み
   */
  private async loadSettingsFallback(): Promise<void> {
    try {
      const result = await chrome.storage.sync.get([
        'enabled', 'strokeColor', 'strokeWidth', 'gestureThreshold', 
        'excludeList', 'defaultGestureStates', 'debugSettings'
      ]);
      
      this.settings = {
        enabled: result.enabled !== false,
        strokeColor: result.strokeColor || '#2196F3',
        strokeWidth: result.strokeWidth || 3,
        gestureThreshold: result.gestureThreshold || 15,
        excludeList: result.excludeList || [],
        defaultGestureStates: result.defaultGestureStates || {} as Record<string, boolean>,
        debugSettings: result.debugSettings || {
          enabled: false,
          logLevel: 2,
          showStatus: false,
          statusPosition: 'top-right'
        }
      };
    } catch (error) {
      console.warn('Fallback settings load failed, using defaults:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  /**
   * デフォルト設定取得
   */
  private getDefaultSettings(): AppSettings {
    return {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      defaultGestureStates: {} as Record<string, boolean>,
      debugSettings: {
        enabled: false,
        logLevel: 2,
        showStatus: false,
        statusPosition: 'top-right'
      }
    };
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
  getSettings(): Readonly<AppSettings> {
    return { ...this.settings };
  }

  /**
   * 設定が有効かチェック
   */
  isEnabled(): boolean {
    return this.settings.enabled;
  }
}