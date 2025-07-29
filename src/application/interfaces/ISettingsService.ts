/**
 * ISettingsService
 * 設定管理機能のインターフェース定義
 * Presentation層とApplication層の境界を定義
 */

import { DebugSettings, DefaultGestureStates } from '../../domain/entities'

// DTO definitions (Data Transfer Objects)

/**
 * 軌跡設定DTO
 */
export interface StrokeSettingsDTO {
  color: string
  width: number
}

/**
 * 設定DTO
 */
export interface SettingsDTO {
  enabled: boolean
  stroke: StrokeSettingsDTO
  gestureThreshold: number
  excludeList: string[]
  gestureStates: DefaultGestureStates
  debugSettings: DebugSettings
  version: string
  lastModified: string
}

/**
 * 設定バックアップDTO
 */
export interface SettingsBackupDTO {
  timestamp: string
  version: string
  settings: SettingsDTO
}

/**
 * 設定検証結果DTO
 */
export interface SettingsValidationDTO {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * 設定使用統計DTO
 */
export interface SettingsUsageStatsDTO {
  enabled: boolean
  enabledGestures: number
  totalGestures: number
  excludeListSize: number
  strokeSettings: StrokeSettingsDTO
  threshold: number
  debugSettings: DebugSettings
  lastModified: string
  repositoryStatus: Record<string, unknown>
}

/**
 * 設定変更コールバック関数の型定義
 */
export type SettingsChangeCallback = (settings: SettingsDTO) => void

/**
 * 設定サービスのインターフェース
 */
export interface ISettingsService {
  /**
   * 現在の設定を取得
   */
  getCurrentSettings(): Promise<SettingsDTO>

  /**
   * 拡張機能の有効/無効を切り替え
   */
  toggleExtension(enabled: boolean): Promise<SettingsDTO>

  /**
   * 軌跡表示設定を更新
   */
  updateStrokeSettings(color: string, width: number): Promise<SettingsDTO>

  /**
   * ジェスチャー検出閾値を更新
   */
  updateGestureThreshold(threshold: number): Promise<SettingsDTO>

  /**
   * 特定ジェスチャーの有効/無効を切り替え
   */
  toggleGesture(gestureId: string, enabled: boolean): Promise<SettingsDTO>

  /**
   * 除外サイトを追加
   */
  addExcludeSite(pattern: string): Promise<SettingsDTO>

  /**
   * 除外サイトを削除
   */
  removeExcludeSite(pattern: string): Promise<SettingsDTO>

  /**
   * デバッグ設定を更新
   */
  updateDebugSettings(debugConfig: Partial<DebugSettings>): Promise<SettingsDTO>

  /**
   * 設定をデフォルトにリセット
   */
  resetToDefaults(): Promise<SettingsDTO>

  /**
   * 設定のバックアップを作成
   */
  createSettingsBackup(): Promise<SettingsBackupDTO>

  /**
   * バックアップから設定を復元
   */
  restoreSettingsFromBackup(backup: SettingsBackupDTO): Promise<SettingsDTO>

  /**
   * 設定の整合性チェック
   */
  validateCurrentSettings(): Promise<SettingsValidationDTO>

  /**
   * 設定の使用統計を取得
   */
  getSettingsUsageStats(): Promise<SettingsUsageStatsDTO>

  /**
   * 設定変更の監視を開始
   * @returns 監視停止関数
   */
  watchSettingsChanges(callback: SettingsChangeCallback): () => void
}