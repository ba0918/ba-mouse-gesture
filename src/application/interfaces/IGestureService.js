/**
 * IGestureService
 * ジェスチャー関連機能のインターフェース定義
 * Presentation層とApplication層の境界を定義
 */

/**
 * ジェスチャーサービスのインターフェース
 * @interface IGestureService
 */
class IGestureService {
  /**
   * ジェスチャー認識とアクション実行
   * @abstract
   * @param {Array<{x: number, y: number, timestamp?: number}>} rawPoints - マウス軌跡データ
   * @param {string} currentUrl - 現在のページURL
   * @param {number} tabId - タブID
   * @returns {Promise<GestureExecutionResultDTO>}
   */
  executeGesture(rawPoints, currentUrl, tabId) {
    // パラメータの型チェックでESLint警告を回避
    if (!rawPoints || !currentUrl || typeof tabId !== 'number') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * カスタムジェスチャーの作成
   * @abstract
   * @param {string} name - ジェスチャー名
   * @param {Array<{x: number, y: number, timestamp?: number}>} rawPoints - 軌跡データ
   * @param {string} action - アクション
   * @param {string} [description] - 説明
   * @returns {Promise<CustomGestureDTO>}
   */
  createCustomGesture(name, rawPoints, action, description = '') {
    // パラメータの型チェックでESLint警告を回避
    if (!name || !rawPoints || !action || typeof description !== 'string') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * カスタムジェスチャーの一覧取得
   * @abstract
   * @returns {Promise<Array<CustomGestureDTO>>}
   */
  getCustomGestures() {
    throw new Error('Method must be implemented')
  }

  /**
   * カスタムジェスチャーの更新
   * @abstract
   * @param {string} gestureId - ジェスチャーID
   * @param {Partial<CustomGestureUpdateDTO>} updates - 更新データ
   * @returns {Promise<CustomGestureDTO>}
   */
  updateCustomGesture(gestureId, updates) {
    // パラメータの型チェックでESLint警告を回避
    if (!gestureId || !updates) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * カスタムジェスチャーの削除
   * @abstract
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<void>}
   */
  deleteCustomGesture(gestureId) {
    // パラメータの型チェックでESLint警告を回避
    if (!gestureId) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * カスタムジェスチャーの有効/無効切り替え
   * @abstract
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<CustomGestureDTO>}
   */
  toggleCustomGesture(gestureId, enabled) {
    // パラメータの型チェックでESLint警告を回避
    if (!gestureId || typeof enabled !== 'boolean') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * カスタムジェスチャーの再学習
   * @abstract
   * @param {string} gestureId - ジェスチャーID
   * @param {Array<Array<{x: number, y: number, timestamp?: number}>>} additionalSamples - 追加サンプル
   * @returns {Promise<LearningResultDTO>}
   */
  retrainCustomGesture(gestureId, additionalSamples) {
    // パラメータの型チェックでESLint警告を回避
    if (!gestureId || !additionalSamples) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * ジェスチャー統計の取得
   * @abstract
   * @returns {Promise<GestureStatisticsDTO>}
   */
  getGestureStatistics() {
    throw new Error('Method must be implemented')
  }

  /**
   * ジェスチャーのエクスポート
   * @abstract
   * @returns {Promise<GestureBackupDTO>}
   */
  exportGestures() {
    throw new Error('Method must be implemented')
  }

  /**
   * ジェスチャーのインポート
   * @abstract
   * @param {GestureBackupDTO} backup - バックアップデータ
   * @returns {Promise<void>}
   */
  importGestures(backup) {
    // パラメータの型チェックでESLint警告を回避
    if (!backup) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * 認識精度の最適化
   * @abstract
   * @returns {Promise<OptimizationResultDTO>}
   */
  optimizeRecognition() {
    throw new Error('Method must be implemented')
  }

  /**
   * ジェスチャー機能が有効かチェック
   * @abstract
   * @param {string} url - 現在のページURL
   * @returns {Promise<boolean>}
   */
  isGestureEnabled(url) {
    // パラメータの型チェックでESLint警告を回避
    if (!url) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * 特定ジェスチャーが有効かチェック
   * @abstract
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<boolean>}
   */
  isSpecificGestureEnabled(gestureId) {
    // パラメータの型チェックでESLint警告を回避
    if (!gestureId) {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }
}

// DTO definitions (Data Transfer Objects)

/**
 * ジェスチャー実行結果DTO
 * @typedef {Object} GestureExecutionResultDTO
 * @property {string} sessionId - セッションID
 * @property {GestureDTO|null} gesture - 認識されたジェスチャー
 * @property {boolean} success - 実行成功/失敗
 * @property {string} message - メッセージ
 * @property {Object} metadata - メタデータ
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * ジェスチャーDTO
 * @typedef {Object} GestureDTO
 * @property {string} id - ジェスチャーID
 * @property {string} name - ジェスチャー名
 * @property {string} action - アクション
 * @property {boolean} enabled - 有効/無効
 */

/**
 * カスタムジェスチャーDTO
 * @typedef {Object} CustomGestureDTO
 * @property {string} id - ジェスチャーID
 * @property {string} name - ジェスチャー名
 * @property {string} action - アクション
 * @property {boolean} enabled - 有効/無効
 * @property {string} description - 説明
 * @property {Object} usage - 使用統計
 * @property {string} createdAt - 作成日時
 * @property {string} updatedAt - 更新日時
 */

/**
 * カスタムジェスチャー更新DTO
 * @typedef {Object} CustomGestureUpdateDTO
 * @property {string} [name] - ジェスチャー名
 * @property {string} [action] - アクション
 * @property {boolean} [enabled] - 有効/無効
 * @property {string} [description] - 説明
 */

/**
 * 学習結果DTO
 * @typedef {Object} LearningResultDTO
 * @property {string} gestureId - ジェスチャーID
 * @property {number} samplesProcessed - 処理されたサンプル数
 * @property {number} accuracy - 精度
 * @property {Array} results - 結果詳細
 * @property {Object} statistics - 統計情報
 * @property {string} message - メッセージ
 */

/**
 * ジェスチャー統計DTO
 * @typedef {Object} GestureStatisticsDTO
 * @property {Object} recognition - 認識統計
 * @property {Object} performance - パフォーマンス統計
 * @property {Object} learning - 学習統計
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * ジェスチャーバックアップDTO
 * @typedef {Object} GestureBackupDTO
 * @property {string} timestamp - タイムスタンプ
 * @property {string} version - バージョン
 * @property {Array} customGestures - カスタムジェスチャー
 * @property {Object} learningData - 学習データ
 */

/**
 * 最適化結果DTO
 * @typedef {Object} OptimizationResultDTO
 * @property {Object} recognitionStats - 認識統計
 * @property {Object} gestureStats - ジェスチャー統計
 * @property {Object} storageOptimization - ストレージ最適化
 * @property {string} message - メッセージ
 */

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IGestureService }
}