/**
 * 実際に動作しない機能を再現する落ちるテスト
 * 🚨 これらのテストはFAILするはず（実際の問題を再現）
 */

require('jest-environment-jsdom')

describe('実際に動作しない機能の再現テスト', () => {
  let consoleErrorSpy
  let consoleWarnSpy
  let optionsManager

  beforeEach(() => {
    // コンソールログをキャプチャ
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})
    
    // 完全なHTML構造を再現（options.htmlと同じ）
    document.body.innerHTML = `
      <div class="container">
        <!-- 基本設定 -->
        <div class="section">
          <input type="checkbox" id="enabled" checked>
        </div>
        
        <!-- ジェスチャー一覧セクション -->
        <div class="section">
          <div id="allGesturesList" class="all-gestures-container"></div>
          <input type="text" id="gestureSearch" placeholder="検索...">
          <select id="gestureFilter">
            <option value="all">すべて</option>
            <option value="default">標準ジェスチャー</option>
            <option value="custom">カスタムジェスチャー</option>
          </select>
          <button id="toggleViewMode">表示切替</button>
        </div>
        
        <!-- 学習統計セクション -->
        <div class="section">
          <div id="learningStats" class="learning-stats-container">
            <div class="stats-overview">
              <div class="stat-item">
                <div id="learnedGesturesCount">-</div>
              </div>
              <div class="stat-item">
                <div id="avgPatternLength">-</div>
              </div>
              <div class="stat-item">
                <div id="totalUsage">-</div>
              </div>
            </div>
            <div id="preferredDirections">-</div>
            <div id="gestureStatsList" class="stats-list"></div>
            <button id="refreshStats">統計を更新</button>
            <button id="resetLearning">学習データをリセット</button>
          </div>
        </div>
        
        <!-- デバッグ設定 -->
        <div class="section">
          <input type="checkbox" id="debugEnabled">
          <div id="debugOptions" style="display: none;">
            <select id="debugLogLevel">
              <option value="0">エラーのみ</option>
              <option value="1">警告以上</option>
              <option value="2" selected>情報以上</option>
              <option value="3">全て（デバッグ含む）</option>
            </select>
            <input type="checkbox" id="debugShowStatus">
            <select id="debugStatusPosition">
              <option value="top-right" selected>右上</option>
              <option value="top-left">左上</option>
              <option value="bottom-right">右下</option>
              <option value="bottom-left">左下</option>
            </select>
          </div>
        </div>
        
        <!-- ステータス表示 -->
        <div id="saveStatus" class="save-status" style="display: none;"></div>
      </div>
    `

    // Chrome拡張機能APIのモック
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn().mockImplementation((keys, callback) => {
            setTimeout(() => {
              const result = {
                enabled: true,
                strokeColor: '#2196F3',
                strokeWidth: 3,
                gestureThreshold: 15,
                excludeList: [],
                defaultGestureStates: {
                  left: true, right: true, up: true, down: true,
                  downright: true, upright: true, rightdown: true, updown: true,
                  super_refresh: true, prev_tab: true, next_tab: true
                },
                debugSettings: {
                  enabled: true, logLevel: 2, showStatus: true, statusPosition: 'top-right'
                }
              }
              if (callback) callback(result)
            }, 10)
            return Promise.resolve({})
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            setTimeout(() => {
              if (callback) callback()
            }, 5)
            return Promise.resolve()
          })
        },
        local: {
          get: jest.fn().mockImplementation((keys, callback) => {
            setTimeout(() => {
              if (callback) callback({})
            }, 5)
            return Promise.resolve({})
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            setTimeout(() => {
              if (callback) callback()
            }, 5)
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

    // マネージャーのモック（正常動作）
    global.CustomGestureManager = jest.fn().mockImplementation(() => ({
      getCustomGestures: jest.fn().mockReturnValue([]),
      loadCustomGestures: jest.fn().mockResolvedValue()
    }))

    global.GestureLearningManager = jest.fn().mockImplementation(() => ({
      getLearningStats: jest.fn().mockResolvedValue({
        totalGestures: 0,
        userProfile: { averagePatternLength: 0, preferredDirections: [] },
        gestureStats: []
      })
    }))
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    delete global.chrome
    delete global.CustomGestureManager
    delete global.GestureLearningManager
  })

  // 🚨 BROKEN FEATURE 1: デバッグ有効化の同期・状態保持問題
  test('BROKEN: デバッグ有効化が同期せず状態も保持されない', async () => {
    const OptionsManager = require('../../popup/options.js')
    optionsManager = new OptionsManager()
    
    // 初期化完了を待つ
    await new Promise(resolve => setTimeout(resolve, 200))
    
    const debugCheckbox = document.getElementById('debugEnabled')
    const debugOptions = document.getElementById('debugOptions')
    
    // 🚨 問題1: 設定画面を再起動するとOFFになる（状態が保持されない）
    // 初期状態でdebugEnabledがtrueのはずだが、チェックボックスはOFF
    expect(debugCheckbox.checked).toBe(true) // 期待: true、実際: false
    
    // 🚨 問題2: チェックボックスを変更しても実際に同期されない
    debugCheckbox.checked = true
    const event = document.createEvent('Event')
    event.initEvent('change', true, true)
    debugCheckbox.dispatchEvent(event)
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // デバッグオプションが表示されるはず
    expect(debugOptions.style.display).toBe('block') // 期待: 'block'、実際: 'none'
    
    // ストレージに保存されるはず
    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        debugSettings: expect.objectContaining({
          enabled: true
        })
      })
    )
  })

  // 🚨 BROKEN FEATURE 2: トグルボタンが反応しない問題
  test('BROKEN: ジェスチャートグルボタンが反応しない（ON/OFF切り替えできない）', async () => {
    const OptionsManager = require('../../popup/options.js')
    optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const gesturesList = document.getElementById('allGesturesList')
    
    // ジェスチャー一覧にトグルボタンが表示されているはず
    expect(gesturesList.innerHTML).toContain('gesture-status-toggle')
    
    // トグルボタンを取得
    const toggleButton = gesturesList.querySelector('.gesture-status-toggle[data-gesture-id="left"]')
    expect(toggleButton).toBeTruthy()
    
    // 初期状態は「enabled」クラスが付いている（ON状態）
    expect(toggleButton.classList.contains('enabled')).toBe(true)
    expect(toggleButton.textContent).toContain('ON')
    
    // 🚨 問題: ボタンをクリックしてもOFFにならない
    toggleButton.click()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // ONからOFFに変わるはず
    expect(toggleButton.classList.contains('enabled')).toBe(false) // 期待: false、実際: true
    expect(toggleButton.textContent).toContain('OFF') // 期待: 'OFF'、実際: 'ON'
    
    // 設定も保存されているはず
    expect(global.chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultGestureStates: expect.objectContaining({
          left: false
        })
      })
    )
  })

  // 🚨 BROKEN FEATURE 3: 表示切替機能が動作しない問題
  test('BROKEN: 表示切替でリスト/グリッド/コンパクト表示に変化がない', async () => {
    const OptionsManager = require('../../popup/options.js')
    optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 300))
    
    const toggleButton = document.getElementById('toggleViewMode')
    const gesturesList = document.getElementById('allGesturesList')
    
    expect(toggleButton).toBeTruthy()
    
    // 初期状態はリスト表示
    expect(optionsManager.currentViewMode).toBe('list')
    expect(toggleButton.textContent).toBe('リスト')
    
    // 🚨 問題1: ボタンをクリックしても表示が変わらない
    toggleButton.click()
    
    // コンパクト表示に変わるはず
    expect(optionsManager.currentViewMode).toBe('compact') // 期待: 'compact'、実際: 'list'
    expect(toggleButton.textContent).toBe('コンパクト') // 期待: 'コンパクト'、実際: 'リスト'
    
    // 🚨 問題2: CSS クラスが適用されない
    expect(gesturesList.classList.contains('compact-view')).toBe(true) // 期待: true、実際: false
    
    // さらにクリックしてグリッド表示
    toggleButton.click()
    
    expect(optionsManager.currentViewMode).toBe('grid') // 期待: 'grid'、実際: 'list'
    expect(toggleButton.textContent).toBe('グリッド') // 期待: 'グリッド'、実際: 'リスト'
    expect(gesturesList.classList.contains('grid-view')).toBe(true) // 期待: true、実際: false
  })

  // 🚨 INTEGRATION: 複数の機能が同時に動作しない
  test('INTEGRATION: 複数の機能が同時に動作せず、UIの反応が全くない', async () => {
    const OptionsManager = require('../../popup/options.js')
    optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // 複数の操作を実行
    const debugCheckbox = document.getElementById('debugEnabled')
    const toggleViewButton = document.getElementById('toggleViewMode')
    const gesturesList = document.getElementById('allGesturesList')
    
    // 1. デバッグ設定変更
    debugCheckbox.checked = true
    const event = document.createEvent('Event')
    event.initEvent('change', true, true)
    debugCheckbox.dispatchEvent(event)
    
    // 2. 表示切替
    toggleViewButton.click()
    
    // 3. ジェスチャー無効化
    const toggleButton = gesturesList.querySelector('.gesture-status-toggle')
    if (toggleButton) {
      toggleButton.click()
    }
    
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // 🚨 問題: どの操作も実際のUI変更につながらない
    const debugOptions = document.getElementById('debugOptions')
    
    // どれか一つでも動作していれば成功とみなす
    const debugWorking = debugOptions.style.display === 'block'
    const viewToggleWorking = optionsManager.currentViewMode !== 'list'
    const gestureToggleWorking = toggleButton && !toggleButton.classList.contains('enabled')
    
    // 全部動いていない状態
    expect(debugWorking || viewToggleWorking || gestureToggleWorking).toBe(true)
    // 期待: true（少なくとも一つは動く）、実際: false（何も動かない）
  })
})