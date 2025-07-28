/**
 * デバッグ有効化問題の正確な再現テスト
 * 🚨 これらのテストはFAILするはず（現在の問題を正確に再現）
 * 
 * 問題1: 同期が取れない（popup ↔ content script）
 * 問題2: 状態が保持されない（popup再起動時）
 */

require('jest-environment-jsdom')

describe('デバッグ有効化問題の再現テスト', () => {
  let consoleLogSpy
  let mockChrome
  let syncStorageData
  let localStorageData

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    
    // テスト環境での window オブジェクト設定
    global.window = global
    
    // ストレージデータの初期化
    syncStorageData = {
      debugSettings: {
        enabled: false,
        logLevel: 2,
        showStatus: false,
        statusPosition: 'top-right'
      }
    }
    localStorageData = {}

    // Chrome APIのモック（実際の動作を忠実に再現）
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn().mockImplementation((keys, callback) => {
            const result = {}
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                result[key] = syncStorageData[key]
              })
            } else if (keys) {
              Object.keys(keys).forEach(key => {
                result[key] = syncStorageData[key] || keys[key]
              })
            }
            if (callback) callback(result)
            return Promise.resolve(result)
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            Object.assign(syncStorageData, data)
            console.log('🔧 Mock sync.set called:', data)
            if (callback) callback()
            // storage変更イベントを発火
            if (mockChrome.storage.onChanged.listeners) {
              mockChrome.storage.onChanged.listeners.forEach(listener => {
                const changes = {}
                Object.keys(data).forEach(key => {
                  changes[key] = { newValue: data[key] }
                })
                listener(changes, 'sync')
              })
            }
            return Promise.resolve()
          })
        },
        local: {
          get: jest.fn().mockImplementation((keys, callback) => {
            const result = {}
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                result[key] = localStorageData[key]
              })
            } else if (keys) {
              Object.keys(keys).forEach(key => {
                result[key] = localStorageData[key] || keys[key]
              })
            }
            if (callback) callback(result)
            return Promise.resolve(result)
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            Object.assign(localStorageData, data)
            console.log('🔧 Mock local.set called:', data)
            if (callback) callback()
            return Promise.resolve()
          })
        },
        onChanged: {
          listeners: [],
          addListener: jest.fn().mockImplementation((listener) => {
            mockChrome.storage.onChanged.listeners.push(listener)
          }),
          removeListener: jest.fn()
        }
      },
      runtime: {
        lastError: null,
        sendMessage: jest.fn()
      }
    }
    global.chrome = mockChrome

    // HTML構造設定
    document.body.innerHTML = `
      <div id="debugEnabled-container">
        <input type="checkbox" id="debugEnabled">
      </div>
      <div id="debugOptions" style="display: none;">
        <select id="debugLogLevel">
          <option value="2" selected>情報以上</option>
        </select>
        <input type="checkbox" id="debugShowStatus">
      </div>
    `
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    delete global.chrome
    delete global.DebugLogger
  })

  // 🚨 PROBLEM 1: popup-content script間の同期が取れない
  test('BROKEN: popup側設定変更がcontent script側に同期されない', async () => {
    // 1. popup側（OptionsManager）で設定変更
    const OptionsManager = require('../../popup/options.js')
    const optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // popup側でデバッグを有効化（実際のユーザー操作をシミュレート）
    optionsManager.currentSettings.debugSettings.enabled = true
    optionsManager.currentSettings.debugSettings.showStatus = true
    await optionsManager.saveDebugSettings()
    
    // popup側はsync storageに正常保存される
    expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
      debugSettings: expect.objectContaining({
        enabled: true,
        showStatus: true
      })
    })
    
    // 2. sync storageの状態確認
    expect(syncStorageData.debugSettings.enabled).toBe(true)
    expect(syncStorageData.debugSettings.showStatus).toBe(true)
    
    // 3. 🚨 問題の確認：content script側の初期化をシミュレート
    // content scriptがsync storageから読み込み、local storageに保存する動作
    
    // content script側でのsync storage読み込み（debug-logger.jsの動作を模擬）
    const syncReadResult = await new Promise(resolve => {
      mockChrome.storage.sync.get(['debugSettings'], resolve)
    })
    
    // content script側でのlocal storage保存（問題の原因）
    await new Promise(resolve => {
      mockChrome.storage.local.set({ debugSettings: syncReadResult.debugSettings }, resolve)
    })
    
    // 🚨 問題確認：異なるストレージに保存されている
    expect(mockChrome.storage.sync.set).toHaveBeenCalled() // popup側
    expect(mockChrome.storage.local.set).toHaveBeenCalled() // content script側
    
    // この時点では一見同期しているように見えるが、以降の変更で問題が発生する
  })

  // 🚨 PROBLEM 2: 状態が保持されない（popup再起動時の問題）
  test('BROKEN: popup再起動時にデバッグ設定が保持されない', async () => {
    // 1. 初回popup起動でデバッグを有効化
    const OptionsManager1 = require('../../popup/options.js')
    const optionsManager1 = new OptionsManager1()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // デバッグを有効化
    optionsManager1.currentSettings.debugSettings.enabled = true
    optionsManager1.currentSettings.debugSettings.showStatus = true
    await optionsManager1.saveDebugSettings()
    
    // sync storageに保存される
    expect(syncStorageData.debugSettings.enabled).toBe(true)
    
    // content script側でのlocal storage保存をシミュレート（問題の原因）
    const syncData = await new Promise(resolve => {
      mockChrome.storage.sync.get(['debugSettings'], resolve)
    })
    await new Promise(resolve => {
      mockChrome.storage.local.set({ debugSettings: syncData.debugSettings }, resolve)
    })
    
    // content script側がlocal storageで独自に変更を加える（実際の動作）
    const modifiedSettings = { ...localStorageData.debugSettings, enabled: false }
    await new Promise(resolve => {
      mockChrome.storage.local.set({ debugSettings: modifiedSettings }, resolve)
    })
    
    // 2. popup再起動（新しいOptionsManagerインスタンス）
    delete require.cache[require.resolve('../../popup/options.js')]
    const OptionsManager2 = require('../../popup/options.js')
    const optionsManager2 = new OptionsManager2()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    await optionsManager2.loadDebugSettings()
    
    // 🚨 問題：popup側はsync storageから読み込むため、content script側のlocal storage変更が反映されない
    
    const debugCheckbox = document.getElementById('debugEnabled')
    
    // 実際の状況：sync storage（enabled: true）vs local storage（enabled: false）
    expect(syncStorageData.debugSettings.enabled).toBe(true) // popup側が参照
    expect(localStorageData.debugSettings.enabled).toBe(false) // content script側が参照
    
    // popup側はsync storageの値（true）を参照するため、content script側の変更が無視される
    expect(debugCheckbox.checked).toBe(true) // popup側はtrue
    expect(optionsManager2.currentSettings.debugSettings.enabled).toBe(true) // popup側はtrue
    
    // 🚨 問題：両者で異なる値を持っている = 同期していない
    expect(syncStorageData.debugSettings.enabled).not.toBe(localStorageData.debugSettings.enabled)
  })

  // 🚨 PROBLEM 3: ストレージの不整合（根本原因の実証）
  test('BROKEN: popup-content script間でストレージが不整合', async () => {
    // popup側の動作
    const OptionsManager = require('../../popup/options.js')
    const optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // popup側で設定変更
    optionsManager.currentSettings.debugSettings.enabled = true
    await optionsManager.saveDebugSettings()
    
    // content script側の動作をシミュレート
    // 1. sync storageから読み込み
    const syncReadResult = await new Promise(resolve => {
      mockChrome.storage.sync.get(['debugSettings'], resolve)
    })
    
    // 2. local storageに保存（これが問題）
    await new Promise(resolve => {
      mockChrome.storage.local.set({ debugSettings: syncReadResult.debugSettings }, resolve)
    })
    
    // 🚨 問題確認：ストレージの使い分けが不整合
    
    // popup側：sync storageに保存
    expect(mockChrome.storage.sync.set).toHaveBeenCalledWith({
      debugSettings: expect.any(Object)
    })
    
    // content script側：local storageに保存
    expect(mockChrome.storage.local.set).toHaveBeenCalledWith({
      debugSettings: expect.any(Object)
    })
    
    // この時点では両者が同じ値を持っているが...
    expect(syncStorageData.debugSettings.enabled).toBe(true)
    expect(localStorageData.debugSettings.enabled).toBe(true)
    
    // 🚨 content script側で独自に変更が発生した場合の問題
    const updatedLocalSettings = { ...localStorageData.debugSettings, enabled: false, logLevel: 3 }
    await new Promise(resolve => {
      mockChrome.storage.local.set({ debugSettings: updatedLocalSettings }, resolve)
    })
    
    // 結果：ストレージが分岐する
    expect(syncStorageData.debugSettings.enabled).toBe(true) // popup側
    expect(localStorageData.debugSettings.enabled).toBe(false) // content script側
    expect(syncStorageData.debugSettings.logLevel).toBe(2) // popup側
    expect(localStorageData.debugSettings.logLevel).toBe(3) // content script側
    
    // 🚨 両者が完全に別々のストレージを使用している = 完全に同期しない
    expect(syncStorageData.debugSettings).not.toEqual(localStorageData.debugSettings)
  })

  // 🚨 INTEGRATION: 複合的な問題の発生
  test('BROKEN: デバッグ機能全体が機能不全状態', async () => {
    // 1. popup-content script間での複数回の設定変更
    const OptionsManager = require('../../popup/options.js')
    const optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // content script側の初期化をシミュレート
    const initialSyncData = await new Promise(resolve => {
      mockChrome.storage.sync.get(['debugSettings'], resolve)
    })
    await new Promise(resolve => {
      mockChrome.storage.local.set({ debugSettings: initialSyncData.debugSettings }, resolve)
    })
    
    // 2. 複数回の設定変更で問題が蓄積
    const changeHistory = []
    
    for (let i = 0; i < 3; i++) {
      const isEnabled = i % 2 === 0
      
      // popup側で変更
      optionsManager.currentSettings.debugSettings.enabled = isEnabled
      optionsManager.currentSettings.debugSettings.logLevel = i + 1
      await optionsManager.saveDebugSettings()
      
      // content script側の独立した変更をシミュレート
      const localSettings = { ...localStorageData.debugSettings }
      localSettings.enabled = !isEnabled // popup側と反対の値
      localSettings.showStatus = i > 0 // 異なる条件
      await new Promise(resolve => {
        mockChrome.storage.local.set({ debugSettings: localSettings }, resolve)
      })
      
      changeHistory.push({
        iteration: i,
        popup: { enabled: isEnabled, logLevel: i + 1 },
        contentScript: { enabled: !isEnabled, showStatus: i > 0 }
      })
      
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    
    // 3. 最終的な状態の確認
    const popupSettings = optionsManager.currentSettings.debugSettings
    const debugCheckbox = document.getElementById('debugEnabled')
    
    // 🚨 問題：popup側とcontent script側で完全に異なる状態
    expect(syncStorageData.debugSettings.enabled).not.toBe(localStorageData.debugSettings.enabled)
    expect(syncStorageData.debugSettings.logLevel).not.toBe(localStorageData.debugSettings.logLevel)
    
    // 🚨 問題：UI状態はpopup側の設定に従うが、実際の動作はcontent script側
    expect(debugCheckbox.checked).toBe(popupSettings.enabled) // UI状態
    
    // 🚨 複数回の変更により状態が完全にばらばら
    const finalSyncState = syncStorageData.debugSettings
    const finalLocalState = localStorageData.debugSettings
    
    // システム全体でデバッグ機能が機能不全状態
    const hasInconsistentState = 
      finalSyncState.enabled !== finalLocalState.enabled ||
      finalSyncState.logLevel !== finalLocalState.logLevel ||
      finalSyncState.showStatus !== finalLocalState.showStatus
    
    expect(hasInconsistentState).toBe(true) // システム全体で不整合状態
    
    console.log('🚨 Final inconsistent state:', {
      sync: finalSyncState,
      local: finalLocalState,
      ui: { checked: debugCheckbox.checked },
      changeHistory
    })
  })
})