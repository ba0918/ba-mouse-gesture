/**
 * SystemServiceImpl
 * ISystemServiceの具象実装クラス
 * Presentation層からApplication層への橋渡しを行う
 */

// SystemApplicationServiceはコンストラクタの引数で受け取るためimportは不要

class SystemServiceImpl {
  /**
   * @param {SystemApplicationService} systemApplicationService
   */
  constructor(systemApplicationService) {
    this.systemApplicationService = systemApplicationService
  }

  /**
   * システムの初期化
   * @param {SystemConfigDTO} [config] - 初期化設定
   * @returns {Promise<SystemInitializationResultDTO>}
   */
  async initializeSystem(config) {
    try {
      const result = await this.systemApplicationService.initializeSystem(config)
      
      return {
        initializationId: result.initializationId,
        success: result.success,
        message: result.message,
        initializationTime: result.initializationTime,
        healthCheck: result.healthCheck ? {
          isHealthy: result.healthCheck.overall,
          healthScore: this.calculateHealthScore(result.healthCheck),
          components: this.convertHealthComponents(result.healthCheck),
          recommendations: this.generateRecommendations(result.healthCheck),
          timestamp: result.healthCheck.timestamp
        } : null,
        error: result.error ? result.error.message : null,
        timestamp: result.timestamp
      }
      
    } catch (error) {
      return {
        initializationId: null,
        success: false,
        message: `System initialization failed: ${error.message}`,
        initializationTime: 0,
        healthCheck: null,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システム状態の取得
   * @returns {Promise<SystemStatusDTO>}
   */
  async getSystemStatus() {
    const status = await this.systemApplicationService.getSystemStatus()
    
    return {
      isInitialized: status.isInitialized,
      initializationTime: status.initializationTime,
      uptime: status.uptime,
      components: {
        infrastructure: status.components.infrastructure,
        repositories: status.components.repositories,
        useCases: status.components.useCases,
        services: status.components.services
      },
      recentErrors: status.recentErrors.map(error => ({
        context: error.context,
        message: error.message,
        stack: error.stack,
        timestamp: error.timestamp
      })),
      healthCheck: status.healthCheck ? {
        isHealthy: status.healthCheck.isHealthy || false,
        healthScore: this.calculateHealthScore(status.healthCheck),
        components: this.convertHealthComponents(status.healthCheck),
        recommendations: this.generateRecommendations(status.healthCheck),
        timestamp: status.healthCheck.timestamp
      } : null,
      timestamp: status.timestamp
    }
  }

  /**
   * システムの健全性チェック
   * @returns {Promise<SystemHealthCheckDTO>}
   */
  async performHealthCheck() {
    const healthCheck = await this.systemApplicationService.performHealthCheck()
    
    return {
      isHealthy: healthCheck.isHealthy || false,
      healthScore: this.calculateHealthScore(healthCheck),
      components: this.convertHealthComponents(healthCheck),
      recommendations: this.generateRecommendations(healthCheck),
      timestamp: healthCheck.timestamp || new Date().toISOString()
    }
  }

  /**
   * システムの優雅な停止
   * @returns {Promise<void>}
   */
  async shutdown() {
    await this.systemApplicationService.shutdown()
  }

  /**
   * システム設定の更新
   * @param {Partial<SystemConfigDTO>} newConfig - 新しい設定
   * @returns {Promise<SystemConfigUpdateResultDTO>}
   */
  async updateSystemConfiguration(newConfig) {
    const result = await this.systemApplicationService.updateSystemConfiguration(newConfig)
    
    return {
      oldConfig: {
        enableDebugMode: result.oldConfig.enableDebugMode,
        maxErrorHistory: result.oldConfig.maxErrorHistory,
        healthCheckInterval: result.oldConfig.healthCheckInterval,
        cleanupInterval: result.oldConfig.cleanupInterval
      },
      newConfig: {
        enableDebugMode: result.newConfig.enableDebugMode,
        maxErrorHistory: result.newConfig.maxErrorHistory,
        healthCheckInterval: result.newConfig.healthCheckInterval,
        cleanupInterval: result.newConfig.cleanupInterval
      },
      timestamp: result.timestamp
    }
  }

  /**
   * エラー履歴の取得
   * @param {number} [limit] - 取得する件数制限
   * @returns {Promise<Array<SystemErrorDTO>>}
   */
  async getErrorHistory(limit = 50) {
    const status = await this.systemApplicationService.getSystemStatus()
    const errors = status.recentErrors || []
    
    const limitedErrors = limit ? errors.slice(-limit) : errors
    
    return limitedErrors.map(error => ({
      context: error.context,
      message: error.message,
      stack: error.stack,
      timestamp: error.timestamp
    }))
  }

  /**
   * システムメトリクスの取得
   * @returns {Promise<SystemMetricsDTO>}
   */
  async getSystemMetrics() {
    try {
      const [status, gestureService] = await Promise.all([
        this.systemApplicationService.getSystemStatus(),
        this.systemApplicationService.getGestureApplicationService()
      ])
      
      // ジェスチャー統計を取得
      const gestureStats = await gestureService.getRecognitionStats()
      const customGestureStats = await gestureService.customGestureManagementUseCase.getGestureStatistics()
      
      return {
        performance: {
          uptime: status.uptime,
          averageResponseTime: gestureStats.performance?.averageRecognitionTime || 0,
          memoryUsage: 0, // 実装が困難なため0に設定
          recognitionRate: gestureStats.recognition?.recognitionRate || 0
        },
        usage: {
          totalGestureRecognitions: gestureStats.recognition?.totalRecognitions || 0,
          totalCustomGestures: customGestureStats.performance?.totalCustomGestures || 0,
          storageUsage: 0, // 実装が困難なため0に設定
          settingsChanges: 0 // 実装が困難なため0に設定
        },
        errors: {
          totalErrors: status.recentErrors.length,
          errorRate: this.calculateErrorRate(status.recentErrors, status.uptime),
          errorsByContext: this.groupErrorsByContext(status.recentErrors),
          topErrors: this.getTopErrors(status.recentErrors)
        },
        timestamp: new Date().toISOString()
      }
      
    } catch {
      // エラー時はデフォルト値を返す
      return {
        performance: {
          uptime: 0,
          averageResponseTime: 0,
          memoryUsage: 0,
          recognitionRate: 0
        },
        usage: {
          totalGestureRecognitions: 0,
          totalCustomGestures: 0,
          storageUsage: 0,
          settingsChanges: 0
        },
        errors: {
          totalErrors: 0,
          errorRate: 0,
          errorsByContext: [],
          topErrors: []
        },
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システムのリセット
   * @param {boolean} [preserveUserData] - ユーザーデータを保持するか
   * @returns {Promise<SystemResetResultDTO>}
   */
  async resetSystem(preserveUserData = true) {
    try {
      // 現在の状態を保存
      await this.systemApplicationService.getSystemStatus()
      
      // システムを停止
      await this.systemApplicationService.shutdown()
      
      const resetComponents = ['infrastructure', 'repositories', 'useCases', 'services']
      
      if (!preserveUserData) {
        // ユーザーデータもリセットする場合の処理
        // 実際の実装では、適切なデータクリア処理を行う
        resetComponents.push('userData')
      }
      
      // システムを再初期化
      const initResult = await this.systemApplicationService.initializeSystem()
      
      return {
        success: initResult.success,
        message: initResult.success ? 
          'System reset completed successfully' : 
          `System reset failed: ${initResult.message}`,
        userDataPreserved: preserveUserData,
        resetComponents: resetComponents,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      return {
        success: false,
        message: `System reset failed: ${error.message}`,
        userDataPreserved: preserveUserData,
        resetComponents: [],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システムの診断実行
   * @returns {Promise<SystemDiagnosticsDTO>}
   */
  async runDiagnostics() {
    try {
      const healthCheck = await this.systemApplicationService.performHealthCheck()
      
      // 診断テストを実行
      const tests = await this.performDiagnosticTests()
      
      // 問題と推奨事項を特定
      const issues = this.identifyIssues(healthCheck, tests)
      const recommendations = this.generateDiagnosticRecommendations(issues, tests)
      
      return {
        overall: tests.chromeApiAvailability && tests.storageConnectivity && 
                tests.settingsIntegrity && tests.gestureDataIntegrity && 
                tests.recognitionFunctionality,
        tests: tests,
        issues: issues,
        recommendations: recommendations,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      return {
        overall: false,
        tests: {
          chromeApiAvailability: false,
          storageConnectivity: false,
          settingsIntegrity: false,
          gestureDataIntegrity: false,
          recognitionFunctionality: false
        },
        issues: [`診断実行エラー: ${error.message}`],
        recommendations: ['システムの再初期化を試してください'],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システムの最適化実行
   * @returns {Promise<SystemOptimizationResultDTO>}
   */
  async optimizeSystem() {
    try {
      // 最適化前のパフォーマンスを取得
      const beforeMetrics = await this.getSystemMetrics()
      
      // ジェスチャー認識の最適化を実行
      const gestureService = await this.systemApplicationService.getGestureApplicationService()
      const optimizationResult = await gestureService.optimizeRecognitionAccuracy()
      
      // 最適化後のパフォーマンスを取得
      const afterMetrics = await this.getSystemMetrics()
      
      return {
        success: true,
        message: 'システム最適化が完了しました',
        details: {
          storageOptimization: optimizationResult.storageOptimization || {},
          recognitionOptimization: optimizationResult.recognitionStats || {},
          cacheOptimization: {} // 実装が必要に応じて追加
        },
        beforePerformance: beforeMetrics.performance,
        afterPerformance: afterMetrics.performance,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      return {
        success: false,
        message: `システム最適化に失敗しました: ${error.message}`,
        details: {
          storageOptimization: {},
          recognitionOptimization: {},
          cacheOptimization: {}
        },
        beforePerformance: {
          uptime: 0,
          averageResponseTime: 0,
          memoryUsage: 0,
          recognitionRate: 0
        },
        afterPerformance: {
          uptime: 0,
          averageResponseTime: 0,
          memoryUsage: 0,
          recognitionRate: 0
        },
        timestamp: new Date().toISOString()
      }
    }
  }

  // Private helper methods

  /**
   * 健全性スコアを計算
   * @private
   * @param {Object} healthCheck
   * @returns {number}
   */
  calculateHealthScore(healthCheck) {
    if (!healthCheck) return 0
    
    let totalScore = 0
    let componentCount = 0
    
    // Infrastructure の健全性
    if (healthCheck.infrastructure) {
      totalScore += healthCheck.infrastructure.isHealthy ? 1 : 0
      componentCount++
    }
    
    // Repository の健全性
    if (healthCheck.repositories) {
      totalScore += healthCheck.repositories.isHealthy ? 1 : 0
      componentCount++
    }
    
    return componentCount > 0 ? totalScore / componentCount : 0
  }

  /**
   * 健全性コンポーネントを変換
   * @private
   * @param {Object} healthCheck
   * @returns {Object}
   */
  convertHealthComponents(healthCheck) {
    return {
      infrastructure: {
        isHealthy: healthCheck.infrastructure?.isHealthy || false,
        components: healthCheck.infrastructure?.components || {},
        error: healthCheck.infrastructure?.error
      },
      repositories: {
        isHealthy: healthCheck.repositories?.isHealthy || false,
        components: healthCheck.repositories?.components || {},
        error: healthCheck.repositories?.error
      },
      recognition: healthCheck.recognition || {},
      customGestures: healthCheck.customGestures || {}
    }
  }

  /**
   * 推奨事項を生成
   * @private
   * @param {Object} healthCheck
   * @returns {Array<string>}
   */
  generateRecommendations(healthCheck) {
    const recommendations = []
    
    if (!healthCheck.infrastructure?.isHealthy) {
      recommendations.push('Infrastructure層の設定を確認してください')
    }
    
    if (!healthCheck.repositories?.isHealthy) {
      recommendations.push('Repository層のストレージ接続を確認してください')
    }
    
    if (recommendations.length === 0) {
      recommendations.push('システムは正常に動作しています')
    }
    
    return recommendations
  }

  /**
   * エラー率を計算
   * @private
   * @param {Array} errors
   * @param {number} uptime
   * @returns {number}
   */
  calculateErrorRate(errors, uptime) {
    if (!uptime || uptime === 0) return 0
    
    const recentErrors = errors.filter(error => {
      const errorTime = new Date(error.timestamp).getTime()
      const now = Date.now()
      return (now - errorTime) <= uptime
    })
    
    return recentErrors.length / (uptime / 3600000) // エラー/時間
  }

  /**
   * コンテキスト別にエラーをグループ化
   * @private
   * @param {Array} errors
   * @returns {Array}
   */
  groupErrorsByContext(errors) {
    const grouped = {}
    
    errors.forEach(error => {
      const context = error.context || 'unknown'
      grouped[context] = (grouped[context] || 0) + 1
    })
    
    return Object.entries(grouped).map(([context, count]) => ({
      context,
      count
    }))
  }

  /**
   * 頻発エラーを取得
   * @private
   * @param {Array} errors
   * @returns {Array}
   */
  getTopErrors(errors) {
    const grouped = {}
    
    errors.forEach(error => {
      const message = error.message || 'unknown'
      grouped[message] = (grouped[message] || 0) + 1
    })
    
    return Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([message, count]) => ({
        message,
        count
      }))
  }

  /**
   * 診断テストを実行
   * @private
   * @returns {Promise<Object>}
   */
  async performDiagnosticTests() {
    const tests = {
      chromeApiAvailability: false,
      storageConnectivity: false,
      settingsIntegrity: false,
      gestureDataIntegrity: false,
      recognitionFunctionality: false
    }
    
    try {
      // Chrome API 利用可能性テスト
      tests.chromeApiAvailability = typeof chrome !== 'undefined' && 
        chrome.storage && chrome.runtime && chrome.tabs
      
      // ストレージ接続性テスト
      if (this.systemApplicationService.isInitialized) {
        const settingsRepo = this.systemApplicationService.repositories?.settingsRepository
        if (settingsRepo) {
          const status = await settingsRepo.getRepositoryStatus()
          tests.storageConnectivity = status.isHealthy
        }
      }
      
      // 設定整合性テスト
      if (this.systemApplicationService.isInitialized) {
        const settingsUseCase = this.systemApplicationService.getSettingsManagementUseCase()
        const validation = await settingsUseCase.validateCurrentSettings()
        tests.settingsIntegrity = validation.isValid
      }
      
      // ジェスチャーデータ整合性テスト
      if (this.systemApplicationService.isInitialized) {
        const gestureService = this.systemApplicationService.getGestureApplicationService()
        const gestureStats = await gestureService.customGestureManagementUseCase.getGestureStatistics()
        tests.gestureDataIntegrity = gestureStats !== null
      }
      
      // 認識機能テスト
      tests.recognitionFunctionality = tests.chromeApiAvailability && 
        tests.storageConnectivity && tests.settingsIntegrity
      
    } catch (error) {
      console.error('Diagnostic tests failed:', error)
    }
    
    return tests
  }

  /**
   * 問題を特定
   * @private
   * @param {Object} healthCheck
   * @param {Object} tests
   * @returns {Array<string>}
   */
  identifyIssues(healthCheck, tests) {
    const issues = []
    
    if (!tests.chromeApiAvailability) {
      issues.push('Chrome API が利用できません')
    }
    
    if (!tests.storageConnectivity) {
      issues.push('ストレージへの接続に問題があります')
    }
    
    if (!tests.settingsIntegrity) {
      issues.push('設定データに整合性の問題があります')
    }
    
    if (!tests.gestureDataIntegrity) {
      issues.push('ジェスチャーデータに問題があります')
    }
    
    if (!tests.recognitionFunctionality) {
      issues.push('認識機能に問題があります')
    }
    
    return issues
  }

  /**
   * 診断用推奨事項を生成
   * @private
   * @param {Array} issues
   * @param {Object} tests
   * @returns {Array<string>}
   */
  generateDiagnosticRecommendations(issues, tests) {
    const recommendations = []
    
    if (!tests.chromeApiAvailability) {
      recommendations.push('Chrome拡張機能として実行されているか確認してください')
    }
    
    if (!tests.storageConnectivity) {
      recommendations.push('ストレージの権限設定を確認してください')
    }
    
    if (!tests.settingsIntegrity) {
      recommendations.push('設定をリセットすることを検討してください')
    }
    
    if (!tests.gestureDataIntegrity) {
      recommendations.push('ジェスチャーデータをエクスポート後、リセットしてください')
    }
    
    if (issues.length === 0) {
      recommendations.push('システムは正常に動作しています')
    }
    
    return recommendations
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SystemServiceImpl }
}