/**
 * GestureRecognitionUseCase
 * ジェスチャー認識のビジネスロジックを統合するUseCaseクラス
 */

// 依存関係のインポート
let GestureRecognizer, PatternMatcher, LearningEngine, Point, GesturePattern
if (typeof require !== 'undefined') {
  ({ GestureRecognizer } = require('../../domain/services/GestureRecognizer'));
  ({ PatternMatcher } = require('../../domain/services/PatternMatcher'));
  ({ LearningEngine } = require('../../domain/services/LearningEngine'));
  ({ Point } = require('../../domain/valueObjects/Point'));
  ({ GesturePattern } = require('../../domain/valueObjects/GesturePattern'))
}

class GestureRecognitionUseCase {
  /**
   * @param {SettingsRepository} settingsRepository 
   * @param {GestureRepository} gestureRepository
   */
  constructor(settingsRepository, gestureRepository) {
    this.settingsRepository = settingsRepository
    this.gestureRepository = gestureRepository
    this.gestureRecognizer = null
    this.patternMatcher = null
    this.learningEngine = null
    this.isInitialized = false
  }

  /**
   * UseCaseの初期化
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // 設定から閾値を取得
      const settings = await this.settingsRepository.getSettings()
      const threshold = settings.getThreshold()

      // ドメインサービスを初期化
      this.gestureRecognizer = new GestureRecognizer(threshold)
      this.patternMatcher = new PatternMatcher()
      this.learningEngine = new LearningEngine()

      // 学習データを読み込み
      const learningData = await this.gestureRepository.getLearningData()
      this.learningEngine.loadLearningData(learningData)

      this.isInitialized = true
    } catch (error) {
      throw new GestureRecognitionError('Failed to initialize recognition use case', error)
    }
  }

  /**
   * マウス軌跡からジェスチャーを認識
   * @param {Array} rawPoints - 生の軌跡データ [{x, y, timestamp}, ...]
   * @returns {Promise<GestureRecognitionResult>}
   */
  async recognizeGesture(rawPoints) {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // バリデーション
      if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
        return new GestureRecognitionResult(null, 'Insufficient points', false)
      }

      // 生データをPointオブジェクトに変換
      const points = this.convertToPoints(rawPoints)

      // パターン認識
      const pattern = this.gestureRecognizer.recognizeFromPoints(points)
      if (!pattern) {
        return new GestureRecognitionResult(null, 'No pattern recognized', false)
      }

      // デフォルトジェスチャーとの照合
      const defaultGestures = await this.getEnabledDefaultGestures()
      const defaultResult = this.gestureRecognizer.matchPattern(pattern, defaultGestures)

      // カスタムジェスチャーとの照合
      const customGestures = await this.gestureRepository.getCustomGestures()
      const enabledCustomGestures = customGestures.filter(g => g.enabled)
      const customResult = this.gestureRecognizer.matchPattern(pattern, enabledCustomGestures)

      // より良いマッチを選択（カスタムジェスチャーを優先）
      const bestResult = this.selectBestMatch(defaultResult, customResult)
      
      // 学習データを更新
      if (bestResult.isSuccess()) {
        await this.updateLearningData(pattern, bestResult.gesture, true)
        
        // 使用統計を記録
        await this.gestureRepository.recordGestureUsage(bestResult.gesture.id, true)
      }

      return new GestureRecognitionResult(
        bestResult.gesture,
        bestResult.gesture ? 'Gesture recognized successfully' : 'No matching gesture found',
        bestResult.isConfident,
        {
          similarity: bestResult.similarity,
          pattern: pattern.toString(),
          isCustomGesture: customGestures.some(g => g.id === bestResult.gesture?.id)
        }
      )

    } catch (error) {
      return new GestureRecognitionResult(null, `Recognition failed: ${error.message}`, false)
    }
  }

  /**
   * ジェスチャーの有効性をチェック
   * @param {string} url - 現在のページURL
   * @returns {Promise<boolean>}
   */
  async isGestureEnabled(url) {
    try {
      const settings = await this.settingsRepository.getSettings()
      
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
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<boolean>}
   */
  async isSpecificGestureEnabled(gestureId) {
    try {
      const settings = await this.settingsRepository.getSettings()
      return settings.isGestureEnabled(gestureId)
    } catch (error) {
      console.error('Failed to check specific gesture enabled status:', error)
      return true
    }
  }

  /**
   * 認識精度統計を取得
   * @returns {Promise<Object>}
   */
  async getRecognitionStats() {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // ジェスチャー認識統計
      const recognitionStats = this.gestureRecognizer.getRecognitionStats()
      
      // パフォーマンス統計
      const performanceStats = await this.gestureRepository.getPerformanceStats()
      
      // 学習統計
      const learningStats = this.learningEngine.getLearningStats()

      return {
        recognition: recognitionStats,
        performance: performanceStats,
        learning: learningStats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new GestureRecognitionError('Failed to get recognition stats', error)
    }
  }

  /**
   * 認識閾値を動的調整
   * @returns {Promise<void>}
   */
  async adaptRecognitionThreshold() {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // 現在の統計を取得
      const stats = await this.getRecognitionStats()
      
      // 適応的閾値調整
      this.gestureRecognizer.adaptThreshold()
      
      // 調整された閾値を設定に反映（必要に応じて）
      const newThreshold = this.gestureRecognizer.threshold
      if (stats.recognition.recognitionRate < 0.7) {
        // 認識率が低い場合は設定を更新
        await this.settingsRepository.updateThreshold(newThreshold.getDetectionThreshold())
      }
      
    } catch (error) {
      console.error('Failed to adapt recognition threshold:', error)
    }
  }

  /**
   * 生データをPointオブジェクトに変換
   * @param {Array} rawPoints
   * @returns {Point[]}
   */
  convertToPoints(rawPoints) {
    return rawPoints.map(point => new Point(point.x, point.y, point.timestamp))
  }

  /**
   * 有効なデフォルトジェスチャーを取得
   * @returns {Promise<Gesture[]>}
   */
  async getEnabledDefaultGestures() {
    const settings = await this.settingsRepository.getSettings()
    const defaultGestureStates = settings.defaultGestureStates
    
    // デフォルトジェスチャーの定義（これは通常設定ファイルから読み込む）
    const defaultGestures = this.getDefaultGestureDefinitions()
    
    return defaultGestures.filter(gesture => 
      defaultGestureStates[gesture.id] !== false
    )
  }

  /**
   * デフォルトジェスチャーの定義を取得
   * @returns {Gesture[]}
   */
  getDefaultGestureDefinitions() {
    // この実装は設定ファイルやレジストリから読み込むべき
    const { Gesture } = require('../../domain/entities/Gesture')
    const { GesturePattern } = require('../../domain/valueObjects/GesturePattern')
    
    return [
      new Gesture('left', 'Back', new GesturePattern(['L']), 'browser_back'),
      new Gesture('right', 'Forward', new GesturePattern(['R']), 'browser_forward'),
      new Gesture('up', 'Scroll to Top', new GesturePattern(['U']), 'scroll_top'),
      new Gesture('down', 'Scroll to Bottom', new GesturePattern(['D']), 'scroll_bottom'),
      new Gesture('downright', 'Close Tab', new GesturePattern(['D', 'R']), 'close_tab'),
      new Gesture('upright', 'New Tab', new GesturePattern(['U', 'R']), 'new_tab'),
      new Gesture('rightdown', 'Duplicate Tab', new GesturePattern(['R', 'D']), 'duplicate_tab'),
      new Gesture('updown', 'Refresh', new GesturePattern(['U', 'D']), 'refresh'),
      new Gesture('super_refresh', 'Super Refresh', new GesturePattern(['U', 'D', 'U']), 'super_refresh'),
      new Gesture('prev_tab', 'Previous Tab', new GesturePattern(['L', 'R']), 'prev_tab'),
      new Gesture('next_tab', 'Next Tab', new GesturePattern(['R', 'L']), 'next_tab')
    ]
  }

  /**
   * 最適なマッチを選択
   * @param {GestureRecognitionResult} defaultResult
   * @param {GestureRecognitionResult} customResult  
   * @returns {GestureRecognitionResult}
   */
  selectBestMatch(defaultResult, customResult) {
    // カスタムジェスチャーが見つかった場合は優先
    if (customResult.isSuccess()) {
      return customResult
    }
    
    // デフォルトジェスチャーの結果を返す
    return defaultResult
  }

  /**
   * 学習データを更新
   * @param {GesturePattern} pattern
   * @param {Gesture} gesture
   * @param {boolean} success
   * @returns {Promise<void>}
   */
  async updateLearningData(pattern, gesture, success) {
    if (!this.learningEngine) return

    try {
      // 学習エンジンにデータを追加
      this.learningEngine.learnPattern(gesture.id, pattern, success)
      
      // 学習データを永続化
      const learningData = this.learningEngine.exportLearningData()
      await this.gestureRepository.saveLearningData(learningData)
      
    } catch (error) {
      console.error('Failed to update learning data:', error)
    }
  }

  /**
   * リソースのクリーンアップ
   */
  cleanup() {
    if (this.gestureRecognizer) {
      this.gestureRecognizer.clearHistory()
    }
    this.isInitialized = false
  }
}

/**
 * ジェスチャー認識結果
 */
class GestureRecognitionResult {
  constructor(gesture, message, isConfident, metadata = {}) {
    this.gesture = gesture
    this.message = message
    this.isConfident = isConfident
    this.metadata = metadata
    this.timestamp = new Date().toISOString()
  }

  /**
   * 認識に成功したかチェック
   * @returns {boolean}
   */
  isSuccess() {
    return this.gesture !== null && this.isConfident
  }

  /**
   * 結果をJSONに変換
   * @returns {Object}
   */
  toJSON() {
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
class GestureRecognitionError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'GestureRecognitionError'
    this.originalError = originalError
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    GestureRecognitionUseCase, 
    GestureRecognitionResult, 
    GestureRecognitionError 
  }
}