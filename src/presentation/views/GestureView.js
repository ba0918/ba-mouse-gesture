/**
 * GestureView
 * ジェスチャー検出のDOM操作・イベントハンドリング・軌跡描画を担当
 */

class GestureView {
  constructor() {
    this.presenter = null
    this.isInitialized = false

    // マウスイベント状態
    this.mouseState = {
      isRightMouseDown: false,
      lastPosition: null,
      startPosition: null
    }

    // Canvas要素
    this.trailCanvas = null
    this.trailContext = null

    // 軌跡描画設定
    this.trailSettings = {
      color: '#2196F3',
      width: 3,
      lineCap: 'round',
      lineJoin: 'round'
    }

    // パフォーマンス最適化
    this.animationFrameId = null
    this.needsRedraw = false

    // イベントハンドラーのバインド
    this.boundHandlers = {
      onMouseDown: this.onMouseDown.bind(this),
      onMouseMove: this.onMouseMove.bind(this),
      onMouseUp: this.onMouseUp.bind(this),
      onContextMenu: this.onContextMenu.bind(this),
      onWindowResize: this.onWindowResize.bind(this),
      onVisibilityChange: this.onVisibilityChange.bind(this),
      onBeforeUnload: this.onBeforeUnload.bind(this)
    }
  }

  /**
   * Presenterを設定
   * @param {GesturePresenter} presenter
   */
  setPresenter(presenter) {
    this.presenter = presenter
  }

  /**
   * 初期化
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return
    }

    try {
      // Canvas要素を初期化
      await this.initializeCanvas()

      // イベントリスナーを設定
      await this.setupEventListeners()

      // Presenterからの通知を受信
      await this.setupPresenterListeners()

      // パフォーマンス最適化
      await this.startAnimationLoop()

      this.isInitialized = true

    } catch (error) {
      console.error('Failed to initialize GestureView:', error)
      throw error
    }
  }

  /**
   * 破棄
   */
  dispose() {
    // アニメーションループを停止
    this.stopAnimationLoop()

    // イベントリスナーを削除
    this.removeEventListeners()

    // Canvas要素を削除
    this.removeCanvas()

    // 状態をリセット
    this.mouseState = {
      isRightMouseDown: false,
      lastPosition: null,
      startPosition: null
    }

    this.presenter = null
    this.isInitialized = false
  }

  /**
   * Canvas要素を初期化
   * @private
   */
  initializeCanvas() {
    if (this.trailCanvas) return

    this.trailCanvas = document.createElement('canvas')
    this.trailCanvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999998;
      background: transparent;
    `

    this.updateCanvasSize()

    this.trailContext = this.trailCanvas.getContext('2d')
    this.applyTrailSettings()

    document.body.appendChild(this.trailCanvas)
  }

  /**
   * Canvasサイズを更新
   * @private
   */
  updateCanvasSize() {
    if (!this.trailCanvas) return

    const dpr = window.devicePixelRatio || 1
    const rect = { width: window.innerWidth, height: window.innerHeight }

    // Canvas要素のサイズを設定
    this.trailCanvas.width = rect.width * dpr
    this.trailCanvas.height = rect.height * dpr

    // CSS表示サイズを設定
    this.trailCanvas.style.width = rect.width + 'px'
    this.trailCanvas.style.height = rect.height + 'px'

    // コンテキストのスケールを調整
    if (this.trailContext) {
      this.trailContext.scale(dpr, dpr)
      this.applyTrailSettings()
    }
  }

  /**
   * 軌跡描画設定を適用
   * @private
   */
  applyTrailSettings() {
    if (!this.trailContext) return

    this.trailContext.strokeStyle = this.trailSettings.color
    this.trailContext.lineWidth = this.trailSettings.width
    this.trailContext.lineCap = this.trailSettings.lineCap
    this.trailContext.lineJoin = this.trailSettings.lineJoin
  }

  /**
   * Canvas要素を削除
   * @private
   */
  removeCanvas() {
    if (this.trailCanvas && this.trailCanvas.parentNode) {
      this.trailCanvas.parentNode.removeChild(this.trailCanvas)
    }
    this.trailCanvas = null
    this.trailContext = null
  }

  /**
   * イベントリスナーを設定
   * @private
   */
  setupEventListeners() {
    // マウスイベント
    document.addEventListener('mousedown', this.boundHandlers.onMouseDown, true)
    document.addEventListener('mousemove', this.boundHandlers.onMouseMove, true)
    document.addEventListener('mouseup', this.boundHandlers.onMouseUp, true)
    document.addEventListener('contextmenu', this.boundHandlers.onContextMenu, true)

    // ウィンドウイベント
    window.addEventListener('resize', this.boundHandlers.onWindowResize)
    window.addEventListener('beforeunload', this.boundHandlers.onBeforeUnload)

    // ページ可視性の変更
    document.addEventListener('visibilitychange', this.boundHandlers.onVisibilityChange)
  }

  /**
   * イベントリスナーを削除
   * @private
   */
  removeEventListeners() {
    document.removeEventListener('mousedown', this.boundHandlers.onMouseDown, true)
    document.removeEventListener('mousemove', this.boundHandlers.onMouseMove, true)
    document.removeEventListener('mouseup', this.boundHandlers.onMouseUp, true)
    document.removeEventListener('contextmenu', this.boundHandlers.onContextMenu, true)

    window.removeEventListener('resize', this.boundHandlers.onWindowResize)
    window.removeEventListener('beforeunload', this.boundHandlers.onBeforeUnload)

    document.removeEventListener('visibilitychange', this.boundHandlers.onVisibilityChange)
  }

  /**
   * Presenterからの通知を受信
   * @private
   */
  setupPresenterListeners() {
    if (!this.presenter) return

    // Presenterからの通知に対応
    this.presenter.onStatus((statusInfo) => {
      this.showStatusMessage(statusInfo.message, statusInfo.type, statusInfo.duration)
    })
  }

  /**
   * アニメーションループを開始
   * @private
   */
  startAnimationLoop() {
    const animationLoop = () => {
      if (this.needsRedraw) {
        this.renderTrail()
        this.needsRedraw = false
      }

      if (this.isInitialized) {
        this.animationFrameId = window.requestAnimationFrame(animationLoop)
      }
    }

    this.animationFrameId = window.requestAnimationFrame(animationLoop)
  }

  /**
   * アニメーションループを停止
   * @private
   */
  stopAnimationLoop() {
    if (this.animationFrameId) {
      window.cancelAnimationFrame(this.animationFrameId)
      this.animationFrameId = null
    }
  }

  /**
   * 軌跡を描画
   * @private
   * @param {Array} [trail] - 軌跡データ
   */
  renderTrail(trail) {
    if (!this.trailContext) return

    // Canvas をクリア
    this.trailContext.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height)

    // 軌跡データを取得
    if (!trail && this.presenter) {
      const state = this.presenter.getRecordingState()
      if (!state.isRecording) return
      // 実際の実装では、Presenterから軌跡データを取得
    }

    if (!trail || trail.length < 2) return

    // 軌跡を描画
    this.trailContext.beginPath()
    this.trailContext.moveTo(trail[0].x, trail[0].y)

    for (let i = 1; i < trail.length; i++) {
      this.trailContext.lineTo(trail[i].x, trail[i].y)
    }

    this.trailContext.stroke()
  }

  /**
   * 軌跡描画設定を更新
   * @param {Object} settings - 新しい設定
   */
  updateTrailSettings(settings) {
    if (settings.color) {
      this.trailSettings.color = settings.color
    }
    if (settings.width) {
      this.trailSettings.width = settings.width
    }

    this.applyTrailSettings()
    this.needsRedraw = true
  }

  /**
   * ステータスメッセージを表示
   * @param {string} message - メッセージ
   * @param {string} type - タイプ
   * @param {number} duration - 表示時間
   */
  showStatusMessage(message, type = 'info', duration = 3000) {
    // デバッグ用のステータス表示
    // 実際の実装では、適切なUI要素に表示
    console.log(`[${type.toUpperCase()}] ${message}`)

    // 必要に応じて画面上にステータスを表示
    if (type === 'error' || type === 'warning') {
      this.showToast(message, type, duration)
    }
  }

  /**
   * トースト通知を表示
   * @private
   * @param {string} message - メッセージ
   * @param {string} type - タイプ
   * @param {number} duration - 表示時間
   */
  showToast(message, type, duration) {
    // トースト要素を作成
    const toast = document.createElement('div')
    toast.className = `gesture-toast toast-${type}`
    toast.textContent = message
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 10px 15px;
      background: ${this.getToastColor(type)};
      color: white;
      border-radius: 4px;
      z-index: 999999;
      font-size: 14px;
      font-family: Arial, sans-serif;
      max-width: 300px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      animation: gestureToastSlideIn 0.3s ease-out;
    `

    // CSS アニメーションを追加
    if (!document.getElementById('gesture-toast-styles')) {
      const style = document.createElement('style')
      style.id = 'gesture-toast-styles'
      style.textContent = `
        @keyframes gestureToastSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes gestureToastSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    document.body.appendChild(toast)

    // 指定時間後に削除
    setTimeout(() => {
      toast.style.animation = 'gestureToastSlideOut 0.3s ease-in'
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, duration)
  }

  /**
   * トーストの色を取得
   * @private
   * @param {string} type - タイプ
   * @returns {string}
   */
  getToastColor(type) {
    switch (type) {
    case 'success': return '#4CAF50'
    case 'error': return '#F44336'
    case 'warning': return '#FF9800'
    case 'info': return '#2196F3'
    default: return '#666'
    }
  }

  // Event handlers

  /**
   * マウスダウンイベント
   * @private
   * @param {MouseEvent} e
   */
  onMouseDown(e) {
    if (e.button === 2) { // 右クリック
      this.mouseState.isRightMouseDown = true
      this.mouseState.startPosition = { x: e.clientX, y: e.clientY }
      this.mouseState.lastPosition = { x: e.clientX, y: e.clientY }

      // Presenterにジェスチャー開始を通知
      if (this.presenter) {
        const started = this.presenter.startGestureRecording(e.clientX, e.clientY)
        if (started) {
          // Canvas を表示
          if (this.trailCanvas) {
            this.trailCanvas.style.display = 'block'
          }
        }
      }
    }
  }

  /**
   * マウス移動イベント
   * @private
   * @param {MouseEvent} e
   */
  onMouseMove(e) {
    if (!this.mouseState.isRightMouseDown || !this.presenter) {
      return
    }

    // スロットリング（パフォーマンス最適化）
    const now = Date.now()
    if (this.lastMoveTime && now - this.lastMoveTime < 16) { // 60fps制限
      return
    }
    this.lastMoveTime = now

    // Presenterに軌跡点を追加
    this.presenter.addGesturePoint(e.clientX, e.clientY)

    // 軌跡の再描画をスケジュール
    this.needsRedraw = true

    this.mouseState.lastPosition = { x: e.clientX, y: e.clientY }
  }

  /**
   * マウスアップイベント
   * @private
   * @param {MouseEvent} e
   */
  onMouseUp(e) {
    if (e.button === 2 && this.mouseState.isRightMouseDown) {
      this.mouseState.isRightMouseDown = false

      // Presenterにジェスチャー終了を通知
      if (this.presenter) {
        this.presenter.stopGestureRecording()
      }

      // Canvas をクリアして非表示
      setTimeout(() => {
        if (this.trailContext) {
          this.trailContext.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height)
        }
        if (this.trailCanvas) {
          this.trailCanvas.style.display = 'none'
        }
      }, 500) // 0.5秒後にクリア
    }
  }

  /**
   * コンテキストメニューイベント
   * @private
   * @param {MouseEvent} e
   */
  onContextMenu(e) {
    // ジェスチャーが実行された場合はコンテキストメニューを無効化
    if (this.presenter) {
      const state = this.presenter.getRecordingState()
      if (state.preventContextMenu) {
        e.preventDefault()
        e.stopPropagation()
        return false
      }
    }
  }

  /**
   * ウィンドウリサイズイベント
   * @private
   */
  onWindowResize() {
    // デバウンス処理
    clearTimeout(this.resizeTimeout)
    this.resizeTimeout = setTimeout(() => {
      this.updateCanvasSize()
    }, 100)
  }

  /**
   * ページ可視性変更イベント
   * @private
   */
  onVisibilityChange() {
    if (document.hidden) {
      // ページが非表示になった場合、進行中のジェスチャーを停止
      if (this.presenter && this.mouseState.isRightMouseDown) {
        this.presenter.forceStopRecording()
        this.mouseState.isRightMouseDown = false
      }
    }
  }

  /**
   * ページアンロードイベント
   * @private
   */
  onBeforeUnload() {
    // クリーンアップ
    this.dispose()
  }

  /**
   * デバッグ情報を取得
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      mouseState: { ...this.mouseState },
      trailSettings: { ...this.trailSettings },
      canvasSize: this.trailCanvas ? {
        width: this.trailCanvas.width,
        height: this.trailCanvas.height,
        clientWidth: this.trailCanvas.clientWidth,
        clientHeight: this.trailCanvas.clientHeight
      } : null,
      animationFrameId: this.animationFrameId,
      needsRedraw: this.needsRedraw
    }
  }

  /**
   * Canvas要素を取得（テスト用）
   * @returns {HTMLCanvasElement|null}
   */
  getCanvas() {
    return this.trailCanvas
  }

  /**
   * マウス状態を取得（テスト用）
   * @returns {Object}
   */
  getMouseState() {
    return { ...this.mouseState }
  }

  /**
   * 軌跡設定を取得
   * @returns {Object}
   */
  getTrailSettings() {
    return { ...this.trailSettings }
  }

  /**
   * 強制的に軌跡をクリア
   */
  clearTrail() {
    if (this.trailContext) {
      this.trailContext.clearRect(0, 0, this.trailCanvas.width, this.trailCanvas.height)
    }
    this.needsRedraw = false
  }

  /**
   * Canvas表示/非表示を切り替え
   * @param {boolean} visible - 表示するか
   */
  setCanvasVisibility(visible) {
    if (this.trailCanvas) {
      this.trailCanvas.style.display = visible ? 'block' : 'none'
    }
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GestureView }
}