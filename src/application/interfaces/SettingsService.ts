/**
 * SettingsService Interface
 * Application層の設定管理抽象化
 */

export interface GestureSettings {
  enabled: boolean
  strokeColor: string
  strokeWidth: number
  gestureThreshold: number
  excludeList: string[]
  defaultGestureStates?: Record<string, boolean>
  debugSettings?: {
    enabled: boolean
    logLevel: number
    showStatus: boolean
    statusPosition: string
  }
}

/**
 * 設定サービスのインターフェース
 */
export interface SettingsService {
  /**
   * 設定を読み込み
   */
  loadSettings(): Promise<GestureSettings>

  /**
   * 設定変更を監視
   */
  watchSettingsChanges(callback: (settings: GestureSettings) => void): void

  /**
   * サイトが除外対象かチェック
   */
  isExcludedSite(url?: string): boolean
}