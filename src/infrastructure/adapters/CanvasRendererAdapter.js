/**
 * CanvasRendererAdapter
 * Canvas描画のInfrastructure層実装
 */

class CanvasRendererAdapter {
  constructor() {
    this.canvas = null
    this.ctx = null
    this.canvasId = 'mouse-gesture-trail'
    this.isInitialized = false
  }

  /**
   * Canvasを初期化
   * @param {Object} style - スタイル設定
   * @returns {boolean} 初期化成功可否
   */
  initializeCanvas(style = {}) {
    try {
      // 既存のcanvasがあれば削除
      this.removeCanvas()

      // 新しいcanvasを作成
      this.canvas = document.createElement('canvas')
      this.canvas.id = this.canvasId
      
      // デフォルトスタイル
      const defaultStyle = {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: '999999',
        background: 'transparent'
      }

      // スタイル適用
      const finalStyle = { ...defaultStyle, ...style }
      Object.assign(this.canvas.style, finalStyle)
      
      // Canvas サイズをウィンドウサイズに設定
      this.updateCanvasSize()
      
      // コンテキストを取得
      this.ctx = this.canvas.getContext('2d')
      if (!this.ctx) {
        throw new Error('Failed to get canvas context')
      }

      // 描画設定のデフォルト値
      this.ctx.lineCap = 'round'
      this.ctx.lineJoin = 'round'
      
      // DOMに追加
      document.body.appendChild(this.canvas)
      
      // ウィンドウリサイズ監視
      this.setupResizeListener()
      
      this.isInitialized = true
      return true

    } catch (error) {
      console.error('Canvas initialization failed:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * Canvasサイズをウィンドウサイズに更新
   */
  updateCanvasSize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
    }
  }

  /**
   * ウィンドウリサイズイベントリスナーを設定
   */
  setupResizeListener() {
    this.resizeHandler = () => {
      this.updateCanvasSize()
    }
    window.addEventListener('resize', this.resizeHandler)
  }

  /**
   * 軌跡を描画
   * @param {Point[]|Object[]} trail - 軌跡データ
   * @param {Object} style - 描画スタイル
   */
  drawTrail(trail, style = {}) {
    if (!this.isInitialized || !this.ctx || !trail || trail.length < 2) {
      return
    }

    try {
      // Canvas をクリア
      this.clearCanvas()

      // 描画スタイル設定
      this.ctx.strokeStyle = style.color || '#2196F3'
      this.ctx.lineWidth = style.width || 3
      
      // パスを開始
      this.ctx.beginPath()
      this.ctx.moveTo(trail[0].x, trail[0].y)
      
      // 軌跡を描画
      for (let i = 1; i < trail.length; i++) {
        this.ctx.lineTo(trail[i].x, trail[i].y)
      }
      
      // 描画実行
      this.ctx.stroke()

    } catch (error) {
      console.error('Trail drawing failed:', error)
    }
  }

  /**
   * スムーズな軌跡を描画（ベジェ曲線使用）
   * @param {Point[]|Object[]} trail - 軌跡データ
   * @param {Object} style - 描画スタイル
   */
  drawSmoothTrail(trail, style = {}) {
    if (!this.isInitialized || !this.ctx || !trail || trail.length < 3) {
      // 短い軌跡は通常描画
      this.drawTrail(trail, style)
      return
    }

    try {
      // Canvas をクリア
      this.clearCanvas()

      // 描画スタイル設定
      this.ctx.strokeStyle = style.color || '#2196F3'
      this.ctx.lineWidth = style.width || 3
      
      // パスを開始
      this.ctx.beginPath()
      this.ctx.moveTo(trail[0].x, trail[0].y)
      
      // ベジェ曲線で滑らかに描画
      for (let i = 1; i < trail.length - 1; i++) {
        const current = trail[i]
        const next = trail[i + 1]
        
        // 制御点を計算
        const controlX = (current.x + next.x) / 2
        const controlY = (current.y + next.y) / 2
        
        this.ctx.quadraticCurveTo(current.x, current.y, controlX, controlY)
      }
      
      // 最後の点
      const lastPoint = trail[trail.length - 1]
      this.ctx.lineTo(lastPoint.x, lastPoint.y)
      
      // 描画実行
      this.ctx.stroke()

    } catch (error) {
      console.error('Smooth trail drawing failed:', error)
    }
  }

  /**
   * Canvasをクリア
   */
  clearCanvas() {
    if (this.isInitialized && this.ctx && this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  /**
   * 遅延クリア（アニメーション効果）
   * @param {number} delay - 遅延時間（ms）
   */
  clearCanvasWithDelay(delay = 200) {
    setTimeout(() => {
      this.clearCanvas()
    }, delay)
  }

  /**
   * Canvasを削除
   */
  removeCanvas() {
    // リサイズリスナーを削除
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler)
      this.resizeHandler = null
    }

    // Canvas要素を削除
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas)
    }

    this.canvas = null
    this.ctx = null
    this.isInitialized = false
  }

  /**
   * 描画スタイルを更新
   * @param {Object} style - 新しいスタイル
   */
  updateStyle(style) {
    if (this.isInitialized && this.ctx) {
      if (style.color) {
        this.ctx.strokeStyle = style.color
      }
      if (style.width) {
        this.ctx.lineWidth = style.width
      }
    }
  }

  /**
   * 初期化状態を確認
   * @returns {boolean}
   */
  isReady() {
    return this.isInitialized && Boolean(this.canvas) && Boolean(this.ctx)
  }

  /**
   * Canvasエレメントを取得
   * @returns {HTMLCanvasElement|null}
   */
  getCanvas() {
    return this.canvas
  }

  /**
   * Canvas描画コンテキストを取得
   * @returns {CanvasRenderingContext2D|null}
   */
  getContext() {
    return this.ctx
  }

  /**
   * Canvasの情報を取得
   * @returns {Object}
   */
  getCanvasInfo() {
    return {
      isInitialized: this.isInitialized,
      canvasExists: Boolean(this.canvas),
      contextExists: Boolean(this.ctx),
      canvasSize: this.canvas ? {
        width: this.canvas.width,
        height: this.canvas.height
      } : null,
      canvasId: this.canvasId
    }
  }

  /**
   * デバッグ情報を取得
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      ...this.getCanvasInfo(),
      windowSize: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      className: 'CanvasRendererAdapter'
    }
  }
}

// ブラウザ環境対応
if (typeof window !== 'undefined') {
  window.CanvasRendererAdapter = CanvasRendererAdapter
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CanvasRendererAdapter }
}