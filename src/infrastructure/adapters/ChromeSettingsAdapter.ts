/**
 * ChromeSettingsAdapter
 * Chrome拡張機能の設定管理アダプター
 * SettingsServiceインターフェースの実装
 */

import { SettingsService, GestureSettings } from '../../application/interfaces/SettingsService';

/**
 * Chrome拡張機能の設定管理アダプター
 */
export class ChromeSettingsAdapter implements SettingsService {
  private settings: GestureSettings = {
    enabled: true,
    strokeColor: '#2196F3',
    strokeWidth: 3,
    gestureThreshold: 15,
    excludeList: []
  };

  private settingsChangeCallback: ((settings: GestureSettings) => void) | null = null;

  constructor() {}

  /**
   * SettingsService実装: 設定を読み込み
   */
  async loadSettings(): Promise<GestureSettings> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        const result = await new Promise<Record<string, unknown>>((resolve) => {
          chrome.storage.sync.get('appSettings', (data) => {
            resolve(data);
          });
        });

        if (result.appSettings) {
          this.settings = { ...this.settings, ...(result.appSettings as Partial<GestureSettings>) };
        }
      }

      return this.settings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.settings;
    }
  }

  /**
   * SettingsService実装: 設定変更を監視
   */
  watchSettingsChanges(callback: (settings: GestureSettings) => void): void {
    this.settingsChangeCallback = callback;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && 'appSettings' in changes) {
          const newSettings = changes.appSettings.newValue as GestureSettings;
          this.settings = newSettings;
          
          if (this.settingsChangeCallback) {
            this.settingsChangeCallback(newSettings);
          }
        }
      });
    }
  }

  /**
   * SettingsService実装: サイトが除外対象かチェック
   */
  isExcludedSite(url?: string): boolean {
    const currentUrl = url || window.location.href;
    
    return this.settings.excludeList.some(pattern => {
      try {
        // シンプルなパターンマッチング
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(currentUrl);
      } catch (error) {
        console.warn('Invalid exclude pattern:', pattern, error);
        return false;
      }
    });
  }

  /**
   * 設定を保存（追加機能）
   */
  async saveSettings(settings: Partial<GestureSettings>): Promise<void> {
    try {
      this.settings = { ...this.settings, ...settings };

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        await new Promise<void>((resolve, reject) => {
          chrome.storage.sync.set({ appSettings: this.settings }, () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }
}