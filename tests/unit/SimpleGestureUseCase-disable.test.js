/**
 * SimpleGestureUseCase ジェスチャー無効化機能のテスト
 * @jest-environment jsdom
 */

// SimpleGestureUseCaseのモック実装
class MockSimpleGestureUseCase {
  constructor(gestureRecognizer, messagingService, logger) {
    this.gestureRecognizer = gestureRecognizer
    this.messagingService = messagingService
    this.logger = logger || { info: jest.fn(), error: jest.fn() }
    this.settings = {
      enabled: true,
      gestureThreshold: 15,
      defaultGestureStates: {}
    }
  }

  async executeGesture(trail) {
    try {
      if (!this.settings.enabled) {
        return { success: false, error: 'Gesture recognition is disabled' }
      }

      const gestureType = this.gestureRecognizer.recognizeGesture(trail)
      if (!gestureType) {
        return { success: false, error: 'Gesture not recognized' }
      }

      this.logger.info('Recognized gesture:', gestureType)

      const result = await this.executeAction(gestureType)
      
      return {
        success: result.success,
        gestureType: gestureType,
        action: result.action,
        error: result.error
      }

    } catch (error) {
      this.logger.error('Gesture execution failed:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async executeAction(gestureType) {
    if (!this.messagingService) {
      return { success: false, error: 'Messaging service not available' }
    }

    // ジェスチャーの無効化チェック
    if (!this.isGestureEnabled(gestureType)) {
      this.logger.info(`Gesture ${gestureType} is disabled`)
      return { success: false, error: `Gesture ${gestureType} is disabled` }
    }

    try {
      const message = this.createActionMessage(gestureType)
      const response = await this.messagingService.sendMessage(message)
      
      return {
        success: response.success,
        action: response.action,
        error: response.error
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  createActionMessage(gestureType) {
    if (this.gestureRecognizer.isSimpleGestureType(gestureType)) {
      return { type: 'simpleGesture', direction: gestureType }
    } else {
      return { type: 'complexGesture', gestureType: gestureType }
    }
  }

  isGestureEnabled(gestureType) {
    if (!this.settings.defaultGestureStates) {
      return true
    }

    const actionName = this.getActionNameFromGestureType(gestureType)
    return this.settings.defaultGestureStates[actionName] !== false
  }

  getActionNameFromGestureType(gestureType) {
    const gestureMapping = {
      'UP': 'scroll_top',
      'DOWN': 'scroll_bottom', 
      'LEFT': 'back',
      'RIGHT': 'forward',
      'downright': 'close_tab',
      'upright': 'new_tab',
      'rightdown': 'duplicate_tab',
      'updown': 'refresh',
      'super_refresh': 'super_refresh',
      'prev_tab': 'prev_tab',
      'next_tab': 'next_tab'
    }
    
    return gestureMapping[gestureType] || gestureType
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
  }
}

describe('SimpleGestureUseCase - ジェスチャー無効化チェック', () => {
  let mockGestureRecognizer
  let mockMessagingService
  let useCase

  beforeEach(async () => {
    // Chrome API のモック
    global.chrome = {
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      }
    }

    // モックの作成
    mockGestureRecognizer = {
      recognizeGesture: jest.fn().mockReturnValue('LEFT'),
      isSimpleGestureType: jest.fn().mockReturnValue(true),
      setThreshold: jest.fn(),
      getThreshold: jest.fn().mockReturnValue(15)
    }

    mockMessagingService = {
      sendMessage: jest.fn().mockResolvedValue({ 
        success: true, 
        action: 'back' 
      })
    }

    const mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn()
    }

    useCase = new MockSimpleGestureUseCase(mockGestureRecognizer, mockMessagingService, mockLogger)
  })

  describe('個別ジェスチャーの無効化チェック', () => {
    test('有効なジェスチャーは実行される', async () => {
      // 設定を更新（ジェスチャー有効）
      useCase.updateSettings({
        defaultGestureStates: {
          back: true,
          forward: true
        }
      })

      const trail = [
        { x: 100, y: 100 },
        { x: 50, y: 100 }
      ]

      const result = await useCase.executeGesture(trail)

      expect(result.success).toBe(true)
      expect(result.gestureType).toBe('LEFT')
      expect(mockMessagingService.sendMessage).toHaveBeenCalled()
    })

    test('無効なジェスチャーは実行されない', async () => {
      // 設定を更新（leftジェスチャー無効）
      useCase.updateSettings({
        defaultGestureStates: {
          back: false,
          forward: true
        }
      })

      mockGestureRecognizer.recognizeGesture.mockReturnValue('LEFT')

      const trail = [
        { x: 100, y: 100 },
        { x: 50, y: 100 }
      ]

      const result = await useCase.executeGesture(trail)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Gesture LEFT is disabled')
      expect(mockMessagingService.sendMessage).not.toHaveBeenCalled()
    })

    test('複合ジェスチャーの無効化チェック', async () => {
      // 設定を更新（close_tab無効）
      useCase.updateSettings({
        defaultGestureStates: {
          close_tab: false,
          new_tab: true
        }
      })

      mockGestureRecognizer.recognizeGesture.mockReturnValue('downright')
      mockGestureRecognizer.isSimpleGestureType.mockReturnValue(false)

      const trail = [
        { x: 100, y: 100 },
        { x: 150, y: 150 }
      ]

      const result = await useCase.executeGesture(trail)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Gesture downright is disabled')
      expect(mockMessagingService.sendMessage).not.toHaveBeenCalled()
    })

    test('defaultGestureStatesが未設定の場合はデフォルトで有効', async () => {
      // defaultGestureStatesを設定しない
      useCase.updateSettings({})

      const trail = [
        { x: 100, y: 100 },
        { x: 50, y: 100 }
      ]

      const result = await useCase.executeGesture(trail)

      expect(result.success).toBe(true)
      expect(mockMessagingService.sendMessage).toHaveBeenCalled()
    })
  })

  describe('ジェスチャーマッピングの確認', () => {
    test('ジェスチャータイプからアクション名への変換が正しい', async () => {
      const testCases = [
        { gestureType: 'UP', actionName: 'scroll_top' },
        { gestureType: 'DOWN', actionName: 'scroll_bottom' },
        { gestureType: 'LEFT', actionName: 'back' },
        { gestureType: 'RIGHT', actionName: 'forward' },
        { gestureType: 'downright', actionName: 'close_tab' },
        { gestureType: 'upright', actionName: 'new_tab' },
        { gestureType: 'rightdown', actionName: 'duplicate_tab' },
        { gestureType: 'updown', actionName: 'refresh' }
      ]

      for (const testCase of testCases) {
        // 該当アクションを無効化
        useCase.updateSettings({
          defaultGestureStates: {
            [testCase.actionName]: false
          }
        })

        mockGestureRecognizer.recognizeGesture.mockReturnValue(testCase.gestureType)

        const trail = [
          { x: 100, y: 100 },
          { x: 150, y: 150 }
        ]

        const result = await useCase.executeGesture(trail)

        expect(result.success).toBe(false)
        expect(result.error).toContain(`Gesture ${testCase.gestureType} is disabled`)
      }
    })
  })
})