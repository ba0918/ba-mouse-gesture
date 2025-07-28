/**
 * GestureManager
 * 全レイヤーを統合するPresentation層のメインコントローラー
 */

// 依存関係のインポート
let GestureEventHandler, SimpleGestureUseCase, SimpleMessagingAdapter, CanvasRendererAdapter, SimpleGestureRecognizer
if (typeof require !== 'undefined') {
  ({ GestureEventHandler } = require('../handlers/GestureEventHandler'));
  ({ SimpleGestureUseCase } = require('../../application/usecases/SimpleGestureUseCase'));
  ({ SimpleMessagingAdapter } = require('../../infrastructure/adapters/SimpleMessagingAdapter'));
  ({ CanvasRendererAdapter } = require('../../infrastructure/adapters/CanvasRendererAdapter'));
  ({ SimpleGestureRecognizer } = require('../../domain/services/SimpleGestureRecognizer'))
}

class GestureManager {
  constructor() {
    // コンポーネント
    this.eventHandler = null
    this.gestureUseCase = null
    this.messagingAdapter = null
    this.canvasRenderer = null
    
    // 設定
    this.settings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: []
    }
    
    // 状態
    this.isInitialized = false
  }

  /**
   * 初期化
   * @returns {Promise<boolean>}
   */
  async initialize() {
    try {
      console.log('🏗️ GestureManager: Initializing...')
      
      // 設定を読み込み
      await this.loadSettings()
      
      // 除外サイトチェック
      if (this.isExcludedSite()) {
        console.log('Site excluded, disabling gestures')
        return false
      }
      
      // Infrastructure層の初期化
      this.messagingAdapter = new SimpleMessagingAdapter()
      this.canvasRenderer = new CanvasRendererAdapter()
      
      // Canvas初期化
      const canvasInitialized = this.canvasRenderer.initializeCanvas()
      if (!canvasInitialized) {
        throw new Error('Canvas initialization failed')
      }
      
      // Domain層の初期化
      const gestureRecognizer = new SimpleGestureRecognizer(this.settings.gestureThreshold)
      
      // Application層の初期化
      this.gestureUseCase = new SimpleGestureUseCase(gestureRecognizer, this.messagingAdapter)
      this.gestureUseCase.updateSettings(this.settings)
      
      // Presentation層の初期化
      this.eventHandler = new GestureEventHandler()
      this.eventHandler.updateSettings(this.settings)
      
      // イベントハンドラーのコールバック設定
      this.eventHandler.initialize({
        onGestureStart: this.onGestureStart.bind(this),
        onGestureMove: this.onGestureMove.bind(this),
        onGestureEnd: this.onGestureEnd.bind(this),
        onContextMenu: this.onContextMenu.bind(this)
      })
      
      // メッセージリスナー設定
      this.setupMessageListener()
      
      // 設定変更監視
      this.watchSettingsChanges()
      
      this.isInitialized = true
      console.log('✅ GestureManager: Initialization complete')
      return true
      
    } catch (error) {
      console.error('❌ GestureManager: Initialization failed:', error)
      this.isInitialized = false
      return false
    }
  }

  /**
   * ジェスチャー開始時の処理
   * @param {Object} startPosition
   */
  onGestureStart(startPosition) {
    if (!this.settings.enabled) return
    
    // Canvas描画スタイル更新
    this.canvasRenderer.updateStyle({
      color: this.settings.strokeColor,
      width: this.settings.strokeWidth
    })
    
    console.log('Gesture started at:', startPosition)
  }

  /**
   * ジェスチャー移動時の処理
   * @param {Object} currentPoint
   * @param {Object[]} trail
   */
  onGestureMove(currentPoint, trail) {
    if (!this.settings.enabled) return
    
    // 軌跡を描画
    this.canvasRenderer.drawTrail(trail, {
      color: this.settings.strokeColor,
      width: this.settings.strokeWidth
    })
  }

  /**
   * ジェスチャー終了時の処理
   * @param {Object[]} trail
   * @param {number} totalDistance
   */
  async onGestureEnd(trail, totalDistance) {
    if (!this.settings.enabled) return
    
    try {
      // Canvas遅延クリア
      this.canvasRenderer.clearCanvasWithDelay(200)
      
      // ジェスチャー認識・実行
      if (trail.length >= 2 && totalDistance >= this.settings.gestureThreshold) {
        const result = await this.gestureUseCase.executeGesture(trail)
        
        if (result.success) {
          console.log('Gesture executed successfully:', result.gestureType, result.action)
        } else {
          console.log('Gesture execution failed:', result.error)
        }
      }
      
    } catch (error) {
      console.error('Gesture end processing failed:', error)
    }
  }

  /**
   * コンテキストメニュー処理
   * @param {MouseEvent} e
   */
  onContextMenu(e) {
    // 既にpreventDefaultは実行済み
    console.log('Context menu prevented')
  }

  /**
   * 設定を読み込み
   * @returns {Promise<void>}
   */
  async loadSettings() {
    try {
      // Clean Architecture 対応: appSettings キーを使用
      const result = await chrome.storage.sync.get(['appSettings', 'settings'])
      let settingsData = null
      
      // 新しい構成 (Clean Architecture) を優先
      if (result.appSettings) {
        settingsData = result.appSettings
        console.log('Settings loaded from appSettings (Clean Architecture)')
      } else if (result.settings) {
        // 後方互換性のために古い構成もサポート
        settingsData = result.settings
        console.log('Settings loaded from settings (legacy)')
      }
      
      if (settingsData) {
        this.settings = {
          enabled: settingsData.enabled ?? true,
          strokeColor: settingsData.strokeColor || '#2196F3',
          strokeWidth: settingsData.strokeWidth || 3,
          gestureThreshold: settingsData.gestureThreshold || 15,
          excludeList: settingsData.excludeList || [],
          defaultGestureStates: settingsData.defaultGestureStates || {}
        }
      }
      console.log('Settings loaded:', this.settings)
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  }

  /**
   * 除外サイトチェック
   * @returns {boolean}
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
   * backgroundスクリプトからのメッセージリスナー設定
   */
  setupMessageListener() {
    if (this.messagingAdapter) {
      this.messagingAdapter.onMessage((message, sender, sendResponse) => {
        if (message.type === 'scroll') {
          this.handleScrollMessage(message.direction)
          sendResponse({ success: true })
          return true
        }
      })
    }
  }

  /**
   * スクロール処理
   * @param {string} direction
   */
  handleScrollMessage(direction) {
    try {
      if (direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (direction === 'bottom') {
        window.scrollTo({ 
          top: document.documentElement.scrollHeight, 
          behavior: 'smooth' 
        })
      }
    } catch (error) {
      console.error('Scroll failed:', error)
    }
  }

  /**
   * 設定変更の監視
   */
  watchSettingsChanges() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener((changes, namespace) => {
          // Clean Architecture 対応: appSettings と settings 両方を監視
          if (namespace === 'sync' && (changes.appSettings || changes.settings)) {
            console.log('Settings changed, reloading...')
            const settingsChange = changes.appSettings || changes.settings
            this.updateSettings(settingsChange.newValue)
          }
        })
      }
    } catch (error) {
      console.error('Failed to setup settings watching:', error)
    }
  }

  /**
   * 設定を更新
   * @param {Object} newSettings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
    
    // 各コンポーネントに設定を伝播
    if (this.eventHandler) {
      this.eventHandler.updateSettings(this.settings)
    }
    if (this.gestureUseCase) {
      this.gestureUseCase.updateSettings(this.settings)
    }
    
    console.log('Settings updated:', this.settings)
  }

  /**
   * 破棄処理
   */
  destroy() {
    if (this.eventHandler) {
      this.eventHandler.destroy()
      this.eventHandler = null
    }
    
    if (this.canvasRenderer) {
      this.canvasRenderer.removeCanvas()
      this.canvasRenderer = null
    }
    
    this.gestureUseCase = null
    this.messagingAdapter = null
    this.isInitialized = false
    
    console.log('GestureManager destroyed')
  }

  /**
   * デバッグ情報を取得
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      settings: this.settings,
      components: {
        eventHandler: this.eventHandler?.getDebugInfo(),
        gestureUseCase: this.gestureUseCase?.getDebugInfo(),
        messagingAdapter: this.messagingAdapter?.getDebugInfo(),
        canvasRenderer: this.canvasRenderer?.getDebugInfo()
      },
      className: 'GestureManager'
    }
  }
}

// ブラウザ環境対応
if (typeof window !== 'undefined') {
  window.GestureManager = GestureManager
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GestureManager }
}