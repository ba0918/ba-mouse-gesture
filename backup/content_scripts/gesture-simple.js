// 設定対応マウスジェスチャー検出 - Clean Architecture準拠版
DebugLogger.info('Mouse Gesture: Clean Architecture version loaded')

// 🎯 Clean Architecture実装の初期化（必須）
if (!window.SettingsUseCase) {
  console.error('❌ FATAL: SettingsUseCase not loaded in content script')
  throw new Error('SettingsUseCase is required for Clean Architecture compliance')
}

let settingsUseCase
try {
  settingsUseCase = new window.SettingsUseCase()
  console.log('✅ SettingsUseCase initialized in content script')
} catch (error) {
  console.error('❌ FATAL: Failed to initialize SettingsUseCase:', error)
  throw error
}

// カスタムジェスチャー機能をインポート
const customGestureManager = new CustomGestureManager()
const customPatternMatcher = new CustomPatternMatcher(customGestureManager)

// 設定の初期化
let settings = {
  enabled: true,
  strokeColor: '#2563eb',
  strokeWidth: 3,
  excludeList: [], // 🎯 修正: excludedSites → excludeList (popup側と統一)
  gestureThreshold: 15, // ジェスチャー検出の最小距離（px）
  defaultGestureStates: {
    // 基本ジェスチャー
    left: true,
    right: true,
    up: true,
    down: true,
    // 複合ジェスチャー
    downright: true,
    upright: true,
    rightdown: true,
    updown: true,
    // Phase 10 新機能
    super_refresh: true,
    prev_tab: true,
    next_tab: true
  }
}

// 現在のページが除外対象かチェック
function isExcludedSite() {
  const currentUrl = window.location.href
  const currentHost = window.location.hostname
    
  return settings.excludeList.some(pattern => { // 🎯 修正: excludedSites → excludeList
    // 完全URL マッチ
    if (pattern.includes('://')) {
      return currentUrl.includes(pattern) || currentUrl.match(pattern.replace(/\*/g, '.*'))
    }
    // ホスト名マッチ
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'))
      return regex.test(currentHost)
    }
    // 部分マッチ
    return currentHost.includes(pattern)
  })
}

// ジェスチャーが有効かチェック
function isGestureEnabled(gestureId) {
  // カスタムジェスチャーは有効/無効フラグで管理されているので個別にチェック
  // デフォルトジェスチャーは設定から状態を確認
  if (!settings.defaultGestureStates) {
    DebugLogger.debug('defaultGestureStates not found, assuming enabled')
    return true
  }
  
  const enabled = settings.defaultGestureStates[gestureId]
  DebugLogger.debug(`Gesture ${gestureId} enabled:`, enabled)
  return enabled !== false // 未設定の場合はデフォルトで有効
}

// 設定を読み込む
async function loadSettings() {
  try {
    // 🎯 Clean Architecture準拠: UseCase経由でのみアクセス
    const loadedSettings = await settingsUseCase.getSettings()
    settings = { ...settings, ...loadedSettings }
    DebugLogger.info('Settings loaded:', settings)
    
    // カスタムジェスチャー設定も読み込み
    await customGestureManager.loadCustomGestures()
    DebugLogger.info('Custom gestures loaded:', customGestureManager.getCustomGestures().length + ' gestures')
        
    // 除外サイトチェック
    if (isExcludedSite()) {
      DebugLogger.warn('Site excluded, disabling mouse gestures')
      DebugLogger.showStatus('マウスジェスチャーは無効です（除外サイト）', DebugLogger.LOG_LEVELS.WARN)
      return false
    }
        
    // 機能が無効の場合
    if (!settings.enabled) {
      DebugLogger.warn('Mouse gestures disabled in settings')
      DebugLogger.showStatus('マウスジェスチャーは無効です', DebugLogger.LOG_LEVELS.WARN)
      return false
    }
        
    return true
  } catch (error) {
    DebugLogger.error('Failed to load settings:', error)
    return true // デフォルトで有効
  }
}

// 設定変更の監視 - Clean Architecture準拠
// 🚫 直接chrome.storage.onChangedは使わず、UseCase経由で設定を再取得
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.settings) {
    DebugLogger.info('Settings changed detected, refreshing via UseCase')
    
    // UseCase経由で最新設定を取得（Clean Architecture準拠）
    loadSettings().then(() => {
      // 除外サイト/無効化チェック
      if (!settings.enabled || isExcludedSite()) {
        removeTrailCanvas()
        DebugLogger.showStatus('マウスジェスチャーが無効になりました')
      } else {
        DebugLogger.showStatus('マウスジェスチャーが有効になりました')
      }
    }).catch(error => {
      DebugLogger.error('Failed to reload settings:', error)
    })
        
    // 軌跡設定が変更された場合
    if (changes.strokeColor || changes.strokeWidth) {
      updateTrailStyle()
    }
  }
})

// 拡張機能が正しく読み込まれたかの確認
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  DebugLogger.info('Chrome extension API available')
  DebugLogger.info('Extension ID:', chrome.runtime.id)
} else {
  console.error('❌ Chrome extension API not available')
}

// ページ読み込み完了の確認
document.addEventListener('DOMContentLoaded', function () {
  DebugLogger.info('DOM loaded')
  DebugLogger.showStatus('Extension loaded successfully')
})

// ステータス表示機能はDebugLogger.showStatusに移行済み

// マウスジェスチャーの状態
let isRightMouseDown = false
let startPos = null
let trail = []
// let gestureExecuted = false // 将来の機能拡張用
let preventContextMenu = false

// 軌跡表示用のCanvas
let trailCanvas = null
let trailContext = null

// 軌跡Canvas初期化
function initTrailCanvas() {
  if (trailCanvas) return
    
  trailCanvas = document.createElement('canvas')
  trailCanvas.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        pointer-events: none;
        z-index: 999998;
        background: transparent;
    `
    
  trailCanvas.width = window.innerWidth
  trailCanvas.height = window.innerHeight
    
  trailContext = trailCanvas.getContext('2d')
  updateTrailStyle()
  trailContext.lineCap = 'round'
  trailContext.lineJoin = 'round'
    
  document.body.appendChild(trailCanvas)
  DebugLogger.debug('Trail canvas initialized')
}

// 軌跡スタイルの更新
function updateTrailStyle() {
  if (trailContext) {
    trailContext.strokeStyle = settings.strokeColor
    trailContext.lineWidth = settings.strokeWidth
    DebugLogger.debug('Trail style updated:', settings.strokeColor, settings.strokeWidth + 'px')
  }
}

// 軌跡描画
function drawTrail() {
  if (!trailContext || trail.length < 2) return
    
  trailContext.clearRect(0, 0, trailCanvas.width, trailCanvas.height)
    
  trailContext.beginPath()
  trailContext.moveTo(trail[0].x, trail[0].y)
    
  for (let i = 1; i < trail.length; i++) {
    trailContext.lineTo(trail[i].x, trail[i].y)
  }
    
  trailContext.stroke()
}

// 軌跡Canvas削除
function removeTrailCanvas() {
  if (trailCanvas && trailCanvas.parentNode) {
    trailCanvas.parentNode.removeChild(trailCanvas)
    trailCanvas = null
    trailContext = null
    DebugLogger.debug('Trail canvas removed')
  }
}

// 単純ジェスチャー判定（1方向のみかチェック）
function isSimpleGesturePath() {
  if (trail.length < 3) return true // 軌跡が短すぎる場合は単純とみなす
  
  const directions = []
  
  // 隣接する点を比較して方向を検出
  for (let i = 0; i < trail.length - 1; i++) {
    const start = trail[i]
    const end = trail[i + 1]
    
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    if (distance > 5) { // 十分な移動距離がある場合のみ
      let direction = ''
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
      } else {
        direction = deltaY > 0 ? 'DOWN' : 'UP'
      }
      directions.push(direction)
    }
  }
  
  // 連続する同じ方向を統合
  const cleanDirections = []
  let lastDirection = null
  for (const dir of directions) {
    if (dir !== lastDirection) {
      cleanDirections.push(dir)
      lastDirection = dir
    }
  }
  
  const uniqueDirections = [...new Set(cleanDirections)]
  
  DebugLogger.debug('Simple gesture check - directions:', directions, 'clean:', cleanDirections, 'unique:', uniqueDirections)
  
  // 単一方向のみの場合は単純ジェスチャー
  return uniqueDirections.length <= 1
}

// 複合ジェスチャーの分析
function analyzeComplexGesture() {
  if (trail.length < 6) return null // 軌跡が短すぎる場合は分析しない（さらに感度を上げた）
    
  const directions = []
  const segmentLength = Math.max(3, Math.floor(trail.length / 6)) // セグメントサイズ（より細かく）
    
  // 軌跡をセグメントに分割して方向を分析
  for (let i = 0; i < trail.length - segmentLength; i += segmentLength) {
    const start = trail[i]
    const end = trail[Math.min(i + segmentLength, trail.length - 1)]
        
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    if (distance > 10) { // 十分な移動距離がある場合のみ（さらに感度を上げた）
      let direction = ''
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
      } else {
        direction = deltaY > 0 ? 'DOWN' : 'UP'
      }
      directions.push(direction)
    }
  }
    
  // 連続する同じ方向を統合
  const cleanDirections = []
  let lastDirection = null
    
  for (const dir of directions) {
    if (dir !== lastDirection) {
      cleanDirections.push(dir)
      lastDirection = dir
    }
  }
    
  DebugLogger.debug('Analyzed directions:', cleanDirections)
  DebugLogger.debug('Pattern string:', cleanDirections.join(''))
    
  // 最初にカスタムジェスチャーをチェック（優先度高）
  if (cleanDirections.length >= 1) {
    try {
      const customResult = customPatternMatcher.matchPattern(cleanDirections)
      if (customResult.matched) {
        DebugLogger.info('Custom gesture matched:', customResult.gestureName, 'confidence:', customResult.confidence)
        return {
          type: 'custom',
          action: customResult.action,
          name: customResult.gestureName,
          confidence: customResult.confidence
        }
      }
    } catch (error) {
      console.warn('⚠️ Custom pattern matching failed:', error)
    }
  }
    
  // デフォルトの複合ジェスチャーのパターンマッチング
  if (cleanDirections.length >= 2) {
    const pattern = cleanDirections.join('')
    DebugLogger.debug('Checking default pattern:', pattern)
        
    // 対応する複合ジェスチャーをチェック
    const complexPatterns = {
      'DOWNRIGHT': 'downright',    // ↓→: タブを閉じる
      'UPRIGHT': 'upright',        // ↑→: 新しいタブ
      'RIGHTDOWN': 'rightdown',    // →↓: タブ複製
      'UPDOWN': 'updown',          // ↑↓: ページ更新
      'UPDOWNUP': 'super_refresh', // ↑↓↑: スーパーリロード（キャッシュクリア）
      'LEFTRIGHT': 'prev_tab',     // ←→: 前のタブ
      'RIGHTLEFT': 'next_tab'      // →←: 次のタブ
    }
        
    const defaultGesture = complexPatterns[pattern]
    if (defaultGesture) {
      DebugLogger.info('Default pattern matched:', pattern, '=>', defaultGesture)
      return {
        type: 'default',
        action: defaultGesture
      }
    } else {
      DebugLogger.debug('No default pattern match for:', pattern)
      
      // 学習機能: 認識失敗を記録
      try {
        customPatternMatcher.recordFailedMatch(cleanDirections)
      } catch (error) {
        console.warn('⚠️ Failed to record learning data:', error)
      }
    }
  }
    
  return null
}

// 単純ジェスチャーの処理
function handleSimpleGesture(direction, distance) {
  // 最初にカスタムジェスチャーをチェック
  try {
    const customResult = customPatternMatcher.matchPattern([direction])
    if (customResult.matched) {
      DebugLogger.info('Custom simple gesture matched:', customResult.gestureName)
      DebugLogger.showStatus(`Custom: ${customResult.gestureName} (${distance.toFixed(0)}px)`)
      
      // カスタムアクションを送信
      sendGestureMessage({
        type: 'customGesture',
        action: customResult.action,
        name: customResult.gestureName,
        direction: direction,
        distance: distance,
        confidence: customResult.confidence
      })
      return
    }
  } catch (error) {
    console.warn('⚠️ Custom simple pattern matching failed:', error)
  }

  // カスタムジェスチャーにマッチしなかった場合、軌跡が真に単純かどうかを再確認
  if (!isSimpleGesturePath()) {
    // 複合的な軌跡の場合は未登録ジェスチャーとして何も実行しない
    DebugLogger.info('Complex pattern detected in simple gesture handler - no action taken')
    DebugLogger.showStatus('未登録のジェスチャーパターンです', DebugLogger.LOG_LEVELS.WARN)
    
    // カスタムジェスチャーにマッチしなかった場合の学習記録
    try {
      customPatternMatcher.recordFailedMatch([direction])
    } catch (error) {
      console.warn('⚠️ Failed to record simple gesture learning data:', error)
    }
    return
  }

  // カスタムジェスチャーにマッチしなかった場合の学習記録
  try {
    customPatternMatcher.recordFailedMatch([direction])
  } catch (error) {
    console.warn('⚠️ Failed to record simple gesture learning data:', error)
  }

  // デフォルトの単純ジェスチャー処理
  // ジェスチャー状態をチェック
  const gestureId = direction.toLowerCase()
  if (!isGestureEnabled(gestureId)) {
    DebugLogger.info(`Gesture ${direction} is disabled`)
    DebugLogger.showStatus(`ジェスチャー ${direction} は無効です`, DebugLogger.LOG_LEVELS.WARN)
    return
  }
  
  DebugLogger.showStatus(`Gesture: ${direction} (${distance.toFixed(0)}px)`)
    
  // バックグラウンドスクリプトに送信
  sendGestureMessage({
    type: 'simpleGesture',
    direction: direction,
    distance: distance
  })
}

// ジェスチャーメッセージ送信の共通関数
function sendGestureMessage(message) {
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage(message, function (response) {
      if (chrome.runtime.lastError) {
        console.error('❌ Message send failed:', chrome.runtime.lastError.message)
        DebugLogger.showStatus('❌ Message failed: ' + chrome.runtime.lastError.message, DebugLogger.LOG_LEVELS.ERROR)
      } else {
        DebugLogger.debug('Message sent successfully:', response)
        DebugLogger.showStatus('✅ Action: ' + (response?.action || 'Success'))
      }
    })
  } else {
    console.error('❌ Chrome runtime not available')
    DebugLogger.showStatus('❌ Chrome runtime not available', DebugLogger.LOG_LEVELS.ERROR)
  }
}

// 複合ジェスチャーの処理
function handleComplexGesture(gestureResult, distance) {
  DebugLogger.info('Handling complex gesture:', gestureResult.type, gestureResult.action)
  
  if (gestureResult.type === 'custom') {
    // カスタムジェスチャーの場合
    DebugLogger.showStatus(`Custom: ${gestureResult.name} (${distance.toFixed(0)}px, ${(gestureResult.confidence * 100).toFixed(0)}%)`)
    
    sendGestureMessage({
      type: 'customGesture',
      action: gestureResult.action,
      name: gestureResult.name,
      distance: distance,
      confidence: gestureResult.confidence
    })
  } else {
    // デフォルトの複合ジェスチャーの場合
    // ジェスチャー状態をチェック
    if (!isGestureEnabled(gestureResult.action)) {
      DebugLogger.info(`Complex gesture ${gestureResult.action} is disabled`)
      DebugLogger.showStatus(`ジェスチャー ${gestureResult.action} は無効です`, DebugLogger.LOG_LEVELS.WARN)
      return
    }
    
    DebugLogger.debug('Sending default complex gesture:', gestureResult.action)
    DebugLogger.showStatus(`Complex Gesture: ${gestureResult.action} (${distance.toFixed(0)}px)`)
    
    sendGestureMessage({
      type: 'complexGesture',
      gestureType: gestureResult.action,
      distance: distance
    })
  }
}

// 右クリック開始
document.addEventListener('mousedown', function (e) {
  if (e.button === 2 && settings.enabled && !isExcludedSite()) { // 右クリック
    isRightMouseDown = true
    startPos = { x: e.clientX, y: e.clientY }
    trail = [{ x: e.clientX, y: e.clientY }]
    // gestureExecuted = false // 将来の機能拡張用
    preventContextMenu = false
        
    initTrailCanvas()
        
    DebugLogger.debug('Right mouse down at:', startPos)
    DebugLogger.showStatus('Gesture started')
  }
}, true)

// マウス移動
document.addEventListener('mousemove', function (e) {
  if (isRightMouseDown && startPos && settings.enabled && !isExcludedSite()) {
    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    // 軌跡に点を追加
    trail.push({ x: e.clientX, y: e.clientY })
        
    // 軌跡を描画
    drawTrail()
        
    if (distance > 20) { // 小さな動きでも表示
      DebugLogger.showStatus(`Moving: (${deltaX.toFixed(0)}, ${deltaY.toFixed(0)}) Distance: ${distance.toFixed(0)}px`)
    }
  }
}, true)

// 右クリック終了
document.addEventListener('mouseup', function (e) {
  if (e.button === 2 && isRightMouseDown && startPos && settings.enabled && !isExcludedSite()) {
    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    DebugLogger.debug('Right mouse up. Delta:', deltaX, deltaY, 'Distance:', distance)
        
    if (distance > settings.gestureThreshold) { // 設定可能な閾値
      // 複合ジェスチャーの検出を試行
      const complexGesture = analyzeComplexGesture()
            
      if (complexGesture) {
        DebugLogger.info('Complex gesture detected:', complexGesture)
        handleComplexGesture(complexGesture, distance)
      } else {
        // 軌跡が複合的でないかチェック（単純ジェスチャーのみ許可）
        if (isSimpleGesturePath()) {
          // 単純なジェスチャーとして処理
          let direction = ''
          if (Math.abs(deltaX) > Math.abs(deltaY)) {
            direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
          } else {
            direction = deltaY > 0 ? 'DOWN' : 'UP'
          }
                  
          DebugLogger.info('Simple gesture detected:', direction)
          handleSimpleGesture(direction, distance)
        } else {
          // 未登録の複合ジェスチャー - 何も実行しない
          DebugLogger.info('Unregistered complex gesture detected - no action taken')
          DebugLogger.showStatus('未登録のジェスチャーパターンです', DebugLogger.LOG_LEVELS.WARN)
        }
      }
            
      // ジェスチャー実行フラグを設定
      // gestureExecuted = true // 将来の機能拡張用
      preventContextMenu = true
            
      // 300ms後にコンテキストメニューブロックを解除
      setTimeout(() => {
        preventContextMenu = false
      }, 300)
            
    } else {
      DebugLogger.showStatus(`Movement too small: ${distance.toFixed(0)}px (need ${settings.gestureThreshold}+)`)
      // gestureExecuted = false // 将来の機能拡張用
            
      // わずかでも動いた場合は短時間コンテキストメニューをブロック
      if (distance > 5) {
        preventContextMenu = true
        setTimeout(() => {
          preventContextMenu = false
        }, 150)
      }
    }
        
    // リセット
    isRightMouseDown = false
    startPos = null
    trail = []
        
    // 軌跡を少し待ってから削除（視覚的フィードバック）
    setTimeout(removeTrailCanvas, 200)
  }
}, true)

// 右クリックメニューを無効化
document.addEventListener('contextmenu', function (e) {
  if ((isRightMouseDown || preventContextMenu) && settings.enabled && !isExcludedSite()) {
    e.preventDefault()
    e.stopPropagation()
    DebugLogger.debug('Context menu blocked', { isRightMouseDown, preventContextMenu })
    return false
  }
}, true)

// バックグラウンドからのメッセージ処理
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  DebugLogger.debug('Content script received message:', request)
    
  if (request.type === 'scroll') {
    handleScrollMessage(request.direction)
      .then(result => {
        DebugLogger.debug('Scroll completed:', result)
        sendResponse({ success: true, action: result })
      })
      .catch(error => {
        console.error('❌ Scroll failed:', error)
        sendResponse({ success: false, error: error.message })
      })
        
    return true // 非同期レスポンス
  }
    
  sendResponse({ success: false, error: 'Unknown message type' })
})

// スクロール処理
function handleScrollMessage(direction) {
  DebugLogger.debug(`Scrolling: ${direction}`)
    
  return new Promise((resolve) => {
    if (direction === 'top') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
      DebugLogger.showStatus('⬆️ Scrolled to top')
      resolve('Scrolled to top')
    } else if (direction === 'bottom') {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      })
      DebugLogger.showStatus('⬇️ Scrolled to bottom')
      resolve('Scrolled to bottom')
    } else {
      throw new Error(`Unknown scroll direction: ${direction}`)
    }
  })
}

// 初期化
loadSettings().then(enabled => {
  if (enabled) {
    DebugLogger.info('Mouse Gesture: Event listeners registered')
    DebugLogger.showStatus('Mouse Gesture Tool Ready!')
  }
})