/**
 * ISystemService
 * システム管理機能のインターフェース定義
 * Presentation層とApplication層の境界を定義
 */

/**
 * システムサービスのインターフェース
 * @interface ISystemService
 */
class ISystemService {
  /**
   * システムの初期化
   * @abstract
   * @param {SystemConfigDTO} [config] - 初期化設定
   * @returns {Promise<SystemInitializationResultDTO>}
   */
  initializeSystem(config) {
    // パラメータの型チェックでESLint警告を回避
    if (config && typeof config !== 'object') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * システム状態の取得
   * @abstract
   * @returns {Promise<SystemStatusDTO>}
   */
  getSystemStatus() {
    throw new Error('Method must be implemented')
  }

  /**
   * システムの健全性チェック
   * @abstract
   * @returns {Promise<SystemHealthCheckDTO>}
   */
  performHealthCheck() {
    throw new Error('Method must be implemented')
  }

  /**
   * システムの優雅な停止
   * @abstract
   * @returns {Promise<void>}
   */
  shutdown() {
    throw new Error('Method must be implemented')
  }

  /**
   * システム設定の更新
   * @abstract
   * @param {Partial<SystemConfigDTO>} newConfig - 新しい設定
   * @returns {Promise<SystemConfigUpdateResultDTO>}
   */
  updateSystemConfiguration(newConfig) {
    // パラメータの型チェックでESLint警告を回避
    if (!newConfig || typeof newConfig !== 'object') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * エラー履歴の取得
   * @abstract
   * @param {number} [limit] - 取得する件数制限
   * @returns {Promise<Array<SystemErrorDTO>>}
   */
  getErrorHistory(limit) {
    // パラメータの型チェックでESLint警告を回避
    if (limit && typeof limit !== 'number') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * システムメトリクスの取得
   * @abstract
   * @returns {Promise<SystemMetricsDTO>}
   */
  getSystemMetrics() {
    throw new Error('Method must be implemented')
  }

  /**
   * システムのリセット
   * @abstract
   * @param {boolean} [preserveUserData] - ユーザーデータを保持するか
   * @returns {Promise<SystemResetResultDTO>}
   */
  resetSystem(preserveUserData) {
    // パラメータの型チェックでESLint警告を回避
    if (preserveUserData !== undefined && typeof preserveUserData !== 'boolean') {
      throw new Error('Invalid parameters')
    }
    throw new Error('Method must be implemented')
  }

  /**
   * システムの診断実行
   * @abstract
   * @returns {Promise<SystemDiagnosticsDTO>}
   */
  runDiagnostics() {
    throw new Error('Method must be implemented')
  }

  /**
   * システムの最適化実行
   * @abstract
   * @returns {Promise<SystemOptimizationResultDTO>}
   */
  optimizeSystem() {
    throw new Error('Method must be implemented')
  }
}

// DTO definitions (Data Transfer Objects)

/**
 * システム設定DTO
 * @typedef {Object} SystemConfigDTO
 * @property {boolean} [enableDebugMode] - デバッグモード有効/無効
 * @property {number} [maxErrorHistory] - 最大エラー履歴数
 * @property {number} [healthCheckInterval] - 健全性チェック間隔（ミリ秒）
 * @property {number} [cleanupInterval] - クリーンアップ間隔（ミリ秒）
 */

/**
 * システム初期化結果DTO
 * @typedef {Object} SystemInitializationResultDTO
 * @property {string} initializationId - 初期化ID
 * @property {boolean} success - 初期化成功/失敗
 * @property {string} message - メッセージ
 * @property {number} initializationTime - 初期化時間（ミリ秒）
 * @property {SystemHealthCheckDTO|null} healthCheck - 初期健全性チェック結果
 * @property {string|null} error - エラーメッセージ
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システム状態DTO
 * @typedef {Object} SystemStatusDTO
 * @property {boolean} isInitialized - 初期化済みか
 * @property {string|null} initializationTime - 初期化時刻
 * @property {number} uptime - 稼働時間（ミリ秒）
 * @property {SystemComponentsDTO} components - コンポーネント状態
 * @property {Array<SystemErrorDTO>} recentErrors - 最近のエラー
 * @property {SystemHealthCheckDTO} [healthCheck] - 健全性チェック結果
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システムコンポーネント状態DTO
 * @typedef {Object} SystemComponentsDTO
 * @property {Array<string>} infrastructure - Infrastructure層コンポーネント
 * @property {Array<string>} repositories - Repository層コンポーネント
 * @property {Array<string>} useCases - UseCase層コンポーネント
 * @property {Array<string>} services - Service層コンポーネント
 */

/**
 * システム健全性チェックDTO
 * @typedef {Object} SystemHealthCheckDTO
 * @property {boolean} isHealthy - システム健全性
 * @property {number} healthScore - 健全性スコア（0-1）
 * @property {SystemHealthComponentsDTO} components - コンポーネント別健全性
 * @property {Array<string>} recommendations - 改善推奨事項
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システム健全性コンポーネントDTO
 * @typedef {Object} SystemHealthComponentsDTO
 * @property {ComponentHealthDTO} infrastructure - Infrastructure層健全性
 * @property {ComponentHealthDTO} repositories - Repository層健全性
 * @property {Object} [recognition] - 認識機能統計
 * @property {Object} [customGestures] - カスタムジェスチャー統計
 */

/**
 * コンポーネント健全性DTO
 * @typedef {Object} ComponentHealthDTO
 * @property {boolean} isHealthy - 健全性
 * @property {Object} [components] - 詳細コンポーネント状態
 * @property {string} [error] - エラーメッセージ
 */

/**
 * システム設定更新結果DTO
 * @typedef {Object} SystemConfigUpdateResultDTO
 * @property {SystemConfigDTO} oldConfig - 更新前設定
 * @property {SystemConfigDTO} newConfig - 更新後設定
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システムエラーDTO
 * @typedef {Object} SystemErrorDTO
 * @property {string} context - エラー発生箇所
 * @property {string} message - エラーメッセージ
 * @property {string} [stack] - スタックトレース
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システムメトリクスDTO
 * @typedef {Object} SystemMetricsDTO
 * @property {SystemPerformanceDTO} performance - パフォーマンス情報
 * @property {SystemUsageDTO} usage - 使用量情報
 * @property {SystemErrorMetricsDTO} errors - エラー情報
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システムパフォーマンスDTO
 * @typedef {Object} SystemPerformanceDTO
 * @property {number} uptime - 稼働時間（ミリ秒）
 * @property {number} averageResponseTime - 平均応答時間（ミリ秒）
 * @property {number} memoryUsage - メモリ使用量
 * @property {number} recognitionRate - 認識成功率
 */

/**
 * システム使用量DTO
 * @typedef {Object} SystemUsageDTO
 * @property {number} totalGestureRecognitions - 総ジェスチャー認識回数
 * @property {number} totalCustomGestures - 総カスタムジェスチャー数
 * @property {number} storageUsage - ストレージ使用量
 * @property {number} settingsChanges - 設定変更回数
 */

/**
 * システムエラーメトリクスDTO
 * @typedef {Object} SystemErrorMetricsDTO
 * @property {number} totalErrors - 総エラー数
 * @property {number} errorRate - エラー率
 * @property {Array<{context: string, count: number}>} errorsByContext - 箇所別エラー数
 * @property {Array<{message: string, count: number}>} topErrors - 頻発エラー
 */

/**
 * システムリセット結果DTO
 * @typedef {Object} SystemResetResultDTO
 * @property {boolean} success - リセット成功/失敗
 * @property {string} message - メッセージ
 * @property {boolean} userDataPreserved - ユーザーデータ保持状態
 * @property {Array<string>} resetComponents - リセットされたコンポーネント
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システム診断DTO
 * @typedef {Object} SystemDiagnosticsDTO
 * @property {boolean} overall - 総合診断結果
 * @property {SystemDiagnosticTestDTO} tests - 診断テスト結果
 * @property {Array<string>} issues - 発見された問題
 * @property {Array<string>} recommendations - 推奨対策
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システム診断テストDTO
 * @typedef {Object} SystemDiagnosticTestDTO
 * @property {boolean} chromeApiAvailability - Chrome API利用可能性
 * @property {boolean} storageConnectivity - ストレージ接続性
 * @property {boolean} settingsIntegrity - 設定整合性
 * @property {boolean} gestureDataIntegrity - ジェスチャーデータ整合性
 * @property {boolean} recognitionFunctionality - 認識機能
 */

/**
 * システム最適化結果DTO
 * @typedef {Object} SystemOptimizationResultDTO
 * @property {boolean} success - 最適化成功/失敗
 * @property {string} message - メッセージ
 * @property {SystemOptimizationDetailsDTO} details - 最適化詳細
 * @property {SystemPerformanceDTO} beforePerformance - 最適化前パフォーマンス
 * @property {SystemPerformanceDTO} afterPerformance - 最適化後パフォーマンス
 * @property {string} timestamp - タイムスタンプ
 */

/**
 * システム最適化詳細DTO
 * @typedef {Object} SystemOptimizationDetailsDTO
 * @property {Object} storageOptimization - ストレージ最適化結果
 * @property {Object} recognitionOptimization - 認識最適化結果
 * @property {Object} cacheOptimization - キャッシュ最適化結果
 */

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ISystemService }
}