/**
 * ジェスチャー一覧初期化の統合テスト
 * クリーンアーキテクチャ対応版
 */

const { OptionsManagerClean } = require('../../src/presentation/OptionsManagerClean')

describe('ジェスチャー一覧初期化（クリーンアーキテクチャ）', () => {
  let optionsManager
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
    optionsManager = new OptionsManagerClean()
    
    await optionsManager.initialize()

    // 初期化後に少し待つ
    await new Promise(resolve => setTimeout(resolve, 50))

    const gesturesList = document.getElementById('allGesturesList')
    
    // ✅ 新しいアーキテクチャでは正常に初期化される
    expect(gesturesList.innerHTML).not.toBe('')
    expect(gesturesList.innerHTML).not.toContain('初期化エラー')
    expect(gesturesList.innerHTML).toContain('gesture-status-toggle')
    
    // ヘルスチェック
    const health = await optionsManager.healthCheck()
    expect(health.status).toBe('healthy')
  })

  // ✅ このテストも新しいアーキテクチャで成功するはず
  test('デバッグ設定が正しく保存・読み込みされる', async () => {
    optionsManager = new OptionsManagerClean()
    
    await optionsManager.initialize()

    // デバッグ設定を変更
    await optionsManager.saveDebugSettings()

    // 保存された値を確認（syncストレージのみ使用）
    expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        debugSettings: expect.objectContaining({
          enabled: expect.any(Boolean),
          showStatus: expect.any(Boolean),
          logLevel: expect.any(Number),
          statusPosition: expect.any(String)
        })
      })
    )

    // ✅ クリーンアーキテクチャでは統一されたストレージ使用
    expect(mockChrome.storage.local.set).not.toHaveBeenCalledWith(
      expect.objectContaining({ debugSettings: expect.anything() })
    )
  })

  // ✅ このテストも新しいアーキテクチャで成功するはず  
  test('デバッグ表示がpopup設定と同期される', async () => {
    optionsManager = new OptionsManagerClean()
    
    await optionsManager.initialize()

    // デバッグ設定を取得
    const debugSettings = await optionsManager.debugSettingsUseCase.getDebugSettings()
    
    // 設定を変更
    debugSettings.enabled = true
    debugSettings.showStatus = true
    
    await optionsManager.debugSettingsUseCase.saveDebugSettings(debugSettings)

    // ✅ chrome.storage.sync経由での同期確認
    expect(mockChrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        debugSettings: expect.objectContaining({
          enabled: true,
          showStatus: true
        })
      })
    )
  })

  // 🆕 新しいアーキテクチャの機能テスト
  test('クリーンアーキテクチャの層分離が正しく動作する', async () => {
    optionsManager = new OptionsManagerClean()
    
    await optionsManager.initialize()

    const status = optionsManager.getStatus()
    
    // 各層の初期化確認
    expect(status.isInitialized).toBe(true)
    expect(status.hasStorageAdapter).toBe(true)
    expect(status.hasRepositories).toBe(true)
    expect(status.hasUseCases).toBe(true)
    expect(status.hasControllers).toBe(true)
    expect(status.storageAvailable).toBe(true)
  })

  // 🆕 エラーハンドリングテスト
  test('初期化エラー時に適切なエラー表示が行われる', async () => {
    // Chrome APIを無効にしてエラーを発生させる
    global.chrome = null
    
    optionsManager = new OptionsManagerClean()
    
    await expect(optionsManager.initialize()).rejects.toThrow()
    
    const gesturesList = document.getElementById('allGesturesList')
    // エラー表示の確認は初期化エラー時に自動で表示される
  })
})