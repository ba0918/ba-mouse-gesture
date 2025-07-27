/**
 * GesturePresenter
 * ジェスチャー検出画面のUIロジックとApplication層との橋渡しを担当
 */

// 依存関係のインポート
let BasePresenter
if (typeof require !== 'undefined') {
  ({ BasePresenter } = require('./BasePresenter'))
}

class GesturePresenter extends BasePresenter {
  /**
   * @param {IGestureService} gestureService - ジェスチャーサービス
   * @param {ISettingsService} settingsService - 設定サービス
   */
  constructor(gestureService, settingsService) {
    super()
    
    this.gestureService = gestureService
    this.settingsService = settingsService
    
    // ジェスチャー検出状態
    this.gestureState = {
      isEnabled: true,
      isRecording: false,
      currentGesture: null,
      trail: [],
      startPosition: null,
      lastProcessedTime: 0,
      preventContextMenu: false
    }
    
    // 設定
    this.settings = {
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      gestureStates: {}
    }
    
    // パフォーマンス監視
    this.performanceMetrics = {
      recognitionCount: 0,
      averageRecognitionTime: 0,
      lastRecognitionTime: 0
    }
    
    // レート制限
    this.rateLimiter = {
      lastGestureTime: 0,
      minInterval: 100 // 最小100ms間隔
    }
  }

  /**
   * 初期化処理
   * @protected
   * @returns {Promise<void>}
   */
  async onInitialize() {
    try {
      // 設定を読み込み
      await this.loadSettings()
      
      // ジェスチャー機能の有効性をチェック
      await this.checkGestureAvailability()
      
      // 設定変更の監視を開始
      this.startSettingsWatching()
      
    } catch (error) {
      this.handleError('Failed to initialize gesture presenter', error)
      throw error
    }
  }

  /**
   * 破棄処理
   * @protected
   * @returns {Promise<void>}
   */
  async onDispose() {
    // ジェスチャー記録を停止
    this.stopGestureRecording()
    
    // 状態をリセット
    this.resetGestureState()
  }

  /**
   * 設定を読み込み
   * @private
   * @returns {Promise<void>}
   */
  async loadSettings() {
    try {
      const settingsDTO = await this.settingsService.getCurrentSettings()
      
      this.settings = {
        strokeColor: settingsDTO.stroke?.color || '#2196F3',
        strokeWidth: settingsDTO.stroke?.width || 3,
        gestureThreshold: settingsDTO.gestureThreshold || 15,
        excludeList: settingsDTO.excludeList || [],
        gestureStates: settingsDTO.gestureStates || {}
      }
      
      this.gestureState.isEnabled = settingsDTO.enabled
      
    } catch (error) {
      this.handleError('Failed to load settings', error)
      // デフォルト設定で継続
    }
  }

  /**
   * ジェスチャー機能の有効性をチェック
   * @private
   * @returns {Promise<void>}
   */
  async checkGestureAvailability() {
    try {
      const currentUrl = window.location.href
      const isEnabled = await this.gestureService.isGestureEnabled(currentUrl)
      
      this.gestureState.isEnabled = isEnabled
      
      if (!isEnabled) {
        this.updateStatus('マウスジェスチャーは無効です（除外サイトまたは機能無効）', 'warning')
      }
      
    } catch (error) {
      this.handleError('Failed to check gesture availability', error)
    }
  }

  /**
   * ジェスチャー記録を開始
   * @param {number} x - 開始X座標
   * @param {number} y - 開始Y座標
   * @returns {boolean} 記録開始に成功したか
   */
  startGestureRecording(x, y) {
    if (!this.gestureState.isEnabled || this.gestureState.isRecording) {
      return false
    }
    
    // レート制限チェック
    const now = Date.now()
    if (now - this.rateLimiter.lastGestureTime < this.rateLimiter.minInterval) {
      return false
    }
    
    this.gestureState.isRecording = true
    this.gestureState.startPosition = { x, y, timestamp: now }
    this.gestureState.trail = [{ x, y, timestamp: now }]
    this.gestureState.preventContextMenu = false
    
    this.updateStatus('ジェスチャー記録開始', 'info')
    
    // Viewに記録開始を通知
    this.notifyView('gestureRecordingStarted', { x, y })
    
    return true
  }

  /**
   * ジェスチャー軌跡を追加
   * @param {number} x - X座標
   * @param {number} y - Y座標
   */
  addGesturePoint(x, y) {
    if (!this.gestureState.isRecording) {
      return
    }
    
    const now = Date.now()
    const newPoint = { x, y, timestamp: now }
    
    // 重複点の除去（パフォーマンス最適化）
    const lastPoint = this.gestureState.trail[this.gestureState.trail.length - 1]
    if (lastPoint && Math.abs(lastPoint.x - x) < 2 && Math.abs(lastPoint.y - y) < 2) {
      return
    }
    
    this.gestureState.trail.push(newPoint)
    
    // 十分な移動距離があるかチェック
    if (this.calculateTrailDistance() >= this.settings.gestureThreshold) {
      this.gestureState.preventContextMenu = true
    }
    
    // Viewに軌跡更新を通知
    this.notifyView('gestureTrailUpdated', { trail: this.gestureState.trail })
  }

  /**
   * ジェスチャー記録を停止して認識実行
   * @returns {Promise<void>}
   */
  async stopGestureRecording() {
    if (!this.gestureState.isRecording) {
      return
    }
    
    this.gestureState.isRecording = false
    const trail = [...this.gestureState.trail]
    const preventContextMenu = this.gestureState.preventContextMenu
    
    // Viewに記録停止を通知
    this.notifyView('gestureRecordingStopped', { trail, preventContextMenu })
    
    // 十分な軌跡がある場合のみ認識実行
    if (trail.length >= 2 && this.calculateTrailDistance() >= this.settings.gestureThreshold) {
      await this.processGestureRecognition(trail)
    } else {
      this.updateStatus('ジェスチャーが短すぎます', 'warning', 1500)
    }
    
    // 状態をリセット
    this.resetGestureState()
    this.rateLimiter.lastGestureTime = Date.now()
  }

  /**
   * ジェスチャー認識を実行
   * @private
   * @param {Array} trail - 軌跡データ
   * @returns {Promise<void>}
   */
  async processGestureRecognition(trail) {
    const startTime = performance.now()
    
    try {
      this.updateStatus('ジェスチャーを認識中...', 'info')
      
      // 軌跡データを正規化
      const rawPoints = trail.map(point => ({
        x: point.x,
        y: point.y,
        timestamp: point.timestamp
      }))
      
      // ジェスチャー認識を実行
      const currentUrl = window.location.href
      const tabId = await this.getCurrentTabId()
      
      const result = await this.gestureService.executeGesture(rawPoints, currentUrl, tabId)
      
      // 認識結果を処理
      await this.handleRecognitionResult(result)
      
      // パフォーマンス測定
      const recognitionTime = performance.now() - startTime
      this.updatePerformanceMetrics(recognitionTime)
      
    } catch (error) {
      this.handleError('Gesture recognition failed', error)
      this.updateStatus('ジェスチャー認識に失敗しました', 'error')
      
      // Viewに認識失敗を通知
      this.notifyView('gestureRecognitionFailed', { error: error.message })
    }
  }

  /**
   * 認識結果を処理
   * @private
   * @param {Object} result - 認識結果
   * @returns {Promise<void>}
   */
  async handleRecognitionResult(result) {
    if (result.success && result.gesture) {
      // 成功した場合
      const gestureInfo = `${result.gesture.name} (${result.gesture.action})`
      this.updateStatus(`ジェスチャー実行: ${gestureInfo}`, 'success', 2000)
      
      // Viewに成功を通知
      this.notifyView('gestureRecognitionSuccess', {
        gesture: result.gesture,
        message: result.message,
        metadata: result.metadata
      })
      
    } else {
      // 認識できなかった場合
      const message = result.message || 'ジェスチャーを認識できませんでした'
      this.updateStatus(message, 'warning', 2000)
      
      // Viewに結果を通知
      this.notifyView('gestureRecognitionResult', {
        success: false,
        message: message
      })
    }
  }

  /**
   * 現在のタブIDを取得
   * @private
   * @returns {Promise<number>}
   */
  async getCurrentTabId() {
    try {
      // Chrome拡張機能のコンテキストでタブIDを取得
      if (typeof chrome !== 'undefined' && chrome.tabs) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
        return tabs[0]?.id || 0
      }
      return 0
    } catch (error) {
      console.warn('Failed to get current tab ID:', error)
      return 0
    }
  }

  /**
   * 軌跡の総移動距離を計算
   * @private
   * @returns {number}
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
   * ジェスチャー状態をリセット
   * @private
   */
  resetGestureState() {
    this.gestureState.isRecording = false
    this.gestureState.currentGesture = null
    this.gestureState.trail = []
    this.gestureState.startPosition = null
    this.gestureState.preventContextMenu = false
    
    // Viewに状態リセットを通知
    this.notifyView('gestureStateReset', {})
  }

  /**
   * パフォーマンス指標を更新
   * @private
   * @param {number} recognitionTime - 認識時間（ミリ秒）
   */
  updatePerformanceMetrics(recognitionTime) {
    this.performanceMetrics.recognitionCount++
    this.performanceMetrics.lastRecognitionTime = recognitionTime
    
    // 移動平均で平均認識時間を計算
    const alpha = 0.1 // 平滑化係数
    this.performanceMetrics.averageRecognitionTime = 
      this.performanceMetrics.averageRecognitionTime * (1 - alpha) + recognitionTime * alpha
  }

  /**
   * 設定変更の監視を開始
   * @private
   */
  startSettingsWatching() {
    try {
      this.settingsService.watchSettingsChanges((change) => {
        if (change.newSettings) {
          this.onSettingsChanged(change.newSettings)
        }
      })
    } catch (error) {
      console.warn('Failed to start settings watching:', error)
    }
  }

  /**
   * 設定変更時の処理
   * @private
   * @param {Object} newSettings - 新しい設定
   */
  onSettingsChanged(newSettings) {
    const oldSettings = { ...this.settings }
    
    // 設定を更新
    this.settings = {
      strokeColor: newSettings.stroke?.color || this.settings.strokeColor,
      strokeWidth: newSettings.stroke?.width || this.settings.strokeWidth,
      gestureThreshold: newSettings.gestureThreshold || this.settings.gestureThreshold,
      excludeList: newSettings.excludeList || this.settings.excludeList,
      gestureStates: newSettings.gestureStates || this.settings.gestureStates
    }
    
    this.gestureState.isEnabled = newSettings.enabled
    
    // 除外サイトチェック
    if (newSettings.enabled && !this.gestureState.isEnabled) {
      this.checkGestureAvailability()
    }
    
    // Viewに設定変更を通知
    this.notifyView('settingsChanged', {
      oldSettings,
      newSettings: this.settings,
      isEnabled: this.gestureState.isEnabled
    })
    
    this.updateStatus('設定が更新されました', 'info', 1500)
  }

  /**
   * 統計情報を取得
   * @returns {Object}
   */
  getStatistics() {
    return {
      gestureState: {
        isEnabled: this.gestureState.isEnabled,
        isRecording: this.gestureState.isRecording,
        trailLength: this.gestureState.trail.length
      },
      performance: { ...this.performanceMetrics },
      settings: { ...this.settings }
    }
  }

  /**
   * 現在の設定を取得
   * @returns {Object}
   */
  getCurrentSettings() {
    return { ...this.settings }
  }

  /**
   * ジェスチャー記録状態を取得
   * @returns {Object}
   */
  getRecordingState() {
    return {
      isRecording: this.gestureState.isRecording,
      trailLength: this.gestureState.trail.length,
      totalDistance: this.calculateTrailDistance(),
      preventContextMenu: this.gestureState.preventContextMenu
    }
  }

  /**
   * 強制的にジェスチャー記録を停止
   */
  forceStopRecording() {
    if (this.gestureState.isRecording) {
      this.gestureState.isRecording = false
      this.resetGestureState()
      this.updateStatus('ジェスチャー記録を強制停止しました', 'warning')
    }
  }

  /**
   * デバッグ情報を取得
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      gestureState: { ...this.gestureState },
      settings: { ...this.settings },
      performance: { ...this.performanceMetrics },
      rateLimiter: { ...this.rateLimiter },
      isInitialized: this.isInitialized
    }
  }

  /**
   * Viewに通知
   * @private
   * @param {string} event - イベント名
   * @param {Object} data - データ
   */
  notifyView(event, data) {
    // Viewからのリスナー登録があれば通知
    this.updateStatus(`View notification: ${event}`, 'debug')
  }

  /**
   * パフォーマンステストを実行
   * @returns {Promise<Object>}
   */
  async performanceTest() {
    const testResults = {
      recognitionTests: [],
      averageTime: 0,
      maxTime: 0,
      minTime: Infinity
    }
    
    try {
      // テスト用の軌跡データを生成
      const testTrails = [
        this.generateTestTrail('right'),
        this.generateTestTrail('left'),
        this.generateTestTrail('up'),
        this.generateTestTrail('down')
      ]
      
      for (const trail of testTrails) {
        const startTime = performance.now()
        
        try {
          await this.processGestureRecognition(trail)
          const endTime = performance.now()
          const duration = endTime - startTime
          
          testResults.recognitionTests.push({
            success: true,
            duration: duration,
            trailLength: trail.length
          })
          
          testResults.maxTime = Math.max(testResults.maxTime, duration)
          testResults.minTime = Math.min(testResults.minTime, duration)
          
        } catch (error) {
          testResults.recognitionTests.push({
            success: false,
            error: error.message,
            duration: 0
          })
        }
      }
      
      // 平均時間を計算
      const successfulTests = testResults.recognitionTests.filter(t => t.success)
      if (successfulTests.length > 0) {
        testResults.averageTime = successfulTests.reduce((sum, t) => sum + t.duration, 0) / successfulTests.length
      }
      
    } catch (error) {
      this.handleError('Performance test failed', error)
    }
    
    return testResults
  }

  /**
   * テスト用の軌跡データを生成
   * @private
   * @param {string} direction - 方向
   * @returns {Array}
   */
  generateTestTrail(direction) {
    const baseTime = Date.now()
    const points = []
    const stepSize = 10
    const totalSteps = 10
    
    for (let i = 0; i <= totalSteps; i++) {
      let x = 100
      let y = 100
      
      switch (direction) {
      case 'right':
        x += i * stepSize
        break
      case 'left':
        x -= i * stepSize
        break
      case 'down':
        y += i * stepSize
        break
      case 'up':
        y -= i * stepSize
        break
      }
      
      points.push({
        x: x,
        y: y,
        timestamp: baseTime + i * 10
      })
    }
    
    return points
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GesturePresenter }
}