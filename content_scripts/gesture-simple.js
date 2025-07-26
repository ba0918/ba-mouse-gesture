// 設定対応マウスジェスチャー検出
console.log('🚀 Mouse Gesture: Settings-enabled version loaded')

// 設定の初期化
let settings = {
  enabled: true,
  strokeColor: '#2563eb',
  strokeWidth: 3,
  excludeList: []
}

// 現在のページが除外対象かチェック
function isExcludedSite() {
  const currentUrl = window.location.href
  const currentHost = window.location.hostname
    
  return settings.excludeList.some(pattern => {
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

// 設定を読み込む
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(settings)
    settings = { ...settings, ...result }
    console.log('📋 Settings loaded:', settings)
        
    // 除外サイトチェック
    if (isExcludedSite()) {
      console.log('🚫 Site excluded, disabling mouse gestures')
      showStatus('マウスジェスチャーは無効です（除外サイト）')
      return false
    }
        
    // 機能が無効の場合
    if (!settings.enabled) {
      console.log('🔇 Mouse gestures disabled in settings')
      showStatus('マウスジェスチャーは無効です')
      return false
    }
        
    return true
  } catch (error) {
    console.error('❌ Failed to load settings:', error)
    return true // デフォルトで有効
  }
}

// 設定変更の監視
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync') {
    console.log('📋 Settings changed:', changes)
        
    // 設定を更新
    Object.keys(changes).forEach(key => {
      if (Object.prototype.hasOwnProperty.call(settings, key)) {
        settings[key] = changes[key].newValue
      }
    })
        
    // 除外サイト/無効化チェック
    if (changes.enabled || changes.excludeList) {
      if (!settings.enabled || isExcludedSite()) {
        removeTrailCanvas()
        showStatus('マウスジェスチャーが無効になりました')
      } else {
        showStatus('マウスジェスチャーが有効になりました')
      }
    }
        
    // 軌跡設定が変更された場合
    if (changes.strokeColor || changes.strokeWidth) {
      updateTrailStyle()
    }
  }
})

// 拡張機能が正しく読み込まれたかの確認
if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) {
  console.log('✅ Chrome extension API available')
  console.log('Extension ID:', chrome.runtime.id)
} else {
  console.error('❌ Chrome extension API not available')
}

// ページ読み込み完了の確認
document.addEventListener('DOMContentLoaded', function () {
  console.log('📄 DOM loaded')
  showStatus('Extension loaded successfully')
})

// ステータス表示関数
function showStatus(message) {
  console.log('📊 Status:', message)
    
  // 既存のステータス要素を削除
  const existing = document.getElementById('gesture-status')
  if (existing) {
    existing.remove()
  }
    
  // 新しいステータス要素を作成
  const statusDiv = document.createElement('div')
  statusDiv.id = 'gesture-status'
  statusDiv.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: #2563eb;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border: 1px solid rgba(255,255,255,0.2);
        max-width: 300px;
        word-wrap: break-word;
    `
  statusDiv.textContent = message
    
  document.body.appendChild(statusDiv)
    
  // 5秒後に自動で消す
  setTimeout(() => {
    if (statusDiv.parentNode) {
      statusDiv.parentNode.removeChild(statusDiv)
    }
  }, 5000)
}

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
  console.log('🎨 Trail canvas initialized')
}

// 軌跡スタイルの更新
function updateTrailStyle() {
  if (trailContext) {
    trailContext.strokeStyle = settings.strokeColor
    trailContext.lineWidth = settings.strokeWidth
    console.log('🎨 Trail style updated:', settings.strokeColor, settings.strokeWidth + 'px')
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
    console.log('🗑️ Trail canvas removed')
  }
}

// 複合ジェスチャーの分析
function analyzeComplexGesture() {
  if (trail.length < 10) return null // 軌跡が短すぎる場合は分析しない
    
  const directions = []
  const segmentLength = Math.max(5, Math.floor(trail.length / 8)) // セグメントサイズ
    
  // 軌跡をセグメントに分割して方向を分析
  for (let i = 0; i < trail.length - segmentLength; i += segmentLength) {
    const start = trail[i]
    const end = trail[Math.min(i + segmentLength, trail.length - 1)]
        
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    if (distance > 20) { // 十分な移動距離がある場合のみ
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
    
  console.log('🔍 Analyzed directions:', cleanDirections)
    
  // 複合ジェスチャーのパターンマッチング
  if (cleanDirections.length >= 2) {
    const pattern = cleanDirections.join('')
        
    // 対応する複合ジェスチャーをチェック
    const complexPatterns = {
      'DOWNRIGHT': 'downright',
      'UPRIGHT': 'upright', 
      'RIGHTDOWN': 'rightdown'
    }
        
    return complexPatterns[pattern] || null
  }
    
  return null
}

// 単純ジェスチャーの処理
function handleSimpleGesture(direction, distance) {
  showStatus(`Gesture: ${direction} (${distance.toFixed(0)}px)`)
    
  // バックグラウンドスクリプトに送信
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({
      type: 'simpleGesture',
      direction: direction,
      distance: distance
    }, function (response) {
      if (chrome.runtime.lastError) {
        console.error('❌ Message send failed:', chrome.runtime.lastError.message)
        showStatus('❌ Message failed: ' + chrome.runtime.lastError.message)
      } else {
        console.log('✅ Message sent successfully:', response)
        showStatus('✅ Action: ' + (response?.action || 'Success'))
      }
    })
  } else {
    console.error('❌ Chrome runtime not available')
    showStatus('❌ Chrome runtime not available')
  }
}

// 複合ジェスチャーの処理
function handleComplexGesture(gestureType, distance) {
  showStatus(`Complex Gesture: ${gestureType} (${distance.toFixed(0)}px)`)
    
  // バックグラウンドスクリプトに送信
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.runtime.sendMessage({
      type: 'complexGesture',
      gestureType: gestureType,
      distance: distance
    }, function (response) {
      if (chrome.runtime.lastError) {
        console.error('❌ Complex gesture message send failed:', chrome.runtime.lastError.message)
        showStatus('❌ Complex gesture failed: ' + chrome.runtime.lastError.message)
      } else {
        console.log('✅ Complex gesture sent successfully:', response)
        showStatus('✅ Action: ' + (response?.action || 'Success'))
      }
    })
  } else {
    console.error('❌ Chrome runtime not available')
    showStatus('❌ Chrome runtime not available')
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
        
    console.log('🖱️ Right mouse down at:', startPos)
    showStatus('Gesture started')
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
      showStatus(`Moving: (${deltaX.toFixed(0)}, ${deltaY.toFixed(0)}) Distance: ${distance.toFixed(0)}px`)
    }
  }
}, true)

// 右クリック終了
document.addEventListener('mouseup', function (e) {
  if (e.button === 2 && isRightMouseDown && startPos && settings.enabled && !isExcludedSite()) {
    const deltaX = e.clientX - startPos.x
    const deltaY = e.clientY - startPos.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    console.log('🖱️ Right mouse up. Delta:', deltaX, deltaY, 'Distance:', distance)
        
    if (distance > 50) {
      // 複合ジェスチャーの検出を試行
      const complexGesture = analyzeComplexGesture()
            
      if (complexGesture) {
        console.log('🎯 Complex gesture detected:', complexGesture)
        handleComplexGesture(complexGesture, distance)
      } else {
        // 単純なジェスチャーとして処理
        let direction = ''
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
        } else {
          direction = deltaY > 0 ? 'DOWN' : 'UP'
        }
                
        console.log('🎯 Simple gesture detected:', direction)
        handleSimpleGesture(direction, distance)
      }
            
      // ジェスチャー実行フラグを設定
      // gestureExecuted = true // 将来の機能拡張用
      preventContextMenu = true
            
      // 300ms後にコンテキストメニューブロックを解除
      setTimeout(() => {
        preventContextMenu = false
      }, 300)
            
    } else {
      showStatus(`Movement too small: ${distance.toFixed(0)}px (need 50+)`)
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
    console.log('🚫 Context menu blocked', { isRightMouseDown, preventContextMenu })
    return false
  }
}, true)

// バックグラウンドからのメッセージ処理
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('📨 Content script received message:', request)
    
  if (request.type === 'scroll') {
    handleScrollMessage(request.direction)
      .then(result => {
        console.log('✅ Scroll completed:', result)
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
  console.log(`📜 Scrolling: ${direction}`)
    
  return new Promise((resolve) => {
    if (direction === 'top') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      })
      showStatus('⬆️ Scrolled to top')
      resolve('Scrolled to top')
    } else if (direction === 'bottom') {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
      })
      showStatus('⬇️ Scrolled to bottom')
      resolve('Scrolled to bottom')
    } else {
      throw new Error(`Unknown scroll direction: ${direction}`)
    }
  })
}

// 初期化
loadSettings().then(enabled => {
  if (enabled) {
    console.log('🎯 Mouse Gesture: Event listeners registered')
    showStatus('Mouse Gesture Tool Ready!')
  }
})