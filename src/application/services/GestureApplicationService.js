/**
 * GestureApplicationService
 * ジェスチャー機能全体を統合するApplication Serviceクラス
 * 複数のUseCaseを組み合わせてより高レベルなビジネスプロセスを提供
 */

// 依存関係のインポート
let GestureRecognitionUseCase, CustomGestureManagementUseCase, SettingsManagementUseCase
if (typeof require !== 'undefined') {
  ({ GestureRecognitionUseCase } = require('../usecases/GestureRecognitionUseCase'));
  ({ CustomGestureManagementUseCase } = require('../usecases/CustomGestureManagementUseCase'));
  ({ SettingsManagementUseCase } = require('../usecases/SettingsManagementUseCase'))
}

class GestureApplicationService {
  /**
   * @param {GestureRepository} gestureRepository
   * @param {SettingsRepository} settingsRepository
   * @param {ChromeMessaging} chromeMessaging
   * @param {ChromeBrowser} chromeBrowser
   */
  constructor(gestureRepository, settingsRepository, chromeMessaging, chromeBrowser) {
    // Repositories
    this.gestureRepository = gestureRepository
    this.settingsRepository = settingsRepository
    
    // Infrastructure services
    this.chromeMessaging = chromeMessaging
    this.chromeBrowser = chromeBrowser
    
    // UseCases
    this.gestureRecognitionUseCase = new GestureRecognitionUseCase(
      settingsRepository, gestureRepository
    )
    this.customGestureManagementUseCase = new CustomGestureManagementUseCase(
      gestureRepository, settingsRepository
    )
    this.settingsManagementUseCase = new SettingsManagementUseCase(
      settingsRepository
    )
    
    // サービス状態
    this.isInitialized = false
    this.activeRecognitionSession = null
  }

  /**
   * サービスの初期化
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // UseCasesを初期化
      await Promise.all([
        this.gestureRecognitionUseCase.initialize(),
        this.customGestureManagementUseCase.initialize()
      ])
      
      // 設定変更の監視を開始
      this.startSettingsWatcher()
      
      this.isInitialized = true
    } catch (error) {
      throw new GestureApplicationServiceError('Failed to initialize gesture application service', error)
    }
  }

  /**
   * ジェスチャー認識とアクション実行の統合プロセス
   * @param {Array} rawPoints - マウス軌跡データ
   * @param {string} currentUrl - 現在のページURL
   * @param {number} tabId - タブID
   * @returns {Promise<GestureExecutionResult>}
   */
  async processGestureExecution(rawPoints, currentUrl, tabId) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // 認識セッション開始
      const sessionId = this.startRecognitionSession(rawPoints, currentUrl, tabId)

      // 1. ジェスチャー機能が有効かチェック
      const isEnabled = await this.gestureRecognitionUseCase.isGestureEnabled(currentUrl)
      if (!isEnabled) {
        return new GestureExecutionResult(
          sessionId, null, false, 'Gesture functionality is disabled for this site'
        )
      }

      // 2. ジェスチャー認識実行
      const recognitionResult = await this.gestureRecognitionUseCase.recognizeGesture(rawPoints)
      
      if (!recognitionResult.isSuccess()) {
        return new GestureExecutionResult(
          sessionId, null, false, recognitionResult.message
        )
      }

      // 3. ジェスチャーが有効かチェック
      const gestureEnabled = await this.gestureRecognitionUseCase.isSpecificGestureEnabled(
        recognitionResult.gesture.id
      )
      if (!gestureEnabled) {
        return new GestureExecutionResult(
          sessionId, recognitionResult.gesture, false, 'This gesture is disabled'
        )
      }

      // 4. アクション実行
      const actionResult = await this.executeGestureAction(
        recognitionResult.gesture, tabId
      )

      // 5. 実行結果を記録
      await this.recordExecutionResult(
        recognitionResult.gesture, actionResult.success
      )

      return new GestureExecutionResult(
        sessionId, 
        recognitionResult.gesture, 
        actionResult.success, 
        actionResult.message,
        {
          recognitionMetadata: recognitionResult.metadata,
          actionMetadata: actionResult.metadata
        }
      )

    } catch (error) {
      return new GestureExecutionResult(
        null, null, false, `Execution failed: ${error.message}`
      )
    } finally {
      this.endRecognitionSession()
    }
  }

  /**
   * カスタムジェスチャーの学習プロセス
   * @param {string} name - ジェスチャー名
   * @param {Array} rawPoints - 軌跡データ
   * @param {string} action - アクション
   * @param {string} description - 説明
   * @returns {Promise<Object>}
   */
  async learnCustomGesture(name, rawPoints, action, description = '') {
    try {
      // 1. カスタムジェスチャー作成
      const customGesture = await this.customGestureManagementUseCase.createCustomGesture(
        name, rawPoints, action, description
      )

      // 2. 認識精度の初期測定
      const initialAccuracy = await this.measureGestureAccuracy(customGesture, [rawPoints])

      // 3. 学習統計を更新
      const stats = await this.customGestureManagementUseCase.getGestureStatistics()

      return {
        gesture: customGesture,
        initialAccuracy: initialAccuracy,
        statistics: stats,
        message: 'Custom gesture created and learned successfully'
      }

    } catch (error) {
      throw new GestureApplicationServiceError('Failed to learn custom gesture', error)
    }
  }

  /**
   * カスタムジェスチャーの再学習プロセス
   * @param {string} gestureId - ジェスチャーID
   * @param {Array} additionalSamples - 追加の軌跡サンプル
   * @returns {Promise<Object>}
   */
  async retrainCustomGesture(gestureId, additionalSamples) {
    try {
      // 各サンプルでパターンマッチングを実行して学習データを蓄積
      const results = []
      for (const sample of additionalSamples) {
        const matchResult = await this.customGestureManagementUseCase.matchPattern(sample)
        results.push({
          sample: sample,
          matched: matchResult.match?.id === gestureId,
          similarity: matchResult.similarity,
          confidence: matchResult.confidence
        })
      }

      // 精度の向上を測定
      const accuracy = results.filter(r => r.matched).length / results.length

      // 統計情報の更新
      const stats = await this.customGestureManagementUseCase.getGestureStatistics()

      return {
        gestureId: gestureId,
        samplesProcessed: additionalSamples.length,
        accuracy: accuracy,
        results: results,
        statistics: stats,
        message: 'Custom gesture retrained successfully'
      }

    } catch (error) {
      throw new GestureApplicationServiceError('Failed to retrain custom gesture', error)
    }
  }

  /**
   * 総合的な認識精度の向上プロセス
   * @returns {Promise<Object>}
   */
  async optimizeRecognitionAccuracy() {
    try {
      // 1. 認識閾値の適応的調整
      await this.gestureRecognitionUseCase.adaptRecognitionThreshold()

      // 2. ストレージの最適化
      const storageOptimization = await this.customGestureManagementUseCase.optimizeStorage()

      // 3. 統計情報の取得
      const recognitionStats = await this.gestureRecognitionUseCase.getRecognitionStats()
      const gestureStats = await this.customGestureManagementUseCase.getGestureStatistics()

      return {
        recognitionStats: recognitionStats,
        gestureStats: gestureStats,
        storageOptimization: storageOptimization,
        message: 'Recognition accuracy optimization completed'
      }

    } catch (error) {
      throw new GestureApplicationServiceError('Failed to optimize recognition accuracy', error)
    }
  }

  /**
   * 設定とジェスチャーの統合管理
   * @param {Object} settingsUpdate - 設定更新データ
   * @returns {Promise<Object>}
   */
  async updateSystemConfiguration(settingsUpdate) {
    try {
      // 設定更新の影響を分析
      const impact = await this.analyzeSettingsImpact(settingsUpdate)

      // 設定を更新
      const updatedSettings = await this.applySettingsUpdate(settingsUpdate)

      // 影響を受けるコンポーネントを再初期化
      if (impact.requiresRecognitionReinitialization) {
        await this.gestureRecognitionUseCase.initialize()
      }

      if (impact.requiresCustomGestureReinitialization) {
        await this.customGestureManagementUseCase.initialize()
      }

      return {
        settings: updatedSettings,
        impact: impact,
        message: 'System configuration updated successfully'
      }

    } catch (error) {
      throw new GestureApplicationServiceError('Failed to update system configuration', error)
    }
  }

  /**
   * システム健全性チェック
   * @returns {Promise<Object>}
   */
  async performHealthCheck() {
    try {
      // 各コンポーネントの状態チェック
      const [
        settingsValidation,
        gestureRepoStatus,
        recognitionStats,
        gestureStats
      ] = await Promise.all([
        this.settingsManagementUseCase.validateCurrentSettings(),
        this.gestureRepository.getRepositoryStatus(),
        this.gestureRecognitionUseCase.getRecognitionStats(),
        this.customGestureManagementUseCase.getGestureStatistics()
      ])

      // 総合健全性スコアを計算
      const healthScore = this.calculateHealthScore({
        settingsValidation,
        gestureRepoStatus,
        recognitionStats,
        gestureStats
      })

      return {
        isHealthy: healthScore > 0.8,
        healthScore: healthScore,
        components: {
          settings: settingsValidation,
          gestureRepository: gestureRepoStatus,
          recognition: recognitionStats,
          customGestures: gestureStats
        },
        recommendations: this.generateHealthRecommendations(healthScore, {
          settingsValidation,
          gestureRepoStatus,
          recognitionStats,
          gestureStats
        }),
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      throw new GestureApplicationServiceError('Failed to perform health check', error)
    }
  }

  // Private methods

  /**
   * 認識セッションを開始
   * @param {Array} rawPoints
   * @param {string} currentUrl
   * @param {number} tabId
   * @returns {string} セッションID
   */
  startRecognitionSession(rawPoints, currentUrl, tabId) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    this.activeRecognitionSession = {
      id: sessionId,
      startTime: new Date().toISOString(),
      rawPoints: rawPoints,
      currentUrl: currentUrl,
      tabId: tabId
    }
    return sessionId
  }

  /**
   * 認識セッションを終了
   */
  endRecognitionSession() {
    if (this.activeRecognitionSession) {
      this.activeRecognitionSession.endTime = new Date().toISOString()
      this.activeRecognitionSession = null
    }
  }

  /**
   * ジェスチャーアクションを実行
   * @param {Gesture} gesture
   * @param {number} tabId
   * @param {string} currentUrl
   * @returns {Promise<Object>}
   */
  async executeGestureAction(gesture, tabId) {
    try {
      const action = gesture.action

      // アクションタイプ別の実行
      if (action.startsWith('url:')) {
        const url = action.substring(4)
        await this.chromeBrowser.navigateToUrl(tabId, url)
        return { success: true, message: `Navigated to ${url}` }
      }
      
      if (action.startsWith('script:')) {
        const script = action.substring(7)
        await this.chromeBrowser.executeScript(tabId, script)
        return { success: true, message: 'Script executed' }
      }

      // 標準ブラウザアクション
      switch (action) {
      case 'browser_back': {
        await this.chromeBrowser.goBack(tabId)
        return { success: true, message: 'Navigated back' }
      }
        
      case 'browser_forward': {
        await this.chromeBrowser.goForward(tabId)
        return { success: true, message: 'Navigated forward' }
      }
        
      case 'new_tab': {
        const newTab = await this.chromeBrowser.createTab()
        return { success: true, message: 'New tab created', metadata: { tabId: newTab.id } }
      }
        
      case 'close_tab': {
        await this.chromeBrowser.closeTab(tabId)
        return { success: true, message: 'Tab closed' }
      }
        
      case 'duplicate_tab': {
        const duplicatedTab = await this.chromeBrowser.duplicateTab(tabId)
        return { success: true, message: 'Tab duplicated', metadata: { tabId: duplicatedTab.id } }
      }
        
      case 'refresh': {
        await this.chromeBrowser.reloadTab(tabId, false)
        return { success: true, message: 'Page refreshed' }
      }
        
      case 'super_refresh': {
        await this.chromeBrowser.reloadTab(tabId, true)
        return { success: true, message: 'Page hard refreshed' }
      }
        
      case 'prev_tab': {
        await this.chromeBrowser.switchToPreviousTab()
        return { success: true, message: 'Switched to previous tab' }
      }
        
      case 'next_tab': {
        await this.chromeBrowser.switchToNextTab()
        return { success: true, message: 'Switched to next tab' }
      }
        
      case 'scroll_top': {
        await this.chromeBrowser.executeScript(tabId, 'window.scrollTo(0, 0)')
        return { success: true, message: 'Scrolled to top' }
      }
        
      case 'scroll_bottom': {
        await this.chromeBrowser.executeScript(tabId, 'window.scrollTo(0, document.body.scrollHeight)')
        return { success: true, message: 'Scrolled to bottom' }
      }
        
      default:
        throw new Error(`Unknown action: ${action}`)
      }

    } catch (executionError) {
      return { 
        success: false, 
        message: `Action execution failed: ${executionError.message}`,
        error: executionError.message
      }
    }
  }

  /**
   * 実行結果を記録
   * @param {Gesture} gesture
   * @param {boolean} success
   */
  async recordExecutionResult(gesture, success) {
    try {
      // カスタムジェスチャーの場合は使用統計を記録
      if (gesture.id.startsWith('custom_')) {
        await this.gestureRepository.recordGestureUsage(gesture.id, success)
      }

      // TODO: 実行ログの記録（必要に応じて）
      
    } catch (recordError) {
      console.error('Failed to record execution result:', recordError)
    }
  }

  /**
   * ジェスチャーの認識精度を測定
   * @param {CustomGesture} gesture
   * @param {Array} testSamples
   * @returns {Promise<number>}
   */
  async measureGestureAccuracy(gesture, testSamples) {
    let correctMatches = 0
    
    for (const sample of testSamples) {
      const matchResult = await this.customGestureManagementUseCase.matchPattern(sample)
      if (matchResult.match && matchResult.match.id === gesture.id) {
        correctMatches++
      }
    }
    
    return testSamples.length > 0 ? correctMatches / testSamples.length : 0
  }

  /**
   * 設定変更の影響を分析
   * @param {Object} settingsUpdate
   * @returns {Promise<Object>}
   */
  analyzeSettingsImpact(settingsUpdate) {
    const impact = {
      requiresRecognitionReinitialization: false,
      requiresCustomGestureReinitialization: false,
      affectedGestures: []
    }

    // 閾値変更の影響
    if (settingsUpdate.gestureThreshold !== undefined) {
      impact.requiresRecognitionReinitialization = true
    }

    // ジェスチャー有効性変更の影響
    if (settingsUpdate.defaultGestureStates !== undefined) {
      impact.affectedGestures = Object.keys(settingsUpdate.defaultGestureStates)
    }

    // 除外リスト変更の影響は即座に反映される

    return impact
  }

  /**
   * 設定更新を適用
   * @param {Object} settingsUpdate
   * @returns {Promise<Settings>}
   */
  async applySettingsUpdate(settingsUpdate) {
    // 各設定項目を個別に更新
    let updatedSettings = await this.settingsManagementUseCase.getCurrentSettings()

    for (const [key, value] of Object.entries(settingsUpdate)) {
      switch (key) {
      case 'enabled': {
        updatedSettings = await this.settingsManagementUseCase.toggleExtension(value)
        break
      }
        
      case 'strokeColor':
      case 'strokeWidth': {
        if (settingsUpdate.strokeColor !== undefined && settingsUpdate.strokeWidth !== undefined) {
          updatedSettings = await this.settingsManagementUseCase.updateStrokeSettings(
            settingsUpdate.strokeColor, settingsUpdate.strokeWidth
          )
        }
        break
      }
        
      case 'gestureThreshold': {
        updatedSettings = await this.settingsManagementUseCase.updateGestureThreshold(value)
        break
      }
        
      case 'debugSettings': {
        updatedSettings = await this.settingsManagementUseCase.updateDebugSettings(value)
        break
      }
        
      default:
        break
      }
    }

    return updatedSettings
  }

  /**
   * 健全性スコアを計算
   * @param {Object} components
   * @returns {number}
   */
  calculateHealthScore(components) {
    let score = 1.0

    // 設定の妥当性
    if (!components.settingsValidation.isValid) {
      score -= 0.3
    }

    // リポジトリの健全性
    if (!components.gestureRepoStatus.isHealthy) {
      score -= 0.2
    }

    // 認識率
    const recognitionRate = components.recognitionStats.recognition.recognitionRate || 0
    if (recognitionRate < 0.7) {
      score -= 0.2
    }

    return Math.max(0, score)
  }

  /**
   * 健全性向上の推奨事項を生成
   * @param {number} healthScore
   * @param {Object} components
   * @returns {Array}
   */
  generateHealthRecommendations(healthScore, components) {
    const recommendations = []

    if (healthScore < 0.8) {
      if (!components.settingsValidation.isValid) {
        recommendations.push('Settings validation failed. Please check configuration.')
      }

      if (!components.gestureRepoStatus.isHealthy) {
        recommendations.push('Gesture repository is unhealthy. Consider optimizing storage.')
      }

      const recognitionRate = components.recognitionStats.recognition.recognitionRate || 0
      if (recognitionRate < 0.7) {
        recommendations.push('Low recognition rate. Consider adjusting thresholds or retraining.')
      }
    }

    return recommendations
  }

  /**
   * 設定変更の監視を開始
   */
  startSettingsWatcher() {
    this.settingsManagementUseCase.watchSettingsChanges((change) => {
      // 設定変更を他のコンポーネントに通知
      this.handleSettingsChange(change)
    })
  }

  /**
   * 設定変更を処理
   * @param {Object} change
   */
  async handleSettingsChange(change) {
    try {
      // 必要に応じて再初期化
      const impact = await this.analyzeSettingsImpact(change.newSettings)
      
      if (impact.requiresRecognitionReinitialization) {
        await this.gestureRecognitionUseCase.initialize()
      }

      if (impact.requiresCustomGestureReinitialization) {
        await this.customGestureManagementUseCase.initialize()
      }

    } catch (error) {
      console.error('Failed to handle settings change:', error)
    }
  }
}

/**
 * ジェスチャー実行結果
 */
class GestureExecutionResult {
  constructor(sessionId, gesture, success, message, metadata = {}) {
    this.sessionId = sessionId
    this.gesture = gesture
    this.success = success
    this.message = message
    this.metadata = metadata
    this.timestamp = new Date().toISOString()
  }

  /**
   * 結果をJSONに変換
   * @returns {Object}
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      gesture: this.gesture ? {
        id: this.gesture.id,
        name: this.gesture.name,
        action: this.gesture.action
      } : null,
      success: this.success,
      message: this.message,
      metadata: this.metadata,
      timestamp: this.timestamp
    }
  }
}

/**
 * ジェスチャーアプリケーションサービス専用エラークラス
 */
class GestureApplicationServiceError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'GestureApplicationServiceError'
    this.originalError = originalError
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    GestureApplicationService, 
    GestureExecutionResult, 
    GestureApplicationServiceError 
  }
}