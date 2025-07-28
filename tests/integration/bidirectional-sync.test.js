/**
 * 双方向同期テスト
 * カスタムジェスチャーセクションとジェスチャー一覧間の双方向同期をテスト
 */

describe('双方向同期テスト', () => {
  let controller
  let mockCustomGestureUseCase, mockSettingsUseCase, mockGestureListUseCase

  beforeEach(async () => {
    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="allGesturesList"></div>
      <div id="customGestureList"></div>
      <div id="saveStatus" style="display: none;"></div>
    `

    // Mock UseCases
    mockCustomGestureUseCase = {
      getAllCustomGestures: jest.fn(),
      toggleCustomGesture: jest.fn(),
      deleteCustomGesture: jest.fn()
    }

    mockSettingsUseCase = {
      toggleGesture: jest.fn()
    }

    mockGestureListUseCase = {
      getAllGestures: jest.fn()
    }

    // ThinOptionsController
    const { ThinOptionsController } = require('../../src/presentation/popup/ThinOptionsController')
    controller = new ThinOptionsController({
      customGestureUseCase: mockCustomGestureUseCase,
      settingsUseCase: mockSettingsUseCase,
      gestureListUseCase: mockGestureListUseCase
    })
    
    // Clean Architecture移行後のイベントリスナー設定のため必要
    await controller.initialize()
  })

  describe('ジェスチャー一覧からカスタムジェスチャーセクションへの同期', () => {
    test('ジェスチャー一覧でカスタムジェスチャーをトグルするとカスタムセクションも更新される', async () => {
      // テストデータの準備
      const mockGestures = [
        {
          id: 'custom_test_123',
          name: 'テストジェスチャー',
          pattern: ['up', 'down'],
          action: 'back',
          type: 'custom',
          enabled: true,
          getFormattedPattern: () => '↑↓',
          getActionDisplayName: () => 'ブラウザの戻る'
        }
      ]

      const mockCustomGestures = [
        {
          id: 'custom_test_123',
          name: 'テストジェスチャー',
          pattern: ['up', 'down'],
          action: 'back',
          enabled: false, // トグル後の状態
          getFormattedPattern: () => '↑↓',
          getActionDisplayName: () => 'ブラウザの戻る'
        }
      ]

      mockGestureListUseCase.getAllGestures.mockResolvedValue(mockGestures)
      mockCustomGestureUseCase.getAllCustomGestures.mockResolvedValue(mockCustomGestures)
      mockCustomGestureUseCase.toggleCustomGesture.mockResolvedValue(mockCustomGestures[0])

      // ジェスチャー一覧をレンダリング
      await controller.renderGestureList()

      // カスタムジェスチャーリストもレンダリング
      const renderCustomSpy = jest.spyOn(controller.renderController, 'renderCustomGestureList')

      // チェックボックスを取得してクリック
      const checkbox = document.querySelector('input[data-gesture-id="custom_test_123"]')
      expect(checkbox).toBeTruthy()

      // チェックボックスの状態を変更してchangeイベントを発火
      checkbox.checked = false
      const changeEvent = new window.Event('change', { bubbles: true })
      checkbox.dispatchEvent(changeEvent)

      // 非同期処理を待つ（イベントデリゲーション処理待機）
      await new Promise(resolve => setTimeout(resolve, 100))

      // 期待する動作の検証
      expect(mockCustomGestureUseCase.toggleCustomGesture).toHaveBeenCalledWith('custom_test_123', false)
      expect(renderCustomSpy).toHaveBeenCalled()
    })

    test('デフォルトジェスチャーのトグルではカスタムセクションが更新されない', async () => {
      // テストデータの準備
      const mockGestures = [
        {
          id: 'left',
          name: 'ブラウザの戻る',
          pattern: '←',
          action: 'back',
          type: 'default',
          enabled: true,
          getFormattedPattern: () => '←',
          getActionDisplayName: () => 'ブラウザの戻る'
        }
      ]

      mockGestureListUseCase.getAllGestures.mockResolvedValue(mockGestures)
      mockSettingsUseCase.toggleGesture.mockResolvedValue()

      // ジェスチャー一覧をレンダリング
      await controller.renderGestureList()

      const renderCustomSpy = jest.spyOn(controller, 'renderCustomGestureList')

      // デフォルトジェスチャーのチェックボックスをクリック
      const checkbox = document.querySelector('input[data-gesture-id="left"]')
      expect(checkbox).toBeTruthy()

      checkbox.checked = false
      const changeEvent = new window.Event('change', { bubbles: true })
      checkbox.dispatchEvent(changeEvent)

      // 非同期処理を待つ（イベントデリゲーション処理待機）
      await new Promise(resolve => setTimeout(resolve, 100))

      // デフォルトジェスチャーの場合はsettingsUseCaseが呼ばれる
      expect(mockSettingsUseCase.toggleGesture).toHaveBeenCalledWith('left', false)
      // カスタムジェスチャーの再描画は呼ばれない
      expect(renderCustomSpy).not.toHaveBeenCalled()
    })
  })

  describe('カスタムジェスチャーセクションからジェスチャー一覧への同期', () => {
    test('カスタムセクションでトグルするとジェスチャー一覧も更新される', async () => {
      const mockCustomGestures = [
        {
          id: 'custom_test_456',
          name: 'テストジェスチャー2',
          pattern: ['left', 'right'],
          action: 'new_tab',
          enabled: true,
          getFormattedPattern: () => '←→',
          getActionDisplayName: () => '新しいタブを開く'
        }
      ]

      mockCustomGestureUseCase.getAllCustomGestures.mockResolvedValue(mockCustomGestures)
      mockCustomGestureUseCase.toggleCustomGesture.mockResolvedValue({...mockCustomGestures[0], enabled: false})

      // カスタムジェスチャーリストをレンダリング
      await controller.renderCustomGestureList()

      const renderGestureListSpy = jest.spyOn(controller.renderController, 'renderGestureList')

      // カスタムジェスチャーのチェックボックスをクリック
      const checkbox = document.querySelector('input[data-gesture-id="custom_test_456"]')
      expect(checkbox).toBeTruthy()

      checkbox.checked = false
      const changeEvent = new window.Event('change', { bubbles: true })
      checkbox.dispatchEvent(changeEvent)

      // 非同期処理を待つ（イベントデリゲーション処理待機）
      await new Promise(resolve => setTimeout(resolve, 100))

      // カスタムジェスチャーのトグルとジェスチャー一覧の更新が呼ばれる
      expect(mockCustomGestureUseCase.toggleCustomGesture).toHaveBeenCalledWith('custom_test_456', false)
      expect(renderGestureListSpy).toHaveBeenCalled()
    })
  })

  describe('パターン表示の正規化', () => {
    test('配列パターンが正しく矢印に変換される', () => {
      const { GestureEntity } = require('../../src/domain/entities/GestureEntity')
      
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['up', 'down', 'left', 'right'],
        action: 'test'
      })

      expect(gesture.getFormattedPattern()).toBe('↑↓←→')
    })

    test('文字列パターンが正しく処理される', () => {
      const { GestureEntity } = require('../../src/domain/entities/GestureEntity')
      
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: '↑↓←→',
        action: 'test'
      })

      expect(gesture.getFormattedPattern()).toBe('↑↓←→')
    })

    test('混在パターンが正しく処理される', () => {
      const { GestureEntity } = require('../../src/domain/entities/GestureEntity')
      
      const gesture = new GestureEntity({
        id: 'test',
        name: 'テスト',
        pattern: ['↑', 'down', '←', 'RIGHT'],
        action: 'test'
      })

      expect(gesture.getFormattedPattern()).toBe('↑↓←→')
    })
  })
})