/**
 * GestureServiceImpl
 * IGestureServiceの具象実装クラス
 * Presentation層からApplication層への橋渡しを行う
 */

// GestureApplicationServiceはコンストラクタの引数で受け取るためimportは不要

class GestureServiceImpl {
  /**
   * @param {GestureApplicationService} gestureApplicationService
   */
  constructor(gestureApplicationService) {
    this.gestureApplicationService = gestureApplicationService
  }

  /**
   * ジェスチャー認識とアクション実行
   * @param {Array<{x: number, y: number, timestamp?: number}>} rawPoints - マウス軌跡データ
   * @param {string} currentUrl - 現在のページURL
   * @param {number} tabId - タブID
   * @returns {Promise<GestureExecutionResultDTO>}
   */
  async executeGesture(rawPoints, currentUrl, tabId) {
    try {
      const result = await this.gestureApplicationService.processGestureExecution(
        rawPoints, currentUrl, tabId
      )
      
      return {
        sessionId: result.sessionId,
        gesture: result.gesture ? {
          id: result.gesture.id,
          name: result.gesture.name,
          action: result.gesture.action,
          enabled: result.gesture.enabled
        } : null,
        success: result.success,
        message: result.message,
        metadata: result.metadata,
        timestamp: result.timestamp
      }
      
    } catch (error) {
      return {
        sessionId: null,
        gesture: null,
        success: false,
        message: `Execution failed: ${error.message}`,
        metadata: {},
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * カスタムジェスチャーの作成
   * @param {string} name - ジェスチャー名
   * @param {Array<{x: number, y: number, timestamp?: number}>} rawPoints - 軌跡データ
   * @param {string} action - アクション
   * @param {string} [description] - 説明
   * @returns {Promise<CustomGestureDTO>}
   */
  async createCustomGesture(name, rawPoints, action, description = '') {
    const result = await this.gestureApplicationService.learnCustomGesture(
      name, rawPoints, action, description
    )
    
    const gesture = result.gesture
    return {
      id: gesture.id,
      name: gesture.name,
      action: gesture.action,
      enabled: gesture.enabled,
      description: gesture.description || '',
      usage: {
        totalCount: gesture.usage?.totalCount || 0,
        successCount: gesture.usage?.successCount || 0,
        lastUsed: gesture.usage?.lastUsed || null
      },
      createdAt: gesture.createdAt,
      updatedAt: gesture.updatedAt
    }
  }

  /**
   * カスタムジェスチャーの一覧取得
   * @returns {Promise<Array<CustomGestureDTO>>}
   */
  async getCustomGestures() {
    const customGestures = await this.gestureApplicationService.customGestureManagementUseCase.getAllCustomGestures()
    
    return customGestures.map(gesture => ({
      id: gesture.id,
      name: gesture.name,
      action: gesture.action,
      enabled: gesture.enabled,
      description: gesture.description || '',
      usage: {
        totalCount: gesture.usage?.totalCount || 0,
        successCount: gesture.usage?.successCount || 0,
        lastUsed: gesture.usage?.lastUsed || null
      },
      createdAt: gesture.createdAt,
      updatedAt: gesture.updatedAt
    }))
  }

  /**
   * カスタムジェスチャーの更新
   * @param {string} gestureId - ジェスチャーID
   * @param {Partial<CustomGestureUpdateDTO>} updates - 更新データ
   * @returns {Promise<CustomGestureDTO>}
   */
  async updateCustomGesture(gestureId, updates) {
    const updatedGesture = await this.gestureApplicationService.customGestureManagementUseCase.updateCustomGesture(
      gestureId, updates
    )
    
    return {
      id: updatedGesture.id,
      name: updatedGesture.name,
      action: updatedGesture.action,
      enabled: updatedGesture.enabled,
      description: updatedGesture.description || '',
      usage: {
        totalCount: updatedGesture.usage?.totalCount || 0,
        successCount: updatedGesture.usage?.successCount || 0,
        lastUsed: updatedGesture.usage?.lastUsed || null
      },
      createdAt: updatedGesture.createdAt,
      updatedAt: updatedGesture.updatedAt
    }
  }

  /**
   * カスタムジェスチャーの削除
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<void>}
   */
  async deleteCustomGesture(gestureId) {
    await this.gestureApplicationService.customGestureManagementUseCase.deleteCustomGesture(gestureId)
  }

  /**
   * カスタムジェスチャーの有効/無効切り替え
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<CustomGestureDTO>}
   */
  async toggleCustomGesture(gestureId, enabled) {
    const updatedGesture = await this.gestureApplicationService.customGestureManagementUseCase.toggleCustomGesture(
      gestureId, enabled
    )
    
    return {
      id: updatedGesture.id,
      name: updatedGesture.name,
      action: updatedGesture.action,
      enabled: updatedGesture.enabled,
      description: updatedGesture.description || '',
      usage: {
        totalCount: updatedGesture.usage?.totalCount || 0,
        successCount: updatedGesture.usage?.successCount || 0,
        lastUsed: updatedGesture.usage?.lastUsed || null
      },
      createdAt: updatedGesture.createdAt,
      updatedAt: updatedGesture.updatedAt
    }
  }

  /**
   * カスタムジェスチャーの再学習
   * @param {string} gestureId - ジェスチャーID
   * @param {Array<Array<{x: number, y: number, timestamp?: number}>>} additionalSamples - 追加サンプル
   * @returns {Promise<LearningResultDTO>}
   */
  async retrainCustomGesture(gestureId, additionalSamples) {
    const result = await this.gestureApplicationService.retrainCustomGesture(gestureId, additionalSamples)
    
    return {
      gestureId: result.gestureId,
      samplesProcessed: result.samplesProcessed,
      accuracy: result.accuracy,
      results: result.results,
      statistics: result.statistics,
      message: result.message
    }
  }

  /**
   * ジェスチャー統計の取得
   * @returns {Promise<GestureStatisticsDTO>}
   */
  async getGestureStatistics() {
    const recognitionStats = await this.gestureApplicationService.gestureRecognitionUseCase.getRecognitionStats()
    const gestureStats = await this.gestureApplicationService.customGestureManagementUseCase.getGestureStatistics()
    
    return {
      recognition: {
        totalRecognitions: recognitionStats.recognition.totalRecognitions,
        recognitionRate: recognitionStats.recognition.recognitionRate,
        averageComplexity: recognitionStats.recognition.averageComplexity
      },
      performance: {
        totalCustomGestures: gestureStats.performance.totalCustomGestures,
        enabledGestures: gestureStats.performance.enabledGestures,
        totalUsage: gestureStats.performance.totalUsage,
        averageSuccessRate: gestureStats.performance.averageSuccessRate
      },
      learning: gestureStats.learning,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * ジェスチャーのエクスポート
   * @returns {Promise<GestureBackupDTO>}
   */
  async exportGestures() {
    const backup = await this.gestureApplicationService.customGestureManagementUseCase.exportCustomGestures()
    
    return {
      timestamp: backup.timestamp,
      version: backup.version,
      customGestures: backup.customGestures,
      learningData: backup.learningData
    }
  }

  /**
   * ジェスチャーのインポート
   * @param {GestureBackupDTO} backup - バックアップデータ
   * @returns {Promise<void>}
   */
  async importGestures(backup) {
    await this.gestureApplicationService.customGestureManagementUseCase.importCustomGestures(backup)
  }

  /**
   * 認識精度の最適化
   * @returns {Promise<OptimizationResultDTO>}
   */
  async optimizeRecognition() {
    const result = await this.gestureApplicationService.optimizeRecognitionAccuracy()
    
    return {
      recognitionStats: result.recognitionStats,
      gestureStats: result.gestureStats,
      storageOptimization: result.storageOptimization,
      message: result.message
    }
  }

  /**
   * ジェスチャー機能が有効かチェック
   * @param {string} url - 現在のページURL
   * @returns {Promise<boolean>}
   */
  isGestureEnabled(url) {
    return this.gestureApplicationService.gestureRecognitionUseCase.isGestureEnabled(url)
  }

  /**
   * 特定ジェスチャーが有効かチェック
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<boolean>}
   */
  isSpecificGestureEnabled(gestureId) {
    return this.gestureApplicationService.gestureRecognitionUseCase.isSpecificGestureEnabled(gestureId)
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GestureServiceImpl }
}