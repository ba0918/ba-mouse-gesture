/**
 * SettingsRepository
 * 設定データの永続化を担当するリポジトリ
 */

import { Settings, DefaultGestureStates } from '../../../domain/entities/Settings';

// 型定義
interface CacheEntry {
  data: any;
  timestamp: number;
}

interface Storage {
  get(key: string): Promise<Record<string, any>>;
  set(data: Record<string, any>): Promise<void>;
  onChanged(callback: (changes: Record<string, chrome.storage.StorageChange>, namespace: string) => void, namespace: string): () => void;
  getUsageStats?(): Promise<{ sync?: any }>;
}

interface BackupData {
  timestamp: string;
  version: string;
  settings: any;
}

interface RepositoryStatus {
  isHealthy: boolean;
  settingsLoaded?: boolean;
  cacheSize?: number;
  storage?: any;
  lastModified?: string | null;
  error?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SettingsRepository {
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
      return this.deserializeSettings(cachedData.data);
    }

    try {
      const result = await this.storage.get(this.settingsKey);
      const settingsData = result[this.settingsKey];
      
      if (settingsData) {
        // キャッシュに保存
        this.cache.set(this.settingsKey, {
          data: settingsData,
          timestamp: Date.now()
        });
        
        return this.deserializeSettings(settingsData);
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

      const serializedData = this.serializeSettings(settings);
      await this.storage.set({ [this.settingsKey]: serializedData });
      
      // キャッシュ更新
      this.cache.set(this.settingsKey, {
        data: serializedData,
        timestamp: Date.now()
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
    settings.setGestureEnabled(gestureId as keyof DefaultGestureStates, enabled);
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
      logLevel: debugConfig.logLevel
    });
    
    const settings = await this.getSettings();
    console.log('🔧 [Debug] Current settings before update:', {
      currentDebugSettings: (settings as any).debugSettings,
      currentLogLevel: (settings as any).debugSettings?.logLevel
    });
    
    settings.setDebugSettings(debugConfig);
    console.log('🔧 [Debug] Settings after setDebugSettings:', {
      updatedDebugSettings: (settings as any).debugSettings,
      updatedLogLevel: (settings as any).debugSettings?.logLevel
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
   * 設定データのバックアップを作成
   * @returns バックアップデータ
   */
  async createBackup(): Promise<BackupData> {
    const settings = await this.getSettings();
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      settings: this.serializeSettings(settings)
    };
  }

  /**
   * バックアップから設定を復元
   * @param backup - バックアップデータ
   * @returns 復元された設定
   */
  async restoreFromBackup(backup: BackupData): Promise<Settings> {
    if (!backup.settings) {
      throw new Error('Invalid backup data');
    }
    
    const settings = this.deserializeSettings(backup.settings);
    await this.saveSettings(settings);
    return settings;
  }

  /**
   * 設定変更を監視
   * @param callback - 変更時コールバック
   * @returns リスナー削除関数
   */
  onSettingsChanged(callback: (newSettings: Settings, oldSettings: Settings | null) => void): () => void {
    return this.storage.onChanged((changes: Record<string, chrome.storage.StorageChange>, namespace: string) => {
      if (namespace === 'sync' && changes[this.settingsKey]) {
        // キャッシュを無効化
        this.cache.delete(this.settingsKey);
        
        const newSettings = this.deserializeSettings(changes[this.settingsKey].newValue);
        const oldSettings = changes[this.settingsKey].oldValue ? 
          this.deserializeSettings(changes[this.settingsKey].oldValue) : null;
        
        callback(newSettings, oldSettings);
      }
    }, 'sync');
  }

  /**
   * 設定データをシリアライズ
   * @param settings 設定エンティティ
   * @returns シリアライズされたデータ
   */
  private serializeSettings(settings: Settings): any {
    return settings.toJSON();
  }

  /**
   * 設定データをデシリアライズ
   * @param data シリアライズされたデータ
   * @returns 設定エンティティ
   */
  private deserializeSettings(data: any): Settings {
    // Settings クラスの動的インポート
    const SettingsClass = (typeof window !== 'undefined' && (window as any).Settings) || Settings;
    return SettingsClass.fromJSON(data);
  }

  /**
   * デフォルト設定を取得
   * @returns デフォルト設定
   */
  private getDefaultSettings(): Settings {
    const SettingsClass = (typeof window !== 'undefined' && (window as any).Settings) || Settings;
    return SettingsClass.getDefaults();
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * リポジトリの状態確認
   * @returns リポジトリの状態
   */
  async getRepositoryStatus(): Promise<RepositoryStatus> {
    try {
      const settings = await this.getSettings();
      const storageStats = this.storage.getUsageStats ? await this.storage.getUsageStats() : { sync: {} };
      
      return {
        isHealthy: true,
        settingsLoaded: Boolean(settings),
        cacheSize: this.cache.size,
        storage: storageStats.sync || {},
        lastModified: (settings as any).lastModified || null
      };
    } catch (error) {
      return {
        isHealthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        cacheSize: this.cache.size
      };
    }
  }

  /**
   * 設定の整合性チェック
   * @returns バリデーション結果
   */
  async validateSettings(): Promise<ValidationResult> {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
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
export class SettingsRepositoryError extends Error {
  public originalError: any;

  constructor(message: string, originalError?: any) {
    super(message);
    this.name = 'SettingsRepositoryError';
    this.originalError = originalError;
  }
}

// ブラウザ環境対応
if (typeof window !== 'undefined') {
  (window as any).SettingsRepository = SettingsRepository;
  (window as any).SettingsRepositoryError = SettingsRepositoryError;
}