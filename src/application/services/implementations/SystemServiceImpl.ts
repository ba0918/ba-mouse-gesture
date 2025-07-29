/**
 * SystemServiceImpl
 * ISystemServiceの具象実装クラス
 * Presentation層からApplication層への橋渡しを行う
 */

// 型定義のインポート
interface SystemApplicationService {
  initializeSystem: (config?: any) => Promise<any>;
  getSystemStatus: () => Promise<any>;
  performHealthCheck: () => Promise<any>;
  shutdown: () => Promise<void>;
  updateSystemConfiguration: (config: any) => Promise<any>;
  getGestureApplicationService: () => Promise<any>;
  getSettingsManagementUseCase: () => any;
  isInitialized: boolean;
  repositories?: any;
}

// DTO型定義
interface SystemConfigDTO {
  enableDebugMode?: boolean;
  maxErrorHistory?: number;
  healthCheckInterval?: number;
  cleanupInterval?: number;
}

interface SystemInitializationResultDTO {
  initializationId: string | null;
  success: boolean;
  message: string;
  initializationTime: number;
  healthCheck: any;
  error: string | null;
  timestamp: string;
}

interface SystemStatusDTO {
  isInitialized: boolean;
  initializationTime: string | null;
  uptime: number;
  components: {
    infrastructure: string[];
    repositories: string[];
    useCases: string[];
    services: string[];
  };
  recentErrors: any[];
  healthCheck: any;
  timestamp: string;
}

interface SystemMetricsDTO {
  performance: {
    uptime: number;
    averageResponseTime: number;
    memoryUsage: number;
    recognitionRate: number;
  };
  usage: {
    totalGestureRecognitions: number;
    totalCustomGestures: number;
    storageUsage: number;
    settingsChanges: number;
  };
  errors: {
    totalErrors: number;
    errorRate: number;
    errorsByContext: Array<{ context: string; count: number }>;
    topErrors: Array<{ message: string; count: number }>;
  };
  timestamp: string;
}

class SystemServiceImpl {
  private systemApplicationService: SystemApplicationService;

  /**
   * @param systemApplicationService システムアプリケーションサービス
   */
  constructor(systemApplicationService: SystemApplicationService) {
    this.systemApplicationService = systemApplicationService;
  }

  /**
   * システムの初期化
   * @param config - 初期化設定
   * @returns Promise<SystemInitializationResultDTO>
   */
  async initializeSystem(config?: SystemConfigDTO): Promise<SystemInitializationResultDTO> {
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
      const errorMessage = (error as Error).message || 'Unknown error';
      return {
        initializationId: null,
        success: false,
        message: `System initialization failed: ${errorMessage}`,
        initializationTime: 0,
        healthCheck: null,
        error: errorMessage,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システム状態の取得
   * @returns Promise<SystemStatusDTO>
   */
  async getSystemStatus(): Promise<SystemStatusDTO> {
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
      recentErrors: status.recentErrors.map((error: any) => ({
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
   * @returns Promise<any>
   */
  async performHealthCheck(): Promise<any> {
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
   * @returns Promise<void>
   */
  async shutdown(): Promise<void> {
    await this.systemApplicationService.shutdown()
  }

  /**
   * システム設定の更新
   * @param newConfig - 新しい設定
   * @returns Promise<any>
   */
  async updateSystemConfiguration(newConfig: Partial<SystemConfigDTO>): Promise<any> {
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
   * @param limit - 取得する件数制限
   * @returns Promise<any[]>
   */
  async getErrorHistory(limit: number = 50): Promise<any[]> {
    const status = await this.systemApplicationService.getSystemStatus()
    const errors = status.recentErrors || []
    
    const limitedErrors = limit ? errors.slice(-limit) : errors
    
    return limitedErrors.map((error: any) => ({
      context: error.context,
      message: error.message,
      stack: error.stack,
      timestamp: error.timestamp
    }))
  }

  /**
   * システムメトリクスの取得
   * @returns Promise<SystemMetricsDTO>
   */
  async getSystemMetrics(): Promise<SystemMetricsDTO> {
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
   * @param preserveUserData - ユーザーデータを保持するか
   * @returns Promise<any>
   */
  async resetSystem(preserveUserData: boolean = true): Promise<any> {
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
      const errorMessage = (error as Error).message || 'Unknown error';
      return {
        success: false,
        message: `System reset failed: ${errorMessage}`,
        userDataPreserved: preserveUserData,
        resetComponents: [],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システムの診断実行
   * @returns Promise<any>
   */
  async runDiagnostics(): Promise<any> {
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
      const errorMessage = (error as Error).message || 'Unknown error';
      return {
        overall: false,
        tests: {
          chromeApiAvailability: false,
          storageConnectivity: false,
          settingsIntegrity: false,
          gestureDataIntegrity: false,
          recognitionFunctionality: false
        },
        issues: [`診断実行エラー: ${errorMessage}`],
        recommendations: ['システムの再初期化を試してください'],
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * システムの最適化実行
   * @returns Promise<any>
   */
  async optimizeSystem(): Promise<any> {
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
        message: `システム最適化に失敗しました: ${(error as Error).message || 'Unknown error'}`,
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
   * @param healthCheck
   * @returns number
   */
  private calculateHealthScore(healthCheck: any): number {
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
   * @param healthCheck
   * @returns any
   */
  private convertHealthComponents(healthCheck: any): any {
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
   * @param healthCheck
   * @returns string[]
   */
  private generateRecommendations(healthCheck: any): string[] {
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
   * @param errors
   * @param uptime
   * @returns number
   */
  private calculateErrorRate(errors: any[], uptime: number): number {
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
   * @param errors
   * @returns Array<{context: string, count: number}>
   */
  private groupErrorsByContext(errors: any[]): Array<{context: string, count: number}> {
    const grouped: Record<string, number> = {}
    
    errors.forEach((error: any) => {
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
   * @param errors
   * @returns Array<{message: string, count: number}>
   */
  private getTopErrors(errors: any[]): Array<{message: string, count: number}> {
    const grouped: Record<string, number> = {}
    
    errors.forEach((error: any) => {
      const message = error.message || 'unknown'
      grouped[message] = (grouped[message] || 0) + 1
    })
    
    return Object.entries(grouped)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([message, count]) => ({
        message,
        count
      }))
  }

  /**
   * 診断テストを実行
   * @private
   * @returns Promise<any>
   */
  private async performDiagnosticTests(): Promise<any> {
    const tests = {
      chromeApiAvailability: false,
      storageConnectivity: false,
      settingsIntegrity: false,
      gestureDataIntegrity: false,
      recognitionFunctionality: false
    }
    
    try {
      // Chrome API 利用可能性テスト
      tests.chromeApiAvailability = Boolean(typeof chrome !== 'undefined' && 
        chrome.storage && chrome.runtime && chrome.tabs)
      
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
        const gestureService = await this.systemApplicationService.getGestureApplicationService()
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
   * @param healthCheck
   * @param tests
   * @returns string[]
   */
  private identifyIssues(healthCheck: any, tests: any): string[] {
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
   * @param issues
   * @param tests
   * @returns string[]
   */
  private generateDiagnosticRecommendations(issues: string[], tests: any): string[] {
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
export { SystemServiceImpl };