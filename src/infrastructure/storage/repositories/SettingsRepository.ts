/**
 * SettingsRepository
 * 設定データの永続化を担当するリポジトリ
 * Clean Architecture - Infrastructure層
 */

import { ISettingsRepository, SettingsValidationResult } from '../../../application/interfaces';
import { Settings } from '../../../domain/entities/Settings';

// 型定義
interface CacheEntry {
  data: any;
  timestamp: number;
}

interface Storage {
  get(key: string): Promise<Record<string, any>>;
  set(data: Record<string, any>): Promise<void>;
  onChanged(
    callback: (changes: Record<string, chrome.storage.StorageChange>, namespace: string) => void,
    namespace: string,
  ): () => void;
  getUsageStats?(): Promise<{ sync?: any }>;
}

export class SettingsRepository implements ISettingsRepository {
  private storage: Storage;
  private settingsKey: string = 'appSettings';
  private cache: Map<string, CacheEntry> = new Map();
  private cacheTimeout: number = 5000; // 5秒でキャッシュ無効化

  /**
   * @param storage - ストレージインターフェース
   */
  constructor(storage: Storage) {
    this.storage = storage;
  }

  /**
   * 設定を取得
   * @returns 設定エンティティ
   */
  async getSettings(): Promise<Settings> {
    // キャッシュチェック
    const cachedData = this.cache.get(this.settingsKey);
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return Settings.fromJSON(cachedData.data);
    }

    try {
      const result = await this.storage.get(this.settingsKey);
      const settingsData = result[this.settingsKey];

      if (settingsData) {
        // キャッシュに保存
        this.cache.set(this.settingsKey, {
          data: settingsData,
          timestamp: Date.now(),
        });

        return Settings.fromJSON(settingsData);
      } else {
        // デフォルト設定を返す
        return this.getDefaultSettings();
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 設定を保存
   * @param settings - 設定エンティティ
   */
  async saveSettings(settings: Settings): Promise<void> {
    try {
      // バリデーション
      if (!settings || typeof settings.isValid !== 'function' || !settings.isValid()) {
        throw new Error('Invalid settings object');
      }

      const serializedData = settings.toJSON();
      await this.storage.set({ [this.settingsKey]: serializedData });

      // キャッシュ更新
      this.cache.set(this.settingsKey, {
        data: serializedData,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new SettingsRepositoryError('Failed to save settings', error);
    }
  }

  /**
   * 特定の設定値を更新
   * @param key - 設定キー
   * @param value - 新しい値
   * @returns 更新された設定
   */
  async updateSetting(key: string, value: any): Promise<Settings> {
    const settings = await this.getSettings();

    // 設定値を更新
    if (key in settings) {
      (settings as any)[key] = value;
      // 更新日時を手動で設定
      (settings as any).lastModified = new Date().toISOString();
      await this.saveSettings(settings);
    } else {
      throw new Error(`Setting key '${key}' does not exist`);
    }

    return settings;
  }

  /**
   * ジェスチャーの有効/無効を更新
   * @param gestureId - ジェスチャーID
   * @param enabled - 有効/無効
   * @returns 更新された設定
   */
  async updateGestureState(gestureId: string, enabled: boolean): Promise<Settings> {
    const settings = await this.getSettings();
    console.log('🔍 Debug - Before gesture state update:', {
      gestureId,
      enabled,
      currentState: settings.defaultGestureStates[gestureId],
      allStates: settings.defaultGestureStates,
    });

    settings.setGestureEnabled(gestureId, enabled);

    console.log('🔍 Debug - After gesture state update:', {
      gestureId,
      enabled,
      newState: settings.defaultGestureStates[gestureId],
      allStates: settings.defaultGestureStates,
    });

    await this.saveSettings(settings);
    return settings;
  }

  /**
   * 除外サイトを追加
   * @param pattern - URLパターン
   * @returns 更新された設定
   */
  async addExcludeSite(pattern: string): Promise<Settings> {
    const settings = await this.getSettings();
    settings.addExcludeSite(pattern);
    await this.saveSettings(settings);
    return settings;
  }

  /**
   * 除外サイトを削除
   * @param pattern - URLパターン
   * @returns 更新された設定
   */
  async removeExcludeSite(pattern: string): Promise<Settings> {
    const settings = await this.getSettings();
    settings.removeExcludeSite(pattern);
    await this.saveSettings(settings);
    return settings;
  }

  /**
   * 軌跡設定を更新
   * @param color - 色
   * @param width - 太さ
   * @returns 更新された設定
   */
  async updateStrokeSettings(color: string, width: number): Promise<Settings> {
    const settings = await this.getSettings();
    settings.setStrokeSettings(color, width);
    await this.saveSettings(settings);
    return settings;
  }

  /**
   * 閾値を更新
   * @param threshold - 新しい閾値
   * @returns 更新された設定
   */
  async updateThreshold(threshold: number): Promise<Settings> {
    const settings = await this.getSettings();
    settings.setThreshold(threshold);
    await this.saveSettings(settings);
    return settings;
  }

  /**
   * デバッグ設定を更新
   * @param debugConfig - デバッグ設定
   * @returns 更新された設定
   */
  async updateDebugSettings(debugConfig: any): Promise<Settings> {
    console.log('🔧 [Debug] SettingsRepository.updateDebugSettings called:', {
      debugConfig: debugConfig,
      logLevel: debugConfig.logLevel,
    });

    const settings = await this.getSettings();
    console.log('🔧 [Debug] Current settings before update:', {
      currentDebugSettings: (settings as any).debugSettings,
      currentLogLevel: (settings as any).debugSettings?.logLevel,
    });

    settings.setDebugSettings(debugConfig);
    console.log('🔧 [Debug] Settings after setDebugSettings:', {
      updatedDebugSettings: (settings as any).debugSettings,
      updatedLogLevel: (settings as any).debugSettings?.logLevel,
    });

    await this.saveSettings(settings);
    console.log('🔧 [Debug] Settings saved successfully');

    return settings;
  }

  /**
   * 設定をデフォルトにリセット
   * @returns デフォルト設定
   */
  async resetToDefaults(): Promise<Settings> {
    const defaultSettings = this.getDefaultSettings();
    await this.saveSettings(defaultSettings);
    return defaultSettings;
  }

  /**
   * 設定変更を監視
   * @param callback - 変更時コールバック
   * @returns リスナー削除関数
   */
  onSettingsChanged(callback: (newSettings: Settings, oldSettings?: Settings) => void): () => void {
    return this.storage.onChanged((changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
      if (namespace === 'sync' && changes[this.settingsKey]) {
        // キャッシュを無効化
        this.cache.delete(this.settingsKey);

        const newSettings = Settings.fromJSON(changes[this.settingsKey].newValue);
        const oldSettings = changes[this.settingsKey].oldValue
          ? Settings.fromJSON(changes[this.settingsKey].oldValue)
          : undefined;

        callback(newSettings, oldSettings);
      }
    }, 'sync');
  }

  /**
   * デフォルト設定を取得
   * @returns デフォルト設定
   */
  private getDefaultSettings(): Settings {
    return Settings.getDefaults();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * 設定の整合性チェック
   * @returns バリデーション結果
   */
  async validateSettings(): Promise<SettingsValidationResult> {
    const validation: SettingsValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    try {
      const settings = await this.getSettings();

      // 基本バリデーション
      if (!settings.isValid()) {
        validation.isValid = false;
        validation.errors.push('Settings object is invalid');
      }

      // 閾値範囲チェック
      if ((settings as any).gestureThreshold < 5 || (settings as any).gestureThreshold > 100) {
        validation.warnings.push('Gesture threshold is outside recommended range (5-100)');
      }

      // 除外リストチェック
      const excludeList = settings.getExcludeList();
      if (excludeList.length > 20) {
        validation.warnings.push('Exclude list is very long (>20 items)');
      }

      // 色設定チェック
      if (!settings.isValidColor((settings as any).strokeColor)) {
        validation.errors.push('Invalid stroke color format');
        validation.isValid = false;
      }
    } catch (error) {
      validation.isValid = false;
      validation.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return validation;
  }
}

/**
 * SettingsRepository専用エラークラス
 */
class SettingsRepositoryError extends Error {
  public originalError: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'SettingsRepositoryError';
    this.originalError = originalError;
  }
}
