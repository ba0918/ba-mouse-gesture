/**
 * GestureRecognitionUseCase
 * ジェスチャー認識のビジネスロジックを統合するUseCaseクラス
 */

// TypeScript imports
import { GestureRecognizer } from '../../domain/services/GestureRecognizer'
import { PatternMatcher } from '../../domain/services/PatternMatcher'
import { Point } from '../../domain/valueObjects/Point'
import { GesturePattern, Direction } from '../../domain/valueObjects/GesturePattern'
import { Gesture, GestureAction } from '../../domain/entities/Gesture'
import { CustomGesture } from '../../domain/entities/CustomGesture'
import { Settings } from '../../domain/entities/Settings'
import { Threshold } from '../../domain/valueObjects/Threshold'

// Type definitions
interface RawPoint {
  x: number
  y: number
  timestamp: number
}

interface MatchResult {
  gesture: Gesture | null
  similarity: number
  isConfident: boolean
  isSuccess(): boolean
}

interface RecognitionMetadata {
  similarity: number
  pattern: string
  isCustomGesture: boolean
}

interface RecognitionStatsData {
  recognition: any
  performance: any
  timestamp: string
}

// Repository interfaces (temporary - will be moved to proper interface files)
interface SettingsRepository {
  getSettings(): Promise<Settings>
  updateThreshold(threshold: number): Promise<void>
}

interface GestureRepository {
  getCustomGestures(): Promise<CustomGesture[]>
  recordGestureUsage(gestureId: string, success: boolean): Promise<void>
  getPerformanceStats(): Promise<any>
}

export class GestureRecognitionUseCase {
  private readonly settingsRepository: SettingsRepository
  private readonly gestureRepository: GestureRepository
  private gestureRecognizer: GestureRecognizer | null = null
  private patternMatcher: PatternMatcher | null = null
  private isInitialized: boolean = false

  constructor(settingsRepository: SettingsRepository, gestureRepository: GestureRepository) {
    this.settingsRepository = settingsRepository
    this.gestureRepository = gestureRepository
  }

  /**
   * UseCaseの初期化
   */
  async initialize(): Promise<void> {
    try {
      // 設定から閾値を取得
      const settings: Settings = await this.settingsRepository.getSettings()
      const threshold: Threshold = settings.getThreshold()

      // ドメインサービスを初期化
      this.gestureRecognizer = new GestureRecognizer(threshold)
      this.patternMatcher = new PatternMatcher()

      this.isInitialized = true
    } catch (error) {
      throw new GestureRecognitionError('Failed to initialize recognition use case', error)
    }
  }

  /**
   * マウス軌跡からジェスチャーを認識
   */
  async recognizeGesture(rawPoints: RawPoint[]): Promise<GestureRecognitionResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // バリデーション
      if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
        return new GestureRecognitionResult(null, 'Insufficient points', false)
      }

      // 生データをPointオブジェクトに変換
      const points: Point[] = this.convertToPoints(rawPoints)

      // パターン認識
      const pattern: GesturePattern | null = this.gestureRecognizer!.recognizeFromPoints(points)
      if (!pattern) {
        return new GestureRecognitionResult(null, 'No pattern recognized', false)
      }

      // デフォルトジェスチャーとの照合
      const defaultGestures: Gesture[] = await this.getEnabledDefaultGestures()
      const defaultResult: MatchResult = this.gestureRecognizer!.matchPattern(pattern, defaultGestures)

      // カスタムジェスチャーとの照合
      const customGestures: CustomGesture[] = await this.gestureRepository.getCustomGestures()
      const enabledCustomGestures: CustomGesture[] = customGestures.filter(g => g.enabled)
      const customResult: MatchResult = this.gestureRecognizer!.matchPattern(pattern, enabledCustomGestures)

      // より良いマッチを選択（カスタムジェスチャーを優先）
      const bestResult: MatchResult = this.selectBestMatch(defaultResult, customResult)
      
      // 使用統計を記録
      if (bestResult.isSuccess() && bestResult.gesture) {
        await this.gestureRepository.recordGestureUsage(bestResult.gesture.id, true)
      }

      const metadata: RecognitionMetadata = {
        similarity: bestResult.similarity,
        pattern: pattern.toString(),
        isCustomGesture: customGestures.some(g => g.id === bestResult.gesture?.id)
      }

      return new GestureRecognitionResult(
        bestResult.gesture,
        bestResult.gesture ? 'Gesture recognized successfully' : 'No matching gesture found',
        bestResult.isConfident,
        metadata
      )

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      return new GestureRecognitionResult(null, `Recognition failed: ${errorMessage}`, false)
    }
  }

  /**
   * ジェスチャーの有効性をチェック
   */
  async isGestureEnabled(url: string): Promise<boolean> {
    try {
      const settings: Settings = await this.settingsRepository.getSettings()
      
      // 全体的に無効の場合
      if (!settings.isEnabled()) {
        return false
      }

      // 除外サイトかチェック
      if (settings.isExcludedSite(url)) {
        return false
      }

      return true
    } catch (error) {
      // エラー時はデフォルトで有効
      console.error('Failed to check gesture enabled status:', error)
      return true
    }
  }

  /**
   * 特定のジェスチャーが有効かチェック
   */
  async isSpecificGestureEnabled(gestureId: string): Promise<boolean> {
    try {
      const settings: Settings = await this.settingsRepository.getSettings()
      // gestureIdをDefaultGestureStatesのkeyとしてキャスト
      const typedGestureId = gestureId as keyof typeof settings.defaultGestureStates
      
      // 存在しないキーの場合はfalseを返す
      if (!(typedGestureId in settings.defaultGestureStates)) {
        return false
      }
      
      return settings.isGestureEnabled(typedGestureId)
    } catch (error) {
      console.error('Failed to check specific gesture enabled status:', error)
      return true
    }
  }

  /**
   * 認識精度統計を取得
   */
  async getRecognitionStats(): Promise<RecognitionStatsData> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // ジェスチャー認識統計
      const recognitionStats = this.gestureRecognizer!.getRecognitionStats()
      
      // パフォーマンス統計
      const performanceStats = await this.gestureRepository.getPerformanceStats()

      return {
        recognition: recognitionStats,
        performance: performanceStats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new GestureRecognitionError('Failed to get recognition stats', error)
    }
  }

  /**
   * 認識閾値を動的調整
   */
  async adaptRecognitionThreshold(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // 現在の統計を取得
      const stats: RecognitionStatsData = await this.getRecognitionStats()
      
      // 適応的閾値調整
      this.gestureRecognizer!.adaptThreshold()
      
      // 調整された閾値を設定に反映（必要に応じて）
      // 認識率が低い場合は閾値調整を実行
      if (stats.recognition.recognitionRate < 0.7) {
        // 現在の設定から新しい閾値を取得して更新
        const currentSettings = await this.settingsRepository.getSettings()
        const currentThreshold = currentSettings.getThreshold()
        // 閾値を少し締める（認識率向上のため）
        const adjustedValue = Math.max(5, currentThreshold.getDetectionThreshold() * 0.9)
        await this.settingsRepository.updateThreshold(adjustedValue)
      }
      
    } catch (error) {
      console.error('Failed to adapt recognition threshold:', error)
    }
  }

  /**
   * 生データをPointオブジェクトに変換
   */
  private convertToPoints(rawPoints: RawPoint[]): Point[] {
    return rawPoints.map(point => new Point(point.x, point.y, point.timestamp))
  }

  /**
   * 有効なデフォルトジェスチャーを取得
   */
  private async getEnabledDefaultGestures(): Promise<Gesture[]> {
    const settings: Settings = await this.settingsRepository.getSettings()
    const defaultGestureStates = settings.defaultGestureStates
    
    // デフォルトジェスチャーの定義（これは通常設定ファイルから読み込む）
    const defaultGestures: Gesture[] = this.getDefaultGestureDefinitions()
    
    return defaultGestures.filter(gesture => {
      // gesture.idをDefaultGestureStatesのkeyとしてキャスト
      const gestureId = gesture.id as keyof typeof settings.defaultGestureStates
      return settings.defaultGestureStates[gestureId] !== false
    })
  }

  /**
   * デフォルトジェスチャーの定義を取得
   */
  private getDefaultGestureDefinitions(): Gesture[] {
    const directions: Direction[][] = [
      ['left'],
      ['right'],
      ['up'],
      ['down'],
      ['down', 'right'],
      ['up', 'right'],
      ['right', 'down'],
      ['up', 'down'],
      ['up', 'down', 'up'],
      ['left', 'right'],
      ['right', 'left']
    ]

    const gestureActions: GestureAction[] = [
      'back',
      'forward',
      'scroll_up',
      'scroll_down',
      'close_tab',
      'new_tab',
      'duplicate_tab',
      'refresh',
      'super_refresh',
      'prev_tab',
      'next_tab'
    ]

    const gestureDefinitions = [
      { id: 'left', name: 'Back' },
      { id: 'right', name: 'Forward' },
      { id: 'up', name: 'Scroll to Top' },
      { id: 'down', name: 'Scroll to Bottom' },
      { id: 'downright', name: 'Close Tab' },
      { id: 'upright', name: 'New Tab' },
      { id: 'rightdown', name: 'Duplicate Tab' },
      { id: 'updown', name: 'Refresh' },
      { id: 'super_refresh', name: 'Super Refresh' },
      { id: 'prev_tab', name: 'Previous Tab' },
      { id: 'next_tab', name: 'Next Tab' }
    ]

    return gestureDefinitions.map((def, index) => 
      new Gesture(def.id, def.name, new GesturePattern(directions[index]), gestureActions[index])
    )
  }

  /**
   * 最適なマッチを選択
   */
  private selectBestMatch(defaultResult: MatchResult, customResult: MatchResult): MatchResult {
    // カスタムジェスチャーが見つかった場合は優先
    if (customResult.isSuccess()) {
      return customResult
    }
    
    // デフォルトジェスチャーの結果を返す
    return defaultResult
  }

  /**
   * リソースのクリーンアップ
   */
  cleanup(): void {
    if (this.gestureRecognizer) {
      this.gestureRecognizer.clearHistory()
    }
    this.isInitialized = false
  }
}

/**
 * ジェスチャー認識結果
 */
export class GestureRecognitionResult {
  readonly gesture: Gesture | null
  readonly message: string
  readonly isConfident: boolean
  readonly metadata: RecognitionMetadata
  readonly timestamp: string

  constructor(
    gesture: Gesture | null, 
    message: string, 
    isConfident: boolean, 
    metadata: RecognitionMetadata = { similarity: 0, pattern: '', isCustomGesture: false }
  ) {
    this.gesture = gesture
    this.message = message
    this.isConfident = isConfident
    this.metadata = metadata
    this.timestamp = new Date().toISOString()
  }

  /**
   * 認識に成功したかチェック
   */
  isSuccess(): boolean {
    return this.gesture !== null && this.isConfident
  }

  /**
   * 結果をJSONに変換
   */
  toJSON(): object {
    return {
      gesture: this.gesture ? {
        id: this.gesture.id,
        name: this.gesture.name,
        action: this.gesture.action
      } : null,
      message: this.message,
      isConfident: this.isConfident,
      metadata: this.metadata,
      timestamp: this.timestamp
    }
  }
}

/**
 * ジェスチャー認識専用エラークラス
 */
export class GestureRecognitionError extends Error {
  readonly originalError?: unknown

  constructor(message: string, originalError?: unknown) {
    super(message)
    this.name = 'GestureRecognitionError'
    this.originalError = originalError
  }
}

// CommonJS exports for Jest compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GestureRecognitionUseCase,
    GestureRecognitionResult,
    GestureRecognitionError
  }
}