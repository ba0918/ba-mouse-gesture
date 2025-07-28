/**
 * 実際の不具合を再現するテスト
 * 🚨 これらのテストは現在ALL FAIL するはず（問題を正確に再現）
 */

describe('実際の不具合再現テスト', () => {
  let mockChrome
  let optionsManager

  beforeEach(() => {
    // 実際のChromeStorageの動作をシミュレート
    // 🔧 修正: デフォルト設定を含む初期データを設定
    const storageData = {
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
    
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn().mockImplementation((keys, callback) => {
            console.log('🔧 Mock storage.sync.get called with keys:', keys)
            const result = {}
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                result[key] = storageData[key]
              })
            } else if (keys) {
              Object.keys(keys).forEach(key => {
                result[key] = storageData[key] || keys[key]
              })
            }
            console.log('🔧 Mock storage.sync.get returning:', result)
            if (callback) callback(result)
            return Promise.resolve(result)
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            console.log('🔧 Mock storage.sync.set called with data:', data)
            Object.assign(storageData, data)
            if (callback) callback()
            return Promise.resolve()
          })
        },
        local: {
          get: jest.fn().mockImplementation((keys, callback) => {
            const result = {}
            if (callback) callback(result)
            return Promise.resolve(result)
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            if (callback) callback()
            return Promise.resolve()
          })
        },
        onChanged: {
          addListener: jest.fn(),
          removeListener: jest.fn()
        }
      },
      runtime: {
        lastError: null,
        sendMessage: jest.fn()
      }
    }
    global.chrome = mockChrome

    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="allGesturesList"></div>
      <div id="gestureSearch"></div>
      <div id="gestureFilter"></div>
      <input type="checkbox" id="debugEnabled">
      <input type="checkbox" id="debugShowStatus">
      <select id="debugLogLevel"></select>
      <select id="debugStatusPosition"></select>
    `

    // CustomGestureManagerをモック
    global.CustomGestureManager = jest.fn().mockImplementation(() => ({
      getCustomGestures: jest.fn().mockReturnValue([]),
      loadCustomGestures: jest.fn().mockResolvedValue()
    }))
  })

  afterEach(() => {
    // グローバル状態をクリア
    delete global.chrome
    delete global.CustomGestureManager
    delete global.DebugLogger
  })

  // 🚨 Bug 1: ジェスチャー一覧が初期化エラーで失敗する（修正版でテスト）
  test('FIXED: ジェスチャー一覧が正常に初期化される', async () => {
    // 修正版OptionsManagerを使用
    const OptionsManagerFixed = require('../../src/presentation/OptionsManagerFixed')
    optionsManager = new OptionsManagerFixed()

    // 初期化を待つ
    await new Promise(resolve => setTimeout(resolve, 100))

    const gesturesList = document.getElementById('allGesturesList')
    
    // ✅ 修正版では正常に初期化されるはず
    expect(gesturesList.innerHTML).not.toContain('初期化エラー')
    
    // システム状態の確認
    const status = optionsManager.getSystemStatus()
    expect(status.isInitialized).toBe(true)
    expect(status.initializationError).toBeNull()
  })

  // ✅ FIXED: デバッグ設定変更時にcontent scriptと正常に同期される
  test('FIXED: デバッグ設定変更時にcontent scriptと正常に同期される', async () => {
    // content scriptの状態をシミュレート
    global.DebugLogger = {
      settings: {
        enabled: false,  // デフォルトfalse
        showStatus: false // デフォルトfalse
      },
      updateSettings: jest.fn(),
      showOnScreenDebug: jest.fn(),
      hideOnScreenDebug: jest.fn()
    }

    const OptionsManagerFixed = require('../../src/presentation/OptionsManagerFixed')
    optionsManager = new OptionsManagerFixed()

    // 初期化を待つ
    await new Promise(resolve => setTimeout(resolve, 100))

    // popup側でデバッグを有効にする（シミュレート）
    if (optionsManager.debugSettingsUseCase) {
      const debugSettings = await optionsManager.debugSettingsUseCase.getDebugSettings()
      debugSettings.enabled = true
      debugSettings.showStatus = true
      await optionsManager.debugSettingsUseCase.saveDebugSettings(debugSettings)
    }

    // 同期処理を待つ
    await new Promise(resolve => setTimeout(resolve, 100))

    // ✅ 修正版では正常に同期される
    expect(global.DebugLogger.updateSettings).toHaveBeenCalled()
    expect(global.DebugLogger.settings.enabled).toBe(true) // 同期されている
    expect(global.DebugLogger.settings.showStatus).toBe(true) // 同期されている
  })

  // 🚨 Bug 3: デバッグ表示の同期問題
  test('BUG: デバッグ設定とcontent script表示が同期しない', async () => {
    // DebugLoggerをモック（実際の動作をシミュレート）
    const mockDebugLogger = {
      settings: {
        enabled: false, // デフォルトfalse
        showStatus: false // デフォルトfalse
      },
      showOnScreenDebug: jest.fn(),
      hideOnScreenDebug: jest.fn(),
      updateSettings: jest.fn().mockImplementation((newSettings) => {
        Object.assign(mockDebugLogger.settings, newSettings)
      })
    }
    global.DebugLogger = mockDebugLogger

    const OptionsManager = require('../../popup/options.js')
    optionsManager = new OptionsManager()

    await new Promise(resolve => setTimeout(resolve, 50))

    // popup側でデバッグを有効にする
    const debugCheckbox = document.getElementById('debugEnabled')
    debugCheckbox.checked = true
    const event = document.createEvent('Event')
    event.initEvent('change', true, true)
    debugCheckbox.dispatchEvent(event)

    await new Promise(resolve => setTimeout(resolve, 50))

    // 🚨 現在この状態のはず（同期されていない）
    // popup側は有効だが、content script側は無効のまま
    expect(debugCheckbox.checked).toBe(true) // popup側は有効
    expect(mockDebugLogger.settings.enabled).toBe(false) // content script側は無効のまま

    // または、逆にcontent scriptは常に表示されているが、popup側は無効
    // （どちらのパターンでも同期していない）
  })

  // 🚨 Bug 4: デバッグ表示がON/OFF切り替えに反応しない
  test('BUG: デバッグ表示のON/OFF切り替えが機能しない', async () => {
    const mockDebugLogger = {
      settings: {
        enabled: true,
        showStatus: true
      },
      showOnScreenDebug: jest.fn(),
      hideOnScreenDebug: jest.fn(),
      updateSettings: jest.fn()
    }
    global.DebugLogger = mockDebugLogger

    const OptionsManager = require('../../popup/options.js')
    optionsManager = new OptionsManager()

    await new Promise(resolve => setTimeout(resolve, 50))

    // 初期状態では表示されている想定
    mockDebugLogger.showOnScreenDebug.mockClear()
    mockDebugLogger.hideOnScreenDebug.mockClear()

    // 無効にする
    const debugCheckbox = document.getElementById('debugEnabled')
    debugCheckbox.checked = false
    const event = document.createEvent('Event')
    event.initEvent('change', true, true)
    debugCheckbox.dispatchEvent(event)

    await new Promise(resolve => setTimeout(resolve, 50))

    // 🚨 現在この状態のはず（hideが呼ばれない）
    expect(mockDebugLogger.hideOnScreenDebug).not.toHaveBeenCalled()
    
    // または呼ばれても実際の表示は変わらない
  })

  // 🚨 Bug 5: ストレージキー名の不整合
  test('BUG: デバッグ設定のストレージキー名が不整合', async () => {
    const OptionsManager = require('../../popup/options.js')
    optionsManager = new OptionsManager()

    await new Promise(resolve => setTimeout(resolve, 50))

    // デバッグ設定を変更
    const debugCheckbox = document.getElementById('debugEnabled')
    debugCheckbox.checked = true
    const event = document.createEvent('Event')
    event.initEvent('change', true, true)
    debugCheckbox.dispatchEvent(event)

    await new Promise(resolve => setTimeout(resolve, 50))

    // 保存されたデータを確認
    const setCall = mockChrome.storage.sync.set.mock.calls[0]
    const savedData = setCall ? setCall[0] : {}

    // 🚨 現在この状態のはず（キー名が不整合）
    // popup側は 'debugSettings' で保存するが
    // content script側は 'enableDebugMode' を期待している
    // または、複数のキーに重複して保存している
    
    const hasDebugSettings = 'debugSettings' in savedData
    const hasEnableDebugMode = 'enableDebugMode' in savedData
    const hasConflict = hasDebugSettings && hasEnableDebugMode
    
    // どちらかが欠けているか、競合している
    expect(hasDebugSettings && hasEnableDebugMode).toBe(false) // 両方同時に存在すべきではない
  })

  // 🆕 統合テスト: 全体の不具合パターン
  test('BUG: システム全体で複数の問題が発生している', async () => {
    const OptionsManager = require('../../popup/options.js')
    optionsManager = new OptionsManager()

    // 初期化
    await new Promise(resolve => setTimeout(resolve, 100))

    // 1. ジェスチャー一覧が初期化エラーで表示されない
    const gesturesList = document.getElementById('allGesturesList')
    expect(gesturesList.innerHTML).toContain('初期化エラー')
    expect(gesturesList.innerHTML).not.toContain('gesture-status-toggle')

    // 2. デバッグ設定のUIは存在するが機能しない
    const debugCheckbox = document.getElementById('debugEnabled')
    expect(debugCheckbox).toBeTruthy()
    
    // 🚨 これらの問題がすべて同時に発生している状態
    const hasMultipleProblems = 
      gesturesList.innerHTML.includes('初期化エラー') && // ジェスチャー初期化失敗
      !gesturesList.innerHTML.includes('gesture-status-toggle') // UI要素が存在しない
    
    expect(hasMultipleProblems).toBe(true) // 複数の問題が同時発生
  })
})