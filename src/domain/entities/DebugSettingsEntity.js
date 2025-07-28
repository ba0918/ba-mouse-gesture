/**
 * デバッグ設定のドメインエンティティ
 * ビジネスロジックと検証を含む
 * 
 * 🎯 修正：統一されたストレージアクセスに対応
 * popup-content script間の同期問題を解決
 */
class DebugSettingsEntity {
  constructor({
    enabled = false,
    logLevel = 2, // INFO レベル
    showStatus = false,  
    statusPosition = 'top-right',
    createdAt = null,
    updatedAt = null
  } = {}) {
    this.enabled = enabled
    this.logLevel = logLevel
    this.showStatus = showStatus
    this.statusPosition = statusPosition
    
    // タイムスタンプ管理
    this.createdAt = createdAt || new Date().toISOString()
    this.updatedAt = updatedAt || new Date().toISOString()
    
    // 検証を実行
    this.validate()
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
    this.updatedAt = new Date().toISOString()
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
    this.updatedAt = new Date().toISOString()
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
    this.updatedAt = new Date().toISOString()
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
    this.updatedAt = new Date().toISOString()
  }

  /**
   * 複数の設定を一括更新
   */
  updateSettings(newSettings) {
    const updated = new DebugSettingsEntity({
      ...this.toPlainObject(),
      ...newSettings,
      updatedAt: new Date().toISOString()
    })
    
    return updated
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
   * 🎯 新機能：popup-content script間の同期検証
   * 両方で同じ設定を持っているかを確認
   */
  validateSyncConsistency(otherSettings) {
    if (!otherSettings) {
      return {
        isConsistent: false,
        inconsistencies: ['Other settings is null or undefined']
      }
    }

    const other = otherSettings instanceof DebugSettingsEntity 
      ? otherSettings 
      : new DebugSettingsEntity(otherSettings)

    const inconsistencies = []
    const fields = ['enabled', 'logLevel', 'showStatus', 'statusPosition']

    fields.forEach(field => {
      if (this[field] !== other[field]) {
        inconsistencies.push(`${field}: ${this[field]} != ${other[field]}`)
      }
    })

    return {
      isConsistent: inconsistencies.length === 0,
      inconsistencies,
      syncStatus: inconsistencies.length === 0 ? 'SYNCED' : 'OUT_OF_SYNC'
    }
  }

  /**
   * 🎯 新機能：同期の必要性を判定
   * 設定変更時に同期が必要かどうかを判定
   */
  requiresSync(otherSettings) {
    const validation = this.validateSyncConsistency(otherSettings)
    return !validation.isConsistent
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
      statusPosition: this.statusPosition,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    }
  }

  /**
   * ストレージ用の形式に変換（sync storage統一対応）
   */
  toStorageFormat() {
    return {
      enabled: this.enabled,
      logLevel: this.logLevel,
      showStatus: this.showStatus,
      statusPosition: this.statusPosition
    }
  }

  /**
   * 設定の変更点を取得
   */
  getChanges(otherSettings) {
    const changes = {}
    const other = otherSettings instanceof DebugSettingsEntity 
      ? otherSettings 
      : new DebugSettingsEntity(otherSettings)
    
    const fields = ['enabled', 'logLevel', 'showStatus', 'statusPosition']
    
    fields.forEach(field => {
      if (this[field] !== other[field]) {
        changes[field] = {
          from: other[field],
          to: this[field]
        }
      }
    })
    
    return changes
  }

  /**
   * 設定の複製
   */
  clone() {
    return new DebugSettingsEntity(this.toPlainObject())
  }

  /**
   * 設定の比較
   */
  equals(otherSettings) {
    if (!(otherSettings instanceof DebugSettingsEntity)) {
      return false
    }
    
    return (
      this.enabled === otherSettings.enabled &&
      this.logLevel === otherSettings.logLevel &&
      this.showStatus === otherSettings.showStatus &&
      this.statusPosition === otherSettings.statusPosition
    )
  }

  /**
   * 🎯 新機能：同期状態の詳細情報
   */
  getSyncInfo() {
    return {
      entity: 'DebugSettingsEntity',
      enabled: this.enabled,
      logLevel: this.logLevel,
      showStatus: this.showStatus,
      statusPosition: this.statusPosition,
      shouldShowDebugInfo: this.shouldShowStatus(),
      updatedAt: this.updatedAt,
      storageFormat: this.toStorageFormat()
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
      enabled: false, // 🎯 修正：デフォルトはfalse（prod環境対応）
      logLevel: 2,
      showStatus: false, // 🎯 修正：デフォルトはfalse
      statusPosition: 'top-right'
    })
  }

  /**
   * 文字列表現（同期情報含む）
   */
  toString() {
    return `DebugSettingsEntity(enabled=${this.enabled}, logLevel=${this.logLevel}, showStatus=${this.showStatus}, position=${this.statusPosition}, updated=${this.updatedAt})`
  }
}

// モジュールとして使用可能にする
if (typeof window !== 'undefined') {
  window.DebugSettingsEntity = DebugSettingsEntity
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DebugSettingsEntity }
}