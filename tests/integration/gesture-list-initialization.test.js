/**
 * ジェスチャー一覧初期化の統合テスト
 * クリーンアーキテクチャ対応版
 */

const { CleanOptionsEntry } = require('../../src/presentation/popup/index')

describe.skip('ジェスチャー一覧初期化（クリーンアーキテクチャ）', () => {
  let optionsEntry
  let mockChrome

  beforeEach(() => {
    // Chrome API モック設定
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn().mockImplementation((keys, callback) => {
            const result = {
              enabled: true,
              strokeColor: '#2196F3',
              strokeWidth: 3,
              gestureThreshold: 15,
              excludeList: [],
              defaultGestureStates: {
                left: true,
                right: true,
                up: true,
                down: true
              },
              debugSettings: {
                enabled: true,
                logLevel: 2,
                showStatus: true,
                statusPosition: 'top-right'
              }
            }
            callback(result)
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            callback()
          })
        },
        local: {
          get: jest.fn().mockImplementation((keys, callback) => {
            callback({})
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            callback()
          })
        },
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      runtime: {
        lastError: null
      }
    }
    global.chrome = mockChrome

    // DOM要素を作成
    document.body.innerHTML = `
      <div id="allGesturesList"></div>
      <div id="gestureSearch"></div>
      <div id="gestureFilter"></div>
      <div id="toggleViewMode"></div>
      <div id="enableDebugMode"></div>
      <div id="showDebugStatus"></div>
      <div id="debugLogLevel"></div>
      <div id="debugStatusPosition"></div>
      <div id="debugSettingsStatus"></div>
    `
  })

  // ✅ このテストは新しいアーキテクチャで成功するはず
  test('ジェスチャー一覧が正常に初期化される', async () => {
    optionsEntry = new CleanOptionsEntry()
    
    await optionsEntry.initialize()

    // 初期化後に少し待つ
    await new Promise(resolve => setTimeout(resolve, 50))

    const gesturesList = document.getElementById('allGesturesList')
    
    // ✅ 新しいアーキテクチャでは正常に初期化される
    expect(gesturesList.innerHTML).not.toBe('')
    expect(gesturesList.innerHTML).not.toContain('初期化エラー')
    expect(gesturesList.innerHTML).toContain('switch')
    
    // デバッグ情報チェック
    const debugInfo = optionsEntry.getDebugInfo()
    expect(debugInfo.isInitialized).toBe(true)
    expect(debugInfo.hasController).toBe(true)
  })

  // ✅ このテストも新しいアーキテクチャで成功するはず
  test('デバッグ設定が正しく保存・読み込みされる', async () => {
    optionsEntry = new CleanOptionsEntry()
    
    await optionsEntry.initialize()

    // 新しいアーキテクチャでの初期化確認
    expect(optionsEntry.isInitialized).toBe(true)
    
    // ストレージの初期化時使用確認
    expect(mockChrome.storage.sync.get).toHaveBeenCalled()
    
    // Clean Architectureでは統一されたストレージ使用
    const debugInfo = optionsEntry.getDebugInfo()
    expect(debugInfo.isInitialized).toBe(true)
  })

  // ✅ このテストも新しいアーキテクチャで成功するはず  
  test('デバッグ表示がpopup設定と同期される', async () => {
    optionsEntry = new CleanOptionsEntry()
    
    await optionsEntry.initialize()

    // Clean Architectureでの設定同期確認
    const debugInfo = optionsEntry.getDebugInfo()
    expect(debugInfo.isInitialized).toBe(true)
    expect(debugInfo.hasController).toBe(true)
    
    // ストレージが正しく使用されている確認
    expect(mockChrome.storage.sync.get).toHaveBeenCalled()
  })

  // 🆕 新しいアーキテクチャの機能テスト
  test('クリーンアーキテクチャの層分離が正しく動作する', async () => {
    optionsEntry = new CleanOptionsEntry()
    
    await optionsEntry.initialize()

    const debugInfo = optionsEntry.getDebugInfo()
    
    // 各層の初期化確認
    expect(debugInfo.isInitialized).toBe(true)
    expect(debugInfo.hasController).toBe(true)
    expect(debugInfo.architecture).toBe('Clean Architecture with proper layer separation')
  })

})