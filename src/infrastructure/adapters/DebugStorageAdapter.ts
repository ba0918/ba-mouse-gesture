/**
 * デバッグ設定専用ストレージアダプター
 * popup-content script間の統一されたストレージアクセスを提供
 * 
 * 修正方針：
 * - 両方でsync storageを使用（統一）
 * - local storageは完全に廃止
 * - 設定変更の即座同期を保証
 */

import { NoOpLogger } from './NoOpLogger'

// 型定義
interface DefaultSettings {
  enabled: boolean;
  logLevel: number;
  showStatus: boolean;
  statusPosition: string;
}

interface StorageState {
  storageType: string;
  settings: any;
  listenerCount: number;
  timestamp: string;
}

interface LegacyDataCheck {
  hasLegacyData: boolean;
  legacyData: any;
}

export class DebugStorageAdapter {
  private readonly STORAGE_KEY: string = 'appSettings';
  private readonly defaultSettings: DefaultSettings = {
    enabled: false,
    logLevel: 2,
    showStatus: false,
    statusPosition: 'top-right'
  };

  private changeListeners: Set<(changes: any) => void> = new Set();
  private logger: any; // DebugLoggerインスタンス

  constructor(logger: any = null) {
    this.logger = logger || new NoOpLogger();
  }

  /**
   * DebugLoggerを設定
   */
  setLogger(logger: any): void {
    this.logger = logger;
  }

  /**
   * logLevelを安全に数値に変換
   */
  private parseLogLevel(value: any): number {
    // 既に有効な整数の場合はそのまま返す
    if (Number.isInteger(value) && value >= 0 && value <= 3) {
      return value;
    }

    // 文字列の場合は数値に変換を試行
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (Number.isInteger(parsed) && parsed >= 0 && parsed <= 3) {
        return parsed;
      }
    }

    // 数値の場合は範囲チェック
    if (typeof value === 'number') {
      const rounded = Math.round(value);
      if (rounded >= 0 && rounded <= 3) {
        return rounded;
      }
    }

    // すべて失敗した場合はデフォルト値を返す
    return this.defaultSettings.logLevel;
  }

  /**
   * デバッグ設定を読み込み（統一されたアクセス）
   * popup/content script両方で同じメソッドを使用
   */
  async loadSettings(): Promise<DefaultSettings> {
    try {
      // 🎯 修正：appSettings.debugSettingsパスから読み込み
      const result = await this.chromeStorageGet(['appSettings']);

      if (result.appSettings && result.appSettings.debugSettings) {
        const loadedSettings = result.appSettings.debugSettings;

        // 🔧 型変換を確実に実行してvalidation errorを防ぐ
        return {
          ...this.defaultSettings,
          enabled: Boolean(loadedSettings.enabled),
          logLevel: this.parseLogLevel(loadedSettings.logLevel),
          showStatus: Boolean(loadedSettings.showStatus),
          statusPosition: typeof loadedSettings.statusPosition === 'string' ? loadedSettings.statusPosition : this.defaultSettings.statusPosition,
          createdAt: loadedSettings.createdAt || null,
          updatedAt: loadedSettings.updatedAt || null
        };
      }

      // 初回読み込み時はデフォルト値を返す
      return { ...this.defaultSettings };

    } catch (error) {
      this.logger.error('DebugStorageAdapter: Failed to load settings:', error);
      return { ...this.defaultSettings };
    }
  }

  /**
   * デバッグ設定を保存（統一されたアクセス）
   * popup/content script両方で同じメソッドを使用
   */
  async saveSettings(settings: Partial<DefaultSettings>): Promise<DefaultSettings> {
    try {
      const settingsToSave = {
        ...this.defaultSettings,
        ...settings
      };

      this.logger.info('DebugStorageAdapter: Saving settings to sync storage:', settingsToSave);

      // 🎯 修正：既存のappSettingsを取得してdebugSettings部分のみ更新
      const result = await this.chromeStorageGet(['appSettings']);
      const currentAppSettings = result.appSettings || {};

      const updatedAppSettings = {
        ...currentAppSettings,
        debugSettings: settingsToSave
      };

      await this.chromeStorageSet({
        [this.STORAGE_KEY]: updatedAppSettings
      });

      this.logger.info('DebugStorageAdapter: Settings saved successfully');
      return settingsToSave;

    } catch (error) {
      this.logger.error('DebugStorageAdapter: Failed to save settings:', error);
      throw error;
    }
  }

  /**
   * 設定変更の監視を開始
   * popup/content script両方で同期イベントを受信
   */
  startChangeListener(callback: (changes: any) => void): void {
    if (!callback || typeof callback !== 'function') {
      throw new Error('Callback function is required');
    }

    this.changeListeners.add(callback);

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      // 統一されたchange listenerを設定
      chrome.storage.onChanged.addListener((changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
        if (namespace === 'sync' && changes[this.STORAGE_KEY]) {
          const newAppSettings = changes[this.STORAGE_KEY].newValue;
          const oldAppSettings = changes[this.STORAGE_KEY].oldValue;

          const newSettings = newAppSettings?.debugSettings;
          const oldSettings = oldAppSettings?.debugSettings;

          // debugSettings部分に変更があった場合のみコールバックを実行
          if (newSettings !== oldSettings) {
            // ログは必要に応じてDebugLoggerで出力
            this.logger.info('DebugStorageAdapter: Settings changed:', {
              old: oldSettings,
              new: newSettings
            });

            // 全ての登録されたコールバックを実行
            this.changeListeners.forEach(listener => {
              try {
                listener({ newSettings, oldSettings });
              } catch (error) {
                this.logger.error('DebugStorageAdapter: Listener callback failed:', error);
              }
            });
          }
        }
      });
    }

    this.logger.info('DebugStorageAdapter: Change listener started');
  }

  /**
   * 設定変更の監視を停止
   */
  stopChangeListener(callback?: (changes: any) => void): void {
    if (callback) {
      this.changeListeners.delete(callback);
    } else {
      this.changeListeners.clear();
    }
  }

  /**
   * 現在の設定状態を確認（デバッグ用）
   */
  async getCurrentState(): Promise<StorageState | null> {
    try {
      const syncSettings = await this.chromeStorageGet([this.STORAGE_KEY]);

      return {
        storageType: 'sync-only',
        settings: syncSettings[this.STORAGE_KEY]?.debugSettings || null,
        listenerCount: this.changeListeners.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      this.logger.error('DebugStorageAdapter: Failed to get current state:', error);
      return null;
    }
  }

  /**
   * 旧形式のlocal storageデータの検出と移行
   */
  async checkLegacyData(): Promise<LegacyDataCheck> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return { hasLegacyData: false, legacyData: null };
      }

      // local storageから旧形式のデータを確認
      return new Promise((resolve) => {
        chrome.storage.local.get(['debugSettings'], (result) => {
          if (chrome.runtime.lastError) {
            this.logger.error('DebugStorageAdapter: Failed to check legacy data:', chrome.runtime.lastError);
            resolve({ hasLegacyData: false, legacyData: null });
            return;
          }

          const hasLegacyData = result.debugSettings && typeof result.debugSettings === 'object';

          this.logger.info('DebugStorageAdapter: Legacy data check result:', { hasLegacyData, legacyData: result.debugSettings });

          resolve({
            hasLegacyData,
            legacyData: hasLegacyData ? result.debugSettings : null
          });
        });
      });
    } catch (error) {
      this.logger.error('DebugStorageAdapter: Failed to check legacy data:', error);
      return { hasLegacyData: false, legacyData: null };
    }
  }

  /**
   * 旧形式のlocal storageデータを削除
   */
  async cleanupLegacyData(): Promise<void> {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        return;
      }

      return new Promise((resolve, reject) => {
        chrome.storage.local.remove(['debugSettings'], () => {
          if (chrome.runtime.lastError) {
            this.logger.error('DebugStorageAdapter: Failed to cleanup legacy data:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            this.logger.info('DebugStorageAdapter: Legacy data cleaned up successfully');
            resolve();
          }
        });
      });
    } catch (error) {
      this.logger.error('DebugStorageAdapter: Failed to cleanup legacy data:', error);
      throw error;
    }
  }

  /**
   * Chrome Storage APIの統一インターフェース
   * テスト環境とブラウザ環境の両方に対応
   */
  private chromeStorageGet(keys: string[]): Promise<Record<string, any>> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API is not available'));
        return;
      }

      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result);
        }
      });
    });
  }

  private chromeStorageSet(data: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API is not available'));
        return;
      }

      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}
