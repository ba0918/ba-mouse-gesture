/**
 * デバッグ設定エンティティ
 * Domain層 - ビジネスルールとエンティティ
 */
class DebugSettingsEntity {
  constructor({
    enabled = true,
    logLevel = 2, // INFO レベル
    showStatus = true,
    statusPosition = 'top-right'
  } = {}) {
    this.enabled = enabled
    this.logLevel = logLevel
    this.showStatus = showStatus
    this.statusPosition = statusPosition
  }

  /**
   * デバッグモードを有効化/無効化
   */
  toggleEnabled() {
    this.enabled = !this.enabled
    // デバッグ無効時は画面表示も無効化
    if (!this.enabled) {
      this.showStatus = false
    }
    return this.enabled
  }

  /**
   * 画面表示を有効化/無効化
   */
  toggleShowStatus() {
    // デバッグが無効の場合は画面表示も有効化できない
    if (!this.enabled) {
      return false
    }
    this.showStatus = !this.showStatus
    return this.showStatus
  }

  /**
   * ログレベルを設定
   */
  setLogLevel(level) {
    const validLevels = [0, 1, 2, 3] // ERROR, WARN, INFO, DEBUG
    if (!validLevels.includes(level)) {
      throw new Error(`Invalid log level: ${level}. Must be 0-3`)
    }
    this.logLevel = level
  }

  /**
   * 表示位置を設定
   */
  setStatusPosition(position) {
    const validPositions = ['top-right', 'top-left', 'bottom-right', 'bottom-left']
    if (!validPositions.includes(position)) {
      throw new Error(`Invalid status position: ${position}`)
    }
    this.statusPosition = position
  }

  /**
   * デバッグ表示が有効かどうか
   */
  shouldShowStatus() {
    return this.enabled && this.showStatus
  }

  /**
   * 指定レベルのログを出力すべきかどうか
   */
  shouldLog(level) {
    return this.enabled && level <= this.logLevel
  }

  /**
   * エンティティの妥当性検証
   */
  validate() {
    if (typeof this.enabled !== 'boolean') {
      throw new Error('enabled must be boolean')
    }
    if (!Number.isInteger(this.logLevel) || this.logLevel < 0 || this.logLevel > 3) {
      throw new Error('logLevel must be integer between 0-3')
    }
    if (typeof this.showStatus !== 'boolean') {
      throw new Error('showStatus must be boolean')
    }
    const validPositions = ['top-right', 'top-left', 'bottom-right', 'bottom-left']
    if (!validPositions.includes(this.statusPosition)) {
      throw new Error('statusPosition must be valid position string')
    }
    return true
  }

  /**
   * エンティティをプレーンオブジェクトに変換
   */
  toPlainObject() {
    return {
      enabled: this.enabled,
      logLevel: this.logLevel,
      showStatus: this.showStatus,
      statusPosition: this.statusPosition
    }
  }

  /**
   * プレーンオブジェクトからエンティティを作成
   */
  static fromPlainObject(obj) {
    return new DebugSettingsEntity(obj)
  }

  /**
   * デフォルト設定を取得
   */
  static getDefault() {
    return new DebugSettingsEntity({
      enabled: true,
      logLevel: 2,
      showStatus: true,
      statusPosition: 'top-right'
    })
  }
}

module.exports = DebugSettingsEntity