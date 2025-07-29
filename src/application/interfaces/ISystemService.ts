/**
 * ISystemService
 * システム管理機能のインターフェース定義
 * Presentation層とApplication層の境界を定義
 */

// DTO definitions (Data Transfer Objects)

/**
 * システム設定DTO
 */
export interface SystemConfigDTO {
  enableDebugMode?: boolean
  maxErrorHistory?: number
  healthCheckInterval?: number
  cleanupInterval?: number
}

/**
 * コンポーネント健全性DTO
 */
export interface ComponentHealthDTO {
  isHealthy: boolean
  components?: Record<string, unknown>
  error?: string
}

/**
 * システム健全性コンポーネントDTO
 */
export interface SystemHealthComponentsDTO {
  infrastructure: ComponentHealthDTO
  repositories: ComponentHealthDTO
  recognition?: Record<string, unknown>
  customGestures?: Record<string, unknown>
}

/**
 * システム健全性チェックDTO
 */
export interface SystemHealthCheckDTO {
  isHealthy: boolean
  healthScore: number
  components: SystemHealthComponentsDTO
  recommendations: string[]
  timestamp: string
}

/**
 * システム初期化結果DTO
 */
export interface SystemInitializationResultDTO {
  initializationId: string
  success: boolean
  message: string
  initializationTime: number
  healthCheck: SystemHealthCheckDTO | null
  error: string | null
  timestamp: string
}

/**
 * システムコンポーネント状態DTO
 */
export interface SystemComponentsDTO {
  infrastructure: string[]
  repositories: string[]
  useCases: string[]
  services: string[]
}

/**
 * システムエラーDTO
 */
export interface SystemErrorDTO {
  context: string
  message: string
  stack?: string
  timestamp: string
}

/**
 * システム状態DTO
 */
export interface SystemStatusDTO {
  isInitialized: boolean
  initializationTime: string | null
  uptime: number
  components: SystemComponentsDTO
  recentErrors: SystemErrorDTO[]
  healthCheck?: SystemHealthCheckDTO
  timestamp: string
}

/**
 * システム設定更新結果DTO
 */
export interface SystemConfigUpdateResultDTO {
  oldConfig: SystemConfigDTO
  newConfig: SystemConfigDTO
  timestamp: string
}

/**
 * システムパフォーマンスDTO
 */
export interface SystemPerformanceDTO {
  uptime: number
  averageResponseTime: number
  memoryUsage: number
  recognitionRate: number
}

/**
 * システム使用量DTO
 */
export interface SystemUsageDTO {
  totalGestureRecognitions: number
  totalCustomGestures: number
  storageUsage: number
  settingsChanges: number
}

/**
 * システムエラーメトリクスDTO
 */
export interface SystemErrorMetricsDTO {
  totalErrors: number
  errorRate: number
  errorsByContext: Array<{ context: string; count: number }>
  topErrors: Array<{ message: string; count: number }>
}

/**
 * システムメトリクスDTO
 */
export interface SystemMetricsDTO {
  performance: SystemPerformanceDTO
  usage: SystemUsageDTO
  errors: SystemErrorMetricsDTO
  timestamp: string
}

/**
 * システムリセット結果DTO
 */
export interface SystemResetResultDTO {
  success: boolean
  message: string
  userDataPreserved: boolean
  resetComponents: string[]
  timestamp: string
}

/**
 * システム診断テストDTO
 */
export interface SystemDiagnosticTestDTO {
  chromeApiAvailability: boolean
  storageConnectivity: boolean
  settingsIntegrity: boolean
  gestureDataIntegrity: boolean
  recognitionFunctionality: boolean
}

/**
 * システム診断DTO
 */
export interface SystemDiagnosticsDTO {
  overall: boolean
  tests: SystemDiagnosticTestDTO
  issues: string[]
  recommendations: string[]
  timestamp: string
}

/**
 * システム最適化詳細DTO
 */
export interface SystemOptimizationDetailsDTO {
  storageOptimization: Record<string, unknown>
  recognitionOptimization: Record<string, unknown>
  cacheOptimization: Record<string, unknown>
}

/**
 * システム最適化結果DTO
 */
export interface SystemOptimizationResultDTO {
  success: boolean
  message: string
  details: SystemOptimizationDetailsDTO
  beforePerformance: SystemPerformanceDTO
  afterPerformance: SystemPerformanceDTO
  timestamp: string
}

/**
 * システムサービスのインターフェース
 */
export interface ISystemService {
  /**
   * システムの初期化
   */
  initializeSystem(config?: SystemConfigDTO): Promise<SystemInitializationResultDTO>

  /**
   * システム状態の取得
   */
  getSystemStatus(): Promise<SystemStatusDTO>

  /**
   * システムの健全性チェック
   */
  performHealthCheck(): Promise<SystemHealthCheckDTO>

  /**
   * システムの優雅な停止
   */
  shutdown(): Promise<void>

  /**
   * システム設定の更新
   */
  updateSystemConfiguration(newConfig: Partial<SystemConfigDTO>): Promise<SystemConfigUpdateResultDTO>

  /**
   * エラー履歴の取得
   */
  getErrorHistory(limit?: number): Promise<SystemErrorDTO[]>

  /**
   * システムメトリクスの取得
   */
  getSystemMetrics(): Promise<SystemMetricsDTO>

  /**
   * システムのリセット
   */
  resetSystem(preserveUserData?: boolean): Promise<SystemResetResultDTO>

  /**
   * システムの診断実行
   */
  runDiagnostics(): Promise<SystemDiagnosticsDTO>

  /**
   * システムの最適化実行
   */
  optimizeSystem(): Promise<SystemOptimizationResultDTO>
}