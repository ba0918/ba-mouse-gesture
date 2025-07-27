/**
 * LegacyIntegrationAdapter
 * 既存レガシーコードと新しいクリーンアーキテクチャを統合するアダプター
 * 段階的移行をサポートし、後方互換性を維持
 */

// 新アーキテクチャのインポート
let createServiceFactory, getServiceFactory
let OptionsPresenter, GesturePresenter
let OptionsView, GestureView
let SettingsViewModel, CustomGestureViewModel

if (typeof require !== 'undefined') {
  const serviceFactoryModule = require('../../application/services/ServiceFactory')
  createServiceFactory = serviceFactoryModule.createServiceFactory
  getServiceFactory = serviceFactoryModule.getServiceFactory
  
  const optionsPresenterModule = require('../presenters/OptionsPresenter')
  OptionsPresenter = optionsPresenterModule.OptionsPresenter
  
  const gesturePresenterModule = require('../presenters/GesturePresenter')
  GesturePresenter = gesturePresenterModule.GesturePresenter
  
  const optionsViewModule = require('../views/OptionsView')
  OptionsView = optionsViewModule.OptionsView
  
  const gestureViewModule = require('../views/GestureView')
  GestureView = gestureViewModule.GestureView
  
  const settingsViewModelModule = require('../viewmodels/SettingsViewModel')
  SettingsViewModel = settingsViewModelModule.SettingsViewModel
  
  const customGestureViewModelModule = require('../viewmodels/CustomGestureViewModel')
  CustomGestureViewModel = customGestureViewModelModule.CustomGestureViewModel
}

/**
 * レガシー統合アダプター
 */
class LegacyIntegrationAdapter {
  constructor() {
    this.serviceFactory = null
    this.services = {}
    this.presenters = {}
    this.views = {}
    this.isInitialized = false
    
    // レガシーAPI互換性のための状態
    this.legacyState = {
      currentSettings: null,
      customGestures: [],
      lastError: null
    }
    
    // イベントリスナー管理
    this.eventListeners = new Map()
  }

  /**
   * アダプターの初期化
   * @param {Object} config - 初期化設定
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    if (this.isInitialized) {
      return
    }

    try {
      // 1. ServiceFactory の初期化
      this.serviceFactory = await this._initializeServiceFactory(config)
      
      // 2. サービスの取得
      this.services = this.serviceFactory.getAllServices()
      
      // 3. ビューとプレゼンターの初期化（必要に応じて）
      if (config.initializeViews !== false) {
        await this._initializeViews(config)
      }
      
      // 4. レガシー状態の初期化
      await this._initializeLegacyState()
      
      // 5. グローバルAPI の設定
      this._setupGlobalAPIs()
      
      this.isInitialized = true
      
    } catch (error) {
      console.error('LegacyIntegrationAdapter initialization failed:', error)
      throw new LegacyIntegrationAdapterError('Failed to initialize adapter', error)
    }
  }

  /**
   * ServiceFactory の初期化
   * @private
   */
  async _initializeServiceFactory(config) {
    // 既存のファクトリがあればそれを使用
    let factory = getServiceFactory()
    
    if (!factory) {
      factory = await createServiceFactory(config)
    }
    
    return factory
  }

  /**
   * ビューとプレゼンターの初期化
   * @private
   */
  async _initializeViews(config) {
    // 設定画面が存在する場合のみ初期化
    if (document.getElementById('enabled') || config.forceOptionsView) {
      await this._initializeOptionsView()
    }
    
    // ジェスチャー検出は常に利用可能
    await this._initializeGestureView()
  }

  /**
   * Options画面の初期化
   * @private
   */
  async _initializeOptionsView() {
    try {
      // ViewModel の作成
      const settingsViewModel = new SettingsViewModel()
      const customGestureViewModel = new CustomGestureViewModel()
      
      // Presenter の作成
      this.presenters.options = new OptionsPresenter(
        this.services.settingsService,
        this.services.gestureService,
        settingsViewModel,
        customGestureViewModel
      )
      
      // View の作成
      this.views.options = new OptionsView()
      this.views.options.setPresenter(this.presenters.options)
      
      // 初期化
      await this.presenters.options.initialize()
      await this.views.options.initialize()
      
    } catch (error) {
      console.warn('Options view initialization failed:', error)
    }
  }

  /**
   * Gesture画面の初期化
   * @private
   */
  async _initializeGestureView() {
    try {
      // Presenter の作成
      this.presenters.gesture = new GesturePresenter(
        this.services.gestureService,
        this.services.settingsService
      )
      
      // View の作成
      this.views.gesture = new GestureView()
      this.views.gesture.setPresenter(this.presenters.gesture)
      
      // 初期化
      await this.presenters.gesture.initialize()
      await this.views.gesture.initialize()
      
    } catch (error) {
      console.warn('Gesture view initialization failed:', error)
    }
  }

  /**
   * レガシー状態の初期化
   * @private
   */
  async _initializeLegacyState() {
    try {
      // 現在の設定を取得
      this.legacyState.currentSettings = await this.services.settingsService.getCurrentSettings()
      
      // カスタムジェスチャーを取得
      this.legacyState.customGestures = await this.services.gestureService.getCustomGestures()
      
    } catch (error) {
      console.warn('Legacy state initialization failed:', error)
      this.legacyState.lastError = error
    }
  }

  /**
   * グローバルAPIの設定（レガシー互換性）
   * @private
   */
  _setupGlobalAPIs() {
    // レガシーコードがアクセスできるグローバルオブジェクト
    if (typeof window !== 'undefined') {
      window.MouseGestureAdapter = this
      window.MouseGestureServices = this.services
      
      // 後方互換性のためのエイリアス
      window.getMouseGestureSettings = () => this.legacyState.currentSettings
      window.updateMouseGestureSettings = (updates) => this.updateLegacySettings(updates)
      window.executeMouseGesture = (points, url, tabId) => this.executeLegacyGesture(points, url, tabId)
    }
  }

  // Public Legacy API methods

  /**
   * レガシー設定の更新
   * @param {Object} updates - 設定更新
   * @returns {Promise<Object>}
   */
  async updateLegacySettings(updates) {
    try {
      let updatedSettings = this.legacyState.currentSettings
      
      // 基本設定の更新
      if (updates.enabled !== undefined) {
        updatedSettings = await this.services.settingsService.toggleExtension(updates.enabled)
      }
      
      if (updates.strokeColor || updates.strokeWidth) {
        const color = updates.strokeColor || updatedSettings.stroke.color
        const width = updates.strokeWidth || updatedSettings.stroke.width
        updatedSettings = await this.services.settingsService.updateStrokeSettings(color, width)
      }
      
      if (updates.gestureThreshold !== undefined) {
        updatedSettings = await this.services.settingsService.updateGestureThreshold(updates.gestureThreshold)
      }
      
      // ジェスチャー個別設定
      if (updates.gestureStates) {
        for (const [gestureId, enabled] of Object.entries(updates.gestureStates)) {
          updatedSettings = await this.services.settingsService.toggleGesture(gestureId, enabled)
        }
      }
      
      // 除外サイト
      if (updates.addExcludeSite) {
        updatedSettings = await this.services.settingsService.addExcludeSite(updates.addExcludeSite)
      }
      if (updates.removeExcludeSite) {
        updatedSettings = await this.services.settingsService.removeExcludeSite(updates.removeExcludeSite)
      }
      
      // デバッグ設定
      if (updates.debugSettings) {
        updatedSettings = await this.services.settingsService.updateDebugSettings(updates.debugSettings)
      }
      
      // レガシー状態を更新
      this.legacyState.currentSettings = updatedSettings
      
      // イベント通知
      this._notifyLegacyListeners('settingsUpdated', updatedSettings)
      
      return updatedSettings
      
    } catch (error) {
      this.legacyState.lastError = error
      throw error
    }
  }

  /**
   * レガシージェスチャー実行
   * @param {Array} points - マウス軌跡
   * @param {string} url - 現在のURL
   * @param {number} tabId - タブID
   * @returns {Promise<Object>}
   */
  async executeLegacyGesture(points, url, tabId) {
    try {
      const result = await this.services.gestureService.executeGesture(points, url, tabId)
      
      // イベント通知
      this._notifyLegacyListeners('gestureExecuted', result)
      
      return result
      
    } catch (error) {
      this.legacyState.lastError = error
      this._notifyLegacyListeners('gestureError', error)
      throw error
    }
  }

  /**
   * レガシーカスタムジェスチャー作成
   * @param {string} name - ジェスチャー名
   * @param {Array} points - 軌跡データ
   * @param {string} action - アクション
   * @param {string} description - 説明
   * @returns {Promise<Object>}
   */
  async createLegacyCustomGesture(name, points, action, description) {
    try {
      const gesture = await this.services.gestureService.createCustomGesture(name, points, action, description)
      
      // レガシー状態を更新
      this.legacyState.customGestures.push(gesture)
      
      // イベント通知
      this._notifyLegacyListeners('customGestureCreated', gesture)
      
      return gesture
      
    } catch (error) {
      this.legacyState.lastError = error
      throw error
    }
  }

  /**
   * レガシーカスタムジェスチャー一覧取得
   * @returns {Promise<Array>}
   */
  async getLegacyCustomGestures() {
    try {
      const gestures = await this.services.gestureService.getCustomGestures()
      this.legacyState.customGestures = gestures
      return gestures
      
    } catch (error) {
      this.legacyState.lastError = error
      throw error
    }
  }

  /**
   * レガシー統計情報取得
   * @returns {Promise<Object>}
   */
  async getLegacyStatistics() {
    try {
      const [gestureStats, systemMetrics] = await Promise.all([
        this.services.gestureService.getGestureStatistics(),
        this.services.systemService.getSystemMetrics()
      ])
      
      return {
        gesture: gestureStats,
        system: systemMetrics,
        factory: await this.serviceFactory.getFactoryStatistics()
      }
      
    } catch (error) {
      this.legacyState.lastError = error
      throw error
    }
  }

  // Event management for legacy compatibility

  /**
   * レガシーイベントリスナーの追加
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  addLegacyEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set())
    }
    this.eventListeners.get(event).add(callback)
  }

  /**
   * レガシーイベントリスナーの削除
   * @param {string} event - イベント名
   * @param {Function} callback - コールバック関数
   */
  removeLegacyEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).delete(callback)
    }
  }

  /**
   * レガシーリスナーへの通知
   * @private
   * @param {string} event - イベント名
   * @param {*} data - データ
   */
  _notifyLegacyListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`Legacy event listener error for ${event}:`, error)
        }
      })
    }
  }

  // Utility methods

  /**
   * 現在の状態を取得（デバッグ用）
   * @returns {Object}
   */
  getAdapterState() {
    return {
      isInitialized: this.isInitialized,
      hasServiceFactory: Boolean(this.serviceFactory),
      services: Object.keys(this.services),
      presenters: Object.keys(this.presenters),
      views: Object.keys(this.views),
      legacyState: {
        hasSettings: Boolean(this.legacyState.currentSettings),
        customGesturesCount: this.legacyState.customGestures.length,
        hasError: Boolean(this.legacyState.lastError)
      },
      eventListeners: Array.from(this.eventListeners.keys())
    }
  }

  /**
   * 健全性チェック
   * @returns {Promise<Object>}
   */
  async performHealthCheck() {
    try {
      if (!this.isInitialized) {
        return { isHealthy: false, message: 'Adapter not initialized' }
      }
      
      const systemHealth = await this.services.systemService.performHealthCheck()
      const adapterState = this.getAdapterState()
      
      return {
        isHealthy: systemHealth.isHealthy && adapterState.hasServiceFactory,
        system: systemHealth,
        adapter: adapterState,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      return {
        isHealthy: false,
        message: `Health check failed: ${error.message}`,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * アダプターのリセット
   * @returns {Promise<void>}
   */
  async reset() {
    try {
      // ビューとプレゼンターの破棄
      Object.values(this.views).forEach(view => {
        if (view.dispose) view.dispose()
      })
      Object.values(this.presenters).forEach(presenter => {
        if (presenter.dispose) presenter.dispose()
      })
      
      // ServiceFactory のリセット
      if (this.serviceFactory) {
        await this.serviceFactory.reset()
      }
      
      // 状態をクリア
      this.services = {}
      this.presenters = {}
      this.views = {}
      this.legacyState = {
        currentSettings: null,
        customGestures: [],
        lastError: null
      }
      this.eventListeners.clear()
      
      this.isInitialized = false
      
    } catch (error) {
      console.error('Adapter reset failed:', error)
      throw new LegacyIntegrationAdapterError('Failed to reset adapter', error)
    }
  }

  /**
   * アダプターの破棄
   * @returns {Promise<void>}
   */
  async dispose() {
    await this.reset()
    
    // グローバルAPIのクリーンアップ
    if (typeof window !== 'undefined') {
      delete window.MouseGestureAdapter
      delete window.MouseGestureServices
      delete window.getMouseGestureSettings
      delete window.updateMouseGestureSettings
      delete window.executeMouseGesture
    }
  }
}

/**
 * LegacyIntegrationAdapter専用エラークラス
 */
class LegacyIntegrationAdapterError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'LegacyIntegrationAdapterError'
    this.originalError = originalError
  }
}

/**
 * シングルトンアダプターのインスタンス管理
 */
let adapterInstance = null

/**
 * アダプターインスタンスの取得/作成
 * @param {Object} config - 初期化設定
 * @returns {Promise<LegacyIntegrationAdapter>}
 */
async function getOrCreateAdapter(config = {}) {
  if (!adapterInstance) {
    adapterInstance = new LegacyIntegrationAdapter()
    await adapterInstance.initialize(config)
  }
  return adapterInstance
}

/**
 * 既存のアダプターインスタンスを取得
 * @returns {LegacyIntegrationAdapter|null}
 */
function getAdapter() {
  return adapterInstance && adapterInstance.isInitialized ? adapterInstance : null
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    LegacyIntegrationAdapter, 
    LegacyIntegrationAdapterError,
    getOrCreateAdapter,
    getAdapter
  }
}