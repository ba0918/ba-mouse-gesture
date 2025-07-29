/**
 * SettingsServiceImpl
 * ISettingsServiceの具象実装クラス
 * Presentation層からApplication層への橋渡しを行う
 */

import { SettingsManagementUseCase } from '../../usecases/SettingsManagementUseCase.js';
import { Settings, DebugSettings, DefaultGestureStates } from '../../../domain/entities/Settings.js';

// DTO型定義
interface SettingsDTO {
  enabled: boolean;
  stroke: { color: string; width: number };
  gestureThreshold: number;
  excludeList: string[];
  gestureStates: DefaultGestureStates;
  debugSettings: DebugSettings;
  version: string;
  lastModified: string;
}

interface SettingsBackupDTO {
  timestamp: string;
  version: string;
  settings: Record<string, unknown>;
}

interface SettingsValidationDTO {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface SettingsUsageStatsDTO {
  enabled: boolean;
  enabledGestures: number;
  totalGestures: number;
  excludeListSize: number;
  strokeSettings: { color: string; width: number };
  threshold: number;
  debugSettings: DebugSettings;
  lastModified: string;
  repositoryStatus: Record<string, unknown>;
}

interface SettingsChangeEvent {
  type: 'settings_changed';
  newSettings: SettingsDTO;
  oldSettings: SettingsDTO | null;
  timestamp: string;
}

export class SettingsServiceImpl {
  constructor(private settingsManagementUseCase: SettingsManagementUseCase) {}

  /**
   * 現在の設定を取得
   */
  async getCurrentSettings(): Promise<SettingsDTO> {
    const settings = await this.settingsManagementUseCase.getCurrentSettings();
    
    return {
      enabled: settings.isEnabled(),
      stroke: settings.getStrokeSettings(),
      gestureThreshold: settings.gestureThreshold,
      excludeList: settings.getExcludeList(),
      gestureStates: settings.defaultGestureStates,
      debugSettings: settings.getDebugSettings(),
      version: settings.version,
      lastModified: settings.lastModified
    };
  }

  /**
   * 拡張機能の有効/無効を切り替え
   */
  async toggleExtension(enabled: boolean): Promise<SettingsDTO> {
    const updatedSettings = await this.settingsManagementUseCase.toggleExtension(enabled);
    
    return this.settingsToDTO(updatedSettings);
  }

  /**
   * 軌跡表示設定を更新
   */
  async updateStrokeSettings(color: string, width: number): Promise<SettingsDTO> {
    const updatedSettings = await this.settingsManagementUseCase.updateStrokeSettings(color, width);
    
    return this.settingsToDTO(updatedSettings);
  }

  /**
   * ジェスチャー検出閾値を更新
   */
  async updateGestureThreshold(threshold: number): Promise<SettingsDTO> {
    const updatedSettings = await this.settingsManagementUseCase.updateGestureThreshold(threshold);
    
    return this.settingsToDTO(updatedSettings);
  }

  /**
   * 特定ジェスチャーの有効/無効を切り替え
   */
  async toggleGesture(gestureId: string, enabled: boolean): Promise<SettingsDTO> {
    const updatedSettings = await this.settingsManagementUseCase.toggleGesture(gestureId, enabled);
    
    return this.settingsToDTO(updatedSettings);
  }

  /**
   * 除外サイトを追加
   */
  async addExcludeSite(pattern: string): Promise<SettingsDTO> {
    const updatedSettings = await this.settingsManagementUseCase.addExcludeSite(pattern);
    
    return this.settingsToDTO(updatedSettings);
  }

  /**
   * 除外サイトを削除
   */
  async removeExcludeSite(pattern: string): Promise<SettingsDTO> {
    const updatedSettings = await this.settingsManagementUseCase.removeExcludeSite(pattern);
    
    return this.settingsToDTO(updatedSettings);
  }

  /**
   * デバッグ設定を更新
   */
  async updateDebugSettings(debugConfig: Partial<DebugSettings>): Promise<SettingsDTO> {
    const updatedSettings = await this.settingsManagementUseCase.updateDebugSettings(debugConfig);
    
    return this.settingsToDTO(updatedSettings);
  }

  /**
   * 設定をデフォルトにリセット
   */
  async resetToDefaults(): Promise<SettingsDTO> {
    const updatedSettings = await this.settingsManagementUseCase.resetToDefaults();
    
    return this.settingsToDTO(updatedSettings);
  }

  /**
   * 設定のバックアップを作成
   */
  async createSettingsBackup(): Promise<SettingsBackupDTO> {
    const backup = await this.settingsManagementUseCase.createSettingsBackup();
    
    return {
      timestamp: backup.timestamp,
      version: backup.version,
      settings: backup.settings
    };
  }

  /**
   * バックアップから設定を復元
   */
  async restoreSettingsFromBackup(backup: SettingsBackupDTO): Promise<SettingsDTO> {
    const restoredSettings = await this.settingsManagementUseCase.restoreSettingsFromBackup(backup);
    
    return this.settingsToDTO(restoredSettings);
  }

  /**
   * 設定の整合性チェック
   */
  async validateCurrentSettings(): Promise<SettingsValidationDTO> {
    const validation = await this.settingsManagementUseCase.validateCurrentSettings();
    
    return {
      isValid: validation.isValid,
      errors: validation.errors,
      warnings: validation.warnings
    };
  }

  /**
   * 設定の使用統計を取得
   */
  async getSettingsUsageStats(): Promise<SettingsUsageStatsDTO> {
    const stats = await this.settingsManagementUseCase.getSettingsUsageStats();
    
    return {
      enabled: stats.enabled as boolean,
      enabledGestures: stats.enabledGestures as number,
      totalGestures: stats.totalGestures as number,
      excludeListSize: stats.excludeListSize as number,
      strokeSettings: stats.strokeSettings as { color: string; width: number },
      threshold: stats.threshold as number,
      debugSettings: stats.debugSettings as DebugSettings,
      lastModified: stats.lastModified as string,
      repositoryStatus: stats.repositoryStatus as Record<string, unknown>
    };
  }

  /**
   * 設定変更の監視を開始
   */
  watchSettingsChanges(callback: (change: SettingsChangeEvent) => void): () => void {
    return this.settingsManagementUseCase.watchSettingsChanges((change) => {
      // Application層の変更イベントをPresentation層用に変換
      const dto: SettingsChangeEvent = {
        type: 'settings_changed',
        newSettings: this.recordToSettingsDTO(change.newSettings),
        oldSettings: change.oldSettings ? this.recordToSettingsDTO(change.oldSettings) : null,
        timestamp: change.timestamp
      };
      
      callback(dto);
    });
  }

  /**
   * Settings エンティティを DTO に変換
   */
  private settingsToDTO(settings: Settings): SettingsDTO {
    return {
      enabled: settings.isEnabled(),
      stroke: settings.getStrokeSettings(),
      gestureThreshold: settings.gestureThreshold,
      excludeList: settings.getExcludeList(),
      gestureStates: settings.defaultGestureStates,
      debugSettings: settings.getDebugSettings(),
      version: settings.version,
      lastModified: settings.lastModified
    };
  }

  /**
   * Record<string, unknown> を SettingsDTO に変換
   */
  private recordToSettingsDTO(record: Record<string, unknown>): SettingsDTO {
    return {
      enabled: Boolean(record.enabled),
      stroke: record.stroke as SettingsDTO['stroke'],
      gestureThreshold: Number(record.gestureThreshold) || 15,
      excludeList: (record.excludeList as string[]) || [],
      gestureStates: record.gestureStates as SettingsDTO['gestureStates'] || {},
      debugSettings: record.debugSettings as SettingsDTO['debugSettings'] || { enabled: false, level: 'info' },
      version: String(record.version) || '1.0.0',
      lastModified: String(record.lastModified) || new Date().toISOString()
    };
  }
}