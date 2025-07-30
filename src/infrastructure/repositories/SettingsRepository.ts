/**
 * SettingsRepository
 * 設定データの永続化を担当するリポジトリ
 */

import { Settings, DefaultGestureStates } from '../../domain/entities/Settings'
import type { ChromeStorageAdapter } from '../adapters/ChromeStorageAdapter'

// Type definitions
interface CacheEntry {
  data: any
  timestamp: number
}

interface BackupData {
  timestamp: string
  version: string
  settings: any
}

interface RepositoryStatus {
  isHealthy: boolean
  settingsLoaded?: boolean
  cacheSize?: number
  storageAvailable?: boolean
  lastModified?: string | null
  error?: string
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

type SettingsChangeCallback = (newSettings: Settings, oldSettings: Settings | null) => void

interface StorageChanges {
  [key: string]: chrome.storage.StorageChange
}

export class SettingsRepository {
  private readonly storageAdapter: ChromeStorageAdapter
  private readonly settingsKey: string = 'appSettings'
  private readonly cache: Map<string, CacheEntry> = new Map()
  private readonly cacheTimeout: number = 5000 // 5秒でキャッシュ無効化

  constructor(storageAdapter: ChromeStorageAdapter) {
    this.storageAdapter = storageAdapter
  }

  /**
   * 設定を取得
   */
  async getSettings(): Promise<Settings> {
    // キャッシュチェック
    const cachedData = this.cache.get(this.settingsKey)
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return this.deserializeSettings(cachedData.data)
    }

    try {
      const result = await this.storageAdapter.get(this.settingsKey)
      const settingsData = result[this.settingsKey]
      
      if (settingsData) {
        // キャッシュに保存
        this.cache.set(this.settingsKey, {
          data: settingsData,
          timestamp: Date.now()
        })
        
        return this.deserializeSettings(settingsData)
      } else {
        // デフォルト設定を返す
        return this.getDefaultSettings()
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      return this.getDefaultSettings()
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
        throw new Error('Invalid settings object')
      }

      const serializedData = this.serializeSettings(settings)
      await this.storageAdapter.set({ [this.settingsKey]: serializedData })
      
      // キャッシュ更新
      this.cache.set(this.settingsKey, {
        data: serializedData,
        timestamp: Date.now()
      })
      
    } catch (error) {
      console.error('Failed to save settings:', error)
      throw new SettingsRepositoryError('Failed to save settings', error)
    }
  }

  /**
   * 特定の設定値を更新
   * @param key - 設定キー
   * @param value - 新しい値
   */
  async updateSetting(key: string, value: any): Promise<Settings> {
    const settings = await this.getSettings()
    
    // 設定値を更新（新しいSettingsインスタンスを作成）
    const updatedConfig = settings.toJSON()
    if (key in updatedConfig) {
      (updatedConfig as any)[key] = value
      const newSettings = Settings.fromJSON(updatedConfig)
      await this.saveSettings(newSettings)
      return newSettings
    } else {
      throw new Error(`Setting key '${key}' does not exist`)
    }
  }

  /**
   * ジェスチャーの有効/無効を更新
   * @param gestureId - ジェスチャーID
   * @param enabled - 有効/無効
   */
  async updateGestureState(gestureId: string, enabled: boolean): Promise<Settings> {
    const settings = await this.getSettings()
    settings.setGestureEnabled(gestureId, enabled)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 除外サイトを追加
   * @param pattern - URLパターン
   */
  async addExcludeSite(pattern: string): Promise<Settings> {
    const settings = await this.getSettings()
    settings.addExcludeSite(pattern)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 除外サイトを削除
   * @param pattern - URLパターン
   */
  async removeExcludeSite(pattern: string): Promise<Settings> {
    const settings = await this.getSettings()
    settings.removeExcludeSite(pattern)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 軌跡設定を更新
   * @param color - 色
   * @param width - 太さ
   */
  async updateStrokeSettings(color: string, width: number): Promise<Settings> {
    const settings = await this.getSettings()
    settings.setStrokeSettings(color, width)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 閾値を更新
   * @param threshold - 新しい閾値
   */
  async updateThreshold(threshold: number): Promise<void> {
    const settings = await this.getSettings()
    settings.setThreshold(threshold)
    await this.saveSettings(settings)
  }

  /**
   * デバッグ設定を更新
   * @param debugConfig - デバッグ設定
   */
  async updateDebugSettings(debugConfig: any): Promise<Settings> {
    const settings = await this.getSettings()
    settings.setDebugSettings(debugConfig)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 設定をデフォルトにリセット
   */
  async resetToDefaults(): Promise<Settings> {
    const defaultSettings = this.getDefaultSettings()
    await this.saveSettings(defaultSettings)
    return defaultSettings
  }

  /**
   * 設定データのバックアップを作成
   */
  async createBackup(): Promise<BackupData> {
    const settings = await this.getSettings()
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      settings: this.serializeSettings(settings)
    }
  }

  /**
   * バックアップから設定を復元
   * @param backup - バックアップデータ
   */
  async restoreFromBackup(backup: BackupData): Promise<Settings> {
    if (!backup.settings) {
      throw new Error('Invalid backup data')
    }
    
    const settings = this.deserializeSettings(backup.settings)
    await this.saveSettings(settings)
    return settings
  }

  /**
   * 設定変更を監視
   * @param callback - 変更時コールバック
   * @returns リスナー削除関数
   */
  onSettingsChanged(callback: SettingsChangeCallback): () => void {
    return this.storageAdapter.addChangeListener((changes, namespace) => {
      if (namespace === 'sync' && this.settingsKey in changes) {
        // キャッシュを無効化
        this.cache.delete(this.settingsKey)
        
        const typedChanges = changes as StorageChanges
        const changeRecord = typedChanges[this.settingsKey]
        const newSettings = this.deserializeSettings(changeRecord.newValue)
        const oldSettings = changeRecord.oldValue ? 
          this.deserializeSettings(changeRecord.oldValue) : null
        
        callback(newSettings, oldSettings)
      }
    })
  }

  /**
   * 設定データをシリアライズ
   */
  private serializeSettings(settings: Settings): any {
    return settings.toJSON()
  }

  /**
   * 設定データをデシリアライズ
   */
  private deserializeSettings(data: any): Settings {
    console.log('🔧 [Debug] SettingsRepository.deserializeSettings called with:', {
      rawData: data,
      debugSettings: data?.debugSettings,
      debugLogLevel: data?.debugSettings?.logLevel,
      debugLogLevelType: typeof data?.debugSettings?.logLevel
    })
    
    const settings = Settings.fromJSON(data)
    
    console.log('🔧 [Debug] SettingsRepository.deserializeSettings result:', {
      settingsEntity: settings,
      debugSettings: settings.debugSettings,
      debugLogLevel: settings.debugSettings?.logLevel,
      debugLogLevelType: typeof settings.debugSettings?.logLevel
    })
    
    return settings
  }

  /**
   * デフォルト設定を取得
   */
  private getDefaultSettings(): Settings {
    return Settings.getDefaults()
  }

  /**
   * キャッシュをクリア
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * リポジトリの状態確認
   */
  async getRepositoryStatus(): Promise<RepositoryStatus> {
    try {
      const settings = await this.getSettings()
      const isStorageAvailable = this.storageAdapter.isAvailable()
      
      return {
        isHealthy: true,
        settingsLoaded: Boolean(settings),
        cacheSize: this.cache.size,
        storageAvailable: isStorageAvailable,
        lastModified: settings ? settings.lastModified : null
      }
    } catch (error) {
      return {
        isHealthy: false,
        error: (error as Error).message,
        cacheSize: this.cache.size
      }
    }
  }

  /**
   * 設定の整合性チェック
   */
  async validateSettings(): Promise<ValidationResult> {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: []
    }
    
    try {
      const settings = await this.getSettings()
      
      // 基本バリデーション
      if (!settings.isValid()) {
        validation.isValid = false
        validation.errors.push('Settings object is invalid')
      }
      
      // 閾値範囲チェック
      if (settings.gestureThreshold < 5 || settings.gestureThreshold > 100) {
        validation.warnings.push('Gesture threshold is outside recommended range (5-100)')
      }
      
      // 除外リストチェック
      const excludeList = settings.getExcludeList()
      if (excludeList.length > 20) {
        validation.warnings.push('Exclude list is very long (>20 items)')
      }
      
      // 色設定チェック
      if (!settings.isValidColor(settings.strokeColor)) {
        validation.errors.push('Invalid stroke color format')
        validation.isValid = false
      }
      
    } catch (error) {
      validation.isValid = false
      validation.errors.push(`Validation error: ${(error as Error).message}`)
    }
    
    return validation
  }
}

/**
 * SettingsRepository専用エラークラス
 */
export class SettingsRepositoryError extends Error {
  readonly originalError?: unknown

  constructor(message: string, originalError?: unknown) {
    super(message)
    this.name = 'SettingsRepositoryError'
    this.originalError = originalError
  }
}

// CommonJS export for Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SettingsRepository, SettingsRepositoryError }
}