/**
 * デバッグ用のテスト
 */

const { ThinOptionsController } = require('./src/presentation/popup/ThinOptionsController')

// DOM環境をセットアップ
document.body.innerHTML = `
  <div id="allGesturesList">
    <input type="checkbox" data-gesture-id="custom_test_123" checked>
  </div>
  <div id="customGestureList"></div>
  <div id="saveStatus" style="display: none;"></div>
`

// Mock UseCases
const mockCustomGestureUseCase = {
  getAllCustomGestures: jest.fn().mockResolvedValue([]),
  toggleCustomGesture: jest.fn().mockResolvedValue({}),
  deleteCustomGesture: jest.fn()
}

const mockSettingsUseCase = {
  toggleGesture: jest.fn(),
  getCurrentSettings: jest.fn().mockResolvedValue({
    enabled: true,
    strokeColor: '#2196F3',
    strokeWidth: 3,
    gestureThreshold: 15,
    debugSettings: {}
  })
}

const mockGestureListUseCase = {
  getAllGestures: jest.fn().mockResolvedValue([
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
  ])
}

async function testEventSetup() {
  console.log('=== デバッグテスト開始 ===')
  
  const controller = new ThinOptionsController({
    customGestureUseCase: mockCustomGestureUseCase,
    settingsUseCase: mockSettingsUseCase,
    gestureListUseCase: mockGestureListUseCase
  })

  console.log('1. コントローラー初期化中...')
  await controller.initialize()

  console.log('2. イベントハンドラーの確認...')
  console.log('controller.eventController:', Boolean(controller.eventController))
  console.log('onGestureAdded:', Boolean(controller.eventController.onGestureAdded))

  console.log('3. ジェスチャー一覧をレンダリング...')
  await controller.renderGestureList()

  console.log('4. チェックボックスを確認...')
  const checkbox = document.querySelector('input[data-gesture-id="custom_test_123"]')
  console.log('checkbox found:', Boolean(checkbox))

  if (checkbox) {
    console.log('5. changeイベントを発火...')
    const renderCustomSpy = jest.spyOn(controller, 'renderCustomGestureList')
    
    checkbox.checked = false
    const changeEvent = new Event('change', { bubbles: true })
    checkbox.dispatchEvent(changeEvent)

    // 非同期処理を待つ
    await new Promise(resolve => setTimeout(resolve, 100))

    console.log('6. 結果確認...')
    console.log('toggleCustomGesture called:', mockCustomGestureUseCase.toggleCustomGesture.mock.calls.length)
    console.log('renderCustomGestureList called:', renderCustomSpy.mock.calls.length)
  }

  console.log('=== デバッグテスト完了 ===')
}

module.exports = { testEventSetup }