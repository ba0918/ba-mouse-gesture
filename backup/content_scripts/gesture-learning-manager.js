// ジェスチャー学習機能管理クラス
// 🎯 Clean Architecture準拠: UseCase経由でのみストレージアクセス

class GestureLearningManager {
  constructor() {
    // 🎯 Clean Architecture: UseCaseの初期化（フォールバック機能付き）
    if (typeof window !== 'undefined' && window.GestureLearningUseCase) {
      try {
        this.gestureLearningUseCase = new window.GestureLearningUseCase()
        console.log('✅ GestureLearningUseCase initialized')
      } catch (error) {
        console.error('❌ FATAL: Failed to initialize GestureLearningUseCase:', error)
        this.gestureLearningUseCase = this.createFallbackUseCase()
      }
    } else {
      // テスト環境やUseCaseが利用できない場合のフォールバック
      console.warn('⚠️ GestureLearningUseCase not available, using fallback')
      this.gestureLearningUseCase = this.createFallbackUseCase()
    }
    this.usageHistory = new Map()
    this.userProfile = {
      averagePatternLength: 0,
      preferredDirections: [],
      gestureSpeed: 'medium'
    }
    this.isDirty = false
  }

  // ジェスチャー使用履歴を記録
  recordGestureUsage(gestureId, pattern, success) {
    if (!this.usageHistory.has(gestureId)) {
      this.usageHistory.set(gestureId, {
        totalUsage: 0,
        successCount: 0,
        failureCount: 0,
        patterns: [],
        lastUsed: null
      })
    }

    const history = this.usageHistory.get(gestureId)
    history.totalUsage++
    if (success) {
      history.successCount++
    } else {
      history.failureCount++
    }
    history.patterns.push(pattern)
    history.lastUsed = new Date().toISOString()
    
    this.isDirty = true
    this.updateUserProfile()
  }

  // 使用履歴を取得
  getUsageHistory(gestureId) {
    return this.usageHistory.get(gestureId) || {
      totalUsage: 0,
      successCount: 0,
      failureCount: 0,
      patterns: [],
      lastUsed: null
    }
  }

  // 学習されたパターンバリエーションを取得
  getLearnedPatternVariations(gestureId) {
    const history = this.getUsageHistory(gestureId)
    if (history.patterns.length === 0) return []

    // パターンの出現頻度を計算
    const patternFrequency = new Map()
    history.patterns.forEach(pattern => {
      const patternKey = JSON.stringify(pattern)
      patternFrequency.set(patternKey, (patternFrequency.get(patternKey) || 0) + 1)
    })

    // 頻度順にソートして学習済みパターンを返す
    const variations = Array.from(patternFrequency.entries())
      .map(([patternKey, frequency]) => ({
        pattern: JSON.parse(patternKey),
        frequency: frequency,
        confidence: Math.min(0.95, 0.66 + (frequency / history.patterns.length) * 0.3)
      }))
      .sort((a, b) => b.frequency - a.frequency)

    return variations
  }

  // ユーザープロファイルを取得
  getUserGestureProfile() {
    return { ...this.userProfile }
  }

  // ユーザープロファイルを更新
  updateUserProfile() {
    const allPatterns = []
    const directionCount = new Map()

    // 全ジェスチャーのパターンを収集
    this.usageHistory.forEach(history => {
      allPatterns.push(...history.patterns)
    })

    if (allPatterns.length === 0) return

    // 平均パターン長を計算
    const totalLength = allPatterns.reduce((sum, pattern) => sum + pattern.length, 0)
    this.userProfile.averagePatternLength = totalLength / allPatterns.length

    // 好みの方向を分析
    allPatterns.forEach(pattern => {
      pattern.forEach(direction => {
        directionCount.set(direction, (directionCount.get(direction) || 0) + 1)
      })
    })

    // 使用頻度の高い方向をプリファレンスとして設定
    this.userProfile.preferredDirections = Array.from(directionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([direction]) => direction)
  }

  // ダーティフラグを取得
  getDirtyFlag() {
    return this.isDirty
  }

  // 学習データを保存
  // Clean Architecture準拠: UseCase経由で保存
  async saveLearningData() {
    try {
      const data = {
        usageHistory: Object.fromEntries(this.usageHistory),
        userProfile: this.userProfile
      }
      
      await this.gestureLearningUseCase.saveLearningData(data)
      this.isDirty = false
    } catch (error) {
      console.error('❌ Failed to save learning data:', error)
      throw error
    }
  }

  // 学習データを読み込み
  // Clean Architecture準拠: UseCase経由で読み込み
  async loadLearningData() {
    try {
      const data = await this.gestureLearningUseCase.getLearningData()
      
      // 使用履歴を復元
      if (data.usageHistory) {
        this.usageHistory = new Map(Object.entries(data.usageHistory))
      }
      
      // ユーザープロファイルを復元
      if (data.userProfile) {
        this.userProfile = { ...this.userProfile, ...data.userProfile }
      }
    } catch (error) {
      console.warn('Failed to load learning data:', error)
    }
  }

  // テスト環境用のフォールバックUseCaseを作成
  createFallbackUseCase() {
    return {
      saveLearningData: async () => {
        // テスト環境では何もしない
        return true
      },
      getLearningData: async () => {
        // テスト環境では空のデータを返す
        return {
          usageHistory: {},
          userProfile: {
            averagePatternLength: 0,
            preferredDirections: [],
            gestureSpeed: 'medium'
          }
        }
      }
    }
  }
}

class PatternAnalyzer {
  constructor() {
    this.commonThreshold = 0.5 // 共通要素として認識する閾値
  }

  // パターン群を分析
  analyzePatterns(patterns) {
    if (patterns.length === 0) {
      return {
        commonElements: [],
        patternClusters: []
      }
    }

    const elementCount = new Map()
    const totalPatterns = patterns.length

    // 全パターンから要素の出現頻度を計算
    patterns.forEach(pattern => {
      const uniqueElements = [...new Set(pattern)]
      uniqueElements.forEach(element => {
        elementCount.set(element, (elementCount.get(element) || 0) + 1)
      })
    })

    // 共通要素を抽出（閾値以上の頻度）
    const commonElements = Array.from(elementCount.entries())
      .filter(([, count]) => count / totalPatterns >= this.commonThreshold)
      .map(([element]) => element)

    // パターンクラスタリング（簡易版）
    const patternClusters = this.clusterPatterns(patterns)

    return {
      commonElements,
      patternClusters
    }
  }

  // パターンの複雑度を計算
  calculateComplexity(pattern) {
    if (pattern.length === 0) return 0
    if (pattern.length === 1) return 1

    // 方向転換の回数 + パターンの長さに基づく複雑度
    let directionChanges = 0
    for (let i = 1; i < pattern.length; i++) {
      if (pattern[i] !== pattern[i - 1]) {
        directionChanges++
      }
    }

    // 複雑度 = 基本長さ + 方向転換のボーナス
    return pattern.length + directionChanges * 0.5
  }

  // パターンの類似性を計算
  calculateSimilarity(pattern1, pattern2) {
    if (pattern1.length === 0 && pattern2.length === 0) return 1.0
    if (pattern1.length === 0 || pattern2.length === 0) return 0.0

    // レーベンシュタイン距離ベースの類似性
    const editDistance = this.calculateEditDistance(pattern1, pattern2)
    const maxLength = Math.max(pattern1.length, pattern2.length)
    
    return 1 - (editDistance / maxLength)
  }

  // 編集距離を計算
  calculateEditDistance(arr1, arr2) {
    const matrix = []
    
    for (let i = 0; i <= arr2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= arr1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= arr2.length; i++) {
      for (let j = 1; j <= arr1.length; j++) {
        if (arr2[i - 1] === arr1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 置換
            matrix[i][j - 1] + 1,     // 挿入
            matrix[i - 1][j] + 1      // 削除
          )
        }
      }
    }
    
    return matrix[arr2.length][arr1.length]
  }

  // パターンクラスタリング（簡易版）
  clusterPatterns(patterns) {
    if (patterns.length === 0) return []

    const clusters = []
    const processed = new Set()

    patterns.forEach((pattern, index) => {
      if (processed.has(index)) return

      const cluster = {
        representative: pattern,
        members: [pattern],
        size: 1
      }

      // 類似パターンを同じクラスターに追加
      patterns.forEach((otherPattern, otherIndex) => {
        if (otherIndex === index || processed.has(otherIndex)) return

        const similarity = this.calculateSimilarity(pattern, otherPattern)
        if (similarity > 0.7) { // 高い類似性閾値
          cluster.members.push(otherPattern)
          cluster.size++
          processed.add(otherIndex)
        }
      })

      clusters.push(cluster)
      processed.add(index)
    })

    return clusters.sort((a, b) => b.size - a.size) // サイズ順にソート
  }
}

class AdaptiveThresholdManager {
  constructor() {
    this.defaultThreshold = 0.6
    this.gestureThresholds = new Map()
    this.minThreshold = 0.3
    this.maxThreshold = 0.9
    this.adjustmentFactor = 0.1
  }

  // 現在の基本閾値を取得
  getCurrentThreshold() {
    return this.defaultThreshold
  }

  // 特定ジェスチャーの閾値を取得
  getThresholdForGesture(gestureId) {
    return this.gestureThresholds.get(gestureId) || this.defaultThreshold
  }

  // 成功率に基づく閾値更新
  updateBasedOnSuccess(gestureId, successRate) {
    const currentThreshold = this.getThresholdForGesture(gestureId)
    let newThreshold = currentThreshold

    if (successRate > 0.8) {
      // 高成功率 → 閾値を上げる（より厳格に）
      newThreshold = Math.min(this.maxThreshold, currentThreshold + this.adjustmentFactor)
    } else if (successRate < 0.5) {
      // 低成功率 → 閾値を下げる（より寛容に）
      newThreshold = Math.max(this.minThreshold, currentThreshold - this.adjustmentFactor)
    }

    // 閾値が変更された場合のみ設定
    if (newThreshold !== currentThreshold) {
      this.gestureThresholds.set(gestureId, newThreshold)
    }
  }

  // 使用頻度に基づく閾値更新
  updateBasedOnUsage(gestureId, usageCount) {
    const currentThreshold = this.getThresholdForGesture(gestureId)
    let newThreshold = currentThreshold

    if (usageCount > 50) {
      // 頻繁に使用 → 閾値を下げる（使いやすく）
      const reductionFactor = Math.min(0.1, usageCount / 1000)
      newThreshold = Math.max(this.minThreshold, currentThreshold - reductionFactor)
    } else if (usageCount < 5) {
      // 稀に使用 → 閾値を維持または少し上げる
      newThreshold = Math.min(this.maxThreshold, currentThreshold + 0.02)
    }

    this.gestureThresholds.set(gestureId, newThreshold)
  }

  // 閾値を手動設定
  setThreshold(gestureId, threshold) {
    const clampedThreshold = Math.max(this.minThreshold, Math.min(this.maxThreshold, threshold))
    this.gestureThresholds.set(gestureId, clampedThreshold)
  }

  // 全ての閾値をリセット
  resetThresholds() {
    this.gestureThresholds.clear()
  }
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    GestureLearningManager,
    PatternAnalyzer,
    AdaptiveThresholdManager
  }
}

// ブラウザ環境では window オブジェクトに追加
if (typeof window !== 'undefined') {
  window.GestureLearningManager = GestureLearningManager
  window.PatternAnalyzer = PatternAnalyzer
  window.AdaptiveThresholdManager = AdaptiveThresholdManager
}