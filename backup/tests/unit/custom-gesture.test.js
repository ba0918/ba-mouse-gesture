// カスタムジェスチャー機能のユニットテスト

const {
  CustomGestureManager,
  GestureRecorder,
  CustomPatternMatcher
} = require('../../content_scripts/custom-gesture-manager.js')

describe('CustomGestureManager', () => {
  let customGestureManager

  beforeEach(() => {
    // CustomGestureManagerクラスのインスタンスを作成
    // 注意: まだ実装されていないので、テストは失敗する
    customGestureManager = new CustomGestureManager()
    
    // chrome.storage のモックをリセット
    chrome.storage.sync.get.mockClear()
    chrome.storage.sync.set.mockClear()
  })

  describe('初期化', () => {
    test('空のカスタムジェスチャーリストで初期化される', () => {
      expect(customGestureManager.getCustomGestures()).toEqual([])
    })

    test('デフォルト設定が適用される', () => {
      const defaultConfig = customGestureManager.getConfig()
      expect(defaultConfig.maxCustomGestures).toBe(20)
      expect(defaultConfig.minPatternLength).toBe(1)
      expect(defaultConfig.matchThreshold).toBe(0.6)
    })
  })

  describe('カスタムジェスチャーの追加', () => {
    test('新しいカスタムジェスチャーを追加できる', async () => {
      const gestureData = {
        name: 'テストジェスチャー',
        pattern: ['UP', 'DOWN', 'RIGHT'],
        action: 'refresh'
      }

      const result = await customGestureManager.addCustomGesture(gestureData)
      
      expect(result.success).toBe(true)
      expect(result.id).toBeDefined()
      
      const customGestures = customGestureManager.getCustomGestures()
      expect(customGestures).toHaveLength(1)
      expect(customGestures[0].name).toBe('テストジェスチャー')
      expect(customGestures[0].pattern).toEqual(['UP', 'DOWN', 'RIGHT'])
      expect(customGestures[0].action).toBe('refresh')
      expect(customGestures[0].enabled).toBe(true)
    })

    test('無効なパターンは追加できない', async () => {
      const invalidGestureData = {
        name: 'テストジェスチャー',
        pattern: [], // 空のパターン
        action: 'refresh'
      }

      const result = await customGestureManager.addCustomGesture(invalidGestureData)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('パターンが無効')
      expect(customGestureManager.getCustomGestures()).toHaveLength(0)
    })

    test('重複する名前のジェスチャーは追加できない', async () => {
      const gestureData1 = {
        name: '同じ名前',
        pattern: ['UP', 'DOWN'],
        action: 'back'
      }
      
      const gestureData2 = {
        name: '同じ名前',
        pattern: ['DOWN', 'UP'],
        action: 'forward'
      }

      await customGestureManager.addCustomGesture(gestureData1)
      const result = await customGestureManager.addCustomGesture(gestureData2)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('既に存在')
      expect(customGestureManager.getCustomGestures()).toHaveLength(1)
    })

    test('最大登録数を超える場合は追加できない', async () => {
      // maxCustomGestures を 2 に設定
      customGestureManager.setConfig({ maxCustomGestures: 2 })
      
      // 2つのジェスチャーを追加
      await customGestureManager.addCustomGesture({
        name: 'ジェスチャー1',
        pattern: ['UP'],
        action: 'back'
      })
      
      await customGestureManager.addCustomGesture({
        name: 'ジェスチャー2',
        pattern: ['DOWN'],
        action: 'forward'
      })
      
      // 3つ目を追加しようとする
      const result = await customGestureManager.addCustomGesture({
        name: 'ジェスチャー3',
        pattern: ['LEFT'],
        action: 'refresh'
      })
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('最大数')
      expect(customGestureManager.getCustomGestures()).toHaveLength(2)
    })
  })

  describe('カスタムジェスチャーの削除', () => {
    test('IDでカスタムジェスチャーを削除できる', async () => {
      // ジェスチャーを追加
      const addResult = await customGestureManager.addCustomGesture({
        name: '削除テスト',
        pattern: ['UP', 'RIGHT'],
        action: 'back'
      })
      
      expect(customGestureManager.getCustomGestures()).toHaveLength(1)
      
      // 削除
      const deleteResult = await customGestureManager.deleteCustomGesture(addResult.id)
      
      expect(deleteResult.success).toBe(true)
      expect(customGestureManager.getCustomGestures()).toHaveLength(0)
    })

    test('存在しないIDでは削除できない', async () => {
      const result = await customGestureManager.deleteCustomGesture('invalid-id')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('見つかりません')
    })
  })

  describe('カスタムジェスチャーの更新', () => {
    test('既存のカスタムジェスチャーを更新できる', async () => {
      // ジェスチャーを追加
      const addResult = await customGestureManager.addCustomGesture({
        name: '更新前',
        pattern: ['UP'],
        action: 'back'
      })
      
      // 更新
      const updateResult = await customGestureManager.updateCustomGesture(addResult.id, {
        name: '更新後',
        pattern: ['UP', 'RIGHT'],
        action: 'forward'
      })
      
      expect(updateResult.success).toBe(true)
      
      const gestures = customGestureManager.getCustomGestures()
      expect(gestures[0].name).toBe('更新後')
      expect(gestures[0].pattern).toEqual(['UP', 'RIGHT'])
      expect(gestures[0].action).toBe('forward')
    })
  })

  describe('データの永続化', () => {
    test('カスタムジェスチャーが正しく保存される', async () => {
      const gestureData = {
        name: '保存テスト',
        pattern: ['LEFT', 'RIGHT'],
        action: 'refresh'
      }

      await customGestureManager.addCustomGesture(gestureData)
      
      // chrome.storage.sync.set が呼び出されることを確認
      expect(chrome.storage.sync.set).toHaveBeenCalled()
      
      const saveCall = chrome.storage.sync.set.mock.calls[0][0]
      expect(saveCall.customGestures).toBeDefined()
      expect(saveCall.customGestures).toHaveLength(1)
    })

    test('保存されたカスタムジェスチャーが読み込まれる', async () => {
      const savedGestures = [
        {
          id: 'test-1',
          name: '保存済み',
          pattern: ['DOWN', 'UP'],
          action: 'back',
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
      expect(gestures[0].name).toBe('保存済み')
    })
  })
})

describe('GestureRecorder', () => {
  let gestureRecorder

  beforeEach(() => {
    gestureRecorder = new GestureRecorder()
  })

  describe('記録機能', () => {
    test('軌跡の記録を開始・停止できる', () => {
      expect(gestureRecorder.isRecording()).toBe(false)
      
      gestureRecorder.startRecording()
      expect(gestureRecorder.isRecording()).toBe(true)
      
      gestureRecorder.stopRecording()
      expect(gestureRecorder.isRecording()).toBe(false)
    })

    test('マウス座標を記録できる', () => {
      gestureRecorder.startRecording()
      gestureRecorder.addPoint(100, 200)
      gestureRecorder.addPoint(150, 180)
      
      const trail = gestureRecorder.getTrail()
      expect(trail).toHaveLength(2)
      expect(trail[0]).toEqual({ x: 100, y: 200 })
      expect(trail[1]).toEqual({ x: 150, y: 180 })
    })

    test('記録していない状態では座標を追加できない', () => {
      gestureRecorder.addPoint(100, 200)
      
      const trail = gestureRecorder.getTrail()
      expect(trail).toHaveLength(0)
    })

    test('軌跡をパターンに変換できる', () => {
      gestureRecorder.startRecording()
      gestureRecorder.addPoint(100, 100) // 開始点
      gestureRecorder.addPoint(100, 50)  // 上
      gestureRecorder.addPoint(150, 50)  // 右
      gestureRecorder.addPoint(150, 100) // 下
      gestureRecorder.stopRecording()
      
      const pattern = gestureRecorder.convertToPattern()
      expect(pattern).toEqual(['UP', 'RIGHT', 'DOWN'])
    })
  })

  describe('記録品質チェック', () => {
    test('短すぎる軌跡は無効と判定される', () => {
      gestureRecorder.startRecording()
      gestureRecorder.addPoint(100, 100)
      gestureRecorder.addPoint(105, 105)
      gestureRecorder.stopRecording()
      
      const isValid = gestureRecorder.isValidGesture()
      expect(isValid).toBe(false)
    })

    test('十分な軌跡は有効と判定される', () => {
      gestureRecorder.startRecording()
      gestureRecorder.addPoint(100, 100) // 開始
      gestureRecorder.addPoint(100, 50)  // 上に50px
      gestureRecorder.addPoint(150, 50)  // 右に50px
      gestureRecorder.stopRecording()
      
      const isValid = gestureRecorder.isValidGesture()
      expect(isValid).toBe(true)
    })
  })
})

describe('CustomPatternMatcher', () => {
  let patternMatcher
  let customGestureManager

  beforeEach(() => {
    customGestureManager = new CustomGestureManager()
    patternMatcher = new CustomPatternMatcher(customGestureManager)
  })

  describe('パターンマッチング', () => {
    test('完全一致のカスタムジェスチャーが認識される', async () => {
      // カスタムジェスチャーを追加
      await customGestureManager.addCustomGesture({
        name: 'カスタム上下',
        pattern: ['UP', 'DOWN'],
        action: 'custom_action'
      })

      const inputPattern = ['UP', 'DOWN']
      const result = patternMatcher.matchPattern(inputPattern)
      
      expect(result.matched).toBe(true)
      expect(result.gestureType).toBe('custom')
      expect(result.action).toBe('custom_action')
      expect(result.confidence).toBeGreaterThan(0.9)
    })

    test('曖昧なパターンもしきい値内で認識される', async () => {
      await customGestureManager.addCustomGesture({
        name: 'カスタムL字',
        pattern: ['RIGHT', 'DOWN'],
        action: 'custom_l'
      })

      // 少し違うパターン（途中にノイズがある）
      const inputPattern = ['RIGHT', 'RIGHT', 'DOWN']
      const result = patternMatcher.matchPattern(inputPattern)
      
      expect(result.matched).toBe(true)
      expect(result.confidence).toBeGreaterThan(0.6)
    })

    test('デフォルトジェスチャーより優先してマッチする', async () => {
      // 既存の 'DOWNRIGHT' パターンをオーバーライド
      await customGestureManager.addCustomGesture({
        name: 'カスタム下右',
        pattern: ['DOWN', 'RIGHT'],
        action: 'custom_downright'
      })

      const inputPattern = ['DOWN', 'RIGHT']
      const result = patternMatcher.matchPattern(inputPattern)
      
      expect(result.matched).toBe(true)
      expect(result.action).toBe('custom_downright') // カスタムが優先
    })

    test('無効化されたカスタムジェスチャーは認識されない', async () => {
      const addResult = await customGestureManager.addCustomGesture({
        name: '無効ジェスチャー',
        pattern: ['LEFT', 'UP'],
        action: 'disabled_action'
      })

      // ジェスチャーを無効化
      await customGestureManager.updateCustomGesture(addResult.id, { enabled: false })

      const inputPattern = ['LEFT', 'UP']
      const result = patternMatcher.matchPattern(inputPattern)
      
      expect(result.matched).toBe(false)
    })
  })
})