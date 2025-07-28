// ジェスチャー学習機能のユニットテスト

const { GestureLearningManager, PatternAnalyzer, AdaptiveThresholdManager } = require('../../content_scripts/gesture-learning-manager.js')

describe('GestureLearningManager', () => {
  let learningManager

  beforeEach(() => {
    learningManager = new GestureLearningManager()
  })

  describe('使用履歴の蓄積', () => {
    test('ジェスチャー使用回数を記録できる', () => {
      const gestureId = 'custom-test-123'
      const pattern = ['UP', 'DOWN']
      
      learningManager.recordGestureUsage(gestureId, pattern, true)
      
      const history = learningManager.getUsageHistory(gestureId)
      expect(history.totalUsage).toBe(1)
      expect(history.successCount).toBe(1)
      expect(history.patterns.length).toBe(1)
    })

    test('失敗したジェスチャーも記録される', () => {
      const gestureId = 'custom-test-456'
      const pattern = ['LEFT', 'RIGHT']
      
      learningManager.recordGestureUsage(gestureId, pattern, false)
      
      const history = learningManager.getUsageHistory(gestureId)
      expect(history.totalUsage).toBe(1)
      expect(history.successCount).toBe(0)
      expect(history.failureCount).toBe(1)
    })

    test('複数回の使用履歴を蓄積できる', () => {
      const gestureId = 'custom-test-789'
      const pattern1 = ['UP', 'RIGHT']
      const pattern2 = ['UP', 'RIGHT', 'DOWN']
      
      learningManager.recordGestureUsage(gestureId, pattern1, true)
      learningManager.recordGestureUsage(gestureId, pattern2, true)
      learningManager.recordGestureUsage(gestureId, pattern1, false)
      
      const history = learningManager.getUsageHistory(gestureId)
      expect(history.totalUsage).toBe(3)
      expect(history.successCount).toBe(2)
      expect(history.failureCount).toBe(1)
      expect(history.patterns.length).toBe(3)
    })
  })

  describe('パターン認識精度向上', () => {
    test('使用頻度の高いパターンバリエーションを学習する', () => {
      const gestureId = 'custom-frequently-used'
      const basePattern = ['UP', 'DOWN']
      const variation1 = ['UP', 'UP', 'DOWN']
      const variation2 = ['UP', 'DOWN', 'DOWN']
      
      // 複数のバリエーションを記録
      for (let i = 0; i < 5; i++) {
        learningManager.recordGestureUsage(gestureId, basePattern, true)
      }
      for (let i = 0; i < 3; i++) {
        learningManager.recordGestureUsage(gestureId, variation1, true)
      }
      for (let i = 0; i < 2; i++) {
        learningManager.recordGestureUsage(gestureId, variation2, true)
      }
      
      const learnedPatterns = learningManager.getLearnedPatternVariations(gestureId)
      expect(learnedPatterns.length).toBeGreaterThan(1)
      expect(learnedPatterns[0].pattern).toEqual(basePattern) // 最も使用頻度の高いパターン
      expect(learnedPatterns[0].confidence).toBeGreaterThan(0.8)
    })

    test('ユーザー固有のジェスチャー特徴を識別できる', () => {
      const gestureId = 'custom-user-specific'
      
      // ユーザーが一貫して長めのパターンを使う傾向
      const longPatterns = [
        ['UP', 'UP', 'RIGHT', 'DOWN'],
        ['UP', 'UP', 'UP', 'RIGHT', 'DOWN'],
        ['UP', 'RIGHT', 'RIGHT', 'DOWN']
      ]
      
      longPatterns.forEach(pattern => {
        for (let i = 0; i < 3; i++) {
          learningManager.recordGestureUsage(gestureId, pattern, true)
        }
      })
      
      const userProfile = learningManager.getUserGestureProfile()
      expect(userProfile.averagePatternLength).toBeGreaterThan(3)
      expect(userProfile.preferredDirections).toContain('UP')
      expect(userProfile.preferredDirections).toContain('RIGHT')
    })
  })

  describe('学習データの永続化', () => {
    test('学習データを保存できる', async () => {
      const gestureId = 'test-save'
      const pattern = ['LEFT', 'DOWN']
      
      learningManager.recordGestureUsage(gestureId, pattern, true)
      
      await learningManager.saveLearningData()
      
      expect(learningManager.getDirtyFlag()).toBe(false)
    })

    test('学習データを読み込める', async () => {
      // 既存データをモック
      const mockData = {
        usageHistory: {
          'test-load': {
            totalUsage: 10,
            successCount: 8,
            failureCount: 2,
            patterns: [['UP', 'DOWN'], ['UP', 'DOWN']],
            lastUsed: new Date().toISOString()
          }
        },
        userProfile: {
          averagePatternLength: 2.5,
          preferredDirections: ['UP', 'DOWN'],
          gestureSpeed: 'medium'
        }
      }
      
      // Chrome storage モックを設定
      global.chrome.storage.sync.get.mockResolvedValue({ gestureLearningData: mockData })
      
      await learningManager.loadLearningData()
      
      const history = learningManager.getUsageHistory('test-load')
      expect(history.totalUsage).toBe(10)
      expect(history.successCount).toBe(8)
    })
  })
})

describe('PatternAnalyzer', () => {
  let analyzer

  beforeEach(() => {
    analyzer = new PatternAnalyzer()
  })

  describe('パターン分析', () => {
    test('パターンの共通性を分析できる', () => {
      const patterns = [
        ['UP', 'DOWN'],
        ['UP', 'UP', 'DOWN'],
        ['UP', 'DOWN', 'DOWN'],
        ['RIGHT', 'DOWN'] // 異なるパターン
      ]
      
      const analysis = analyzer.analyzePatterns(patterns)
      
      expect(analysis.commonElements).toContain('UP')
      expect(analysis.commonElements).toContain('DOWN')
      expect(analysis.patternClusters.length).toBeGreaterThan(1)
    })

    test('パターンの複雑度を計算できる', () => {
      const simplePattern = ['UP']
      const complexPattern = ['UP', 'RIGHT', 'DOWN', 'LEFT', 'UP', 'DOWN']
      
      const simpleComplexity = analyzer.calculateComplexity(simplePattern)
      const complexComplexity = analyzer.calculateComplexity(complexPattern)
      
      expect(complexComplexity).toBeGreaterThan(simpleComplexity)
      expect(simpleComplexity).toBe(1)
      expect(complexComplexity).toBeGreaterThan(3)
    })

    test('パターンの類似性を計算できる', () => {
      const pattern1 = ['UP', 'DOWN', 'RIGHT']
      const pattern2 = ['UP', 'DOWN', 'LEFT']  // 最後だけ異なる
      const pattern3 = ['LEFT', 'UP', 'RIGHT'] // 順序が異なる
      
      const similarity1_2 = analyzer.calculateSimilarity(pattern1, pattern2)
      const similarity1_3 = analyzer.calculateSimilarity(pattern1, pattern3)
      
      expect(similarity1_2).toBeGreaterThan(similarity1_3)
      expect(similarity1_2).toBeGreaterThan(0.6)
      expect(similarity1_3).toBeLessThan(0.6)
    })
  })
})

describe('AdaptiveThresholdManager', () => {
  let thresholdManager

  beforeEach(() => {
    thresholdManager = new AdaptiveThresholdManager()
  })

  describe('動的閾値調整', () => {
    test('初期閾値が設定されている', () => {
      expect(thresholdManager.getCurrentThreshold()).toBe(0.6)
    })

    test('成功率に基づいて閾値を調整できる', () => {
      const highSuccessGestureId = 'high-success-gesture'
      const lowSuccessGestureId = 'low-success-gesture'
      
      // 高い成功率 → 閾値を上げる（より厳格に）
      thresholdManager.updateBasedOnSuccess(highSuccessGestureId, 0.95) // 95%成功率
      let newThreshold = thresholdManager.getThresholdForGesture(highSuccessGestureId)
      expect(newThreshold).toBeGreaterThan(0.6)
      
      // 低い成功率 → 閾値を下げる（より寛容に）
      thresholdManager.updateBasedOnSuccess(lowSuccessGestureId, 0.3) // 30%成功率
      newThreshold = thresholdManager.getThresholdForGesture(lowSuccessGestureId)
      expect(newThreshold).toBeLessThan(0.6)
    })

    test('使用頻度に基づいて閾値を調整できる', () => {
      const frequentGestureId = 'frequent-gesture'
      const rareGestureId = 'rare-gesture'
      
      // 頻繁に使用されるジェスチャー → 閾値を下げる（使いやすく）
      thresholdManager.updateBasedOnUsage(frequentGestureId, 100) // 100回使用
      const frequentThreshold = thresholdManager.getThresholdForGesture(frequentGestureId)
      
      // 稀に使用されるジェスチャー → 閾値を維持またはやや上げる
      thresholdManager.updateBasedOnUsage(rareGestureId, 2) // 2回使用
      const rareThreshold = thresholdManager.getThresholdForGesture(rareGestureId)
      
      expect(frequentThreshold).toBeLessThanOrEqual(rareThreshold)
    })

    test('閾値の上限・下限が制限されている', () => {
      const gestureId = 'boundary-test'
      
      // 極端に高い成功率でも上限を超えない
      thresholdManager.updateBasedOnSuccess(gestureId, 1.0)
      thresholdManager.updateBasedOnSuccess(gestureId, 1.0)
      thresholdManager.updateBasedOnSuccess(gestureId, 1.0)
      const maxThreshold = thresholdManager.getThresholdForGesture(gestureId)
      expect(maxThreshold).toBeLessThanOrEqual(0.9)
      
      // 極端に低い成功率でも下限を下回らない
      const lowGestureId = 'low-success'
      thresholdManager.updateBasedOnSuccess(lowGestureId, 0.0)
      thresholdManager.updateBasedOnSuccess(lowGestureId, 0.0)
      thresholdManager.updateBasedOnSuccess(lowGestureId, 0.0)
      const minThreshold = thresholdManager.getThresholdForGesture(lowGestureId)
      expect(minThreshold).toBeGreaterThanOrEqual(0.3)
    })
  })
})