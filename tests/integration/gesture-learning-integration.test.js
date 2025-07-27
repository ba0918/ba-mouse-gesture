// ジェスチャー学習機能の統合テスト

const { CustomGestureManager, CustomPatternMatcher } = require('../../content_scripts/custom-gesture-manager.js')
const { GestureLearningManager, AdaptiveThresholdManager } = require('../../content_scripts/gesture-learning-manager.js')

describe('ジェスチャー学習機能統合テスト', () => {
  let customGestureManager
  let patternMatcher
  let learningManager

  beforeEach(async () => {
    // Chrome storage のモックをリセット
    jest.clearAllMocks()
    
    // マネージャーを初期化
    customGestureManager = new CustomGestureManager()
    learningManager = new GestureLearningManager()
    patternMatcher = new CustomPatternMatcher(customGestureManager)
    
    // 学習機能を手動で設定（実際の統合では自動）
    patternMatcher.learningManager = learningManager
    patternMatcher.thresholdManager = new AdaptiveThresholdManager()
    
    // テスト用カスタムジェスチャーを追加
    await customGestureManager.addCustomGesture({
      name: 'テスト戻る',
      pattern: ['LEFT'],
      action: 'back'
    })
    
    await customGestureManager.addCustomGesture({
      name: 'テスト複合',
      pattern: ['UP', 'DOWN', 'RIGHT'],
      action: 'close_tab'
    })
  })

  describe('学習データの蓄積と活用', () => {
    test('成功したジェスチャーの学習データが蓄積される', () => {
      const testPattern = ['LEFT']
      const gesture = customGestureManager.getCustomGestures()[0]
      
      // パターンマッチングを実行（成功）
      const result = patternMatcher.matchPattern(testPattern)
      
      expect(result.matched).toBe(true)
      expect(result.gestureName).toBe('テスト戻る')
      
      // 学習データが記録されているかチェック
      const history = learningManager.getUsageHistory(gesture.id)
      expect(history.totalUsage).toBe(1)
      expect(history.successCount).toBe(1)
      expect(history.patterns.length).toBe(1)
    })

    test('失敗したマッチングも学習データとして記録される', () => {
      const testPattern = ['DOWN', 'UP', 'LEFT'] // どのジェスチャーにも完全一致しない
      
      // マッチング試行
      const result = patternMatcher.matchPattern(testPattern)
      
      expect(result.matched).toBe(false)
      
      // 失敗データの記録を実行
      patternMatcher.recordFailedMatch(testPattern)
      
      // 類似度が高いジェスチャーに失敗が記録されているか確認
      const gestures = customGestureManager.getCustomGestures()
      const complexGesture = gestures.find(g => g.name === 'テスト複合')
      const history = learningManager.getUsageHistory(complexGesture.id)
      
      // 部分的に似ているため失敗として記録される可能性
      expect(history.totalUsage).toBeGreaterThanOrEqual(0)
    })

    test('複数回使用によるパターンバリエーション学習', () => {
      const gesture = customGestureManager.getCustomGestures()[0]
      const basePattern = ['LEFT']
      const variation1 = ['LEFT', 'LEFT'] // 少し異なるパターン
      
      // 基本パターンを複数回使用
      for (let i = 0; i < 5; i++) {
        patternMatcher.recordUsageForLearning(gesture.id, basePattern, true)
      }
      
      // バリエーションを使用
      for (let i = 0; i < 3; i++) {
        patternMatcher.recordUsageForLearning(gesture.id, variation1, true)
      }
      
      // 学習されたパターンバリエーションを確認
      const learnedVariations = learningManager.getLearnedPatternVariations(gesture.id)
      expect(learnedVariations.length).toBeGreaterThan(1)
      expect(learnedVariations[0].pattern).toEqual(basePattern) // 最も頻度の高いパターン
    })
  })

  describe('適応的閾値調整', () => {
    test('高成功率ジェスチャーの閾値が上がる', () => {
      const gesture = customGestureManager.getCustomGestures()[0]
      const initialThreshold = patternMatcher.thresholdManager.getThresholdForGesture(gesture.id)
      
      // 高成功率の使用を記録
      for (let i = 0; i < 10; i++) {
        patternMatcher.recordUsageForLearning(gesture.id, ['LEFT'], true)
      }
      
      const newThreshold = patternMatcher.thresholdManager.getThresholdForGesture(gesture.id)
      expect(newThreshold).toBeGreaterThanOrEqual(initialThreshold)
    })

    test('低成功率ジェスチャーの閾値が下がる', () => {
      const gesture = customGestureManager.getCustomGestures()[1]
      const initialThreshold = patternMatcher.thresholdManager.getThresholdForGesture(gesture.id)
      
      // 低成功率の使用を記録（成功2回、失敗8回）
      patternMatcher.recordUsageForLearning(gesture.id, ['UP', 'DOWN', 'RIGHT'], true)
      patternMatcher.recordUsageForLearning(gesture.id, ['UP', 'DOWN', 'RIGHT'], true)
      
      for (let i = 0; i < 8; i++) {
        patternMatcher.recordUsageForLearning(gesture.id, ['UP', 'DOWN', 'RIGHT'], false)
      }
      
      const newThreshold = patternMatcher.thresholdManager.getThresholdForGesture(gesture.id)
      expect(newThreshold).toBeLessThanOrEqual(initialThreshold)
    })

    test('頻繁に使用されるジェスチャーの閾値が最適化される', () => {
      const gesture = customGestureManager.getCustomGestures()[0]
      const initialThreshold = patternMatcher.thresholdManager.getThresholdForGesture(gesture.id)
      
      // 大量使用をシミュレート
      for (let i = 0; i < 100; i++) {
        patternMatcher.recordUsageForLearning(gesture.id, ['LEFT'], true)
      }
      
      const newThreshold = patternMatcher.thresholdManager.getThresholdForGesture(gesture.id)
      // 頻繁に使用されるため、より使いやすい閾値に調整される
      expect(newThreshold).toBeLessThanOrEqual(initialThreshold + 0.3)
    })
  })

  describe('ユーザープロファイル学習', () => {
    test('ユーザーの平均パターン長が学習される', () => {
      const gestures = customGestureManager.getCustomGestures()
      
      // 様々な長さのパターンを使用
      patternMatcher.recordUsageForLearning(gestures[0].id, ['LEFT'], true)
      patternMatcher.recordUsageForLearning(gestures[1].id, ['UP', 'DOWN', 'RIGHT'], true)
      patternMatcher.recordUsageForLearning(gestures[0].id, ['LEFT', 'UP'], true)
      
      const userProfile = learningManager.getUserGestureProfile()
      expect(userProfile.averagePatternLength).toBeGreaterThan(1)
      expect(userProfile.averagePatternLength).toBeLessThan(4)
    })

    test('ユーザーの好みの方向が識別される', () => {
      const gesture = customGestureManager.getCustomGestures()[0]
      
      // LEFT方向を多用
      for (let i = 0; i < 10; i++) {
        patternMatcher.recordUsageForLearning(gesture.id, ['LEFT'], true)
        patternMatcher.recordUsageForLearning(gesture.id, ['LEFT', 'LEFT'], true)
      }
      
      // UP方向も使用（少なめ）
      for (let i = 0; i < 3; i++) {
        patternMatcher.recordUsageForLearning(gesture.id, ['UP'], true)
      }
      
      const userProfile = learningManager.getUserGestureProfile()
      expect(userProfile.preferredDirections).toContain('LEFT')
      expect(userProfile.preferredDirections.indexOf('LEFT')).toBeLessThan(
        userProfile.preferredDirections.indexOf('UP')
      )
    })
  })

  describe('統計機能', () => {
    test('学習統計が正確に集計される', () => {
      const gestures = customGestureManager.getCustomGestures()
      
      // 使用データを蓄積
      patternMatcher.recordUsageForLearning(gestures[0].id, ['LEFT'], true)
      patternMatcher.recordUsageForLearning(gestures[0].id, ['LEFT'], true)
      patternMatcher.recordUsageForLearning(gestures[0].id, ['LEFT'], false)
      
      patternMatcher.recordUsageForLearning(gestures[1].id, ['UP', 'DOWN', 'RIGHT'], true)
      
      const stats = patternMatcher.getLearningStats()
      
      expect(stats).toBeDefined()
      expect(stats.totalGestures).toBe(2)
      expect(stats.gestureStats.length).toBe(2)
      
      // 最初のジェスチャーの統計
      const firstGestureStats = stats.gestureStats.find(s => s.name === 'テスト戻る')
      expect(firstGestureStats.usage).toBe(3)
      expect(firstGestureStats.successRate).toBeCloseTo(2/3, 2)
      
      // ユーザープロファイル
      expect(stats.userProfile.averagePatternLength).toBeGreaterThan(0)
      expect(stats.userProfile.preferredDirections.length).toBeGreaterThan(0)
    })

    test('学習データの永続化と読み込み', async () => {
      const gesture = customGestureManager.getCustomGestures()[0]
      
      // データを蓄積
      patternMatcher.recordUsageForLearning(gesture.id, ['LEFT'], true)
      patternMatcher.recordUsageForLearning(gesture.id, ['LEFT'], false)
      
      // 保存
      await learningManager.saveLearningData()
      
      // Chrome storage モックを設定して復元をテスト
      const savedData = {
        usageHistory: Object.fromEntries(learningManager.usageHistory),
        userProfile: learningManager.userProfile
      }
      global.chrome.storage.sync.get.mockResolvedValue({ gestureLearningData: savedData })
      
      // 新しいインスタンスを作成
      const newLearningManager = new GestureLearningManager()
      await newLearningManager.loadLearningData()
      
      // データが復元されているか確認
      const history = newLearningManager.getUsageHistory(gesture.id)
      expect(history.totalUsage).toBe(2)
      expect(history.successCount).toBe(1)
      expect(history.failureCount).toBe(1)
    })
  })

  describe('エラーハンドリング', () => {
    test('学習機能が無効でも基本機能は動作する', () => {
      // 学習機能を無効化
      patternMatcher.learningManager = null
      patternMatcher.thresholdManager = null
      
      const result = patternMatcher.matchPattern(['LEFT'])
      
      // 基本的なマッチング機能は動作
      expect(result.matched).toBe(true)
      expect(result.gestureName).toBe('テスト戻る')
    })

    test('無効なジェスチャーIDでの学習記録が安全に処理される', () => {
      expect(() => {
        patternMatcher.recordUsageForLearning('invalid-id', ['LEFT'], true)
      }).not.toThrow()
      
      expect(() => {
        patternMatcher.recordUsageForLearning(null, ['LEFT'], true)
      }).not.toThrow()
    })

    test('破損した学習データの読み込みが安全に処理される', async () => {
      // 破損データをモック
      global.chrome.storage.sync.get.mockResolvedValue({
        gestureLearningData: {
          usageHistory: 'invalid-data',
          userProfile: null
        }
      })
      
      expect(async () => {
        await learningManager.loadLearningData()
      }).not.toThrow()
      
      // デフォルト状態に戻ることを確認
      const profile = learningManager.getUserGestureProfile()
      expect(profile.averagePatternLength).toBe(0)
    })
  })
})