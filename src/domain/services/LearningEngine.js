/**
 * LearningEngine ドメインサービス
 * AI学習機能のコアロジックを提供
 */

// 依存関係のインポート
let Threshold, GesturePattern
if (typeof require !== 'undefined') {
  const ThresholdModule = require('../valueObjects/Threshold')
  Threshold = ThresholdModule.Threshold
  const GesturePatternModule = require('../valueObjects/GesturePattern')
  GesturePattern = GesturePatternModule.GesturePattern
}
class LearningEngine {
  /**
   * @param {Threshold} threshold - 学習閾値
   */
  constructor(threshold) {
    this.threshold = threshold || Threshold.getDefault()
    this.learningHistory = new Map() // gestureId -> LearningData
    this.globalStats = {
      totalLearnings: 0,
      totalGestures: 0,
      averageSuccessRate: 0,
      lastUpdated: new Date().toISOString()
    }
    this.maxHistoryPerGesture = 50
  }

  /**
   * ジェスチャー使用を学習
   * @param {string} gestureId - ジェスチャーID
   * @param {GesturePattern} pattern - 実際のパターン
   * @param {boolean} success - 実行成功
   * @param {number} executionTime - 実行時間（ms）
   */
  recordGestureUsage(gestureId, pattern, success, executionTime = 0) {
    if (!gestureId || !pattern) return

    // 学習データを取得または作成
    let learningData = this.learningHistory.get(gestureId)
    if (!learningData) {
      learningData = new LearningData(gestureId)
      this.learningHistory.set(gestureId, learningData)
    }

    // 使用パターンを記録
    const usage = new GestureUsage(pattern, success, executionTime)
    learningData.addUsage(usage)

    // パターンバリエーションを学習
    this.learnPatternVariations(learningData, pattern, success)

    // 動的閾値調整
    this.adjustDynamicThreshold(learningData)

    // グローバル統計更新
    this.updateGlobalStats()
  }

  /**
   * パターンバリエーションを学習
   * @param {LearningData} learningData
   * @param {GesturePattern} pattern
   * @param {boolean} success
   */
  learnPatternVariations(learningData, pattern, success) {
    
    // 既存バリエーションを検索
    let variation = learningData.patternVariations.find(v => 
      v.pattern.exactMatch(pattern))
    
    if (!variation) {
      // 新しいバリエーションを作成
      variation = new PatternVariation(pattern)
      learningData.patternVariations.push(variation)
    }
    
    // 使用統計を更新
    variation.addUsage(success)
    
    // 信頼度を再計算
    this.recalculateVariationConfidence(learningData)
  }

  /**
   * バリエーション信頼度を再計算
   * @param {LearningData} learningData
   */
  recalculateVariationConfidence(learningData) {
    const totalUsage = learningData.getTotalUsageCount()
    
    learningData.patternVariations.forEach(variation => {
      // 使用頻度に基づく信頼度
      const frequencyScore = variation.usageCount / totalUsage
      
      // 成功率に基づく信頼度
      const successScore = variation.getSuccessRate()
      
      // パターンの複雑さによる調整
      const complexityScore = Math.min(1.0, variation.pattern.getComplexity() / 5)
      
      // 総合信頼度
      variation.confidence = Math.min(0.95, 
        (frequencyScore * 0.3) + 
        (successScore * 0.5) + 
        (complexityScore * 0.2)
      )
    })
    
    // 信頼度順にソート
    learningData.patternVariations.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * 動的閾値調整
   * @param {LearningData} learningData
   */
  adjustDynamicThreshold(learningData) {
    const successRate = learningData.getSuccessRate()
    const usageCount = learningData.getTotalUsageCount()
    
    // 十分なデータが蓄積されてから調整開始
    if (usageCount < 5) return
    
    let adjustmentFactor = 1.0
    
    // 成功率に基づく調整
    if (successRate > 0.9) {
      // 高い成功率：閾値を少し上げて精度向上
      adjustmentFactor = 1.05
    } else if (successRate < 0.6) {
      // 低い成功率：閾値を下げて検出感度向上
      adjustmentFactor = 0.95
    }
    
    // 使用頻度による調整
    const frequencyBonus = Math.min(0.1, usageCount / 100 * 0.1)
    adjustmentFactor += frequencyBonus
    
    // 新しい閾値を計算
    const currentThreshold = learningData.adaptiveThreshold || this.threshold
    learningData.adaptiveThreshold = currentThreshold.makeStricter(adjustmentFactor)
  }

  /**
   * ユーザー特徴を学習
   * @param {string} userId - ユーザーID
   * @returns {UserProfile}
   */
  learnUserCharacteristics(userId = 'default') {
    const allLearningData = Array.from(this.learningHistory.values())
    
    if (allLearningData.length === 0) {
      return new UserProfile(userId)
    }
    
    // ユーザープロファイルを分析
    const profile = new UserProfile(userId)
    
    // 平均的なジェスチャー速度
    profile.averageExecutionTime = this.calculateAverageExecutionTime(allLearningData)
    
    // よく使うジェスチャー
    profile.favoriteGestures = this.identifyFavoriteGestures(allLearningData)
    
    // ジェスチャーの精度
    profile.averageAccuracy = this.calculateAverageAccuracy(allLearningData)
    
    // 使用パターン（時間帯、頻度など）
    profile.usagePatterns = this.analyzeUsagePatterns(allLearningData)
    
    return profile
  }

  /**
   * 平均実行時間を計算
   * @param {LearningData[]} learningDataArray
   * @returns {number}
   */
  calculateAverageExecutionTime(learningDataArray) {
    let totalTime = 0
    let totalCount = 0
    
    learningDataArray.forEach(data => {
      data.usageHistory.forEach(usage => {
        totalTime += usage.executionTime
        totalCount++
      })
    })
    
    return totalCount > 0 ? totalTime / totalCount : 0
  }

  /**
   * よく使うジェスチャーを特定
   * @param {LearningData[]} learningDataArray
   * @returns {Object[]}
   */
  identifyFavoriteGestures(learningDataArray) {
    return learningDataArray
      .map(data => ({
        gestureId: data.gestureId,
        usageCount: data.getTotalUsageCount(),
        successRate: data.getSuccessRate()
      }))
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, 5)
  }

  /**
   * 平均精度を計算
   * @param {LearningData[]} learningDataArray
   * @returns {number}
   */
  calculateAverageAccuracy(learningDataArray) {
    const accuracies = learningDataArray.map(data => data.getSuccessRate())
    return accuracies.length > 0 ? 
      accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length : 0
  }

  /**
   * 使用パターンを分析
   * @param {LearningData[]} learningDataArray
   * @returns {Object}
   */
  analyzeUsagePatterns(learningDataArray) {
    const hourlyUsage = new Array(24).fill(0)
    const dailyUsage = new Array(7).fill(0)
    
    learningDataArray.forEach(data => {
      data.usageHistory.forEach(usage => {
        const date = new Date(usage.timestamp)
        hourlyUsage[date.getHours()]++
        dailyUsage[date.getDay()]++
      })
    })
    
    return {
      peakHours: this.findPeakUsageHours(hourlyUsage),
      peakDays: this.findPeakUsageDays(dailyUsage),
      totalSessions: learningDataArray.reduce((sum, data) => 
        sum + data.getTotalUsageCount(), 0)
    }
  }

  /**
   * ピーク使用時間を特定
   * @param {number[]} hourlyUsage
   * @returns {number[]}
   */
  findPeakUsageHours(hourlyUsage) {
    const maxUsage = Math.max(...hourlyUsage)
    const threshold = maxUsage * 0.7
    
    return hourlyUsage
      .map((usage, hour) => ({ hour, usage }))
      .filter(item => item.usage >= threshold)
      .map(item => item.hour)
  }

  /**
   * ピーク使用曜日を特定
   * @param {number[]} dailyUsage
   * @returns {number[]}
   */
  findPeakUsageDays(dailyUsage) {
    const maxUsage = Math.max(...dailyUsage)
    const threshold = maxUsage * 0.7
    
    return dailyUsage
      .map((usage, day) => ({ day, usage }))
      .filter(item => item.usage >= threshold)
      .map(item => item.day)
  }

  /**
   * 学習統計を取得
   * @param {string} gestureId - 特定ジェスチャーの統計（省略時は全体）
   * @returns {Object}
   */
  getLearningStats(gestureId = null) {
    if (gestureId) {
      const learningData = this.learningHistory.get(gestureId)
      return learningData ? learningData.getStats() : null
    }
    
    // 全体統計
    const allData = Array.from(this.learningHistory.values())
    
    return {
      ...this.globalStats,
      gestureCount: allData.length,
      totalUsage: allData.reduce((sum, data) => sum + data.getTotalUsageCount(), 0),
      averageSuccessRate: this.calculateAverageAccuracy(allData),
      topGestures: this.identifyFavoriteGestures(allData).slice(0, 3)
    }
  }

  /**
   * グローバル統計を更新
   */
  updateGlobalStats() {
    const allData = Array.from(this.learningHistory.values())
    
    this.globalStats.totalGestures = allData.length
    this.globalStats.totalLearnings = allData.reduce((sum, data) => 
      sum + data.getTotalUsageCount(), 0)
    this.globalStats.averageSuccessRate = this.calculateAverageAccuracy(allData)
    this.globalStats.lastUpdated = new Date().toISOString()
  }

  /**
   * 学習データをリセット
   * @param {string} gestureId - 特定ジェスチャーのリセット（省略時は全体）
   */
  resetLearning(gestureId = null) {
    if (gestureId) {
      this.learningHistory.delete(gestureId)
    } else {
      this.learningHistory.clear()
      this.globalStats = {
        totalLearnings: 0,
        totalGestures: 0,
        averageSuccessRate: 0,
        lastUpdated: new Date().toISOString()
      }
    }
  }

  /**
   * 学習データをエクスポート
   * @returns {Object}
   */
  exportLearningData() {
    const data = {}
    
    this.learningHistory.forEach((learningData, gestureId) => {
      data[gestureId] = learningData.toJSON()
    })
    
    return {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      globalStats: this.globalStats,
      learningData: data
    }
  }

  /**
   * 学習データをインポート
   * @param {Object} data
   */
  importLearningData(data) {
    if (!data.learningData) return
    
    this.learningHistory.clear()
    
    Object.entries(data.learningData).forEach(([gestureId, learningDataJson]) => {
      const learningData = LearningData.fromJSON(learningDataJson)
      this.learningHistory.set(gestureId, learningData)
    })
    
    if (data.globalStats) {
      this.globalStats = { ...data.globalStats }
    }
  }
}

/**
 * 学習データクラス
 */
class LearningData {
  constructor(gestureId) {
    this.gestureId = gestureId
    this.usageHistory = []
    this.patternVariations = []
    this.adaptiveThreshold = null
    this.createdAt = new Date().toISOString()
  }

  addUsage(usage) {
    this.usageHistory.push(usage)
    
    // 履歴サイズ制限
    if (this.usageHistory.length > 50) {
      this.usageHistory.shift()
    }
  }

  getTotalUsageCount() {
    return this.usageHistory.length
  }

  getSuccessRate() {
    if (this.usageHistory.length === 0) return 0
    const successCount = this.usageHistory.filter(usage => usage.success).length
    return successCount / this.usageHistory.length
  }

  getStats() {
    return {
      gestureId: this.gestureId,
      totalUsage: this.getTotalUsageCount(),
      successRate: this.getSuccessRate(),
      patternVariations: this.patternVariations.length,
      averageExecutionTime: this.getAverageExecutionTime(),
      lastUsed: this.getLastUsedTime()
    }
  }

  getAverageExecutionTime() {
    if (this.usageHistory.length === 0) return 0
    const totalTime = this.usageHistory.reduce((sum, usage) => sum + usage.executionTime, 0)
    return totalTime / this.usageHistory.length
  }

  getLastUsedTime() {
    return this.usageHistory.length > 0 ? 
      this.usageHistory[this.usageHistory.length - 1].timestamp : null
  }

  toJSON() {
    return {
      gestureId: this.gestureId,
      usageHistory: this.usageHistory.map(usage => usage.toJSON()),
      patternVariations: this.patternVariations.map(variation => variation.toJSON()),
      adaptiveThreshold: this.adaptiveThreshold ? this.adaptiveThreshold.toJSON() : null,
      createdAt: this.createdAt
    }
  }

  static fromJSON(data) {
    const learningData = new LearningData(data.gestureId)
    learningData.usageHistory = data.usageHistory.map(usage => GestureUsage.fromJSON(usage))
    learningData.patternVariations = data.patternVariations.map(variation => 
      PatternVariation.fromJSON(variation))
    learningData.adaptiveThreshold = data.adaptiveThreshold ? 
      Threshold.fromJSON(data.adaptiveThreshold) : null
    learningData.createdAt = data.createdAt
    return learningData
  }
}

/**
 * ジェスチャー使用記録クラス
 */
class GestureUsage {
  constructor(pattern, success, executionTime = 0) {
    this.pattern = pattern
    this.success = success
    this.executionTime = executionTime
    this.timestamp = new Date().toISOString()
  }

  toJSON() {
    return {
      pattern: this.pattern.toJSON(),
      success: this.success,
      executionTime: this.executionTime,
      timestamp: this.timestamp
    }
  }

  static fromJSON(data) {
    const pattern = GesturePattern.fromArray(data.pattern)
    const usage = new GestureUsage(pattern, data.success, data.executionTime)
    usage.timestamp = data.timestamp
    return usage
  }
}

/**
 * パターンバリエーションクラス
 */
class PatternVariation {
  constructor(pattern) {
    this.pattern = pattern
    this.usageCount = 0
    this.successCount = 0
    this.confidence = 0.5
  }

  addUsage(success) {
    this.usageCount++
    if (success) {
      this.successCount++
    }
  }

  getSuccessRate() {
    return this.usageCount > 0 ? this.successCount / this.usageCount : 0
  }

  toJSON() {
    return {
      pattern: this.pattern.toJSON(),
      usageCount: this.usageCount,
      successCount: this.successCount,
      confidence: this.confidence
    }
  }

  static fromJSON(data) {
    const pattern = GesturePattern.fromArray(data.pattern)
    const variation = new PatternVariation(pattern)
    variation.usageCount = data.usageCount
    variation.successCount = data.successCount
    variation.confidence = data.confidence
    return variation
  }
}

/**
 * ユーザープロファイルクラス
 */
class UserProfile {
  constructor(userId) {
    this.userId = userId
    this.averageExecutionTime = 0
    this.favoriteGestures = []
    this.averageAccuracy = 0
    this.usagePatterns = {}
    this.createdAt = new Date().toISOString()
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    LearningEngine, 
    LearningData, 
    GestureUsage, 
    PatternVariation, 
    UserProfile 
  }
}