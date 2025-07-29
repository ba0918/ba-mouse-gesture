/* eslint-disable */
/**
 * GestureRecognitionUseCase テスト
 */

import { GestureRecognitionUseCase, GestureRecognitionResult } from '../usecases/GestureRecognitionUseCase';
import { Settings } from '../../domain/entities/Settings';

// モック作成
class MockSettingsRepository {
  public mockSettings: Settings;

  constructor() {
    this.mockSettings = new Settings({
      enabled: true,
      gestureThreshold: 15,
      defaultGestureStates: {
        left: true, right: true, up: true, down: true
      }
    })
  }

  async getSettings() {
    return this.mockSettings
  }

  async updateThreshold(threshold: number) {
    this.mockSettings.setThreshold(threshold)
    return this.mockSettings
  }
}

class MockGestureRepository {
  public mockCustomGestures: any[];
  public mockLearningData: any;

  constructor() {
    this.mockCustomGestures = []
    this.mockLearningData = {}
  }

  async getCustomGestures() {
    return this.mockCustomGestures
  }

  async getLearningData() {
    return this.mockLearningData
  }

  async saveLearningData(data: any) {
    this.mockLearningData = data
  }

  async recordGestureUsage(gestureId: string, success: boolean) {
    // Mock implementation
  }

  async getPerformanceStats() {
    return {
      totalCustomGestures: 0,
      enabledGestures: 0,
      totalUsage: 0,
      averageSuccessRate: 0
    }
  }
}

// テストデータ
const mockRawPoints = [
  { x: 100, y: 100, timestamp: Date.now() },
  { x: 150, y: 100, timestamp: Date.now() + 10 },
  { x: 200, y: 100, timestamp: Date.now() + 20 }
]

const mockRawPointsInsufficient = [
  { x: 100, y: 100, timestamp: Date.now() }
]

const mockRawPointsComplex = [
  { x: 100, y: 100 },
  { x: 120, y: 100 },
  { x: 140, y: 100 },
  { x: 160, y: 100 },
  { x: 180, y: 100 },
  { x: 200, y: 100 },
  { x: 200, y: 120 },
  { x: 200, y: 140 },
  { x: 200, y: 160 }
]

describe('GestureRecognitionUseCase', () => {
  let useCase: GestureRecognitionUseCase
  let mockSettingsRepository: MockSettingsRepository
  let mockGestureRepository: MockGestureRepository

  beforeEach(() => {
    mockSettingsRepository = new MockSettingsRepository()
    mockGestureRepository = new MockGestureRepository()
    useCase = new GestureRecognitionUseCase(mockSettingsRepository as any, mockGestureRepository as any)
  })

  describe('初期化', () => {
    test('正常に初期化される', async () => {
      await useCase.initialize()
      expect((useCase as any).isInitialized).toBe(true)
      expect((useCase as any).gestureRecognizer).toBeDefined()
      expect((useCase as any).patternMatcher).toBeDefined()
    })

    test('設定リポジトリエラー時は初期化失敗', async () => {
      mockSettingsRepository.getSettings = jest.fn().mockRejectedValue(new Error('Settings error'))
      
      await expect(useCase.initialize()).rejects.toThrow('Failed to initialize recognition use case')
    })
  })

  describe('ジェスチャー認識', () => {
    beforeEach(async () => {
      await useCase.initialize()
    })

    test('有効な軌跡でジェスチャーが認識される', async () => {
      const result = await useCase.recognizeGesture(mockRawPoints)
      
      expect(result).toBeInstanceOf(GestureRecognitionResult)
      expect(result.message).toBeDefined()
      expect(typeof result.isConfident).toBe('boolean')
    })

    test('不十分な点数では認識失敗', async () => {
      const result = await useCase.recognizeGesture(mockRawPointsInsufficient)
      
      expect(result.gesture).toBeNull()
      expect(result.message).toBe('Insufficient points')
      expect(result.isConfident).toBe(false)
    })

    test('空の配列では認識失敗', async () => {
      const result = await useCase.recognizeGesture([])
      
      expect(result.gesture).toBeNull()
      expect(result.message).toBe('Insufficient points')
      expect(result.isConfident).toBe(false)
    })

    test('nullや無効な入力では認識失敗', async () => {
      const resultNull = await useCase.recognizeGesture(null as any)
      const resultUndefined = await useCase.recognizeGesture(undefined as any)
      const resultString = await useCase.recognizeGesture('invalid' as any)
      
      expect(resultNull.gesture).toBeNull()
      expect(resultUndefined.gesture).toBeNull()
      expect(resultString.gesture).toBeNull()
    })

    test('未初期化状態でも自動初期化される', async () => {
      const newUseCase = new GestureRecognitionUseCase(mockSettingsRepository as any, mockGestureRepository)
      expect((newUseCase as any).isInitialized).toBe(false)
      
      const result = await newUseCase.recognizeGesture(mockRawPoints)
      
      expect((newUseCase as any).isInitialized).toBe(true)
      expect(result).toBeInstanceOf(GestureRecognitionResult)
    })
  })

  describe('ジェスチャー有効性チェック', () => {
    beforeEach(async () => {
      await useCase.initialize()
    })

    test('有効なURLではtrue', async () => {
      const result = await useCase.isGestureEnabled('https://example.com')
      expect(result).toBe(true)
    })

    test('拡張機能が無効の場合はfalse', async () => {
      mockSettingsRepository.mockSettings.isEnabled = () => false
      
      const result = await useCase.isGestureEnabled('https://example.com')
      expect(result).toBe(false)
    })

    test('除外サイトの場合はfalse', async () => {
      mockSettingsRepository.mockSettings.isExcludedSite = () => true
      
      const result = await useCase.isGestureEnabled('https://excluded.com')
      expect(result).toBe(false)
    })

    test('設定取得エラー時はデフォルトでtrue', async () => {
      mockSettingsRepository.getSettings = jest.fn().mockRejectedValue(new Error('Settings error'))
      
      const result = await useCase.isGestureEnabled('https://example.com')
      expect(result).toBe(true)
    })
  })

  describe('特定ジェスチャー有効性チェック', () => {
    beforeEach(async () => {
      await useCase.initialize()
    })

    test('有効なジェスチャーでtrue', async () => {
      const result = await useCase.isSpecificGestureEnabled('left')
      expect(result).toBe(true)
    })

    test('無効なジェスチャーでfalse', async () => {
      mockSettingsRepository.mockSettings.isGestureEnabled = (id: any) => id !== 'disabled_gesture'
      
      const result = await useCase.isSpecificGestureEnabled('disabled_gesture')
      expect(result).toBe(false)
    })

    test('設定取得エラー時はデフォルトでtrue', async () => {
      mockSettingsRepository.getSettings = jest.fn().mockRejectedValue(new Error('Settings error'))
      
      const result = await useCase.isSpecificGestureEnabled('left')
      expect(result).toBe(true)
    })
  })

  describe('認識統計', () => {
    beforeEach(async () => {
      await useCase.initialize()
    })

    test('統計情報が正常に取得される', async () => {
      const stats = await useCase.getRecognitionStats()
      
      expect(stats).toHaveProperty('recognition')
      expect(stats).toHaveProperty('performance')
      expect(stats).toHaveProperty('timestamp')
      expect(stats.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    test('未初期化状態でも統計取得できる', async () => {
      const newUseCase = new GestureRecognitionUseCase(mockSettingsRepository as any, mockGestureRepository)
      
      const stats = await newUseCase.getRecognitionStats()
      
      expect(stats).toHaveProperty('recognition')
      expect((newUseCase as any).isInitialized).toBe(true)
    })
  })

  describe('認識閾値適応', () => {
    beforeEach(async () => {
      await useCase.initialize()
    })

    test('閾値適応が正常に実行される', async () => {
      // エラーが発生しないことを確認
      await expect(useCase.adaptRecognitionThreshold()).resolves.toBeUndefined()
    })

    test('未初期化状態でも閾値適応できる', async () => {
      const newUseCase = new GestureRecognitionUseCase(mockSettingsRepository as any, mockGestureRepository)
      
      await expect(newUseCase.adaptRecognitionThreshold()).resolves.toBeUndefined()
      expect((newUseCase as any).isInitialized).toBe(true)
    })
  })

  describe('点データ変換', () => {
    test('生データが正常にPointオブジェクトに変換される', () => {
      const points = (useCase as any).convertToPoints(mockRawPoints)
      
      expect(Array.isArray(points)).toBe(true)
      expect(points).toHaveLength(mockRawPoints.length)
      points.forEach((point: any, index: number) => {
        expect(point.x).toBe(mockRawPoints[index].x)
        expect(point.y).toBe(mockRawPoints[index].y)
      })
    })

    test('タイムスタンプが欠けていても変換される', () => {
      const rawPointsNoTimestamp = [
        { x: 100, y: 100 },
        { x: 150, y: 100 }
      ]
      
      const points = (useCase as any).convertToPoints(rawPointsNoTimestamp)
      
      expect(Array.isArray(points)).toBe(true)
      expect(points).toHaveLength(2)
    })

    test('空配列の変換', () => {
      const points = (useCase as any).convertToPoints([])
      
      expect(Array.isArray(points)).toBe(true)
      expect(points).toHaveLength(0)
    })
  })

  describe('デフォルトジェスチャー定義', () => {
    test('デフォルトジェスチャーが正しく定義されている', () => {
      const gestures = (useCase as any).getDefaultGestureDefinitions()
      
      expect(Array.isArray(gestures)).toBe(true)
      expect(gestures.length).toBeGreaterThan(0)
      
      gestures.forEach((gesture: any) => {
        expect(gesture).toHaveProperty('id')
        expect(gesture).toHaveProperty('name')
        expect(gesture).toHaveProperty('action')
        expect(gesture).toHaveProperty('pattern')
      })
      
      // 基本ジェスチャーの存在確認
      const gestureIds = gestures.map((g: any) => g.id)
      expect(gestureIds).toContain('left')
      expect(gestureIds).toContain('right')
      expect(gestureIds).toContain('up')
      expect(gestureIds).toContain('down')
    })
  })

  describe('最適マッチ選択', () => {
    test('カスタムジェスチャーが優先される', () => {
      const mockDefaultResult = {
        gesture: { id: 'default_gesture', name: 'Default' },
        similarity: 0.8,
        isConfident: true,
        isSuccess: () => true
      }
      
      const mockCustomResult = {
        gesture: { id: 'custom_gesture', name: 'Custom' },
        similarity: 0.7,
        isConfident: true,
        isSuccess: () => true
      }
      
      const result = (useCase as any).selectBestMatch(mockDefaultResult as any, mockCustomResult as any)
      
      expect(result).toBe(mockCustomResult)
    })

    test('カスタムジェスチャーが失敗の場合はデフォルトが選択される', () => {
      const mockDefaultResult = {
        gesture: { id: 'default_gesture', name: 'Default' },
        similarity: 0.8,
        isConfident: true,
        isSuccess: () => true
      }
      
      const mockCustomResult = {
        gesture: null,
        similarity: 0.3,
        isConfident: false,
        isSuccess: () => false
      }
      
      const result = (useCase as any).selectBestMatch(mockDefaultResult as any, mockCustomResult as any)
      
      expect(result).toBe(mockDefaultResult)
    })
  })

  describe('クリーンアップ', () => {
    beforeEach(async () => {
      await useCase.initialize()
    })

    test('クリーンアップが正常に実行される', () => {
      expect((useCase as any).isInitialized).toBe(true)
      
      useCase.cleanup()
      
      expect((useCase as any).isInitialized).toBe(false)
    })

    test('未初期化状態でのクリーンアップ', () => {
      const newUseCase = new GestureRecognitionUseCase(mockSettingsRepository as any, mockGestureRepository)
      
      // エラーが発生しないことを確認
      expect(() => newUseCase.cleanup()).not.toThrow()
    })
  })

  describe('エラーハンドリング', () => {
    test('学習データ更新エラーは無視される', async () => {
      await useCase.initialize()
      
      // 学習エンジンでエラーが発生するように設定
      mockGestureRepository.saveLearningData = jest.fn().mockRejectedValue(new Error('Save error'))
      
      // 認識は継続して動作することを確認
      const result = await useCase.recognizeGesture(mockRawPoints)
      expect(result).toBeInstanceOf(GestureRecognitionResult)
    })

    test('統計取得エラーでも例外は発生しない', async () => {
      mockGestureRepository.getPerformanceStats = jest.fn().mockRejectedValue(new Error('Stats error'))
      
      await expect(useCase.getRecognitionStats()).rejects.toThrow('Failed to get recognition stats')
    })
  })
})

describe('GestureRecognitionResult', () => {
  test('成功結果の作成', () => {
    const gesture = { id: 'test', name: 'Test', action: 'test_action' }
    const result = new GestureRecognitionResult(gesture as any, 'Success', true, { similarity: 0.9 } as any)
    
    expect(result.gesture).toBe(gesture)
    expect(result.message).toBe('Success')
    expect(result.isConfident).toBe(true)
    expect(result.metadata.similarity).toBe(0.9)
    expect(result.isSuccess()).toBe(true)
  })

  test('失敗結果の作成', () => {
    const result = new GestureRecognitionResult(null, 'Failed', false)
    
    expect(result.gesture).toBeNull()
    expect(result.message).toBe('Failed')
    expect(result.isConfident).toBe(false)
    expect(result.isSuccess()).toBe(false)
  })

  test('JSON変換', () => {
    const gesture = { id: 'test', name: 'Test', action: 'test_action' }
    const result = new GestureRecognitionResult(gesture as any, 'Success', true, { test: 'value' } as any)
    const json = result.toJSON()
    
    expect(json).toHaveProperty('gesture')
    expect((json as any).gesture.id).toBe('test')
    expect((json as any).gesture.name).toBe('Test')
    expect((json as any).gesture.action).toBe('test_action')
    expect((json as any).message).toBe('Success')
    expect((json as any).isConfident).toBe(true)
    expect((json as any).metadata.test).toBe('value')
    expect(json).toHaveProperty('timestamp')
  })

  test('ジェスチャーがnullの場合のJSON変換', () => {
    const result = new GestureRecognitionResult(null, 'Failed', false)
    const json = result.toJSON()
    
    expect((json as any).gesture).toBeNull()
    expect((json as any).message).toBe('Failed')
    expect((json as any).isConfident).toBe(false)
  })
})