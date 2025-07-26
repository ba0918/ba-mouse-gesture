// デバッグ用シンプルなジェスチャー検出
console.log('🚀 マウスジェスチャーツール: デバッグ版開始')

// 基本的な状態管理
let isRightClicking = false
let startPosition = null

// デバッグ用の状態表示
function showDebugMessage(message) {
  const debugDiv = document.getElementById('gesture-debug') || createDebugDiv()
  debugDiv.textContent = message
  console.log('🖱️ ' + message)
}

function createDebugDiv() {
  const div = document.createElement('div')
  div.id = 'gesture-debug'
  div.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: monospace;
        font-size: 12px;
        z-index: 999999;
        max-width: 300px;
    `
  document.body.appendChild(div)
  return div
}

// 右クリック開始
document.addEventListener('mousedown', function (e) {
  console.log('👆 mousedown detected, button:', e.button)
    
  if (e.button === 2) { // 右クリック
    isRightClicking = true
    startPosition = { x: e.clientX, y: e.clientY }
    showDebugMessage(`ジェスチャー開始: (${e.clientX}, ${e.clientY})`)
  }
}, true)

// マウス移動
document.addEventListener('mousemove', function (e) {
  if (isRightClicking && startPosition) {
    const deltaX = e.clientX - startPosition.x
    const deltaY = e.clientY - startPosition.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    showDebugMessage(`移動中: Δ(${deltaX.toFixed(0)}, ${deltaY.toFixed(0)}) 距離:${distance.toFixed(0)}`)
  }
}, true)

// 右クリック終了
document.addEventListener('mouseup', function (e) {
  console.log('👆 mouseup detected, button:', e.button)
    
  if (e.button === 2 && isRightClicking && startPosition) {
    const deltaX = e.clientX - startPosition.x
    const deltaY = e.clientY - startPosition.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    if (distance > 50) {
      let direction = ''
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left'
      } else {
        direction = deltaY > 0 ? 'down' : 'up'
      }
            
      showDebugMessage(`ジェスチャー完了: ${direction} (距離:${distance.toFixed(0)})`)
            
      // バックグラウンドスクリプトにメッセージ送信を試行
      try {
        chrome.runtime.sendMessage({
          type: 'gesture',
          direction: direction,
          timestamp: Date.now()
        }, function (response) {
          if (chrome.runtime.lastError) {
            showDebugMessage('❌ メッセージ送信失敗: ' + chrome.runtime.lastError.message)
          } else {
            showDebugMessage('✅ メッセージ送信成功: ' + JSON.stringify(response))
          }
        })
      } catch (error) {
        showDebugMessage('❌ 送信エラー: ' + error.message)
      }
    } else {
      showDebugMessage(`移動距離不足: ${distance.toFixed(0)}px (最小50px必要)`)
    }
        
    isRightClicking = false
    startPosition = null
  }
}, true)

// 右クリックメニューを無効化
document.addEventListener('contextmenu', function (e) {
  if (isRightClicking) {
    e.preventDefault()
    e.stopPropagation()
    showDebugMessage('コンテキストメニューをブロック')
    return false
  }
}, true)

// 初期化完了
showDebugMessage('初期化完了 - 右クリック+ドラッグを試してください')

console.log('🎯 マウスジェスチャーツール: デバッグ版初期化完了')