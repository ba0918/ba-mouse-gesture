(function () {
  'use strict'
    
  console.log('マウスジェスチャーツール: コンテンツスクリプト開始')
    
  // ジェスチャーの状態管理
  const gestureState = {
    isActive: false,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 },
    trail: [],
    startTime: 0
  }
    
  // 設定
  const config = {
    minDistance: 50,        // 最小移動距離（ピクセル）
    maxTime: 2000,         // 最大ジェスチャー時間（ミリ秒）
    trailColor: '#4285f4',  // 軌跡の色
    trailWidth: 3,         // 軌跡の幅
    segmentMinDistance: 30, // セグメント最小距離（ピクセル）
    directionChangeThreshold: 45  // 方向変更の閾値（度）
  }
    
  // 軌跡表示用のCanvas要素
  let trailCanvas = null
  let trailContext = null
    
  /**
     * 軌跡表示用のCanvasを初期化
     */
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
            z-index: 999999;
            background: transparent;
        `
        
    trailCanvas.width = window.innerWidth
    trailCanvas.height = window.innerHeight
        
    trailContext = trailCanvas.getContext('2d')
    trailContext.strokeStyle = config.trailColor
    trailContext.lineWidth = config.trailWidth
    trailContext.lineCap = 'round'
    trailContext.lineJoin = 'round'
        
    document.body.appendChild(trailCanvas)
        
    // ウィンドウリサイズ時の対応
    window.addEventListener('resize', function () {
      if (trailCanvas) {
        trailCanvas.width = window.innerWidth
        trailCanvas.height = window.innerHeight
      }
    })
  }
    
  /**
     * 軌跡をクリア
     */
  function clearTrail() {
    if (trailContext) {
      trailContext.clearRect(0, 0, trailCanvas.width, trailCanvas.height)
    }
  }
    
  /**
     * 軌跡を描画
     */
  function drawTrail() {
    if (!trailContext || gestureState.trail.length < 2) return
        
    clearTrail()
        
    trailContext.beginPath()
    const firstPoint = gestureState.trail[0]
    trailContext.moveTo(firstPoint.x, firstPoint.y)
        
    for (let i = 1; i < gestureState.trail.length; i++) {
      const point = gestureState.trail[i]
      trailContext.lineTo(point.x, point.y)
    }
        
    trailContext.stroke()
  }
    
  /**
     * 軌跡表示用Canvasを削除
     */
  function removeTrailCanvas() {
    if (trailCanvas && trailCanvas.parentNode) {
      trailCanvas.parentNode.removeChild(trailCanvas)
      trailCanvas = null
      trailContext = null
    }
  }
    
  /**
     * 軌跡を分析して複合ジェスチャーを検出
     * @param {Array} trail 軌跡座標の配列
     * @returns {Array} 検出された方向のシーケンス
     */
  function analyzeComplexGesture(trail) {
    if (trail.length < 2) return []
        
    const segments = []
    let currentSegmentStart = 0
        
    // 軌跡を意味のあるセグメントに分割
    for (let i = 1; i < trail.length; i++) {
      const segmentStart = trail[currentSegmentStart]
      const currentPoint = trail[i]
            
      const distance = Math.sqrt(
        Math.pow(currentPoint.x - segmentStart.x, 2) + 
                Math.pow(currentPoint.y - segmentStart.y, 2)
      )
            
      // セグメントが十分な長さに達した場合
      if (distance >= config.segmentMinDistance) {
        const direction = getSegmentDirection(segmentStart, currentPoint)
        if (direction) {
          segments.push({
            start: segmentStart,
            end: currentPoint,
            direction: direction
          })
          currentSegmentStart = i
        }
      }
    }
        
    // 最後のセグメントを処理
    if (currentSegmentStart < trail.length - 1) {
      const segmentStart = trail[currentSegmentStart]
      const endPoint = trail[trail.length - 1]
      const direction = getSegmentDirection(segmentStart, endPoint)
      if (direction) {
        segments.push({
          start: segmentStart,
          end: endPoint,
          direction: direction
        })
      }
    }
        
    // 連続する同じ方向のセグメントを統合
    const directions = []
    let lastDirection = null
        
    for (const segment of segments) {
      if (segment.direction !== lastDirection) {
        directions.push(segment.direction)
        lastDirection = segment.direction
      }
    }
        
    return directions
  }
    
  /**
     * セグメントの方向を取得
     * @param {Object} start 開始座標
     * @param {Object} end 終了座標
     * @returns {string|null} 方向
     */
  function getSegmentDirection(start, end) {
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    if (distance < config.segmentMinDistance) {
      return null
    }
        
    // より大きな変化の軸を基準に方向を決定
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }
    
  /**
     * 単純な方向判定（既存の関数を維持）
     * @param {Object} start 開始座標 {x, y}
     * @param {Object} end 終了座標 {x, y}
     * @returns {string|null} 方向（'left', 'right', 'up', 'down'）またはnull
     */
  function detectDirection(start, end) {
    const deltaX = end.x - start.x
    const deltaY = end.y - start.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
        
    // 最小移動距離に達していない場合は無視
    if (distance < config.minDistance) {
      return null
    }
        
    // より大きな変化の軸を基準に方向を決定
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // 水平方向の移動
      return deltaX > 0 ? 'right' : 'left'
    } else {
      // 垂直方向の移動
      return deltaY > 0 ? 'down' : 'up'
    }
  }
    
  /**
     * ジェスチャーに基づいてアクションを実行
     * @param {string} direction ジェスチャーの方向
     */
  function executeGestureAction(direction) {
    console.log('ジェスチャー実行:', direction)
        
    // バックグラウンドスクリプトにメッセージを送信
    chrome.runtime.sendMessage({
      type: 'gesture',
      direction: direction,
      timestamp: Date.now()
    }, function (response) {
      if (chrome.runtime.lastError) {
        console.error('メッセージ送信エラー:', chrome.runtime.lastError)
      } else {
        console.log('ジェスチャー実行完了:', response)
      }
    })
  }
    
  /**
     * 複合ジェスチャーに基づいてアクションを実行
     * @param {string} gestureSequence ジェスチャーのシーケンス（例: "downright", "upright"）
     */
  function executeComplexGestureAction(gestureSequence) {
    console.log('複合ジェスチャー実行:', gestureSequence)
        
    // バックグラウンドスクリプトにメッセージを送信
    chrome.runtime.sendMessage({
      type: 'complexGesture',
      sequence: gestureSequence,
      timestamp: Date.now()
    }, function (response) {
      if (chrome.runtime.lastError) {
        console.error('複合ジェスチャー送信エラー:', chrome.runtime.lastError)
      } else {
        console.log('複合ジェスチャー実行完了:', response)
      }
    })
  }
    
  /**
     * ジェスチャー開始
     * @param {MouseEvent} e マウスイベント
     */
  function startGesture(e) {
    if (e.button !== 2) return // 右クリックのみ
        
    gestureState.isActive = true
    gestureState.startPosition = { x: e.clientX, y: e.clientY }
    gestureState.currentPosition = { x: e.clientX, y: e.clientY }
    gestureState.trail = [{ x: e.clientX, y: e.clientY }]
    gestureState.startTime = Date.now()
        
    initTrailCanvas()
        
    console.log('ジェスチャー開始:', gestureState.startPosition)
  }
    
  /**
     * ジェスチャー追跡
     * @param {MouseEvent} e マウスイベント
     */
  function trackGesture(e) {
    if (!gestureState.isActive) return
        
    gestureState.currentPosition = { x: e.clientX, y: e.clientY }
    gestureState.trail.push({ x: e.clientX, y: e.clientY })
        
    // 軌跡を描画
    drawTrail()
  }
    
  /**
     * ジェスチャー終了
     * @param {MouseEvent} e マウスイベント
     */
  function endGesture(e) {
    if (!gestureState.isActive || e.button !== 2) return
        
    const duration = Date.now() - gestureState.startTime
        
    // タイムアウトチェック
    if (duration > config.maxTime) {
      console.log('ジェスチャータイムアウト')
      resetGesture()
      return
    }
        
    // 複合ジェスチャーを分析
    const complexDirections = analyzeComplexGesture(gestureState.trail)
        
    if (complexDirections.length > 1) {
      // 複合ジェスチャーとして処理
      const gestureSequence = complexDirections.join('')
      console.log('複合ジェスチャー検出:', complexDirections, '→', gestureSequence)
      executeComplexGestureAction(gestureSequence)
    } else {
      // 単純なジェスチャーとして処理
      const direction = detectDirection(gestureState.startPosition, gestureState.currentPosition)
            
      if (direction) {
        executeGestureAction(direction)
      } else {
        console.log('ジェスチャーが認識されませんでした（移動距離不足）')
      }
    }
        
    resetGesture()
  }
    
  /**
     * ジェスチャー状態をリセット
     */
  function resetGesture() {
    gestureState.isActive = false
    gestureState.trail = []
        
    // 軌跡をクリアして少し待ってからCanvasを削除
    clearTrail()
    setTimeout(removeTrailCanvas, 100)
        
    console.log('ジェスチャーリセット')
  }
    
  /**
     * 右クリックコンテキストメニューを無効化
     * @param {Event} e イベント
     */
  function preventContextMenu(e) {
    if (gestureState.isActive) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }
    
  // イベントリスナーを設定
  document.addEventListener('mousedown', startGesture, true)
  document.addEventListener('mousemove', trackGesture, true)
  document.addEventListener('mouseup', endGesture, true)
  document.addEventListener('contextmenu', preventContextMenu, true)
    
  // ページ離脱時のクリーンアップ
  window.addEventListener('beforeunload', function () {
    removeTrailCanvas()
  })
    
  // バックグラウンドスクリプトからのメッセージを処理
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log('コンテンツスクリプト: メッセージ受信', request)
        
    if (request.type === 'scroll') {
      handleScrollAction(request.direction)
        .then(result => {
          sendResponse({ success: true, action: result })
        })
        .catch(error => {
          console.error('スクロール処理エラー:', error)
          sendResponse({ success: false, error: error.message })
        })
            
      // 非同期レスポンスを送信するためにtrueを返す
      return true
    }
  })
    
  /**
     * スクロールアクションを実行
     * @param {string} direction スクロール方向（'top' | 'bottom'）
     * @returns {Promise<string>} 実行されたアクションの説明
     */
  async function handleScrollAction(direction) {
    return new Promise((resolve) => {
      if (direction === 'top') {
        // ページトップへスムーズスクロール
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
        resolve('ページトップへスクロール完了')
      } else if (direction === 'bottom') {
        // ページボトムへスムーズスクロール
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth'
        })
        resolve('ページボトムへスクロール完了')
      } else {
        throw new Error(`未知のスクロール方向: ${direction}`)
      }
    })
  }
    
  console.log('マウスジェスチャーツール: イベントリスナー設定完了')
    
})()