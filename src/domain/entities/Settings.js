/**
 * Settings エンティティ
 * アプリケーション設定を表現するドメインエンティティ
 */

// 依存関係のインポート
let Threshold
if (typeof require !== 'undefined') {
  ({ Threshold } = require('../valueObjects/Threshold'))
}
class Settings {
  /**
   * @param {Object} config - 設定データ
   */
  constructor(config = {}) {
    // 基本設定
    this.enabled = config.enabled !== undefined ? config.enabled : true
    this.strokeColor = config.strokeColor || '#2196F3'
    this.strokeWidth = config.strokeWidth || 3
    this.gestureThreshold = config.gestureThreshold || 15
    this.excludeList = config.excludeList || []
    
    // デフォルトジェスチャー状態
    this.defaultGestureStates = {
      // 基本ジェスチャー
      left: true,
      right: true,
      up: true,
      down: true,
      // 複合ジェスチャー
      downright: true,
      upright: true,
      rightdown: true,
      updown: true,
      // Phase 10 新機能
      super_refresh: true,
      prev_tab: true,
      next_tab: true,
      ...config.defaultGestureStates
    }
    
    // デバッグ設定
    this.debugSettings = {
      enabled: true,
      logLevel: 2, // INFO
      showStatus: true,
      statusPosition: 'top-right',
      ...config.debugSettings
    }
    
    // メタデータ
    this.version = '1.0.0'
    this.lastModified = new Date().toISOString()
  }

  /**
   * 機能が有効かチェック
   * @returns {boolean}
   */
  isEnabled() {
    return this.enabled
  }

  /**
   * 機能の有効/無効を切り替え
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.enabled = Boolean(enabled)
    this.updateModified()
  }

  /**
   * 特定ジェスチャーが有効かチェック
   * @param {string} gestureId - ジェスチャーID
   * @returns {boolean}
   */
  isGestureEnabled(gestureId) {
    return this.defaultGestureStates[gestureId] !== false
  }

  /**
   * ジェスチャーの有効/無効を設定
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   */
  setGestureEnabled(gestureId, enabled) {
    this.defaultGestureStates[gestureId] = Boolean(enabled)
    this.updateModified()
  }

  /**
   * 軌跡表示設定を取得
   * @returns {Object}
   */
  getStrokeSettings() {
    return {
      color: this.strokeColor,
      width: this.strokeWidth
    }
  }

  /**
   * 軌跡表示設定を更新
   * @param {string} color - 色
   * @param {number} width - 太さ
   */
  setStrokeSettings(color, width) {
    if (this.isValidColor(color)) {
      this.strokeColor = color
    }
    if (this.isValidWidth(width)) {
      this.strokeWidth = width
    }
    this.updateModified()
  }

  /**
   * ジェスチャー検出閾値を取得
   * @returns {Threshold}
   */
  getThreshold() {
    return new Threshold(this.gestureThreshold)
  }

  /**
   * ジェスチャー検出閾値を設定
   * @param {number} threshold - 閾値（ピクセル）
   */
  setThreshold(threshold) {
    if (threshold >= 5 && threshold <= 100) {
      this.gestureThreshold = threshold
      this.updateModified()
    }
  }

  /**
   * 除外サイトリストを取得
   * @returns {string[]}
   */
  getExcludeList() {
    return [...this.excludeList]
  }

  /**
   * 除外サイトを追加
   * @param {string} pattern - URLパターン
   */
  addExcludeSite(pattern) {
    if (pattern && !this.excludeList.includes(pattern)) {
      this.excludeList.push(pattern)
      this.updateModified()
    }
  }

  /**
   * 除外サイトを削除
   * @param {string} pattern - URLパターン
   */
  removeExcludeSite(pattern) {
    const index = this.excludeList.indexOf(pattern)
    if (index > -1) {
      this.excludeList.splice(index, 1)
      this.updateModified()
    }
  }

  /**
   * サイトが除外対象かチェック
   * @param {string} url - チェック対象URL
   * @returns {boolean}
   */
  isExcludedSite(url) {
    if (!url) return false
    
    // URLコンストラクタはブラウザ環境で利用可能
    const currentHost = typeof window !== 'undefined' && window.URL ? new window.URL(url).hostname : ''
    
    return this.excludeList.some(pattern => {
      // 完全URL マッチ
      if (pattern.includes('://')) {
        return url.includes(pattern) || url.match(pattern.replace(/\*/g, '.*'))
      }
      // ホスト名マッチ
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'))
        return regex.test(currentHost)
      }
      // 部分マッチ
      return currentHost.includes(pattern)
    })
  }

  /**
   * デバッグ設定を取得
   * @returns {Object}
   */
  getDebugSettings() {
    return { ...this.debugSettings }
  }

  /**
   * デバッグ設定を更新
   * @param {Object} debugConfig
   */
  setDebugSettings(debugConfig) {
    this.debugSettings = { ...this.debugSettings, ...debugConfig }
    this.updateModified()
  }

  /**
   * 色の妥当性をチェック
   * @param {string} color
   * @returns {boolean}
   */
  isValidColor(color) {
    return /^#[0-9A-F]{6}$/i.test(color)
  }

  /**
   * 幅の妥当性をチェック
   * @param {number} width
   * @returns {boolean}
   */
  isValidWidth(width) {
    return Number.isInteger(width) && width >= 1 && width <= 10
  }

  /**
   * 設定の不変条件をチェック
   * @returns {boolean}
   */
  isValid() {
    return this.isValidColor(this.strokeColor) &&
           this.isValidWidth(this.strokeWidth) &&
           this.gestureThreshold >= 5 &&
           this.gestureThreshold <= 100 &&
           Array.isArray(this.excludeList)
  }

  /**
   * 更新日時を設定
   */
  updateModified() {
    this.lastModified = new Date().toISOString()
  }

  /**
   * デフォルト設定にリセット
   */
  resetToDefaults() {
    const defaultConfig = new Settings()
    Object.assign(this, defaultConfig)
    this.updateModified()
  }

  /**
   * エンティティの複製
   * @returns {Settings}
   */
  clone() {
    return new Settings(this.toJSON())
  }

  /**
   * シリアライズ（永続化用）
   * @returns {Object}
   */
  toJSON() {
    return {
      enabled: this.enabled,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      gestureThreshold: this.gestureThreshold,
      excludeList: [...this.excludeList],
      defaultGestureStates: { ...this.defaultGestureStates },
      debugSettings: { ...this.debugSettings },
      version: this.version,
      lastModified: this.lastModified
    }
  }

  /**
   * デシリアライズ（復元用）
   * @param {Object} data
   * @returns {Settings}
   */
  static fromJSON(data) {
    return new Settings(data)
  }

  /**
   * デフォルト設定を取得
   * @returns {Settings}
   */
  static getDefaults() {
    return new Settings()
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Settings }
}