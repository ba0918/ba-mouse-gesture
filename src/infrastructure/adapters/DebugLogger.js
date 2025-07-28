/**
 * デバッグロガー
 * ログレベルに応じた出力制御を提供
 */
class DebugLogger {
  constructor(debugSettings) {
    this.debugSettings = debugSettings
  }

  /**
   * デバッグレベルのログ出力 (level: 3)
   */
  debug(message, ...args) {
    if (this.debugSettings && this.debugSettings.shouldLog(3)) {
      console.log(`🐛 [Debug] ${message}`, ...args)
    }
  }

  /**
   * 情報レベルのログ出力 (level: 2)
   */
  info(message, ...args) {
    if (this.debugSettings && this.debugSettings.shouldLog(2)) {
      console.log(`🔧 ${message}`, ...args)
    }
  }

  /**
   * 警告レベルのログ出力 (level: 1)
   */
  warn(message, ...args) {
    if (this.debugSettings && this.debugSettings.shouldLog(1)) {
      console.warn(`⚠️ ${message}`, ...args)
    }
  }

  /**
   * エラーレベルのログ出力 (level: 0)
   */
  error(message, ...args) {
    if (this.debugSettings && this.debugSettings.shouldLog(0)) {
      console.error(`❌ ${message}`, ...args)
    }
  }

  /**
   * デバッグ設定を更新
   */
  updateDebugSettings(debugSettings) {
    this.debugSettings = debugSettings
  }

  /**
   * ログレベル表示用ヘルパー
   */
  logLevel() {
    if (!this.debugSettings) return 'unknown'
    return this.debugSettings.logLevel
  }
}

// モジュールとして使用可能にする
if (typeof window !== 'undefined') {
  window.DebugLogger = DebugLogger
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DebugLogger }
}