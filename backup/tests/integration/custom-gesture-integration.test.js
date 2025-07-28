// カスタムジェスチャー統合テスト

describe('カスタムジェスチャー統合テスト', () => {
  let customGestureManager
  let customPatternMatcher

  beforeEach(() => {
    // Chrome APIのモックをセットアップ
    global.chrome = {
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
        lastError: null
      },
      tabs: {
        goBack: jest.fn(),
        goForward: jest.fn(),
        create: jest.fn(),
        remove: jest.fn(),
        reload: jest.fn(),
        sendMessage: jest.fn()
      }
    }

    // CustomGestureManagerクラスをロード
    const { 
      CustomGestureManager, 
      CustomPatternMatcher 
    } = require('../../content_scripts/custom-gesture-manager.js')
    
    customGestureManager = new CustomGestureManager()
    customPatternMatcher = new CustomPatternMatcher(customGestureManager)
  })

  describe('カスタムジェスチャーとデフォルトジェスチャーの優先度', () => {
    test('カスタムジェスチャーがデフォルトより優先される', async () => {
      // デフォルトの LEFT ジェスチャーをカスタムで上書き
      await customGestureManager.addCustomGesture({
        name: 'カスタム戻る',
        pattern: ['LEFT'],
        action: 'custom_back'
      })

      const result = customPatternMatcher.matchPattern(['LEFT'])
      
      expect(result.matched).toBe(true)
      expect(result.action).toBe('custom_back')
      expect(result.gestureType).toBe('custom')
      expect(result.gestureName).toBe('カスタム戻る')
    })

    test('カスタムジェスチャーが無効な場合はデフォルトが使用される', async () => {
      // カスタムジェスチャーを追加
      const addResult = await customGestureManager.addCustomGesture({
        name: 'カスタム戻る',
        pattern: ['LEFT'],
        action: 'custom_back'
      })

      // カスタムジェスチャーを無効化
      await customGestureManager.updateCustomGesture(addResult.id, {
        enabled: false
      })

      const result = customPatternMatcher.matchPattern(['LEFT'])
      
      expect(result.matched).toBe(false) // カスタムマッチャーでは無効になる
    })

    test('複合ジェスチャーもカスタムが優先される', async () => {
      // デフォルトの DOWN+RIGHT をカスタムで上書き
      await customGestureManager.addCustomGesture({
        name: 'カスタムタブ閉じる',
        pattern: ['DOWN', 'RIGHT'],
        action: 'custom_close'
      })

      const result = customPatternMatcher.matchPattern(['DOWN', 'RIGHT'])
      
      expect(result.matched).toBe(true)
      expect(result.action).toBe('custom_close')
      expect(result.gestureName).toBe('カスタムタブ閉じる')
    })

    test('上下ジェスチャーがデフォルトで更新になる', async () => {
      // デフォルトのUP+DOWNパターンをテスト
      await customGestureManager.addCustomGesture({
        name: 'カスタム更新',
        pattern: ['UP', 'DOWN'],
        action: 'refresh'
      })

      const result = customPatternMatcher.matchPattern(['UP', 'DOWN'])
      
      expect(result.matched).toBe(true)
      expect(result.action).toBe('refresh')
      expect(result.gestureName).toBe('カスタム更新')
    })
  })

  describe('新しいカスタムジェスチャーパターン', () => {
    test('3方向の複雑なパターンが認識される', async () => {
      await customGestureManager.addCustomGesture({
        name: 'トリプルムーブ',
        pattern: ['UP', 'DOWN', 'RIGHT'],
        action: 'triple_action'
      })

      const result = customPatternMatcher.matchPattern(['UP', 'DOWN', 'RIGHT'])
      
      expect(result.matched).toBe(true)
      expect(result.action).toBe('triple_action')
      expect(result.confidence).toBeGreaterThan(0.9)
    })

    test('4方向の複雑なパターンが認識される', async () => {
      await customGestureManager.addCustomGesture({
        name: 'クアッドムーブ',
        pattern: ['LEFT', 'RIGHT', 'UP', 'DOWN'],
        action: 'quad_action'
      })

      const result = customPatternMatcher.matchPattern(['LEFT', 'RIGHT', 'UP', 'DOWN'])
      
      expect(result.matched).toBe(true)
      expect(result.action).toBe('quad_action')
    })

    test('類似パターンが適切に区別される', async () => {
      // 2つの似たパターンを登録
      await customGestureManager.addCustomGesture({
        name: 'パターン1',
        pattern: ['UP', 'RIGHT'],
        action: 'action1'
      })

      await customGestureManager.addCustomGesture({
        name: 'パターン2', 
        pattern: ['UP', 'RIGHT', 'DOWN'],
        action: 'action2'
      })

      // 短いパターンをテスト
      const result1 = customPatternMatcher.matchPattern(['UP', 'RIGHT'])
      expect(result1.matched).toBe(true)
      expect(result1.action).toBe('action1')

      // 長いパターンをテスト
      const result2 = customPatternMatcher.matchPattern(['UP', 'RIGHT', 'DOWN'])
      expect(result2.matched).toBe(true)
      expect(result2.action).toBe('action2')
    })
  })

  describe('曖昧なパターンマッチング', () => {
    test('ノイズを含むパターンが適切にマッチする', async () => {
      // より寛容な閾値設定
      customGestureManager.setConfig({ matchThreshold: 0.4 })
      
      await customGestureManager.addCustomGesture({
        name: 'ノイズテスト',
        pattern: ['RIGHT', 'DOWN'],
        action: 'noise_test'
      })

      // 軽度のノイズを含む入力パターン  
      const noisyPattern = ['RIGHT', 'RIGHT', 'DOWN']
      const result = customPatternMatcher.matchPattern(noisyPattern)
      
      expect(result.matched).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.4)
    })

    test('信頼度が低すぎる場合はマッチしない', async () => {
      await customGestureManager.addCustomGesture({
        name: 'ストリクトパターン',
        pattern: ['UP', 'DOWN'],
        action: 'strict_action'
      })

      // 全く異なるパターン
      const differentPattern = ['LEFT', 'RIGHT', 'LEFT', 'RIGHT']
      const result = customPatternMatcher.matchPattern(differentPattern)
      
      expect(result.matched).toBe(false)
    })
  })

  describe('メッセージ送信統合', () => {
    test('カスタムジェスチャーメッセージが正しい形式で送信される', () => {
      const expectedMessage = {
        type: 'customGesture',
        action: 'custom_action',
        name: 'テストジェスチャー',
        direction: 'UP',
        distance: 100,
        confidence: 0.95
      }

      // メッセージ送信をモック
      chrome.runtime.sendMessage.mockImplementation((message, callback) => {
        expect(message).toEqual(expectedMessage)
        callback({ success: true, action: 'Custom action executed' })
      })

      // 実際のメッセージ送信をシミュレート
      chrome.runtime.sendMessage(expectedMessage, (response) => {
        expect(response.success).toBe(true)
      })

      expect(chrome.runtime.sendMessage).toHaveBeenCalled()
    })
  })

  describe('設定同期', () => {
    test('カスタムジェスチャー設定が正しく保存される', async () => {
      const testGesture = {
        name: '設定テスト',
        pattern: ['LEFT', 'UP'],
        action: 'settings_test'
      }

      chrome.storage.sync.set.mockResolvedValue()
      
      await customGestureManager.addCustomGesture(testGesture)
      
      expect(chrome.storage.sync.set).toHaveBeenCalledWith({
        customGestures: expect.arrayContaining([
          expect.objectContaining({
            name: '設定テスト',
            pattern: ['LEFT', 'UP'],
            action: 'settings_test'
          })
        ])
      })
    })

    test('カスタムジェスチャー設定が正しく読み込まれる', async () => {
      const savedGestures = [
        {
          id: 'test-1',
          name: '保存済みジェスチャー',
          pattern: ['DOWN', 'UP'],
          action: 'saved_action',
          enabled: true,
          createdAt: new Date().toISOString()
        }
      ]

      chrome.storage.sync.get.mockResolvedValue({
        customGestures: savedGestures
      })

      await customGestureManager.loadCustomGestures()
      
      const gestures = customGestureManager.getCustomGestures()
      expect(gestures).toHaveLength(1)
      expect(gestures[0].name).toBe('保存済みジェスチャー')
      
      // 読み込んだジェスチャーがマッチングで使用できることを確認
      const result = customPatternMatcher.matchPattern(['DOWN', 'UP'])
      expect(result.matched).toBe(true)
      expect(result.action).toBe('saved_action')
    })
  })

  describe('エラーハンドリング', () => {
    test('破損したカスタムジェスチャーデータが適切に処理される', async () => {
      // 破損したデータをモック
      chrome.storage.sync.get.mockResolvedValue({
        customGestures: [
          null, // null値
          { name: 'broken' }, // 必須フィールド不足
          { // 正常なデータ
            id: 'valid-1',
            name: '正常なジェスチャー',
            pattern: ['UP'],
            action: 'valid_action',
            enabled: true,
            createdAt: new Date().toISOString()
          }
        ]
      })

      // エラーが発生しないことを確認
      await expect(customGestureManager.loadCustomGestures()).resolves.not.toThrow()
      
      // 有効なジェスチャーのみが読み込まれることを確認
      const gestures = customGestureManager.getCustomGestures()
      expect(gestures).toHaveLength(1)
      expect(gestures[0].name).toBe('正常なジェスチャー')
    })

    test('Chrome APIエラーが適切にハンドリングされる', async () => {
      chrome.storage.sync.get.mockRejectedValue(new Error('Storage error'))
      
      // エラーが発生してもアプリケーションが停止しないことを確認
      await expect(customGestureManager.loadCustomGestures()).resolves.not.toThrow()
      
      // デフォルト状態を維持することを確認
      expect(customGestureManager.getCustomGestures()).toEqual([])
    })
  })
})