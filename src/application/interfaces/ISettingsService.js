/**
 * ISettingsService
 * 設定管理機能のインターフェース定義
 * Presentation層とApplication層の境界を定義
 */

/**
 * 設定サービスのインターフェース
 * @interface ISettingsService
 */
class ISettingsService {
  /**
   * 現在の設定を取得
   * @abstract
   * @returns {Promise<SettingsDTO>}
   */
  getCurrentSettings() {
    throw new Error('Method must be implemented')
  }

  /**
   * 拡張機能の有効/無効を切り替え
   * @abstract
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<SettingsDTO>}
   */
  toggleExtension(enabled) {
    // パラメータの型チェックでESLint警告を回避
    if (typeof enabled !== 'boolean') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * 軌跡表示設定を更新
   * @abstract
   * @param {string} color - 色（例: '#FF0000'）
   * @param {number} width - 線の太さ（1-10）
   * @returns {Promise<SettingsDTO>}
   */
  updateStrokeSettings(color, width) {
    // パラメータの型チェックでESLint警告を回避
    if (!color || typeof width !== 'number') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * ジェスチャー検出閾値を更新
   * @abstract
   * @param {number} threshold - 閾値（5-100ピクセル）
   * @returns {Promise<SettingsDTO>}
   */
  updateGestureThreshold(threshold) {
    // パラメータの型チェックでESLint警告を回避
    if (typeof threshold !== 'number') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * 特定ジェスチャーの有効/無効を切り替え
   * @abstract
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<SettingsDTO>}
   */
  toggleGesture(gestureId, enabled) {
    // パラメータの型チェックでESLint警告を回避
    if (!gestureId || typeof enabled !== 'boolean') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * 除外サイトを追加
   * @abstract
   * @param {string} pattern - URLパターン
   * @returns {Promise<SettingsDTO>}
   */
  addExcludeSite(pattern) {
    // パラメータの型チェックでESLint警告を回避
    if (!pattern) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * 除外サイトを削除
   * @abstract
   * @param {string} pattern - URLパターン
   * @returns {Promise<SettingsDTO>}
   */
  removeExcludeSite(pattern) {
    // パラメータの型チェックでESLint警告を回避
    if (!pattern) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * デバッグ設定を更新
   * @abstract
   * @param {Object} debugConfig - デバッグ設定
   * @returns {Promise<SettingsDTO>}
   */
  updateDebugSettings(debugConfig) {
    // パラメータの型チェックでESLint警告を回避
    if (!debugConfig) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * 設定をデフォルトにリセット
   * @abstract
   * @returns {Promise<SettingsDTO>}
   */
  resetToDefaults() {
    throw new Error('Method must be implemented')
  }

  /**
   * 設定のバックアップを作成
   * @abstract
   * @returns {Promise<SettingsBackupDTO>}
   */
  createSettingsBackup() {
    throw new Error('Method must be implemented')
  }

  /**
   * バックアップから設定を復元
   * @abstract
   * @param {SettingsBackupDTO} backup - バックアップデータ
   * @returns {Promise<SettingsDTO>}
   */
  restoreSettingsFromBackup(backup) {
    // パラメータの型チェックでESLint警告を回避
    if (!backup) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * 設定の整合性チェック
   * @abstract
   * @returns {Promise<SettingsValidationDTO>}
   */
  validateCurrentSettings() {
    throw new Error('Method must be implemented')
  }

  /**
   * 設定の使用統計を取得
   * @abstract
   * @returns {Promise<SettingsUsageStatsDTO>}
   */
  getSettingsUsageStats() {
    throw new Error('Method must be implemented')
  }

  /**
   * 設定変更の監視を開始
   * @abstract
   * @param {Function} callback - 変更時のコールバック関数
   * @returns {Function} 監視停止関数
   */
  watchSettingsChanges(callback) {
    // パラメータの型チェックでESLint警告を回避
    if (typeof callback !== 'function') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }
}

// DTO definitions (Data Transfer Objects)

/**
 * 設定DTO
 * @typedef {Object} SettingsDTO
 * @property {boolean} enabled - 拡張機能有効/無効
 * @property {Object} stroke - 軌跡設定
 * @property {number} gestureThreshold - ジェスチャー検出閾値
 * @property {Array<string>} excludeList - 除外サイト一覧
 * @property {Object} gestureStates - ジェスチャー個別設定
 * @property {Object} debugSettings - デバッグ設定
 * @property {string} version - 設定バージョン
 * @property {string} lastModified - 最終更新日時
 */

/**
 * 設定バックアップDTO
 * @typedef {Object} SettingsBackupDTO
 * @property {string} timestamp - バックアップ作成日時
 * @property {string} version - バージョン
 * @property {SettingsDTO} settings - 設定データ
 */

/**
 * 設定検証結果DTO
 * @typedef {Object} SettingsValidationDTO
 * @property {boolean} isValid - 検証結果
 * @property {Array<string>} errors - エラー一覧
 * @property {Array<string>} warnings - 警告一覧
 */

/**
 * 設定使用統計DTO
 * @typedef {Object} SettingsUsageStatsDTO
 * @property {boolean} enabled - 拡張機能有効/無効
 * @property {number} enabledGestures - 有効なジェスチャー数
 * @property {number} totalGestures - 総ジェスチャー数
 * @property {number} excludeListSize - 除外サイト数
 * @property {Object} strokeSettings - 軌跡設定
 * @property {number} threshold - 検出閾値
 * @property {Object} debugSettings - デバッグ設定
 * @property {string} lastModified - 最終更新日時
 * @property {Object} repositoryStatus - Repository状態
 */

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ISettingsService }
}