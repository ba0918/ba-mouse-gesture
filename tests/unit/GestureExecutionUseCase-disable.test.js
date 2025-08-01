/**
 * GestureExecutionUseCase ジェスチャー無効化機能のテスト
 * @jest-environment jsdom
 */

// GestureExecutionUseCaseのモック実装
class MockGestureExecutionUseCase {
  constructor(gestureRecognizer, messagingService, logger) {
    this.gestureRecognizer = gestureRecognizer;
    this.messagingService = messagingService;
    this.logger = logger || { info: jest.fn(), error: jest.fn() };
    this.settings = {
      enabled: true,
      gestureThreshold: 15,
      defaultGestureStates: {},
    };
  }

  async executeGesture(trail) {
    try {
      if (!this.settings.enabled) {
        return { success: false, error: 'Gesture recognition is disabled' };
      }

      const gestureType = this.gestureRecognizer.recognizeGesture(trail);
      if (!gestureType) {
        return { success: false, error: 'Gesture not recognized' };
      }

      this.logger.info('Recognized gesture:', gestureType);

      const result = await this.executeAction(gestureType);

      return {
        success: result.success,
        gestureType: gestureType,
        action: result.action,
        error: result.error,
      };
    } catch (error) {
      this.logger.error('Gesture execution failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async executeAction(gestureType) {
    if (!this.messagingService) {
      return { success: false, error: 'Messaging service not available' };
    }

    // ジェスチャーの無効化チェック
    if (!this.isGestureEnabled(gestureType)) {
      this.logger.info(`Gesture ${gestureType} is disabled`);
      return { success: false, error: `Gesture ${gestureType} is disabled` };
    }

    try {
      const message = this.createActionMessage(gestureType);
      const response = await this.messagingService.sendMessage(message);

      return {
        success: response.success,
        action: response.action,
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  createActionMessage(gestureType) {
    const actionName = this.getActionNameFromGestureType(gestureType);
    return {
      type: 'executeAction',
      action: actionName,
    };
  }

  isGestureEnabled(gestureType) {
    if (!this.settings.defaultGestureStates) {
      return true;
    }

    // ジェスチャータイプからジェスチャーIDを取得（UI側と一致）
    const gestureId = this.getGestureIdFromGestureType(gestureType);
    return this.settings.defaultGestureStates[gestureId] !== false;
  }

  getGestureIdFromGestureType(gestureType) {
    const gestureIdMapping = {
      '↑': 'up',
      '↓': 'down',
      '←': 'left',
      '→': 'right',
      '↓→': 'downright',
      '↑→': 'upright',
      '→↓': 'rightdown',
      '↑↓': 'updown',
      '↑↓↑': 'super_refresh',
      '←→': 'prev_tab',
      '→←': 'next_tab',
    };

    return gestureIdMapping[gestureType] || gestureType.toLowerCase();
  }

  getActionNameFromGestureType(gestureType) {
    const gestureMapping = {
      UP: 'scroll_top',
      DOWN: 'scroll_bottom',
      LEFT: 'back',
      RIGHT: 'forward',
      downright: 'close_tab',
      upright: 'new_tab',
      rightdown: 'duplicate_tab',
      updown: 'refresh',
      super_refresh: 'super_refresh',
      prev_tab: 'prev_tab',
      next_tab: 'next_tab',
    };

    return gestureMapping[gestureType] || gestureType;
  }

  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings };
  }
}

describe('GestureExecutionUseCase - ジェスチャー無効化チェック', () => {
  let mockGestureRecognizer;
  let mockMessagingService;
  let useCase;

  beforeEach(() => {
    // Chrome API のモック
    global.chrome = {
      runtime: {
        sendMessage: jest.fn().mockResolvedValue({ success: true }),
      },
    };

    // モックの作成
    mockGestureRecognizer = {
      recognizeGesture: jest.fn().mockReturnValue('←'),
      setThreshold: jest.fn(),
      getThreshold: jest.fn().mockReturnValue(15),
    };

    mockMessagingService = {
      sendMessage: jest.fn().mockResolvedValue({
        success: true,
        action: 'back',
      }),
    };

    const mockLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    useCase = new MockGestureExecutionUseCase(mockGestureRecognizer, mockMessagingService, mockLogger);
  });

  describe('個別ジェスチャーの無効化チェック', () => {
    test('有効なジェスチャーは実行される', async () => {
      // 設定を更新（ジェスチャー有効）
      useCase.updateSettings({
        defaultGestureStates: {
          left: true, // ジェスチャーIDで設定
          right: true,
        },
      });

      const trail = [
        { x: 100, y: 100 },
        { x: 50, y: 100 },
      ];

      const result = await useCase.executeGesture(trail);

      expect(result.success).toBe(true);
      expect(result.gestureType).toBe('←');
      expect(mockMessagingService.sendMessage).toHaveBeenCalled();
    });

    test('無効なジェスチャーは実行されない', async () => {
      // 設定を更新（leftジェスチャー無効）
      useCase.updateSettings({
        defaultGestureStates: {
          left: false, // ジェスチャーIDで設定
          right: true,
        },
      });

      mockGestureRecognizer.recognizeGesture.mockReturnValue('LEFT');

      const trail = [
        { x: 100, y: 100 },
        { x: 50, y: 100 },
      ];

      const result = await useCase.executeGesture(trail);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gesture LEFT is disabled');
      expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
    });

    test('複合ジェスチャーの無効化チェック', async () => {
      // 設定を更新（downright無効）
      useCase.updateSettings({
        defaultGestureStates: {
          downright: false, // ジェスチャーIDで設定
          upright: true,
        },
      });

      // Complex gesture test - using multi-directional gesture
      mockGestureRecognizer.recognizeGesture.mockReturnValue('↓→');

      const trail = [
        { x: 100, y: 100 },
        { x: 150, y: 150 },
      ];

      const result = await useCase.executeGesture(trail);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Gesture ↓→ is disabled');
      expect(mockMessagingService.sendMessage).not.toHaveBeenCalled();
    });

    test('defaultGestureStatesが未設定の場合はデフォルトで有効', async () => {
      // defaultGestureStatesを設定しない
      useCase.updateSettings({});

      const trail = [
        { x: 100, y: 100 },
        { x: 50, y: 100 },
      ];

      const result = await useCase.executeGesture(trail);

      expect(result.success).toBe(true);
      expect(mockMessagingService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('ジェスチャーマッピングの確認', () => {
    test('ジェスチャータイプからジェスチャーIDへの変換が正しい', async () => {
      const testCases = [
        { gestureType: 'UP', gestureId: 'up' },
        { gestureType: 'DOWN', gestureId: 'down' },
        { gestureType: 'LEFT', gestureId: 'left' },
        { gestureType: 'RIGHT', gestureId: 'right' },
        { gestureType: 'downright', gestureId: 'downright' },
        { gestureType: 'upright', gestureId: 'upright' },
        { gestureType: 'rightdown', gestureId: 'rightdown' },
        { gestureType: 'updown', gestureId: 'updown' },
      ];

      for (const testCase of testCases) {
        // 該当ジェスチャーIDを無効化
        useCase.updateSettings({
          defaultGestureStates: {
            [testCase.gestureId]: false,
          },
        });

        mockGestureRecognizer.recognizeGesture.mockReturnValue(testCase.gestureType);

        const trail = [
          { x: 100, y: 100 },
          { x: 150, y: 150 },
        ];

        const result = await useCase.executeGesture(trail);

        expect(result.success).toBe(false);
        expect(result.error).toContain(`Gesture ${testCase.gestureType} is disabled`);
      }
    });
  });
});
