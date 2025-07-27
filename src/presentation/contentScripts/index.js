/**
 * Clean Architecture - Content Scripts エントリーポイント
 * ジェスチャー検出機能をLegacyIntegrationAdapterと統合
 */

// LegacyIntegrationAdapter のインポート
const { getOrCreateAdapter } = require('../adapters/LegacyIntegrationAdapter')

/**
 * Clean Architecture 対応ジェスチャーマネージャー
 */
class CleanGestureManager {
  constructor() {
    this.adapter = null
    this.isInitialized = false
    this.gestureState = {
      isRecording: false,
      trail: [],
      startPosition: null,
      preventContextMenu: false
    }
    this.settings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: []
    }
    this.canvas = null
    this.ctx = null
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      console.log('🏗️ Clean Architecture Gestures: Initializing...')
      
      // LegacyIntegrationAdapter を初期化
      this.adapter = await getOrCreateAdapter({
        initializeViews: false, // content scriptsではビューは不要
        forceOptionsView: false
      })
      
      // 設定を読み込み
      this.loadSettings()
      
      // 除外サイトチェック
      if (this.isExcludedSite()) {
        console.log('Site excluded, disabling Clean Architecture gestures')
        return
      }
      
      // Canvas初期化
      this.initializeCanvas()
      
      // イベントリスナー設定
      this.setupEventListeners()
      
      // 設定変更監視
      this.watchSettingsChanges()
      
      this.isInitialized = true
      console.log('✅ Clean Architecture Gestures: Initialization complete')
      
    } catch (error) {
      console.error('❌ Clean Architecture Gestures: Initialization failed:', error)
      
      // フォールバック: 既存のgesture-simple.jsが動作している場合はそちらに委譲
      this.initializeFallback()
    }
  }

  /**
   * 設定の読み込み
   */
  loadSettings() {
    if (!this.adapter) return

    try {
      const currentSettings = this.adapter.legacyState.currentSettings
      if (currentSettings) {
        this.settings = {
          enabled: currentSettings.enabled,
          strokeColor: currentSettings.strokeColor || currentSettings.stroke?.color || '#2196F3',
          strokeWidth: currentSettings.strokeWidth || currentSettings.stroke?.width || 3,
          gestureThreshold: currentSettings.gestureThreshold || 15,
          excludeList: currentSettings.excludeList || []
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  /**
   * 除外サイトチェック
   */
  isExcludedSite() {
    const currentUrl = window.location.href
    const currentHost = window.location.hostname
    
    return this.settings.excludeList.some(pattern => {
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

  /**
   * Canvas初期化
   */
  initializeCanvas() {
    // 既存のcanvasがあれば削除
    const existingCanvas = document.getElementById('mouse-gesture-trail')
    if (existingCanvas) {
      existingCanvas.remove()
    }

    // 新しいcanvasを作成
    this.canvas = document.createElement('canvas')
    this.canvas.id = 'mouse-gesture-trail'
    this.canvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 999999;
      background: transparent;
    `
    
    // Canvas サイズをウィンドウサイズに設定
    this.canvas.width = window.innerWidth
    this.canvas.height = window.innerHeight
    
    // コンテキストを取得
    this.ctx = this.canvas.getContext('2d')
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    
    // DOMに追加
    document.body.appendChild(this.canvas)
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    // マウスイベント
    document.addEventListener('mousedown', this.onMouseDown.bind(this), true)
    document.addEventListener('mousemove', this.onMouseMove.bind(this), true)
    document.addEventListener('mouseup', this.onMouseUp.bind(this), true)
    document.addEventListener('contextmenu', this.onContextMenu.bind(this), true)
    
    // ウィンドウリサイズ
    window.addEventListener('resize', this.onWindowResize.bind(this))
  }

  /**
   * マウスダウンイベント
   */
  onMouseDown(e) {
    if (!this.settings.enabled || e.button !== 2) return // 右クリック以外は無視
    
    this.gestureState.isRecording = true
    this.gestureState.startPosition = { x: e.clientX, y: e.clientY, timestamp: Date.now() }
    this.gestureState.trail = [{ x: e.clientX, y: e.clientY, timestamp: Date.now() }]
    this.gestureState.preventContextMenu = false
    
    // Canvas準備
    if (this.canvas) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.strokeStyle = this.settings.strokeColor
      this.ctx.lineWidth = this.settings.strokeWidth
    }
  }

  /**
   * マウスムーブイベント
   */
  onMouseMove(e) {
    if (!this.gestureState.isRecording) return
    
    const newPoint = { x: e.clientX, y: e.clientY, timestamp: Date.now() }
    this.gestureState.trail.push(newPoint)
    
    // 軌跡描画
    this.drawTrail()
    
    // 十分な移動距離があるかチェック
    if (this.calculateTrailDistance() >= this.settings.gestureThreshold) {
      this.gestureState.preventContextMenu = true
    }
  }

  /**
   * マウスアップイベント
   */
  async onMouseUp(e) {
    if (!this.gestureState.isRecording || e.button !== 2) return
    
    this.gestureState.isRecording = false
    const trail = [...this.gestureState.trail]
    
    // Canvas クリア
    if (this.canvas) {
      setTimeout(() => {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }, 200) // 少し遅延してから消去
    }
    
    // ジェスチャー認識実行
    if (trail.length >= 2 && this.calculateTrailDistance() >= this.settings.gestureThreshold) {
      await this.executeGesture(trail)
    }
    
    // 状態リセット
    this.resetGestureState()
  }

  /**
   * コンテキストメニューイベント
   */
  onContextMenu(e) {
    if (this.gestureState.preventContextMenu) {
      e.preventDefault()
      e.stopPropagation()
      return false
    }
  }

  /**
   * ウィンドウリサイズイベント
   */
  onWindowResize() {
    if (this.canvas) {
      this.canvas.width = window.innerWidth
      this.canvas.height = window.innerHeight
    }
  }

  /**
   * 軌跡描画
   */
  drawTrail() {
    if (!this.ctx || this.gestureState.trail.length < 2) return
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.beginPath()
    
    const trail = this.gestureState.trail
    this.ctx.moveTo(trail[0].x, trail[0].y)
    
    for (let i = 1; i < trail.length; i++) {
      this.ctx.lineTo(trail[i].x, trail[i].y)
    }
    
    this.ctx.stroke()
  }

  /**
   * 軌跡の総移動距離を計算
   */
  calculateTrailDistance() {
    const trail = this.gestureState.trail
    if (trail.length < 2) return 0
    
    let totalDistance = 0
    for (let i = 1; i < trail.length; i++) {
      const prev = trail[i - 1]
      const current = trail[i]
      const dx = current.x - prev.x
      const dy = current.y - prev.y
      totalDistance += Math.sqrt(dx * dx + dy * dy)
    }
    
    return totalDistance
  }

  /**
   * ジェスチャー実行
   */
  async executeGesture(trail) {
    if (!this.adapter) return
    
    try {
      // LegacyIntegrationAdapter経由でジェスチャー実行
      const currentUrl = window.location.href
      const tabId = await this.getCurrentTabId()
      
      const result = await this.adapter.executeLegacyGesture(trail, currentUrl, tabId)
      
      if (result.success) {
        console.log('Gesture executed successfully:', result.gesture?.name)
      } else {
        console.log('Gesture not recognized or failed:', result.message)
      }
      
    } catch (error) {
      console.error('Gesture execution failed:', error)
    }
  }

  /**
   * 現在のタブIDを取得
   */
  async getCurrentTabId() {
    try {
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        return tabs[0]?.id || 0
      }
      return 0
    } catch {
      return 0
    }
  }

  /**
   * ジェスチャー状態をリセット
   */
  resetGestureState() {
    this.gestureState.isRecording = false
    this.gestureState.trail = []
    this.gestureState.startPosition = null
    this.gestureState.preventContextMenu = false
  }

  /**
   * 設定変更の監視
   */
  watchSettingsChanges() {
    if (!this.adapter) return
    
    try {
      // chrome.storage.onChangedを監視
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          if (namespace === 'sync') {
            this.onSettingsChanged(changes)
          }
        })
      }
    } catch (error) {
      console.error('Failed to setup settings watching:', error)
    }
  }

  /**
   * 設定変更時の処理
   */
  onSettingsChanged(changes) {
    let needsReload = false
    
    // 設定の更新
    Object.keys(changes).forEach(key => {
      if (key in this.settings) {
        this.settings[key] = changes[key].newValue
        needsReload = true
      }
    })
    
    if (needsReload) {
      console.log('Settings changed, reloading...')
      this.loadSettings()
    }
  }

  /**
   * フォールバック初期化
   */
  initializeFallback() {
    console.warn('Clean Architecture Gestures: Falling back to legacy mode')
    
    // 既存のgesture-simple.jsが動作している場合は、それに委譲
    // ここでは何もしない（既存システムが動作し続ける）
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasAdapter: Boolean(this.adapter),
      gestureState: { ...this.gestureState },
      settings: { ...this.settings },
      canvasSize: this.canvas ? { width: this.canvas.width, height: this.canvas.height } : null
    }
  }
}

// ページ読み込み完了時に初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const manager = new CleanGestureManager()
    await manager.initialize()
    
    // グローバルアクセス用
    window.cleanGestureManager = manager
    
  } catch (error) {
    console.error('Clean Gesture Manager initialization failed:', error)
  }
})

// document.readyStateが'complete'の場合は即座に初期化
if (document.readyState === 'loading') {
  // DOMContentLoadedで初期化（上記）
} else {
  // 既に読み込み完了している場合は即座に初期化
  (async () => {
    try {
      const manager = new CleanGestureManager()
      await manager.initialize()
      window.cleanGestureManager = manager
    } catch (error) {
      console.error('Clean Gesture Manager immediate initialization failed:', error)
    }
  })()
}

// CommonJS export（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CleanGestureManager }
}