/**
 * デバッグロガー
 * ログレベルに応じた出力制御を提供
 */

// Type definitions
export type LogLevel = 0 | 1 | 2 | 3

export interface DebugSettings {
  shouldLog(level: LogLevel): boolean
  logLevel: LogLevel
}

export class DebugLogger {
  private debugSettings: DebugSettings | null

  constructor(debugSettings: DebugSettings | null) {
    this.debugSettings = debugSettings
  }

  /**
   * デバッグレベルのログ出力 (level: 3)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.debugSettings && this.debugSettings.shouldLog(3)) {
      console.log(`🐛 [Debug] ${message}`, ...args)
    }
  }

  /**
   * 情報レベルのログ出力 (level: 2)
   */
  info(message: string, ...args: unknown[]): void {
    if (this.debugSettings && this.debugSettings.shouldLog(2)) {
      console.log(`🔧 ${message}`, ...args)
    }
  }

  /**
   * 警告レベルのログ出力 (level: 1)
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.debugSettings && this.debugSettings.shouldLog(1)) {
      console.warn(`⚠️ ${message}`, ...args)
    }
  }

  /**
   * エラーレベルのログ出力 (level: 0)
   */
  error(message: string, ...args: unknown[]): void {
    if (this.debugSettings && this.debugSettings.shouldLog(0)) {
      console.error(`❌ ${message}`, ...args)
    }
  }

  /**
   * デバッグ設定を更新
   */
  updateDebugSettings(debugSettings: DebugSettings): void {
    this.debugSettings = debugSettings
  }

  /**
   * ログレベル表示用ヘルパー
   */
  logLevel(): LogLevel | 'unknown' {
    if (!this.debugSettings) return 'unknown'
    return this.debugSettings.logLevel
  }
}

