/**
 * Clean Architecture - Content Scripts エントリーポイント
 * UseCaseパターンとクリーンアーキテクチャに基づく実装
 */

// Clean Architecture - Dynamic imports (ビルド時に解決)
// SettingsUseCase, CustomGestureUseCase等のクラスは実行時に動的に読み込み

/**
 * Clean Architecture 対応ジェスチャーマネージャー
 */
class CleanGestureManager {
  constructor() {
    // Clean Architecture - UseCase instances (初期化は遅延ロード)
    this.settingsUseCase = null
    this.customGestureUseCase = null
    this.learningUseCase = null
    this.debugUseCase = null
    
    // Clean Architecture - Domain Services
    this.gestureRecognizer = null
    
    // Clean Architecture - Infrastructure Adapters
    this.canvasRenderer = null
    this.messagingAdapter = null
    
    // Clean Architecture - Controllers
    this.gestureController = null
    
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
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      console.log('🏗️ Clean Architecture Gestures: Initializing...')
      
      // Clean Architecture コンポーネントの初期化
      this.initializeCleanArchitecture()
      
      // 設定を読み込み
      await this.loadSettings()
      
      // 除外サイトチェック
      if (this.isExcludedSite()) {
        console.log('Site excluded, disabling Clean Architecture gestures')
        return
      }
      
      // Canvas初期化
      this.initializeCanvas()
      
      // イベントリスナー設定
      this.setupEventListeners()
      
      // メッセージリスナー設定
      this.setupMessageListener()
      
      // 設定変更監視
      this.watchSettingsChanges()
      
      this.isInitialized = true
      console.log('✅ Clean Architecture Gestures: Initialization complete')
      
    } catch (error) {
      console.error('❌ Clean Architecture Gestures: Initialization failed:', error)
    }
  }
  
  /**
   * Clean Architecture コンポーネントの初期化
   */
  initializeCleanArchitecture() {
    try {
      // 簡易実装でデバッグ機能を確保
      this.debugUseCase = this.createSimpleDebugUseCase()
      
      // グローバルに存在するクラスを使用（ビルド時に統合される前提）
      if (typeof window !== 'undefined') {
        this.settingsUseCase = window.SettingsUseCase ? new window.SettingsUseCase() : null
        this.customGestureUseCase = window.CustomGestureUseCase ? new window.CustomGestureUseCase() : null
        this.learningUseCase = window.GestureLearningUseCase ? new window.GestureLearningUseCase() : null
        
        // より高度なデバッグUseCaseが利用可能な場合は置き換え
        if (window.DebugSettingsUseCase) {
          try {
            this.debugUseCase = new window.DebugSettingsUseCase()
          } catch (error) {
            console.warn('Failed to initialize DebugSettingsUseCase, using fallback:', error)
          }
        }
        
        this.gestureRecognizer = window.SimpleGestureRecognizer ? new window.SimpleGestureRecognizer() : null
        
        this.canvasRenderer = window.CanvasRendererAdapter ? new window.CanvasRendererAdapter() : null
        this.messagingAdapter = window.SimpleMessagingAdapter ? new window.SimpleMessagingAdapter() : null
        
        if (window.GestureManager && this.settingsUseCase && this.customGestureUseCase) {
          this.gestureController = new window.GestureManager({
            settingsUseCase: this.settingsUseCase,
            customGestureUseCase: this.customGestureUseCase,
            learningUseCase: this.learningUseCase
          })
        }
      }
      
      console.log('Clean Architecture components initialized:', {
        settingsUseCase: Boolean(this.settingsUseCase),
        customGestureUseCase: Boolean(this.customGestureUseCase),
        learningUseCase: Boolean(this.learningUseCase),
        debugUseCase: Boolean(this.debugUseCase),
        gestureRecognizer: Boolean(this.gestureRecognizer),
        canvasRenderer: Boolean(this.canvasRenderer),
        messagingAdapter: Boolean(this.messagingAdapter),
        gestureController: Boolean(this.gestureController)
      })
      
    } catch (error) {
      console.warn('Clean Architecture initialization failed, using fallback:', error)
    }
  }

  /**
   * シンプルなデバッグUseCase実装（フォールバック用）
   */
  createSimpleDebugUseCase() {
    return {
      async isDebugEnabled() {
        try {
          const result = await new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
              chrome.storage.sync.get(['appSettings'], (data) => {
                const debugEnabled = data.appSettings?.debugSettings?.enabled || false
                resolve(debugEnabled)
              })
            } else {
              resolve(false)
            }
          })
          return result
        } catch (error) {
          console.error('Debug enabled check failed:', error)
          return false
        }
      },

      async getDebugSettings() {
        try {
          const result = await new Promise((resolve) => {
            if (typeof chrome !== 'undefined' && chrome.storage) {
              chrome.storage.sync.get(['appSettings'], (data) => {
                const debugSettings = data.appSettings?.debugSettings || {
                  enabled: false,
                  logLevel: 2,
                  showStatus: false,
                  statusPosition: 'top-right'
                }
                
                // shouldShowStatus メソッドを追加
                debugSettings.shouldShowStatus = function () {
                  return this.enabled && this.showStatus
                }
                
                resolve(debugSettings)
              })
            } else {
              resolve({
                enabled: false,
                logLevel: 2,
                showStatus: false,
                statusPosition: 'top-right',
                shouldShowStatus: () => false
              })
            }
          })
          return result
        } catch (error) {
          console.error('Get debug settings failed:', error)
          return {
            enabled: false,
            logLevel: 2,
            showStatus: false,
            statusPosition: 'top-right',
            shouldShowStatus: () => false
          }
        }
      }
    }
  }

  /**
   * 設定の読み込み - Clean Architecture対応
   */
  async loadSettings() {
    // Clean Architecture UseCase が利用可能な場合のみ使用
    if (this.settingsUseCase && this.customGestureUseCase) {
      try {
        // UseCase経由で設定を読み込み
        const loadedSettings = await this.settingsUseCase.getSettings()
        this.settings = {
          enabled: loadedSettings.enabled ?? true,
          strokeColor: loadedSettings.strokeColor || '#2196F3',
          strokeWidth: loadedSettings.strokeWidth || 3,
          gestureThreshold: loadedSettings.gestureThreshold || 15,
          excludeList: loadedSettings.excludeList || [],
          defaultGestureStates: loadedSettings.defaultGestureStates || {}
        }
        
        // カスタムジェスチャーも読み込み
        await this.customGestureUseCase.loadCustomGestures()
        
        console.log('Settings loaded via UseCase:', this.settings)
        
        // デバッグ情報の表示
        if (await this.debugUseCase.isDebugEnabled()) {
          console.log('🐛 Debug mode enabled')
          this.showDebugStatus('設定を読み込みました')
        }
        
        return
        
      } catch (error) {
        console.warn('Failed to load settings via UseCase, using fallback:', error)
      }
    }
    
    // Clean Architecture 初期化未完了の場合は直接フォールバック使用
    await this.loadSettingsFallback()
  }
  
  /**
   * 設定読み込みのフォールバック
   */
  async loadSettingsFallback() {
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
      console.log('Settings loaded (fallback):', this.settings)
    } catch (error) {
      console.error('Fallback settings load failed:', error)
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
   * Canvas初期化 - Clean Architecture対応
   */
  initializeCanvas() {
    // Clean Architecture Adapter が利用可能な場合のみ使用
    if (this.canvasRenderer) {
      try {
        // Clean Architecture - Adapter経由でCanvas初期化
        this.canvasRenderer.initialize({
          canvasId: 'mouse-gesture-trail',
          strokeColor: this.settings.strokeColor,
          strokeWidth: this.settings.strokeWidth,
          zIndex: 999999
        })
        
        // 下位互換性のため、直接アクセス用のcanvasも保持
        this.canvas = this.canvasRenderer.getCanvas()
        this.ctx = this.canvasRenderer.getContext()
        
        console.log('Canvas initialized via CanvasRendererAdapter')
        return
        
      } catch (error) {
        console.warn('Canvas adapter initialization failed, using fallback:', error)
      }
    }
    
    // Clean Architecture 初期化未完了の場合は直接フォールバック使用
    this.initializeCanvasFallback()
  }
  
  /**
   * Canvas初期化のフォールバック
   */
  initializeCanvasFallback() {
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
    try {
      // ジェスチャー認識
      const gestureResult = await this.recognizeGesture(trail)
      if (!gestureResult) {
        console.log('Gesture not recognized')
        return
      }
      
      console.log('Recognized gesture:', gestureResult)
      
      // ジェスチャーの種類に応じて処理
      const distance = this.calculateTrailDistance()
      if (gestureResult.type === 'custom') {
        await this.handleCustomGesture(gestureResult, distance)
      } else {
        await this.handleDefaultGesture(gestureResult, distance)
      }
      
    } catch (error) {
      console.error('Gesture execution failed:', error)
    }
  }
  
  /**
   * カスタムジェスチャーの処理
   */
  async handleCustomGesture(gestureResult, distance) {
    try {
      console.log(`Custom gesture: ${gestureResult.name} (${distance.toFixed(0)}px)`)
      
      const response = await this.sendGestureMessage({
        type: 'customGesture',
        action: gestureResult.action,
        name: gestureResult.name,
        distance: distance,
        confidence: gestureResult.confidence
      })
      
      if (response.success) {
        console.log('Custom gesture executed successfully:', response.action)
        // カスタムジェスチャーのデバッグ表示
        await this.showDebugStatus(`🎯 Custom: ${response.action}`)
      } else {
        console.error('Custom gesture execution failed:', response.error)
        // カスタムジェスチャーエラー時のデバッグ表示
        await this.showDebugStatus('❌ Custom: Failed')
      }
    } catch (error) {
      console.error('Custom gesture handling failed:', error)
    }
  }
  
  /**
   * デフォルトジェスチャーの処理
   */
  async handleDefaultGesture(gestureResult, distance) {
    try {
      // ジェスチャー状態をチェック
      const gestureType = typeof gestureResult === 'string' ? gestureResult : gestureResult.action || gestureResult.type
      
      if (!this.isGestureEnabled(gestureType)) {
        console.log(`Gesture ${gestureType} is disabled`)
        return
      }
      
      console.log(`Default gesture: ${gestureType} (${distance.toFixed(0)}px)`)
      
      const response = await this.sendGestureMessage(gestureType)
      
      if (response.success) {
        console.log('Default gesture executed successfully:', response.action)
        // デバッグ表示を追加
        await this.showDebugStatus(`✅ ${gestureType}: ${response.action}`)
      } else {
        console.error('Default gesture execution failed:', response.error)
        // エラー時もデバッグ表示
        await this.showDebugStatus(`❌ ${gestureType}: Failed`)
      }
    } catch (error) {
      console.error('Default gesture handling failed:', error)
    }
  }

  /**
   * ジェスチャー認識 - Clean Architecture対応
   */
  async recognizeGesture(trail) {
    if (trail.length < 2) return null
    
    // 軌跡の総移動距離チェック
    const totalDistance = this.calculateTrailDistance()
    if (totalDistance < this.settings.gestureThreshold) return null
    
    try {
      // Clean Architecture - Domain Service経由でジェスチャー認識
      const recognitionResult = await this.gestureRecognizer.recognizeGesture({
        trail,
        threshold: this.settings.gestureThreshold,
        settings: this.settings
      })
      
      if (recognitionResult) {
        console.log('Gesture recognized via Domain Service:', recognitionResult)
        return recognitionResult
      }
      
      // カスタムジェスチャーのチェック
      const customResult = await this.checkCustomGesture(trail)
      if (customResult) {
        return customResult
      }
      
    } catch (error) {
      console.warn('Domain Service recognition failed, using fallback:', error)
    }
    
    // フォールバック: 従来のロジック
    return this.recognizeGestureFallback(trail)
  }
  
  /**
   * カスタムジェスチャーのチェック
   */
  async checkCustomGesture(trail) {
    try {
      const directions = this.convertTrailToDirections(trail)
      const customResult = await this.customGestureUseCase.matchPattern(directions)
      
      if (customResult.matched) {
        // パターンマッチ成功
        
        return {
          type: 'custom',
          action: customResult.action,
          name: customResult.gestureName,
          confidence: customResult.confidence
        }
      }
    } catch (error) {
      console.error('Custom gesture check failed:', error)
    }
    
    return null
  }
  
  /**
   * ジェスチャー認識のフォールバック
   */
  recognizeGestureFallback(trail) {
    // 最初に単純ジェスチャーかチェック
    if (this.isSimpleGesturePath(trail)) {
      return this.analyzeSimpleGesture(trail)
    }
    
    // 複合ジェスチャーの分析
    return this.analyzeComplexGesture(trail)
  }

  /**
   * 単純ジェスチャー判定（1方向のみかチェック）
   */
  isSimpleGesturePath(trail) {
    if (trail.length < 3) return true
    
    const directions = []
    
    // 隣接する点を比較して方向を検出
    for (let i = 0; i < trail.length - 1; i++) {
      const start = trail[i]
      const end = trail[i + 1]
      
      const deltaX = end.x - start.x
      const deltaY = end.y - start.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 5) {
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
    const cleanDirections = this.cleanDirections(directions)
    const uniqueDirections = [...new Set(cleanDirections)]
    
    console.log('Simple gesture check - unique directions:', uniqueDirections)
    
    // 単一方向のみの場合は単純ジェスチャー
    return uniqueDirections.length <= 1
  }

  /**
   * 単純ジェスチャーの分析
   */
  analyzeSimpleGesture(trail) {
    const start = trail[0]
    const end = trail[trail.length - 1]
    const dx = end.x - start.x
    const dy = end.y - start.y
    
    const absDx = Math.abs(dx)
    const absDy = Math.abs(dy)
    
    if (absDx > absDy) {
      return dx > 0 ? 'RIGHT' : 'LEFT'
    } else {
      return dy > 0 ? 'DOWN' : 'UP'
    }
  }

  /**
   * 複合ジェスチャーの分析
   */
  analyzeComplexGesture(trail) {
    if (trail.length < 6) return null
    
    const directions = []
    const segmentLength = Math.max(3, Math.floor(trail.length / 6))
    
    // 軌跡をセグメントに分割して方向を分析
    for (let i = 0; i < trail.length - segmentLength; i += segmentLength) {
      const start = trail[i]
      const end = trail[Math.min(i + segmentLength, trail.length - 1)]
      
      const deltaX = end.x - start.x
      const deltaY = end.y - start.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 10) {
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
    const cleanDirections = this.cleanDirections(directions)
    
    console.log('Complex gesture - directions:', cleanDirections)
    
    if (cleanDirections.length >= 2) {
      const pattern = cleanDirections.join('')
      console.log('Checking pattern:', pattern)
      
      // 複合ジェスチャーのパターンマッチング
      const complexPatterns = {
        'DOWNRIGHT': 'downright',     // ↓→: タブを閉じる
        'UPRIGHT': 'upright',         // ↑→: 新しいタブ
        'RIGHTDOWN': 'rightdown',     // →↓: タブ複製
        'UPDOWN': 'updown',           // ↑↓: ページ更新
        'UPDOWNUP': 'super_refresh',  // ↑↓↑: スーパーリロード
        'LEFTRIGHT': 'prev_tab',      // ←→: 前のタブ
        'RIGHTLEFT': 'next_tab'       // →←: 次のタブ
      }
      
      return complexPatterns[pattern] || null
    }
    
    return null
  }

  /**
   * 方向配列をクリーンアップ（連続する同じ方向を統合）
   */
  cleanDirections(directions) {
    const cleanDirections = []
    let lastDirection = null
    
    for (const dir of directions) {
      if (dir !== lastDirection) {
        cleanDirections.push(dir)
        lastDirection = dir
      }
    }
    
    return cleanDirections
  }

  /**
   * backgroundスクリプトにジェスチャーメッセージを送信 - Clean Architecture対応
   */
  async sendGestureMessage(gestureType) {
    // Clean Architecture Adapter が利用可能な場合のみ使用
    if (this.messagingAdapter) {
      try {
        const message = this.isSimpleGesture(gestureType) 
          ? { type: 'simpleGesture', direction: gestureType }
          : { type: 'complexGesture', gestureType: gestureType }
        
        const response = await this.messagingAdapter.sendMessage(message)
        
        // デバッグ情報の表示
        if (await this.debugUseCase.isDebugEnabled()) {
          this.showDebugStatus(`✅ Action: ${response?.action || 'Success'}`)
        }
        
        return response
        
      } catch (error) {
        console.warn('Messaging adapter failed, using fallback:', error)
        return this.sendGestureMessageFallback(gestureType)
      }
    } else {
      // Clean Architecture 初期化未完了の場合は直接フォールバック使用
      return this.sendGestureMessageFallback(gestureType)
    }
  }
  
  /**
   * メッセージ送信のフォールバック
   */
  sendGestureMessageFallback(gestureType) {
    return new Promise((resolve) => {
      const message = this.isSimpleGesture(gestureType) 
        ? { type: 'simpleGesture', direction: gestureType }
        : { type: 'complexGesture', gestureType: gestureType }
      
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false, error: chrome.runtime.lastError.message })
        } else {
          resolve(response || { success: false, error: 'No response' })
        }
      })
    })
  }

  /**
   * シンプルジェスチャーかどうかの判定
   */
  isSimpleGesture(gestureType) {
    return ['LEFT', 'RIGHT', 'UP', 'DOWN'].includes(gestureType)
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
   * 設定変更の監視 - Clean Architecture対応
   */
  watchSettingsChanges() {
    try {
      // chrome.storage.onChangedを監視
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.addListener(async (changes, namespace) => {
          // Clean Architecture 対応: appSettings と settings 両方を監視
          if (namespace === 'sync' && (changes.appSettings || changes.settings)) {
            console.log('Settings changed, reloading via UseCase...')
            
            // UseCase経由で最新設定を取得
            await this.loadSettings()
            
            // 除外サイト/無効化チェック
            if (!this.settings.enabled || this.isExcludedSite()) {
              this.clearCanvas()
              if (await this.debugUseCase.isDebugEnabled()) {
                this.showDebugStatus('マウスジェスチャーが無効になりました')
              }
            } else {
              if (await this.debugUseCase.isDebugEnabled()) {
                this.showDebugStatus('マウスジェスチャーが有効になりました')
              }
            }
            
            // 軌跡設定が変更された場合
            const settingsChange = changes.appSettings || changes.settings
            if (settingsChange && settingsChange.newValue) {
              const newSettings = settingsChange.newValue
              if (newSettings.strokeColor || newSettings.strokeWidth) {
                this.updateCanvasStyle()
              }
            }
          }
        })
      }
    } catch (error) {
      console.error('Failed to setup settings watching:', error)
    }
  }

  /**
   * backgroundスクリプトからのメッセージを処理
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'scroll') {
        this.handleScrollMessage(message.direction)
        sendResponse({ success: true })
      }
    })
  }

  /**
   * スクロール処理
   */
  handleScrollMessage(direction) {
    try {
      if (direction === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else if (direction === 'bottom') {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      }
    } catch (error) {
      console.error('Scroll failed:', error)
    }
  }

  /**
   * 軌跡を方向配列に変換
   */
  convertTrailToDirections(trail) {
    const directions = []
    
    for (let i = 0; i < trail.length - 1; i++) {
      const start = trail[i]
      const end = trail[i + 1]
      
      const deltaX = end.x - start.x
      const deltaY = end.y - start.y
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      if (distance > 5) {
        let direction = ''
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          direction = deltaX > 0 ? 'RIGHT' : 'LEFT'
        } else {
          direction = deltaY > 0 ? 'DOWN' : 'UP'
        }
        directions.push(direction)
      }
    }
    
    return this.cleanDirections(directions)
  }
  
  /**
   * ジェスチャーが有効かチェック
   */
  isGestureEnabled(gestureId) {
    if (!this.settings.defaultGestureStates) {
      return true // デフォルトで有効
    }
    
    const enabled = this.settings.defaultGestureStates[gestureId]
    return enabled !== false
  }
  
  /**
   * Canvas のスタイルを更新
   */
  updateCanvasStyle() {
    try {
      if (this.canvasRenderer) {
        this.canvasRenderer.updateStyle({
          strokeColor: this.settings.strokeColor,
          strokeWidth: this.settings.strokeWidth
        })
      } else {
        // フォールバック
        if (this.ctx) {
          this.ctx.strokeStyle = this.settings.strokeColor
          this.ctx.lineWidth = this.settings.strokeWidth
        }
      }
    } catch {
      // フォールバック
      if (this.ctx) {
        this.ctx.strokeStyle = this.settings.strokeColor
        this.ctx.lineWidth = this.settings.strokeWidth
      }
    }
  }
  
  /**
   * Canvas をクリア
   */
  clearCanvas() {
    try {
      if (this.canvasRenderer) {
        this.canvasRenderer.clear()
      } else {
        if (this.canvas && this.ctx) {
          this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
        }
      }
    } catch {
      if (this.canvas && this.ctx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      }
    }
  }
  
  /**
   * デバッグステータス表示
   */
  async showDebugStatus(message) {
    try {
      if (this.debugUseCase) {
        const debugSettings = await this.debugUseCase.getDebugSettings()
        
        // デバッグ情報を詳細ログ出力
        console.log(`🐛 [Debug] ${message}`)
        console.log('🔧 Debug Settings:', {
          enabled: debugSettings.enabled,
          showStatus: debugSettings.showStatus,
          shouldShowStatus: debugSettings.shouldShowStatus(),
          statusPosition: debugSettings.statusPosition
        })
        
        // 画面上への表示
        if (debugSettings.shouldShowStatus()) {
          console.log('🔧 Creating debug status element...')
          this.createOrUpdateDebugStatusElement(message, debugSettings.statusPosition)
        } else {
          console.log('🔧 Debug status display is disabled')
        }
      } else {
        console.log(`[Debug Fallback] ${message}`)
      }
    } catch (error) {
      console.error('🚫 showDebugStatus error:', error)
      console.log(`[Debug Fallback] ${message}`)
    }
  }

  /**
   * デバッグステータス表示要素の作成/更新
   */
  createOrUpdateDebugStatusElement(message, position = 'top-right') {
    console.log('🔧 createOrUpdateDebugStatusElement called:', { message, position })
    
    const statusId = 'mouse-gesture-debug-status'
    let statusElement = document.getElementById(statusId)
    
    // 要素が存在しない場合は作成
    if (!statusElement) {
      console.log('🔧 Creating new debug status element')
      statusElement = document.createElement('div')
      statusElement.id = statusId
      statusElement.style.cssText = this.getDebugStatusStyles(position)
      
      if (document.body) {
        document.body.appendChild(statusElement)
        console.log('🔧 Debug status element appended to body')
      } else {
        console.error('🚫 document.body is not available')
        return
      }
    } else {
      console.log('🔧 Using existing debug status element')
    }
    
    // メッセージを更新
    statusElement.textContent = message
    statusElement.style.display = 'block'
    console.log('🔧 Debug status element updated:', {
      textContent: statusElement.textContent,
      display: statusElement.style.display,
      position: position
    })
    
    // 位置を更新（設定が変更された場合）
    this.updateDebugStatusPosition(statusElement, position)
    
    // 3秒後に自動的に非表示
    clearTimeout(this.debugStatusTimeout)
    this.debugStatusTimeout = setTimeout(() => {
      if (statusElement) {
        statusElement.style.display = 'none'
        console.log('🔧 Debug status element hidden after 3 seconds')
      }
    }, 3000)
  }

  /**
   * デバッグステータスのスタイルを取得
   */
  getDebugStatusStyles(position) {
    const baseStyles = `
      position: fixed;
      z-index: 9999999;
      background: rgba(0, 0, 0, 0.8);
      color: #fff;
      padding: 8px 12px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      font-weight: bold;
      pointer-events: none;
      max-width: 300px;
      word-wrap: break-word;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    `
    
    const positionStyles = {
      'top-right': 'top: 20px; right: 20px;',
      'top-left': 'top: 20px; left: 20px;',
      'bottom-right': 'bottom: 20px; right: 20px;',
      'bottom-left': 'bottom: 20px; left: 20px;'
    }
    
    return baseStyles + (positionStyles[position] || positionStyles['top-right'])
  }

  /**
   * デバッグステータスの位置を更新
   */
  updateDebugStatusPosition(element, position) {
    const positionStyles = {
      'top-right': { top: '20px', right: '20px', bottom: 'auto', left: 'auto' },
      'top-left': { top: '20px', left: '20px', bottom: 'auto', right: 'auto' },
      'bottom-right': { bottom: '20px', right: '20px', top: 'auto', left: 'auto' },
      'bottom-left': { bottom: '20px', left: '20px', top: 'auto', right: 'auto' }
    }
    
    const styles = positionStyles[position] || positionStyles['top-right']
    Object.assign(element.style, styles)
  }
  
  /**
   * デバッグ情報取得 - Clean Architecture対応
   */
  async getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasUseCases: {
        settings: Boolean(this.settingsUseCase),
        customGesture: Boolean(this.customGestureUseCase),
        learning: Boolean(this.learningUseCase),
        debug: Boolean(this.debugUseCase)
      },
      hasAdapters: {
        canvas: Boolean(this.canvasRenderer),
        messaging: Boolean(this.messagingAdapter)
      },
      hasDomainServices: {
        gestureRecognizer: Boolean(this.gestureRecognizer)
      },
      hasControllers: {
        gestureController: Boolean(this.gestureController)
      },
      gestureState: { ...this.gestureState },
      settings: { ...this.settings },
      canvasSize: this.canvas ? { width: this.canvas.width, height: this.canvas.height } : null,
      customGesturesCount: await this.getCustomGesturesCount(),
      isDebugEnabled: await this.debugUseCase.isDebugEnabled().catch(() => false)
    }
  }
  
  /**
   * カスタムジェスチャー数を取得
   */
  async getCustomGesturesCount() {
    try {
      if (this.customGestureUseCase) {
        const customGestures = await this.customGestureUseCase.getAllCustomGestures()
        return customGestures.length
      }
      return 0
    } catch {
      return 0
    }
  }
}

// ページ読み込み完了時に初期化 - Clean Architecture対応
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('🏗️ Clean Architecture Gesture Manager: Initializing...')
    
    const manager = new CleanGestureManager()
    await manager.initialize()
    
    // グローバルアクセス用
    window.cleanGestureManager = manager
    
    // デバッグ情報の表示
    if (await manager.debugUseCase.isDebugEnabled()) {
      const debugInfo = await manager.getDebugInfo()
      console.log('🐛 Debug Info:', debugInfo)
      manager.showDebugStatus('Clean Architecture Gesture Manager initialized successfully')
    }
    
    console.log('✅ Clean Architecture Gesture Manager: Initialization complete')
    
  } catch (error) {
    console.error('❌ Clean Gesture Manager initialization failed:', error)
  }
})

// document.readyStateが'complete'の場合は即座に初期化
if (document.readyState === 'loading') {
  // DOMContentLoadedで初期化（上記）
} else {
  // 既に読み込み完了している場合は即座に初期化
  (async () => {
    try {
      console.log('🏗️ Clean Architecture Gesture Manager: Immediate initialization...')
      
      const manager = new CleanGestureManager()
      await manager.initialize()
      window.cleanGestureManager = manager
      
      // デバッグ情報の表示
      if (await manager.debugUseCase.isDebugEnabled()) {
        const debugInfo = await manager.getDebugInfo()
        console.log('🐛 Debug Info:', debugInfo)
        manager.showDebugStatus('Clean Architecture Gesture Manager initialized immediately')
      }
      
      console.log('✅ Clean Architecture Gesture Manager: Immediate initialization complete')
      
    } catch (error) {
      console.error('❌ Clean Gesture Manager immediate initialization failed:', error)
    }
  })()
}

// CommonJS export（テスト用）- Clean Architecture対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    CleanGestureManager
  }
}