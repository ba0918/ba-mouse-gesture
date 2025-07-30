// ジェスチャー無効化機能のテスト

/**
 * @jest-environment jsdom
 */

describe('ジェスチャー無効化機能', () => {
  let mockChrome
  let mockDebugLogger
  let gestureScript

  beforeEach(() => {
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
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn()
        },
        id: 'test-extension-id'
      }
    }
    global.chrome = mockChrome

    // DebugLoggerのモック
    mockDebugLogger = {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      showStatus: jest.fn(),
      LOG_LEVELS: {
        ERROR: 0,
        WARN: 1,
        INFO: 2,
        DEBUG: 3
      }
    }
    global.DebugLogger = mockDebugLogger

    // CustomGestureManagerのモック
    global.CustomGestureManager = jest.fn(() => ({
      loadCustomGestures: jest.fn().mockResolvedValue(),
      getCustomGestures: jest.fn().mockReturnValue([])
    }))
    
    global.CustomPatternMatcher = jest.fn(() => ({
      matchPattern: jest.fn().mockReturnValue({ matched: false }),
      recordFailedMatch: jest.fn()
    }))

    // DOM環境のセットアップ
    document.body.innerHTML = ''
    
    // gestureスクリプトのモジュール環境を作成
    gestureScript = {
      settings: {
        enabled: true,
        strokeColor: '#2563eb',
        strokeWidth: 3,
        excludeList: [],
        gestureThreshold: 15,
        defaultGestureStates: {
          '←': true,
          '→': true,
          '↑': true,
          '↓': true,
          '↓→': true,
          '↑→': true,
          '→↓': true,
          '↑↓': true,
          super_refresh: true,
          prev_tab: true,
          next_tab: true
        }
      }
    }
  })

  describe('isGestureEnabled関数', () => {
    test('defaultGestureStatesが設定されている場合、正しい状態を返す', () => {
      const isGestureEnabled = function (gestureId) {
        if (!this.settings.defaultGestureStates) {
          return true
        }
        const enabled = this.settings.defaultGestureStates[gestureId]
        return enabled !== false
      }.bind(gestureScript)

      expect(isGestureEnabled('←')).toBe(true)
      expect(isGestureEnabled('→')).toBe(true)
      
      // 無効化した場合
      gestureScript.settings.defaultGestureStates['←'] = false
      expect(isGestureEnabled('←')).toBe(false)
      expect(isGestureEnabled('→')).toBe(true)
    })

    test('defaultGestureStatesが未設定の場合、デフォルトで有効を返す', () => {
      const testScript = {
        settings: {
          defaultGestureStates: null
        }
      }
      
      const isGestureEnabled = function (gestureId) {
        if (!this.settings.defaultGestureStates) {
          mockDebugLogger.debug('defaultGestureStates not found, assuming enabled')
          return true
        }
        const enabled = this.settings.defaultGestureStates[gestureId]
        return enabled !== false
      }.bind(testScript)

      expect(isGestureEnabled('←')).toBe(true)
      expect(mockDebugLogger.debug).toHaveBeenCalledWith('defaultGestureStates not found, assuming enabled')
    })

    test('未設定のジェスチャーIDは有効として扱われる', () => {
      const isGestureEnabled = function (gestureId) {
        if (!this.settings.defaultGestureStates) {
          return true
        }
        const enabled = this.settings.defaultGestureStates[gestureId]
        return enabled !== false
      }.bind(gestureScript)

      // 存在しないgestureId
      expect(isGestureEnabled('unknown_gesture')).toBe(true)
    })
  })

  describe('単純ジェスチャー実行時の状態チェック', () => {
    test('有効なジェスチャーは実行される', () => {
      const sendGestureMessage = jest.fn()
      
      const handleSimpleGesture = function (direction, distance) {
        const gestureId = direction.toLowerCase()
        
        if (!this.settings.defaultGestureStates) {
          mockDebugLogger.debug('defaultGestureStates not found, assuming enabled')
          // 実行継続
        } else {
          const enabled = this.settings.defaultGestureStates[gestureId]
          if (enabled === false) {
            mockDebugLogger.info(`Gesture ${direction} is disabled`)
            mockDebugLogger.showStatus(`ジェスチャー ${direction} は無効です`, mockDebugLogger.LOG_LEVELS.WARN)
            return
          }
        }
        
        mockDebugLogger.showStatus(`Gesture: ${direction} (${distance.toFixed(0)}px)`)
        sendGestureMessage({
          type: 'simpleGesture',
          direction: direction,
          distance: distance
        })
      }.bind(gestureScript)

      // 有効なジェスチャー
      gestureScript.settings.defaultGestureStates['←'] = true
      handleSimpleGesture('←', 50)

      expect(sendGestureMessage).toHaveBeenCalledWith({
        type: 'simpleGesture',
        direction: '←',
        distance: 50
      })
      expect(mockDebugLogger.showStatus).toHaveBeenCalledWith('Gesture: ← (50px)')
    })

    test('無効なジェスチャーは実行されない', () => {
      const sendGestureMessage = jest.fn()
      
      const handleSimpleGesture = function (direction, distance) {
        const gestureId = direction.toLowerCase()
        
        if (!this.settings.defaultGestureStates) {
          mockDebugLogger.debug('defaultGestureStates not found, assuming enabled')
          // 実行継続
        } else {
          const enabled = this.settings.defaultGestureStates[gestureId]
          if (enabled === false) {
            mockDebugLogger.info(`Gesture ${direction} is disabled`)
            mockDebugLogger.showStatus(`ジェスチャー ${direction} は無効です`, mockDebugLogger.LOG_LEVELS.WARN)
            return
          }
        }
        
        mockDebugLogger.showStatus(`Gesture: ${direction} (${distance.toFixed(0)}px)`)
        sendGestureMessage({
          type: 'simpleGesture',
          direction: direction,
          distance: distance
        })
      }.bind(gestureScript)

      // 無効なジェスチャー
      gestureScript.settings.defaultGestureStates['←'] = false
      handleSimpleGesture('←', 50)

      expect(sendGestureMessage).not.toHaveBeenCalled()
      expect(mockDebugLogger.info).toHaveBeenCalledWith('Gesture ← is disabled')
      expect(mockDebugLogger.showStatus).toHaveBeenCalledWith('ジェスチャー ← は無効です', mockDebugLogger.LOG_LEVELS.WARN)
    })
  })

  describe('複合ジェスチャー実行時の状態チェック', () => {
    test('有効な複合ジェスチャーは実行される', () => {
      const sendGestureMessage = jest.fn()
      
      const handleComplexGesture = function (gestureResult, distance) {
        if (gestureResult.type === 'default') {
          // デフォルトの複合ジェスチャーの状態チェック
          if (!this.settings.defaultGestureStates) {
            // 設定がない場合は実行継続
          } else {
            const enabled = this.settings.defaultGestureStates[gestureResult.action]
            if (enabled === false) {
              mockDebugLogger.info(`Complex gesture ${gestureResult.action} is disabled`)
              mockDebugLogger.showStatus(`ジェスチャー ${gestureResult.action} は無効です`, mockDebugLogger.LOG_LEVELS.WARN)
              return
            }
          }
          
          mockDebugLogger.showStatus(`Complex Gesture: ${gestureResult.action} (${distance.toFixed(0)}px)`)
          sendGestureMessage({
            type: 'complexGesture',
            gestureType: gestureResult.action,
            distance: distance
          })
        }
      }.bind(gestureScript)

      // 有効な複合ジェスチャー
      gestureScript.settings.defaultGestureStates['↑↓'] = true
      handleComplexGesture({ type: 'default', action: '↑↓' }, 80)

      expect(sendGestureMessage).toHaveBeenCalledWith({
        type: 'complexGesture',
        gestureType: '↑↓',
        distance: 80
      })
      expect(mockDebugLogger.showStatus).toHaveBeenCalledWith('Complex Gesture: ↑↓ (80px)')
    })

    test('無効な複合ジェスチャーは実行されない', () => {
      const sendGestureMessage = jest.fn()
      
      const handleComplexGesture = function (gestureResult, distance) {
        if (gestureResult.type === 'default') {
          // デフォルトの複合ジェスチャーの状態チェック
          if (!this.settings.defaultGestureStates) {
            // 設定がない場合は実行継続
          } else {
            const enabled = this.settings.defaultGestureStates[gestureResult.action]
            if (enabled === false) {
              mockDebugLogger.info(`Complex gesture ${gestureResult.action} is disabled`)
              mockDebugLogger.showStatus(`ジェスチャー ${gestureResult.action} は無効です`, mockDebugLogger.LOG_LEVELS.WARN)
              return
            }
          }
          
          mockDebugLogger.showStatus(`Complex Gesture: ${gestureResult.action} (${distance.toFixed(0)}px)`)
          sendGestureMessage({
            type: 'complexGesture',
            gestureType: gestureResult.action,
            distance: distance
          })
        }
      }.bind(gestureScript)

      // 無効な複合ジェスチャー
      gestureScript.settings.defaultGestureStates['↑↓'] = false
      handleComplexGesture({ type: 'default', action: '↑↓' }, 80)

      expect(sendGestureMessage).not.toHaveBeenCalled()
      expect(mockDebugLogger.info).toHaveBeenCalledWith('Complex gesture ↑↓ is disabled')
      expect(mockDebugLogger.showStatus).toHaveBeenCalledWith('ジェスチャー ↑↓ は無効です', mockDebugLogger.LOG_LEVELS.WARN)
    })

    test('カスタムジェスチャーは状態チェックをスキップして実行される', () => {
      const sendGestureMessage = jest.fn()
      
      const handleComplexGesture = function (gestureResult, distance) {
        if (gestureResult.type === 'custom') {
          // カスタムジェスチャーはそのまま実行
          mockDebugLogger.showStatus(`Custom: ${gestureResult.name} (${distance.toFixed(0)}px)`)
          sendGestureMessage({
            type: 'customGesture',
            action: gestureResult.action,
            name: gestureResult.name,
            distance: distance
          })
        }
      }

      handleComplexGesture({ 
        type: 'custom', 
        action: 'back', 
        name: 'カスタム戻る' 
      }, 60)

      expect(sendGestureMessage).toHaveBeenCalledWith({
        type: 'customGesture',
        action: 'back',
        name: 'カスタム戻る',
        distance: 60
      })
    })
  })

  describe('設定変更時の通知処理', () => {
    test('defaultGestureStates変更時に適切な通知が表示される', () => {
      const storageChangeListener = function (changes, namespace) {
        if (namespace === 'sync') {
          mockDebugLogger.info('Settings changed:', changes)
          
          // defaultGestureStatesの変更通知
          if (changes.defaultGestureStates) {
            mockDebugLogger.info('Gesture states updated:', changes.defaultGestureStates.newValue)
            mockDebugLogger.showStatus('ジェスチャー状態が更新されました')
          }
        }
      }

      const changes = {
        defaultGestureStates: {
          oldValue: { left: true },
          newValue: { left: false }
        }
      }

      storageChangeListener(changes, 'sync')

      expect(mockDebugLogger.info).toHaveBeenCalledWith('Gesture states updated:', { left: false })
      expect(mockDebugLogger.showStatus).toHaveBeenCalledWith('ジェスチャー状態が更新されました')
    })
  })

  describe('全ジェスチャーの状態確認', () => {
    test('すべてのデフォルトジェスチャーの状態を確認できる', () => {
      const isGestureEnabled = function (gestureId) {
        if (!this.settings.defaultGestureStates) {
          return true
        }
        const enabled = this.settings.defaultGestureStates[gestureId]
        return enabled !== false
      }.bind(gestureScript)

      // 一部のジェスチャーを無効化
      gestureScript.settings.defaultGestureStates = {
        '←': false,
        '→': true,
        '↑': true,
        '↓': false,
        '↓→': true,
        '↑→': false,
        '→↓': true,
        '↑↓': true,
        'super_refresh': false,
        'prev_tab': true,
        'next_tab': true
      }

      expect(isGestureEnabled('←')).toBe(false)
      expect(isGestureEnabled('→')).toBe(true)
      expect(isGestureEnabled('↑')).toBe(true)
      expect(isGestureEnabled('↓')).toBe(false)
      expect(isGestureEnabled('↓→')).toBe(true)
      expect(isGestureEnabled('↑→')).toBe(false)
      expect(isGestureEnabled('→↓')).toBe(true)
      expect(isGestureEnabled('↑↓')).toBe(true)
      expect(isGestureEnabled('super_refresh')).toBe(false)
      expect(isGestureEnabled('prev_tab')).toBe(true)
      expect(isGestureEnabled('next_tab')).toBe(true)
    })
  })

  describe('Chrome storage連携', () => {
    test('設定読み込み時にdefaultGestureStatesが正しく統合される', async () => {
      const defaultSettings = {
        enabled: true,
        strokeColor: '#2563eb',
        strokeWidth: 3,
        excludeList: [],
        gestureThreshold: 15,
        defaultGestureStates: {
          '←': true,
          '→': true,
          '↑': true,
          '↓': true
        }
      }

      const storedSettings = {
        enabled: true,
        defaultGestureStates: {
          '←': false,
          '→': true,
          'super_refresh': false
        }
      }

      mockChrome.storage.sync.get.mockResolvedValue(storedSettings)

      const loadSettings = async function () {
        try {
          const result = await chrome.storage.sync.get(defaultSettings)
          this.settings = { ...defaultSettings, ...result }
          return true
        } catch {
          return false
        }
      }.bind(gestureScript)

      const success = await loadSettings()

      expect(success).toBe(true)
      expect(gestureScript.settings.defaultGestureStates).toEqual({
        '←': false,    // ストレージから上書き
        '→': true,    // ストレージから上書き
        'super_refresh': false  // ストレージから追加
      })
    })
  })
})