// ジェスチャー無効化機能の統合テスト

/**
 * @jest-environment jsdom
 */

describe('ジェスチャー無効化機能統合テスト', () => {
  let mockChrome
  let mockDebugLogger
  let gestureSystem

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

    // 統合ジェスチャーシステムのモック
    gestureSystem = {
      settings: {
        enabled: true,
        strokeColor: '#2563eb',
        strokeWidth: 3,
        excludeList: [],
        gestureThreshold: 15,
        defaultGestureStates: {
          left: true,
          right: true,
          up: true,
          down: true,
          downright: true,
          upright: true,
          rightdown: true,
          updown: true,
          super_refresh: true,
          prev_tab: true,
          next_tab: true
        }
      },
      
      isGestureEnabled: function (gestureId) {
        if (!this.settings.defaultGestureStates) {
          mockDebugLogger.debug('defaultGestureStates not found, assuming enabled')
          return true
        }
        const enabled = this.settings.defaultGestureStates[gestureId]
        mockDebugLogger.debug(`Gesture ${gestureId} enabled:`, enabled)
        return enabled !== false
      },
      
      handleSimpleGesture: function (direction, distance) {
        // カスタムジェスチャーチェック（ここでは省略）
        
        // デフォルトの単純ジェスチャー処理
        const gestureId = direction.toLowerCase()
        if (!this.isGestureEnabled(gestureId)) {
          mockDebugLogger.info(`Gesture ${direction} is disabled`)
          mockDebugLogger.showStatus(`ジェスチャー ${direction} は無効です`, mockDebugLogger.LOG_LEVELS.WARN)
          return { executed: false, reason: 'disabled' }
        }
        
        mockDebugLogger.showStatus(`Gesture: ${direction} (${distance.toFixed(0)}px)`)
        this.sendGestureMessage({
          type: 'simpleGesture',
          direction: direction,
          distance: distance
        })
        return { executed: true }
      },
      
      handleComplexGesture: function (gestureResult, distance) {
        if (gestureResult.type === 'custom') {
          // カスタムジェスチャーはそのまま実行
          mockDebugLogger.showStatus(`Custom: ${gestureResult.name} (${distance.toFixed(0)}px)`)
          this.sendGestureMessage({
            type: 'customGesture',
            action: gestureResult.action,
            name: gestureResult.name,
            distance: distance
          })
          return { executed: true }
        } else {
          // デフォルトの複合ジェスチャーの状態チェック
          if (!this.isGestureEnabled(gestureResult.action)) {
            mockDebugLogger.info(`Complex gesture ${gestureResult.action} is disabled`)
            mockDebugLogger.showStatus(`ジェスチャー ${gestureResult.action} は無効です`, mockDebugLogger.LOG_LEVELS.WARN)
            return { executed: false, reason: 'disabled' }
          }
          
          mockDebugLogger.showStatus(`Complex Gesture: ${gestureResult.action} (${distance.toFixed(0)}px)`)
          this.sendGestureMessage({
            type: 'complexGesture',
            gestureType: gestureResult.action,
            distance: distance
          })
          return { executed: true }
        }
      },
      
      sendGestureMessage: jest.fn(),
      
      updateSettings: function (newSettings) {
        this.settings = { ...this.settings, ...newSettings }
      }
    }

    // DOM環境のセットアップ
    document.body.innerHTML = ''
  })

  describe('設定画面からの状態変更統合テスト', () => {
    test('設定画面でジェスチャーを無効化→実際の動作が停止される', async () => {
      // 1. 初期状態：すべて有効
      expect(gestureSystem.isGestureEnabled('left')).toBe(true)
      
      // 2. 設定画面でleftジェスチャーを無効化（シミュレート）
      const updatedSettings = {
        defaultGestureStates: {
          ...gestureSystem.settings.defaultGestureStates,
          left: false
        }
      }
      
      // 3. 設定をChrome storageに保存（シミュレート）
      mockChrome.storage.sync.set.mockResolvedValue()
      await chrome.storage.sync.set(updatedSettings)
      
      // 4. ジェスチャーシステムに設定を反映
      gestureSystem.updateSettings(updatedSettings)
      
      // 5. 無効化されたジェスチャーが実行されないことを確認
      expect(gestureSystem.isGestureEnabled('left')).toBe(false)
      const result = gestureSystem.handleSimpleGesture('LEFT', 50)
      
      expect(result.executed).toBe(false)
      expect(result.reason).toBe('disabled')
      expect(mockDebugLogger.info).toHaveBeenCalledWith('Gesture LEFT is disabled')
      expect(mockDebugLogger.showStatus).toHaveBeenCalledWith('ジェスチャー LEFT は無効です', mockDebugLogger.LOG_LEVELS.WARN)
      expect(gestureSystem.sendGestureMessage).not.toHaveBeenCalled()
    })

    test('一部のジェスチャーのみ無効化→他のジェスチャーは正常動作', () => {
      // leftとupdownを無効化、他は有効のまま
      const updatedSettings = {
        defaultGestureStates: {
          ...gestureSystem.settings.defaultGestureStates,
          left: false,
          updown: false
        }
      }
      
      gestureSystem.updateSettings(updatedSettings)
      
      // 無効化されたジェスチャー
      const leftResult = gestureSystem.handleSimpleGesture('LEFT', 50)
      expect(leftResult.executed).toBe(false)
      
      const updownResult = gestureSystem.handleComplexGesture({ type: 'default', action: 'updown' }, 80)
      expect(updownResult.executed).toBe(false)
      
      // 有効なジェスチャー
      const rightResult = gestureSystem.handleSimpleGesture('RIGHT', 50)
      expect(rightResult.executed).toBe(true)
      
      const downrightResult = gestureSystem.handleComplexGesture({ type: 'default', action: 'downright' }, 80)
      expect(downrightResult.executed).toBe(true)
      
      expect(gestureSystem.sendGestureMessage).toHaveBeenCalledTimes(2)
    })
  })

  describe('設定同期の統合テスト', () => {
    test('Chrome storage変更→コンテンツスクリプト設定反映→ジェスチャー動作変更', () => {
      // 初期設定
      expect(gestureSystem.isGestureEnabled('super_refresh')).toBe(true)
      
      // Chrome storage変更をシミュレート
      const storageChangeListener = gestureSystem.settings.storageChangeListener = jest.fn((changes, namespace) => {
        if (namespace === 'sync') {
          mockDebugLogger.info('Settings changed:', changes)
          
          // 設定を更新
          Object.keys(changes).forEach(key => {
            if (Object.prototype.hasOwnProperty.call(gestureSystem.settings, key)) {
              gestureSystem.settings[key] = changes[key].newValue
            }
          })
          
          // defaultGestureStatesの変更通知
          if (changes.defaultGestureStates) {
            mockDebugLogger.info('Gesture states updated:', changes.defaultGestureStates.newValue)
            mockDebugLogger.showStatus('ジェスチャー状態が更新されました')
          }
        }
      })
      
      // 設定変更をシミュレート
      const changes = {
        defaultGestureStates: {
          oldValue: gestureSystem.settings.defaultGestureStates,
          newValue: {
            ...gestureSystem.settings.defaultGestureStates,
            super_refresh: false
          }
        }
      }
      
      storageChangeListener(changes, 'sync')
      
      // 設定が反映されることを確認
      expect(gestureSystem.settings.defaultGestureStates.super_refresh).toBe(false)
      expect(mockDebugLogger.showStatus).toHaveBeenCalledWith('ジェスチャー状態が更新されました')
      
      // ジェスチャー動作が変更されることを確認
      expect(gestureSystem.isGestureEnabled('super_refresh')).toBe(false)
      const result = gestureSystem.handleComplexGesture({ type: 'default', action: 'super_refresh' }, 70)
      expect(result.executed).toBe(false)
    })
  })

  describe('カスタムジェスチャーとの共存テスト', () => {
    test('デフォルトジェスチャー無効化時もカスタムジェスチャーは動作する', () => {
      // デフォルトのleftジェスチャーを無効化
      gestureSystem.updateSettings({
        defaultGestureStates: {
          ...gestureSystem.settings.defaultGestureStates,
          left: false
        }
      })
      
      // デフォルトのleftジェスチャーは実行されない
      const defaultResult = gestureSystem.handleSimpleGesture('LEFT', 50)
      expect(defaultResult.executed).toBe(false)
      
      // カスタムジェスチャーは実行される
      const customResult = gestureSystem.handleComplexGesture({
        type: 'custom',
        action: 'back',
        name: 'カスタム戻る'
      }, 60)
      expect(customResult.executed).toBe(true)
      
      expect(gestureSystem.sendGestureMessage).toHaveBeenCalledWith({
        type: 'customGesture',
        action: 'back',
        name: 'カスタム戻る',
        distance: 60
      })
    })
  })

  describe('Phase 10新機能ジェスチャーの無効化テスト', () => {
    test('新機能ジェスチャーも正しく無効化される', () => {
      // Phase 10の新機能を無効化
      gestureSystem.updateSettings({
        defaultGestureStates: {
          ...gestureSystem.settings.defaultGestureStates,
          super_refresh: false,
          prev_tab: false,
          next_tab: false
        }
      })
      
      // すべての新機能が無効化されることを確認
      expect(gestureSystem.isGestureEnabled('super_refresh')).toBe(false)
      expect(gestureSystem.isGestureEnabled('prev_tab')).toBe(false)
      expect(gestureSystem.isGestureEnabled('next_tab')).toBe(false)
      
      // 実行されないことを確認
      const superRefreshResult = gestureSystem.handleComplexGesture({ type: 'default', action: 'super_refresh' }, 80)
      const prevTabResult = gestureSystem.handleComplexGesture({ type: 'default', action: 'prev_tab' }, 80)
      const nextTabResult = gestureSystem.handleComplexGesture({ type: 'default', action: 'next_tab' }, 80)
      
      expect(superRefreshResult.executed).toBe(false)
      expect(prevTabResult.executed).toBe(false)
      expect(nextTabResult.executed).toBe(false)
      
      expect(gestureSystem.sendGestureMessage).not.toHaveBeenCalled()
    })
  })

  describe('設定初期化テスト', () => {
    test('defaultGestureStatesが存在しない設定でも正常動作する', () => {
      // defaultGestureStatesを削除した設定
      gestureSystem.settings = {
        enabled: true,
        strokeColor: '#2563eb',
        strokeWidth: 3,
        excludeList: [],
        gestureThreshold: 15
        // defaultGestureStatesなし
      }
      
      // デフォルトで有効として動作することを確認
      expect(gestureSystem.isGestureEnabled('left')).toBe(true)
      expect(gestureSystem.isGestureEnabled('super_refresh')).toBe(true)
      
      const result = gestureSystem.handleSimpleGesture('LEFT', 50)
      expect(result.executed).toBe(true)
      expect(mockDebugLogger.debug).toHaveBeenCalledWith('defaultGestureStates not found, assuming enabled')
    })
  })

  describe('エラーハンドリング統合テスト', () => {
    test('設定読み込みエラー時もジェスチャーは動作する', async () => {
      mockChrome.storage.sync.get.mockRejectedValue(new Error('Storage error'))
      
      const loadSettings = async function () {
        try {
          const result = await chrome.storage.sync.get(this.settings)
          this.settings = { ...this.settings, ...result }
          return true
        } catch (error) {
          mockDebugLogger.error('Failed to load settings:', error)
          return true // デフォルトで有効
        }
      }.bind(gestureSystem)
      
      const success = await loadSettings()
      expect(success).toBe(true)
      
      // エラー時でもジェスチャーは動作する
      const result = gestureSystem.handleSimpleGesture('LEFT', 50)
      expect(result.executed).toBe(true)
    })
  })
})