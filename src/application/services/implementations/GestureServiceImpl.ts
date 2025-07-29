/**
 * GestureServiceImpl
 * IGestureServiceの具象実装クラス
 * Presentation層からApplication層への橋渡しを行う
 */

import type { 
  GestureExecutionResultDTO, 
  CustomGestureDTO, 
  CustomGestureUpdateDTO,
  LearningResultDTO,
  GestureStatisticsDTO,
  GestureBackupDTO,
  OptimizationResultDTO
} from '../../interfaces/index.js';

// 型定義
interface RawPoint {
  x: number;
  y: number;
  timestamp?: number;
}

// GestureApplicationServiceは依存性注入で受け取る
interface GestureApplicationService {
  processGestureExecution: (rawPoints: RawPoint[], currentUrl: string, tabId: number) => Promise<any>;
  learnCustomGesture: (name: string, rawPoints: RawPoint[], action: string, description?: string) => Promise<any>;
  retrainCustomGesture: (gestureId: string, additionalSamples: RawPoint[][]) => Promise<any>;
  optimizeRecognitionAccuracy: () => Promise<any>;
  customGestureManagementUseCase: any;
  gestureRecognitionUseCase: any;
}

class GestureServiceImpl {
  private gestureApplicationService: GestureApplicationService;

  /**
   * @param gestureApplicationService ジェスチャーアプリケーションサービス
   */
  constructor(gestureApplicationService: GestureApplicationService) {
    this.gestureApplicationService = gestureApplicationService;
  }

  /**
   * ジェスチャー認識とアクション実行
   * @param rawPoints - マウス軌跡データ
   * @param currentUrl - 現在のページURL
   * @param tabId - タブID
   * @returns Promise<GestureExecutionResultDTO>
   */
  async executeGesture(rawPoints: RawPoint[], currentUrl: string, tabId: number): Promise<GestureExecutionResultDTO> {
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
        sessionId: '',
        gesture: null,
        success: false,
        message: `Execution failed: ${(error as Error).message}`,
        metadata: {},
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * カスタムジェスチャーの作成
   * @param name - ジェスチャー名
   * @param rawPoints - 軌跡データ
   * @param action - アクション
   * @param description - 説明
   * @returns Promise<CustomGestureDTO>
   */
  async createCustomGesture(name: string, rawPoints: RawPoint[], action: string, description: string = ''): Promise<CustomGestureDTO> {
    const result = await this.gestureApplicationService.learnCustomGesture(
      name, rawPoints, action as any
    )
    
    const gesture = result.gesture
    return {
      id: gesture.id,
      name: gesture.name,
      action: gesture.action,
      enabled: gesture.enabled,
      description: gesture.description || '',
      usage: {
        totalUses: gesture.usage?.totalUses || 0,
        lastUsed: gesture.usage?.lastUsed || '',
        averageAccuracy: gesture.usage?.averageAccuracy || 0,
        successRate: gesture.usage?.successRate || 0
      },
      createdAt: gesture.createdAt,
      updatedAt: gesture.updatedAt
    }
  }

  /**
   * カスタムジェスチャーの一覧取得
   * @returns Promise<Array<CustomGestureDTO>>
   */
  async getCustomGestures(): Promise<CustomGestureDTO[]> {
    const customGestures = await this.gestureApplicationService.customGestureManagementUseCase.getAllCustomGestures()
    
    return customGestures.map((gesture: any) => ({
      id: gesture.id,
      name: gesture.name,
      action: gesture.action,
      enabled: gesture.enabled,
      description: gesture.description || '',
      usage: {
        totalUses: gesture.usage?.totalUses || 0,
        lastUsed: gesture.usage?.lastUsed || '',
        averageAccuracy: gesture.usage?.averageAccuracy || 0,
        successRate: gesture.usage?.successRate || 0
      },
      createdAt: gesture.createdAt,
      updatedAt: gesture.updatedAt
    }))
  }

  /**
   * カスタムジェスチャーの更新
   * @param gestureId - ジェスチャーID
   * @param updates - 更新データ
   * @returns Promise<CustomGestureDTO>
   */
  async updateCustomGesture(gestureId: string, updates: Partial<CustomGestureUpdateDTO>): Promise<CustomGestureDTO> {
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
        totalUses: updatedGesture.usage?.totalUses || 0,
        lastUsed: updatedGesture.usage?.lastUsed || '',
        averageAccuracy: updatedGesture.usage?.averageAccuracy || 0,
        successRate: updatedGesture.usage?.successRate || 0
      },
      createdAt: updatedGesture.createdAt,
      updatedAt: updatedGesture.updatedAt
    }
  }

  /**
   * カスタムジェスチャーの削除
   * @param gestureId - ジェスチャーID
   * @returns Promise<void>
   */
  async deleteCustomGesture(gestureId: string): Promise<void> {
    await this.gestureApplicationService.customGestureManagementUseCase.deleteCustomGesture(gestureId)
  }

  /**
   * カスタムジェスチャーの有効/無効切り替え
   * @param gestureId - ジェスチャーID
   * @param enabled - 有効/無効
   * @returns Promise<CustomGestureDTO>
   */
  async toggleCustomGesture(gestureId: string, enabled: boolean): Promise<CustomGestureDTO> {
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
        totalUses: updatedGesture.usage?.totalUses || 0,
        lastUsed: updatedGesture.usage?.lastUsed || '',
        averageAccuracy: updatedGesture.usage?.averageAccuracy || 0,
        successRate: updatedGesture.usage?.successRate || 0
      },
      createdAt: updatedGesture.createdAt,
      updatedAt: updatedGesture.updatedAt
    }
  }

  /**
   * カスタムジェスチャーの再学習
   * @param gestureId - ジェスチャーID
   * @param additionalSamples - 追加サンプル
   * @returns Promise<LearningResultDTO>
   */
  async retrainCustomGesture(gestureId: string, additionalSamples: RawPoint[][]): Promise<LearningResultDTO> {
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
   * @returns Promise<GestureStatisticsDTO>
   */
  async getGestureStatistics(): Promise<GestureStatisticsDTO> {
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
   * @returns Promise<GestureBackupDTO>
   */
  async exportGestures(): Promise<GestureBackupDTO> {
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
   * @param backup - バックアップデータ
   * @returns Promise<void>
   */
  async importGestures(backup: GestureBackupDTO): Promise<void> {
    await this.gestureApplicationService.customGestureManagementUseCase.importCustomGestures(backup)
  }

  /**
   * 認識精度の最適化
   * @returns Promise<OptimizationResultDTO>
   */
  async optimizeRecognition(): Promise<OptimizationResultDTO> {
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
   * @param url - 現在のページURL
   * @returns boolean
   */
  isGestureEnabled(url: string): boolean {
    return this.gestureApplicationService.gestureRecognitionUseCase.isGestureEnabled(url)
  }

  /**
   * 特定ジェスチャーが有効かチェック
   * @param gestureId - ジェスチャーID
   * @returns boolean
   */
  isSpecificGestureEnabled(gestureId: string): boolean {
    return this.gestureApplicationService.gestureRecognitionUseCase.isSpecificGestureEnabled(gestureId)
  }
}

// ES6 Module export
export { GestureServiceImpl };