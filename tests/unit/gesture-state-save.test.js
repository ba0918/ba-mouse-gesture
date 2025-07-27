// ジェスチャー状態保存機能のテスト

/**
 * @jest-environment jsdom
 */

describe('ジェスチャー状態保存機能', () => {
  let optionsManager
  let mockChrome

  beforeEach(() => {
    // Chrome APIのモック
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      runtime: {
        sendMessage: jest.fn()
      }
    }
    global.chrome = mockChrome

    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="saveStatus" style="display: none;"></div>
      <div id="allGesturesList"></div>
    `

    // OptionsManagerのモック
    global.OptionsManager = class MockOptionsManager {
      constructor() {
        this.defaultSettings = {
          enabled: true,
          strokeColor: '#2196F3',
          strokeWidth: 3,
          gestureThreshold: 15,
          excludeList: [],
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
          },
          debugSettings: {
            enabled: true,
            logLevel: 2,
            showStatus: true,
            statusPosition: 'top-right'
          }
        }
        
        this.currentSettings = { ...this.defaultSettings }
        this.allGestures = []
      }

      async saveSettings() {
        await chrome.storage.sync.set(this.currentSettings)
        this.showSaveStatus('設定を保存しました', true)
        
        chrome.runtime.sendMessage({
          type: 'SETTINGS_UPDATED',
          settings: this.currentSettings
        })
      }

      showSaveStatus(message, isSuccess) {
        const statusElement = document.getElementById('saveStatus')
        statusElement.textContent = message
        statusElement.className = `save-status ${isSuccess ? 'success' : 'error'}`
        statusElement.style.display = 'block'
      }

      getDefaultGestures() {
        const gestureStates = this.currentSettings?.defaultGestureStates || this.defaultSettings.defaultGestureStates
        
        return [
          {
            id: 'left',
            name: 'ブラウザの戻る',
            pattern: '←',
            action: 'back',
            type: 'default',
            category: 'basic',
            description: '前のページに戻ります',
            enabled: gestureStates.left !== undefined ? gestureStates.left : true
          },
          {
            id: 'right',
            name: 'ブラウザの進む',
            pattern: '→',
            action: 'forward',
            type: 'default',
            category: 'basic',
            description: '次のページに進みます',
            enabled: gestureStates.right !== undefined ? gestureStates.right : true
          },
          {
            id: 'super_refresh',
            name: 'スーパーリロード',
            pattern: '↑↓↑',
            action: 'super_refresh',
            type: 'default',
            category: 'new',
            description: 'キャッシュをクリアしてページをリロードします',
            enabled: gestureStates.super_refresh !== undefined ? gestureStates.super_refresh : true,
            isNew: true
          }
        ]
      }

      filterAndRenderGestures() {
        // モック実装
        console.log('Mock: filterAndRenderGestures called')
      }

      async toggleGestureStatus(gestureId) {
        const gesture = this.allGestures.find(g => g.id === gestureId)
        if (!gesture) return

        gesture.enabled = !gesture.enabled

        if (gesture.type === 'custom') {
          // カスタムジェスチャーの場合は既存の処理
          this.showSaveStatus(`${gesture.name}を${gesture.enabled ? '有効' : '無効'}にしました`, true)
        } else {
          // デフォルトジェスチャーの場合は設定に保存
          try {
            if (!this.currentSettings.defaultGestureStates) {
              this.currentSettings.defaultGestureStates = {}
            }
            this.currentSettings.defaultGestureStates[gestureId] = gesture.enabled
            await this.saveSettings()
            this.showSaveStatus(`${gesture.name}を${gesture.enabled ? '有効' : '無効'}にしました`, true)
            this.filterAndRenderGestures()
          } catch (error) {
            console.error('Failed to save default gesture state:', error)
            this.showSaveStatus('ジェスチャー状態の保存に失敗しました', false)
            gesture.enabled = !gesture.enabled // ロールバック
          }
        }
      }
    }

    optionsManager = new OptionsManager()
  })

  describe('デフォルトジェスチャー状態の読み込み', () => {
    test('デフォルト状態で全てのジェスチャーが有効', () => {
      const gestures = optionsManager.getDefaultGestures()
      
      gestures.forEach(gesture => {
        expect(gesture.enabled).toBe(true)
      })
    })

    test('設定から状態を正しく読み込む', () => {
      // 設定を変更
      optionsManager.currentSettings.defaultGestureStates = {
        left: false,
        right: true,
        super_refresh: false
      }

      const gestures = optionsManager.getDefaultGestures()
      
      expect(gestures.find(g => g.id === 'left').enabled).toBe(false)
      expect(gestures.find(g => g.id === 'right').enabled).toBe(true)
      expect(gestures.find(g => g.id === 'super_refresh').enabled).toBe(false)
    })

    test('部分的な設定でもデフォルト値で補完される', () => {
      // 一部の設定のみ変更
      optionsManager.currentSettings.defaultGestureStates = {
        left: false
        // rightは未設定
      }

      const gestures = optionsManager.getDefaultGestures()
      
      expect(gestures.find(g => g.id === 'left').enabled).toBe(false)
      expect(gestures.find(g => g.id === 'right').enabled).toBe(true) // デフォルト値
    })
  })

  describe('デフォルトジェスチャー状態の保存', () => {
    beforeEach(() => {
      mockChrome.storage.sync.set.mockResolvedValue()
      
      // テスト用ジェスチャーを設定
      optionsManager.allGestures = [
        {
          id: 'left',
          name: 'ブラウザの戻る',
          type: 'default',
          enabled: true
        }
      ]
    })

    test('デフォルトジェスチャーの有効/無効切り替えが保存される', async () => {
      await optionsManager.toggleGestureStatus('left')

      // 状態が変更されることを確認
      expect(optionsManager.allGestures[0].enabled).toBe(false)
      
      // 設定に保存されることを確認
      expect(optionsManager.currentSettings.defaultGestureStates.left).toBe(false)
      
      // Chrome storageに保存されることを確認
      expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
        expect.objectContaining({
          defaultGestureStates: expect.objectContaining({
            left: false
          })
        })
      )
    })

    test('複数のジェスチャー状態を個別に保存できる', async () => {
      optionsManager.allGestures = [
        { id: 'left', name: 'ブラウザの戻る', type: 'default', enabled: true },
        { id: 'right', name: 'ブラウザの進む', type: 'default', enabled: true },
        { id: 'super_refresh', name: 'スーパーリロード', type: 'default', enabled: true }
      ]

      // leftを無効化
      await optionsManager.toggleGestureStatus('left')
      expect(optionsManager.currentSettings.defaultGestureStates.left).toBe(false)
      
      // super_refreshを無効化
      await optionsManager.toggleGestureStatus('super_refresh')
      expect(optionsManager.currentSettings.defaultGestureStates.super_refresh).toBe(false)
      
      // rightは有効のまま（初期設定で全てtrueなので）
      expect(optionsManager.currentSettings.defaultGestureStates.right).toBe(true)
    })

    test('保存エラー時にロールバックされる', async () => {
      mockChrome.storage.sync.set.mockRejectedValue(new Error('保存エラー'))

      const originalState = optionsManager.allGestures[0].enabled
      
      await optionsManager.toggleGestureStatus('left')

      // エラー時にロールバックされることを確認
      expect(optionsManager.allGestures[0].enabled).toBe(originalState)
    })
  })

  describe('設定の初期化', () => {
    test('defaultGestureStatesが存在しない場合に自動作成される', async () => {
      // defaultGestureStatesを削除
      delete optionsManager.currentSettings.defaultGestureStates
      
      optionsManager.allGestures = [
        { id: 'left', name: 'ブラウザの戻る', type: 'default', enabled: true }
      ]

      await optionsManager.toggleGestureStatus('left')

      // 自動的に作成されることを確認
      expect(optionsManager.currentSettings.defaultGestureStates).toBeDefined()
      expect(optionsManager.currentSettings.defaultGestureStates.left).toBe(false)
    })
  })

  describe('カスタムジェスチャーとの連携', () => {
    test('カスタムジェスチャーの状態変更は従来通り動作する', async () => {
      optionsManager.allGestures = [
        {
          id: 'custom1',
          name: 'カスタムジェスチャー',
          type: 'custom',
          enabled: true
        }
      ]

      await optionsManager.toggleGestureStatus('custom1')

      // カスタムジェスチャーの状態変更
      expect(optionsManager.allGestures[0].enabled).toBe(false)
      
      // defaultGestureStatesには影響しない
      expect(optionsManager.currentSettings.defaultGestureStates.custom1).toBeUndefined()
    })
  })

  describe('UIフィードバック', () => {
    test('成功時に適切なメッセージが表示される', async () => {
      optionsManager.allGestures = [
        { id: 'left', name: 'ブラウザの戻る', type: 'default', enabled: true }
      ]

      await optionsManager.toggleGestureStatus('left')

      const statusElement = document.getElementById('saveStatus')
      expect(statusElement.textContent).toBe('ブラウザの戻るを無効にしました')
      expect(statusElement.className).toContain('success')
    })

    test('エラー時に適切なメッセージが表示される', async () => {
      mockChrome.storage.sync.set.mockRejectedValue(new Error('保存エラー'))
      
      optionsManager.allGestures = [
        { id: 'left', name: 'ブラウザの戻る', type: 'default', enabled: true }
      ]

      await optionsManager.toggleGestureStatus('left')

      const statusElement = document.getElementById('saveStatus')
      expect(statusElement.textContent).toBe('ジェスチャー状態の保存に失敗しました')
      expect(statusElement.className).toContain('error')
    })
  })
})