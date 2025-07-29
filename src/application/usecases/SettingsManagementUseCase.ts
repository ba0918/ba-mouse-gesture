/**
 * SettingsManagementUseCase
 * 設定管理のビジネスロジックを統合するUseCaseクラス
 */

import { Settings, DebugSettings } from '../../domain/entities'

// Repository interfaces
interface SettingsRepository {
  getSettings(): Promise<Settings>
  updateSetting(key: string, value: unknown): Promise<Settings>
  updateStrokeSettings(color: string, width: number): Promise<Settings>
  updateThreshold(threshold: number): Promise<Settings>
  updateGestureState(gestureId: string, enabled: boolean): Promise<Settings>
  addExcludeSite(pattern: string): Promise<Settings>
  removeExcludeSite(pattern: string): Promise<Settings>
  updateDebugSettings(debugConfig: Partial<DebugSettings>): Promise<Settings>
  resetToDefaults(): Promise<Settings>
  createBackup(): Promise<SettingsBackupData>
  restoreFromBackup(backup: SettingsBackupData): Promise<Settings>
  validateSettings(): Promise<SettingsValidationResult>
  getRepositoryStatus(): Promise<Record<string, unknown>>
  onSettingsChanged(callback: (newSettings: Settings, oldSettings?: Settings) => void): () => void
  storageAdapter?: {
    get(keys: string | string[]): Promise<Record<string, unknown>>
    set(data: Record<string, unknown>): Promise<void>
  }
}

interface ChromeMessagingAdapter {
  sendMessage(message: unknown, options?: { expectResponse?: boolean }): Promise<unknown>
}

// Types for internal use
interface SettingsBackupData {
  timestamp: string
  version: string
  settings: Record<string, unknown>
}

interface SettingsValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

interface SettingsChangeData {
  type: string
  newSettings: Record<string, unknown>
  oldSettings: Record<string, unknown> | null
  timestamp: string
}

export class SettingsManagementUseCase {
  private messagingAdapter?: ChromeMessagingAdapter

  constructor(private settingsRepository: SettingsRepository) {}

  /**
   * 現在の設定を取得
   */
  async getCurrentSettings(): Promise<Settings> {
    try {
      return await this.settingsRepository.getSettings()
    } catch (error) {
      throw new SettingsManagementError('Failed to get current settings', error as Error)
    }
  }

  /**
   * 機能の有効/無効を切り替え
   */
  async toggleExtension(enabled: boolean): Promise<Settings> {
    try {
      const result = await this.settingsRepository.updateSetting('enabled', enabled)

      // 設定変更通知
      await this.notifySettingsChange('extension_toggled', { enabled })

      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to toggle extension', error as Error)
    }
  }

  /**
   * 軌跡表示設定を更新
   */
  async updateStrokeSettings(color: string, width: number): Promise<Settings> {
    try {
      // 入力値の検証
      this.validateStrokeSettings(color, width)

      const result = await this.settingsRepository.updateStrokeSettings(color, width)

      // 設定変更通知
      await this.notifySettingsChange('stroke_settings_updated', { color, width })

      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to update stroke settings', error as Error)
    }
  }

  /**
   * ジェスチャー検出閾値を更新
   */
  async updateGestureThreshold(threshold: number): Promise<Settings> {
    try {
      // 入力値の検証
      this.validateThreshold(threshold)

      const result = await this.settingsRepository.updateThreshold(threshold)

      // 設定変更通知
      await this.notifySettingsChange('threshold_updated', { threshold })

      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to update gesture threshold', error as Error)
    }
  }

  /**
   * 特定ジェスチャーの有効/無効を切り替え（標準ジェスチャーのみ）
   */
  async toggleGesture(gestureId: string, enabled: boolean): Promise<Settings> {
    try {
      // カスタムジェスチャーIDの場合はエラー
      if (gestureId.startsWith('custom_')) {
        throw new Error(`This method is for default gestures only. Use CustomGestureManagementUseCase for custom gestures: ${gestureId}`)
      }
      
      console.log('🔍 Debug - Original gestureId received:', gestureId, 'enabled:', enabled);
      
      // ジェスチャーIDの検証（標準ジェスチャーのみ）
      this.validateGestureId(gestureId)

      // Action名からジェスチャーIDへのマッピング（実際のリポジトリ操作用）
      const actualGestureId = this.mapActionToGestureId(gestureId);

      console.log('🔍 Debug - Mapped gestureId:', {
        originalId: gestureId,
        mappedId: actualGestureId,
        enabled: enabled,
        isActionName: gestureId !== actualGestureId
      });

      const result = await this.settingsRepository.updateGestureState(actualGestureId, enabled)

      // 設定変更通知
      await this.notifySettingsChange('gesture_toggled', { gestureId: actualGestureId, enabled })

      return result
    } catch (error) {
      console.error('❌ SettingsManagementUseCase.toggleGesture failed:', error);
      throw new SettingsManagementError('Failed to toggle gesture', error as Error)
    }
  }

  /**
   * 除外サイトを追加
   */
  async addExcludeSite(pattern: string): Promise<Settings> {
    try {
      // パターンの検証
      this.validateUrlPattern(pattern)

      const result = await this.settingsRepository.addExcludeSite(pattern)

      // 設定変更通知
      await this.notifySettingsChange('exclude_site_added', { pattern })

      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to add exclude site', error as Error)
    }
  }

  /**
   * 除外サイトを削除
   */
  async removeExcludeSite(pattern: string): Promise<Settings> {
    try {
      const result = await this.settingsRepository.removeExcludeSite(pattern)

      // 設定変更通知
      await this.notifySettingsChange('exclude_site_removed', { pattern })

      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to remove exclude site', error as Error)
    }
  }

  /**
   * デバッグ設定を更新
   */
  async updateDebugSettings(debugConfig: Partial<DebugSettings>): Promise<Settings> {
    try {
      // デバッグ設定の検証
      this.validateDebugSettings(debugConfig)

      const result = await this.settingsRepository.updateDebugSettings(debugConfig)

      // DebugSettingsUseCaseへの同期（2つのシステム統合）
      try {
        const { DebugSettingsUseCase } = await import('./DebugSettingsUseCase.js');
        const debugSettingsUseCase = new DebugSettingsUseCase();
        
        // SettingsからDebugSettingsEntityへの変換
        let logLevel = typeof debugConfig.debugLogLevel === 'string' 
          ? parseInt(debugConfig.debugLogLevel, 10) 
          : (debugConfig.debugLogLevel ?? 2);
        
        // logLevelの範囲チェック（0-3）
        if (isNaN(logLevel) || logLevel < 0 || logLevel > 3) {
          console.warn('⚠️ Invalid logLevel value:', debugConfig.debugLogLevel, 'defaulting to 2');
          logLevel = 2;
        }
        
        const debugSettingsEntity = {
          enabled: debugConfig.debugEnabled ?? false,
          logLevel: logLevel,
          showStatus: debugConfig.debugShowStatus ?? false,
          statusPosition: debugConfig.debugStatusPosition ?? 'top-right'
        };
        
        console.log('🔄 Syncing debug settings:', {
          original: debugConfig,
          converted: debugSettingsEntity
        });
        
        const savedEntity = await debugSettingsUseCase.saveDebugSettings(debugSettingsEntity);
        console.log('✅ Debug settings synchronized to DebugSettingsUseCase:', savedEntity.getSyncInfo());
      } catch (syncError) {
        console.warn('⚠️ Failed to sync debug settings to DebugSettingsUseCase:', syncError);
      }

      // 設定変更通知
      await this.notifySettingsChange('debug_settings_updated', debugConfig)

      return result
    } catch (error) {
      console.error('❌ SettingsManagementUseCase.updateDebugSettings error:', error)
      throw new SettingsManagementError('Failed to update debug settings', error as Error)
    }
  }

  /**
   * 設定をデフォルトにリセット
   */
  async resetToDefaults(): Promise<Settings> {
    try {
      const result = await this.settingsRepository.resetToDefaults()

      // 設定変更通知
      await this.notifySettingsChange('settings_reset', {})

      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to reset settings to defaults', error as Error)
    }
  }

  /**
   * 設定のバックアップを作成
   */
  async createSettingsBackup(): Promise<SettingsBackupData> {
    try {
      return await this.settingsRepository.createBackup()
    } catch (error) {
      throw new SettingsManagementError('Failed to create settings backup', error as Error)
    }
  }

  /**
   * バックアップから設定を復元
   */
  async restoreSettingsFromBackup(backup: SettingsBackupData): Promise<Settings> {
    try {
      // バックアップデータの検証
      this.validateBackupData(backup)

      const result = await this.settingsRepository.restoreFromBackup(backup)

      // 設定変更通知
      await this.notifySettingsChange('settings_restored', { timestamp: backup.timestamp })

      return result
    } catch (error) {
      throw new SettingsManagementError('Failed to restore settings from backup', error as Error)
    }
  }

  /**
   * 設定の整合性チェック
   */
  async validateCurrentSettings(): Promise<SettingsValidationResult> {
    try {
      return await this.settingsRepository.validateSettings()
    } catch (error) {
      throw new SettingsManagementError('Failed to validate settings', error as Error)
    }
  }

  /**
   * 設定の使用統計を取得
   */
  async getSettingsUsageStats(): Promise<Record<string, unknown>> {
    try {
      const settings = await this.settingsRepository.getSettings()
      const repoStatus = await this.settingsRepository.getRepositoryStatus()

      return {
        enabled: settings.isEnabled(),
        enabledGestures: this.countEnabledGestures(settings),
        totalGestures: Object.keys(settings.defaultGestureStates).length,
        excludeListSize: settings.getExcludeList().length,
        strokeSettings: settings.getStrokeSettings(),
        threshold: settings.gestureThreshold,
        debugSettings: settings.getDebugSettings(),
        lastModified: settings.lastModified,
        repositoryStatus: repoStatus
      } as unknown as Record<string, unknown>
    } catch (error) {
      throw new SettingsManagementError('Failed to get settings usage stats', error as Error)
    }
  }

  /**
   * 設定変更の監視を開始
   */
  watchSettingsChanges(callback: (data: SettingsChangeData) => void): () => void {
    try {
      return this.settingsRepository.onSettingsChanged((newSettings, oldSettings) => {
        callback({
          type: 'settings_changed',
          newSettings: newSettings.toJSON() as unknown as Record<string, unknown>,
          oldSettings: oldSettings ? oldSettings.toJSON() as unknown as Record<string, unknown> : null,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Failed to watch settings changes:', error)
      return () => { } // 空の停止関数を返す
    }
  }

  // ========================================
  // 旧SettingsUseCase互換メソッド（統合後）
  // ========================================

  /**
   * 設定を取得（旧SettingsUseCaseインターフェース互換）
   */
  async getSettings(): Promise<Record<string, unknown>> {
    try {
      const settings = await this.getCurrentSettings()
      const settingsJSON = settings.toJSON()

      return settingsJSON as unknown as Record<string, unknown>
    } catch (error) {
      console.error('❌ SettingsManagementUseCase: Failed to load settings:', error)
      return this.getDefaultSettings()
    }
  }

  /**
   * 設定を保存（旧SettingsUseCaseインターフェース互換）
   */
  async saveSettings(settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    try {
      // 設定の各フィールドをそれぞれ更新
      if (settings.enabled !== undefined) {
        await this.toggleExtension(settings.enabled as boolean)
      }

      if (settings.strokeColor !== undefined || settings.strokeWidth !== undefined) {
        const currentSettings = await this.getCurrentSettings()
        const color = (settings.strokeColor as string) || currentSettings.strokeColor
        const width = (settings.strokeWidth as number) || currentSettings.strokeWidth
        await this.updateStrokeSettings(color, width)
      }

      if (settings.gestureThreshold !== undefined) {
        await this.updateGestureThreshold(settings.gestureThreshold as number)
      }

      if (settings.excludeList !== undefined) {
        // 現在の除外リストをクリアして新しいものを設定
        const currentSettings = await this.getCurrentSettings()
        const currentList = currentSettings.getExcludeList()

        // 既存のアイテムを削除
        for (const item of currentList) {
          await this.removeExcludeSite(item)
        }

        // 新しいアイテムを追加
        for (const item of settings.excludeList as string[]) {
          await this.addExcludeSite(item)
        }
      }

      if (settings.defaultGestureStates !== undefined) {
        // 各ジェスチャーの状態を更新
        for (const [gestureId, enabled] of Object.entries(settings.defaultGestureStates as Record<string, boolean>)) {
          await this.toggleGesture(gestureId, enabled)
        }
      }

      console.log('✅ SettingsManagementUseCase: Settings saved successfully')

      // バックグラウンドスクリプトに設定変更を通知
      if (this.messagingAdapter) {
        try {
          await this.messagingAdapter.sendMessage({
            type: 'SETTINGS_UPDATED',
            settings: settings
          }, { expectResponse: false })
        } catch (error) {
          console.log('Settings update notification failed:', error)
        }
      }

      // 更新後の設定を返す
      const updatedSettings = await this.getCurrentSettings()
      return updatedSettings.toJSON() as unknown as Record<string, unknown>

    } catch (error) {
      console.error('❌ SettingsManagementUseCase: Failed to save settings:', error)
      throw error
    }
  }

  /**
   * デフォルト設定を取得（旧SettingsUseCaseインターフェース互換）
   */
  getDefaultSettings(): Record<string, unknown> {
    return {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      defaultGestureStates: {
        left: true,
        right: true,
        up: true,
        down: true,
        downright: true,
        upright: true,
        rightdown: true,
        updown: true,
        super_refresh: true,
        prev_tab: true,
        next_tab: true
      }
    }
  }

  /**
   * Chrome Storage APIの統一インターフェース
   */
  async chromeStorageGet(keys: string | string[]): Promise<Record<string, unknown>> {
    try {
      if (this.settingsRepository?.storageAdapter) {
        return await this.settingsRepository.storageAdapter.get(keys)
      } else {
        throw new Error('Storage adapter is not available')
      }
    } catch (error) {
      console.error('chromeStorageGet failed:', error)
      throw error
    }
  }

  /**
   * Chrome Storage APIの統一インターフェース
   */
  async chromeStorageSet(data: Record<string, unknown>): Promise<void> {
    try {
      if (this.settingsRepository?.storageAdapter) {
        return await this.settingsRepository.storageAdapter.set(data)
      } else {
        throw new Error('Storage adapter is not available')
      }
    } catch (error) {
      console.error('chromeStorageSet failed:', error)
      throw error
    }
  }

  // ========================================
  // Validation methods
  // ========================================

  private validateStrokeSettings(color: string, width: number): void {
    const settingsInstance = new Settings()
    if (!settingsInstance.isValidColor(color)) {
      throw new Error('Invalid color format. Expected hex color like #FF0000')
    }
    if (!settingsInstance.isValidWidth(width)) {
      throw new Error('Invalid width. Expected integer between 1 and 10')
    }
  }

  private validateThreshold(threshold: number): void {
    if (!Number.isInteger(threshold) || threshold < 5 || threshold > 100) {
      throw new Error('Invalid threshold. Expected integer between 5 and 100')
    }
  }

  private validateGestureId(gestureId: string): void {
    // Action名・ジェスチャーIDからジェスチャーIDへのマッピング
    const actionToGestureIdMap: Record<string, string> = {
      // アクション名 → ジェスチャーID
      'back': 'left',
      'forward': 'right', 
      'scroll_top': 'up',
      'scroll_bottom': 'down',
      'close_tab': 'downright',
      'new_tab': 'upright',
      'duplicate_tab': 'rightdown',
      'refresh': 'updown',
      'super_refresh': 'super_refresh',
      'prev_tab': 'prev_tab',
      'next_tab': 'next_tab',
      // ジェスチャーID → ジェスチャーID（UI側から直接IDが渡される場合）
      'left': 'left',
      'right': 'right',
      'up': 'up',
      'down': 'down',
      'downright': 'downright',
      'upright': 'upright',
      'rightdown': 'rightdown',
      'updown': 'updown'
    };

    const validGestureIds = [
      'left', 'right', 'up', 'down',
      'downright', 'upright', 'rightdown', 'updown',
      'super_refresh', 'prev_tab', 'next_tab'
    ];

    // アクション名またはジェスチャーIDが渡された場合は対応するジェスチャーIDに変換
    let actualGestureId = gestureId;
    if (actionToGestureIdMap[gestureId]) {
      actualGestureId = actionToGestureIdMap[gestureId];
      if (gestureId !== actualGestureId) {
        console.log('🔄 Action name mapped to gesture ID:', { action: gestureId, gestureId: actualGestureId });
      }
    }

    if (!validGestureIds.includes(actualGestureId)) {
      console.error('❌ Invalid gesture ID for standard gesture:', {
        originalId: gestureId,
        mappedId: actualGestureId,
        validIds: validGestureIds,
        isCustomId: gestureId.startsWith('custom_'),
        availableActions: Object.keys(actionToGestureIdMap)
      });
      throw new Error(`Invalid standard gesture ID: ${gestureId} (mapped: ${actualGestureId}). Valid IDs: ${validGestureIds.join(', ')}`);
    }
  }

  private mapActionToGestureId(gestureId: string): string {
    // Action名からジェスチャーIDへのマッピング + ジェスチャーIDからジェスチャーIDへのマッピング
    const actionToGestureIdMap: Record<string, string> = {
      // アクション名 → ジェスチャーID
      'back': 'left',
      'forward': 'right', 
      'scroll_top': 'up',
      'scroll_bottom': 'down',
      'close_tab': 'downright',
      'new_tab': 'upright',
      'duplicate_tab': 'rightdown',
      'refresh': 'updown',
      'super_refresh': 'super_refresh',
      'prev_tab': 'prev_tab',
      'next_tab': 'next_tab',
      // ジェスチャーID → ジェスチャーID（UI側から直接IDが渡される場合）
      'left': 'left',
      'right': 'right',
      'up': 'up',
      'down': 'down',
      'downright': 'downright',
      'upright': 'upright',
      'rightdown': 'rightdown',
      'updown': 'updown'
    };

    // マッピングが存在する場合は対応するジェスチャーIDに変換
    if (actionToGestureIdMap[gestureId]) {
      return actionToGestureIdMap[gestureId];
    }

    // マッピングが見つからない場合は元のIDをそのまま返す
    return gestureId;
  }

  private validateUrlPattern(pattern: string): void {
    if (!pattern || typeof pattern !== 'string' || pattern.trim().length === 0) {
      throw new Error('Invalid URL pattern. Pattern cannot be empty')
    }

    if (pattern.length > 200) {
      throw new Error('URL pattern too long. Maximum 200 characters')
    }
  }

  private validateDebugSettings(debugConfig: Partial<DebugSettings>): void {
    if (!debugConfig || typeof debugConfig !== 'object') {
      throw new Error('Invalid debug config. Expected object')
    }

    const validLogLevels = [0, 1, 2, 3]
    if (debugConfig.logLevel !== undefined && !validLogLevels.includes(debugConfig.logLevel)) {
      throw new Error('Invalid log level. Expected 0-3')
    }

    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right']
    if (debugConfig.statusPosition && !validPositions.includes(debugConfig.statusPosition)) {
      throw new Error('Invalid status position')
    }
  }

  private validateBackupData(backup: SettingsBackupData): void {
    if (!backup || !backup.settings) {
      throw new Error('Invalid backup data. Missing settings')
    }

    if (!backup.timestamp || !backup.version) {
      throw new Error('Invalid backup data. Missing metadata')
    }
  }

  private countEnabledGestures(settings: Settings): number {
    return Object.values(settings.defaultGestureStates).filter(Boolean).length
  }

  private async notifySettingsChange(type: string, data: Record<string, unknown>): Promise<void> {
    try {
      if (this.messagingAdapter) {
        await this.messagingAdapter.sendMessage({
          type: 'settings_changed',
          changeType: type,
          data: data,
          timestamp: new Date().toISOString()
        }, { expectResponse: false }).catch(error => {
          console.log('Settings change notification failed:', error)
        })
      }
    } catch (error) {
      console.error('Failed to notify settings change:', error)
    }
  }
}

/**
 * 設定管理専用エラークラス
 */
export class SettingsManagementError extends Error {
  readonly originalError?: Error

  constructor(message: string, originalError?: Error) {
    super(message)
    this.name = 'SettingsManagementError'
    this.originalError = originalError
  }
}