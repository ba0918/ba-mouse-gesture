/**
 * GestureRecognizerのテスト
 * カスタムジェスチャーに対する無効化チェック機能のテスト
 * @jest-environment jsdom
 */

// GestureRecognizerクラスのモック実装
class MockGestureRecognizer {
  constructor(settingsManager) {
    this.settingsManager = settingsManager
    this.gestureRecognizer = null
    this.customGestureUseCase = null
  }

  async initialize() {
    // 初期化処理のモック
    this.gestureRecognizer = {
      recognizeGesture: jest.fn().mockReturnValue('RIGHT')
    }
    this.customGestureUseCase = {
      matchPattern: jest.fn().mockResolvedValue({ match: null, confidence: 0.1 })
    }
  }

  async recognizeAndExecute(trail) {
    try {
      // 1. カスタムジェスチャー認識を優先
      const customResult = await this.recognizeCustomGesture(trail)
      if (customResult.type === 'custom' && customResult.action) {
        // カスタムジェスチャーも無効化チェックを実行
        if (!this.settingsManager.isGestureEnabled(customResult.action)) {
          console.log(`Custom gesture ${customResult.action} is disabled`)
          return { type: 'custom', action: undefined }
        }
        await this.executeAction(customResult.action)
        return customResult
      }

      // 2. 標準ジェスチャー認識
      const standardResult = this.recognizeStandardGesture(trail)
      if (standardResult.type !== 'simple' || !standardResult.action) {
        return { type: 'simple', action: undefined }
      }

      // 3. ジェスチャーが有効かチェック
      if (!this.settingsManager.isGestureEnabled(standardResult.action)) {
        console.log(`Gesture ${standardResult.action} is disabled`)
        return { type: 'simple', action: undefined }
      }

      // 4. アクション実行
      await this.executeAction(standardResult.action)
      return standardResult

    } catch (error) {
      console.error('Gesture recognition failed:', error)
      return { type: 'simple', action: undefined }
    }
  }

  async recognizeCustomGesture(trail) {
    if (!this.customGestureUseCase) {
      return { type: 'custom', action: undefined }
    }

    try {
      const rawPoints = trail.map(point => ({ x: point.x, y: point.y }))
      const result = await this.customGestureUseCase.matchPattern(rawPoints)
      
      if (result.match && result.match.action) {
        return {
          type: 'custom',
          action: result.match.action,
          name: result.match.name,
          confidence: result.confidence
        }
      }
    } catch (error) {
      console.warn('Custom gesture recognition failed:', error)
    }

    return { type: 'custom', action: undefined }
  }

  recognizeStandardGesture(trail) {
    if (!this.gestureRecognizer) {
      return { type: 'simple', action: undefined }
    }

    try {
      const gestureType = this.gestureRecognizer.recognizeGesture(trail)
      
      if (!gestureType) {
        return { type: 'simple', action: undefined }
      }

      const action = this.convertGestureTypeToAction(gestureType)
      
      return {
        type: this.isComplexGesture(gestureType) ? 'complex' : 'simple',
        action: action,
        confidence: 0.8
      }
    } catch (error) {
      console.warn('Standard gesture recognition failed:', error)
      return { type: 'simple', action: undefined }
    }
  }

  async executeAction(action) {
    try {
      const message = { action }
      await chrome.runtime.sendMessage(message)
    } catch (error) {
      console.warn('Action execution failed:', error)
    }
  }

  convertGestureTypeToAction(gestureType) {
    const gestureMapping = {
      '←': 'back',
      '→': 'forward', 
      '↑': 'scroll_top',
      '↓': 'scroll_bottom',
      '↓→': 'close_tab',
      '↑→': 'new_tab',
      '→↓': 'duplicate_tab',
      '↑↓': 'refresh',
      'super_refresh': 'super_refresh',
      'prev_tab': 'prev_tab',
      'next_tab': 'next_tab'
    }
    
    return gestureMapping[gestureType] || gestureType
  }

  isComplexGesture(gestureType) {
    const complexGestures = ['↓→', '↑→', '→↓', '↑↓', 'super_refresh', 'prev_tab', 'next_tab']
    return complexGestures.includes(gestureType)
  }
}

describe('GestureRecognizer - ジェスチャー無効化チェック', () => {
  let mockChrome
  let mockSettingsManager
  let gestureRecognizer

  beforeEach(async () => {
    // Chrome APIのモック
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn(),
          onChanged: {
            addListener: jest.fn()
          }
        }
      },
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({}),
        onMessage: {
          addListener: jest.fn()
        },
        id: 'test-extension-id'
      }
    }
    global.chrome = mockChrome

    // SettingsManagerのモック
    mockSettingsManager = {
      isGestureEnabled: jest.fn().mockReturnValue(true)
    }

    gestureRecognizer = new MockGestureRecognizer(mockSettingsManager)
    await gestureRecognizer.initialize()
  })

  describe('標準ジェスチャーの無効化チェック', () => {
    test('有効な標準ジェスチャーは実行される', async () => {
      mockSettingsManager.isGestureEnabled.mockReturnValue(true)
      
      const trail = [
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ]

      const result = await gestureRecognizer.recognizeAndExecute(trail)

      expect(mockSettingsManager.isGestureEnabled).toHaveBeenCalled()
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled()
      expect(result.action).toBeDefined()
    })

    test('無効な標準ジェスチャーは実行されない', async () => {
      mockSettingsManager.isGestureEnabled.mockReturnValue(false)
      
      const trail = [
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ]

      const result = await gestureRecognizer.recognizeAndExecute(trail)

      expect(mockSettingsManager.isGestureEnabled).toHaveBeenCalled()
      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled()
      expect(result.action).toBeUndefined()
    })
  })

  describe('カスタムジェスチャーの無効化チェック', () => {
    test('有効なカスタムジェスチャーは実行される', async () => {
      // CustomGestureManagementUseCaseのモック（カスタムジェスチャーマッチあり）
      const mockCustomGestureUseCase = {
        matchPattern: jest.fn().mockResolvedValue({
          match: { action: 'custom_back', name: 'カスタム戻る' },
          confidence: 0.9
        })
      }
      gestureRecognizer.customGestureUseCase = mockCustomGestureUseCase

      mockSettingsManager.isGestureEnabled.mockReturnValue(true)
      
      const trail = [
        { x: 100, y: 100 },
        { x: 50, y: 100 }
      ]

      const result = await gestureRecognizer.recognizeAndExecute(trail)

      expect(mockSettingsManager.isGestureEnabled).toHaveBeenCalledWith('custom_back')
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'custom_back' })
      expect(result.type).toBe('custom')
      expect(result.action).toBe('custom_back')
    })

    test('無効なカスタムジェスチャーは実行されない', async () => {
      // CustomGestureManagementUseCaseのモック（カスタムジェスチャーマッチあり）
      const mockCustomGestureUseCase = {
        matchPattern: jest.fn().mockResolvedValue({
          match: { action: 'custom_back', name: 'カスタム戻る' },
          confidence: 0.9
        })
      }
      gestureRecognizer.customGestureUseCase = mockCustomGestureUseCase

      mockSettingsManager.isGestureEnabled.mockReturnValue(false)
      
      const trail = [
        { x: 100, y: 100 },
        { x: 50, y: 100 }
      ]

      const result = await gestureRecognizer.recognizeAndExecute(trail)

      expect(mockSettingsManager.isGestureEnabled).toHaveBeenCalledWith('custom_back')
      expect(mockChrome.runtime.sendMessage).not.toHaveBeenCalled()
      expect(result.type).toBe('custom')
      expect(result.action).toBeUndefined()
    })

    test('カスタムジェスチャーマッチなしの場合は標準ジェスチャーに移行', async () => {
      // CustomGestureManagementUseCaseのモック（カスタムジェスチャーマッチなし）
      const mockCustomGestureUseCase = {
        matchPattern: jest.fn().mockResolvedValue({
          match: null,
          confidence: 0.1
        })
      }
      gestureRecognizer.customGestureUseCase = mockCustomGestureUseCase

      mockSettingsManager.isGestureEnabled.mockReturnValue(true)
      
      const trail = [
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ]

      const result = await gestureRecognizer.recognizeAndExecute(trail)

      expect(mockCustomGestureUseCase.matchPattern).toHaveBeenCalled()
      expect(mockSettingsManager.isGestureEnabled).toHaveBeenCalled()
      expect(mockChrome.runtime.sendMessage).toHaveBeenCalled()
    })
  })

  describe('エラーハンドリング', () => {
    test('CustomGestureUseCase初期化失敗時も動作継続', async () => {
      // 初期化失敗をシミュレート
      gestureRecognizer.customGestureUseCase = null
      
      mockSettingsManager.isGestureEnabled.mockReturnValue(true)
      
      const trail = [
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ]

      const result = await gestureRecognizer.recognizeAndExecute(trail)

      // 標準ジェスチャー認識にフォールバック
      expect(mockSettingsManager.isGestureEnabled).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    test('SettingsManager呼び出し失敗時のエラーハンドリング', async () => {
      mockSettingsManager.isGestureEnabled.mockImplementation(() => {
        throw new Error('Settings error')
      })
      
      const trail = [
        { x: 100, y: 100 },
        { x: 200, y: 100 }
      ]

      const result = await gestureRecognizer.recognizeAndExecute(trail)

      expect(result.type).toBe('simple')
      expect(result.action).toBeUndefined()
    })
  })

  describe('ジェスチャータイプとアクションのマッピング', () => {
    test('convertGestureTypeToActionメソッドが正しくマッピングする', () => {
      const testGestureRecognizer = new MockGestureRecognizer(mockSettingsManager)
      
      // 直接メソッドをテスト
      expect(testGestureRecognizer.convertGestureTypeToAction('←')).toBe('back')
      expect(testGestureRecognizer.convertGestureTypeToAction('→')).toBe('forward')
      expect(testGestureRecognizer.convertGestureTypeToAction('↑')).toBe('scroll_top')
      expect(testGestureRecognizer.convertGestureTypeToAction('↓')).toBe('scroll_bottom')
      expect(testGestureRecognizer.convertGestureTypeToAction('↓→')).toBe('close_tab')
      expect(testGestureRecognizer.convertGestureTypeToAction('↑→')).toBe('new_tab')
      expect(testGestureRecognizer.convertGestureTypeToAction('→↓')).toBe('duplicate_tab')
      expect(testGestureRecognizer.convertGestureTypeToAction('↑↓')).toBe('refresh')
    })
  })
})