/**
 * 実際のブラウザエラーを正確に再現するテスト
 * 🚨 これらのテストはFAILするはず（実際の問題を再現）
 */

// DOMテスト環境を設定
require('jest-environment-jsdom')

describe('実際のブラウザエラー再現テスト', () => {
  let consoleErrorSpy

  beforeEach(() => {
    // コンソールエラーをキャプチャ
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // 🔧 修正: 実際のHTML構造を完全再現（options.htmlと同じ構造）
    document.body.innerHTML = `
      <div class="container">
        <!-- 基本設定 -->
        <div class="section">
          <input type="checkbox" id="enabled" checked>
        </div>
        
        <!-- 軌跡カスタマイズ -->
        <div class="section">
          <input type="color" id="strokeColor" value="#2196F3">
          <input type="range" id="strokeWidth" min="1" max="10" value="3">
          <span id="strokeWidthValue">3px</span>
          <input type="range" id="gestureThreshold" min="5" max="50" value="15">
          <span id="gestureThresholdValue">15px</span>
          <canvas id="previewCanvas" width="200" height="100"></canvas>
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
        
        <!-- カスタムジェスチャー -->
        <div class="section">
          <div id="customGestureList" class="gesture-list-container"></div>
          <input type="text" id="gestureName" placeholder="例: カスタム戻る">
          <input type="text" id="gesturePatternDisplay" readonly>
          <button id="recordPatternBtn">記録開始</button>
          <button id="clearPatternBtn">クリア</button>
          <select id="gestureAction">
            <option value="back">戻る</option>
            <option value="forward">進む</option>
          </select>
          <button id="addGestureBtn">カスタムジェスチャーを追加</button>
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
            <div id="statsStatus" style="display: none;"></div>
            <div id="lastUpdated" style="display: none;"></div>
            <button id="refreshStats">統計を更新</button>
            <button id="resetLearning">学習データをリセット</button>
          </div>
        </div>
        
        <!-- 除外サイト -->
        <div class="section">
          <input type="text" id="newExcludeUrl" placeholder="除外するサイトのURLを入力">
          <button id="addExcludeBtn">追加</button>
          <div id="excludeList"></div>
        </div>
        
        <!-- デバッグ設定 -->
        <div class="section">
          <input type="checkbox" id="debugEnabled">
          <div id="debugOptions" style="display: none;">
            <select id="debugLogLevel">
              <option value="0">エラーのみ</option>
              <option value="1">警告以上</option>
              <option value="2">情報以上</option>
              <option value="3">全て（デバッグ含む）</option>
            </select>
            <input type="checkbox" id="debugShowStatus">
            <select id="debugStatusPosition">
              <option value="top-right">右上</option>
              <option value="top-left">左上</option>
              <option value="bottom-right">右下</option>
              <option value="bottom-left">左下</option>
            </select>
          </div>
        </div>
        
        <!-- ステータス表示 -->
        <div id="saveStatus" class="save-status" style="display: none;"></div>
      </div>
      
      <!-- 確認ダイアログ -->
      <div id="confirmDialog" class="confirm-dialog" style="display: none;">
        <div class="confirm-overlay"></div>
        <div class="confirm-content">
          <h3 class="confirm-title">確認</h3>
          <p id="confirmMessage" class="confirm-message"></p>
          <div class="confirm-buttons">
            <button id="confirmCancel">キャンセル</button>
            <button id="confirmOk">OK</button>
          </div>
        </div>
      </div>
    `

    // Chrome拡張機能APIのモック
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn().mockImplementation((keys, callback) => {
            // 🚨 重要: 実際のブラウザではasync処理で遅延が発生
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
            }, 10) // 実際のブラウザでは遅延がある
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

    // CustomGestureManagerをモック（実際のエラー状況を再現）
    global.CustomGestureManager = jest.fn().mockImplementation(() => ({
      getCustomGestures: jest.fn().mockReturnValue([]),
      loadCustomGestures: jest.fn().mockRejectedValue(new Error('Loading failed')) // 🚨 失敗をシミュレート
    }))

    // GestureLearningManagerをモック（実際のエラー状況を再現）  
    global.GestureLearningManager = jest.fn().mockImplementation(() => ({
      getLearningStats: jest.fn().mockRejectedValue(new Error('Stats loading failed')) // 🚨 失敗をシミュレート
    }))
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    delete global.chrome
    delete global.CustomGestureManager
    delete global.GestureLearningManager
  })

  // 🚨 BUG 1: DOM要素が見つからない（textContentセットエラー）
  test('ACTUAL BUG: renderLearningStats時にDOM要素がnullでエラー発生', async () => {
    // 実際のエラー条件を再現: DOM読み込み完了前にスクリプト実行
    const OptionsManager = require('../../popup/options.js')
    
    // DOMが完全にロードされる前に初期化（実際のブラウザでの状況）
    const optionsManager = new OptionsManager()
    
    // 非同期処理を待つ前にDOM操作が実行される状況を再現
    await new Promise(resolve => setTimeout(resolve, 5)) // 短い待機
    
    // 🚨 実際のエラー: Cannot set properties of null (setting 'textContent')
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Options初期化エラー')
    )
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot set properties of null')
    )
  })

  // 🚨 BUG 2: allGestures not available エラー
  test('ACTUAL BUG: filterAndRenderGesturesでallGesturesが未定義エラー', async () => {
    const OptionsManager = require('../../popup/options.js')
    const optionsManager = new OptionsManager()
    
    // ジェスチャーデータの読み込み失敗を待つ
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 🚨 実際のエラー: allGestures not available
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('allGestures not available')
    )
  })

  // 🚨 BUG 3: 初期化順序問題
  test('ACTUAL BUG: 初期化の依存関係順序エラー', async () => {
    // DOM要素を一時的に除去（実際のタイミング問題を再現）
    const originalGetElementById = document.getElementById
    document.getElementById = jest.fn().mockReturnValue(null) // 🚨 常にnullを返す
    
    const OptionsManager = require('../../popup/options.js')
    const optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // DOM要素が見つからない状況でのエラー
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('TypeError: Cannot set properties of null')
    )
    
    // 後でDOM要素を復元してもエラーが続く状況
    document.getElementById = originalGetElementById
    
    // 🚨 一度エラーが発生すると復旧しない問題
    expect(optionsManager.isInitialized).toBe(false) // 初期化が失敗したまま
  })

  // 🚨 BUG 4: ジェスチャー一覧の初期化エラー再現
  test('ACTUAL BUG: ジェスチャー一覧が初期化エラーを表示', async () => {
    const OptionsManager = require('../../popup/options.js')
    const optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const gesturesList = document.getElementById('allGesturesList')
    
    // 🚨 実際のブラウザで観察される状態
    expect(gesturesList.innerHTML).toContain('初期化エラー')
    expect(gesturesList.innerHTML).not.toContain('gesture-status-toggle')
  })

  // 🚨 BUG 5: デバッグ設定の同期問題再現
  test('ACTUAL BUG: デバッグ設定とcontent script表示が同期しない', async () => {
    // DebugLoggerがまだ初期化されていない状況（実際のブラウザ）
    const OptionsManager = require('../../popup/options.js')
    const optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // popupでデバッグを有効にする
    const debugCheckbox = document.getElementById('debugEnabled')
    debugCheckbox.checked = true
    const event = document.createEvent('Event')
    event.initEvent('change', true, true)
    debugCheckbox.dispatchEvent(event)
    
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // 🚨 実際の問題: 同期されていない
    // popup側は有効だが、content script側（DebugLogger）は反応しない
    expect(debugCheckbox.checked).toBe(true) // popup側は有効
    // content script側が存在しないか、同期されていない状況
    expect(global.DebugLogger).toBeUndefined() // content scriptが利用できない
  })

  // 🚨 統合テスト: 複数エラー同時発生
  test('ACTUAL BUG: 複数の初期化エラーが同時発生', async () => {
    const OptionsManager = require('../../popup/options.js')
    const optionsManager = new OptionsManager()
    
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 実際のブラウザコンソールで観察される複数エラー
    const errorMessages = consoleErrorSpy.mock.calls.map(call => call[0])
    
    // 🚨 複数のエラーが同時に発生している
    const hasLearningStatsError = errorMessages.some(msg => 
      typeof msg === 'string' && msg.includes('Cannot set properties of null'))
    const hasGesturesError = errorMessages.some(msg => 
      typeof msg === 'string' && msg.includes('allGestures not available'))
    const hasInitError = errorMessages.some(msg => 
      typeof msg === 'string' && msg.includes('初期化エラー'))
    
    expect(hasLearningStatsError || hasGesturesError || hasInitError).toBe(true)
  })
})