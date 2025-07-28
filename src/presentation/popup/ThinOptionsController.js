/**
 * ThinOptionsController - 統合コントローラー（真に薄い実装）
 * 各専用コントローラーを統合し、初期化・コーディネートのみを担当
 * Clean Architecture - Presentation層
 */

class ThinOptionsController {
  /**
   * @param {Object} dependencies - 依存関係
   * @param {Object} dependencies.settingsUseCase - 設定UseCase
   * @param {Object} dependencies.customGestureUseCase - カスタムジェスチャーUseCase
   * @param {Object} dependencies.gestureListUseCase - ジェスチャー一覧UseCase
   */
  constructor(dependencies) {
    this.settingsUseCase = dependencies.settingsUseCase
    this.customGestureUseCase = dependencies.customGestureUseCase
    this.gestureListUseCase = dependencies.gestureListUseCase
    
    this.isInitialized = false
    
    // 専用コントローラーの初期化
    this.initializeControllers()
  }

  /**
   * 専用コントローラーの初期化
   * @private
   */
  initializeControllers() {
    // 依存クラスの読み込み（テスト環境対応）
    this.loadDependencies()
    
    // パターンフォーマッター
    this.patternFormatter = new GesturePatternFormatter()
    
    // 描画コントローラー
    this.renderController = new OptionsRenderController({
      settingsUseCase: this.settingsUseCase,
      customGestureUseCase: this.customGestureUseCase,
      gestureListUseCase: this.gestureListUseCase,
      patternFormatter: this.patternFormatter,
      showStatus: (message, type, duration) => this.showStatus(message, type, duration)
    })
    
    // イベントコントローラー
    this.eventController = new OptionsEventController({
      settingsUseCase: this.settingsUseCase,
      customGestureUseCase: this.customGestureUseCase,
      showStatus: (message, type, duration) => this.showStatus(message, type, duration),
      updateElement: (elementId, value, property) => this.updateElement(elementId, value, property),
      updatePreview: () => this.updatePreview(),
      renderExcludeList: () => this.renderController.renderExcludeList()
    })
    
    // 相互参照の設定
    this.setupControllerInteractions()
  }

  /**
   * コントローラー間の相互作用を設定
   * @private
   */
  setupControllerInteractions() {
    // 描画コントローラーに外部ハンドラーを設定
    this.renderController.setExternalHandlers(
      (gestureId) => this.editCustomGesture(gestureId),
      (message) => this.showConfirm(message)
    )
    
    // イベントコントローラーにコールバックを設定
    this.eventController.setCallbacks(
      async () => {
        await this.renderController.renderCustomGestureList()
        await this.renderController.renderGestureList()
      }
    )
  }

  /**
   * 初期化（統合的な初期化処理）
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // イベント設定
      this.eventController.setupBasicSettingsEvents()
      this.eventController.setupGestureListEvents()
      this.eventController.setupCustomGestureEvents()
      this.eventController.setupExcludeSiteEvents()
      this.eventController.setupDebugEvents()
      
      // 初期データ読み込み
      await this.loadInitialData()
      
      this.isInitialized = true
      
    } catch (error) {
      console.error('❌ Thin Options Controller: Initialization failed:', error)
      this.showStatus('設定画面の初期化に失敗しました', 'error')
    }
  }

  /**
   * 初期データの読み込み
   * @returns {Promise<void>}
   * @private
   */
  async loadInitialData() {
    try {
      // 設定取得
      const settings = await this.settingsUseCase.getCurrentSettings()
      this.updateUIFromSettings(settings)

      // ジェスチャー一覧表示
      await this.renderController.renderGestureList()
      
      // カスタムジェスチャー一覧表示
      await this.renderController.renderCustomGestureList()
      
      // 除外サイト一覧表示
      await this.renderController.renderExcludeList()
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error)
      this.showStatus('初期データの読み込みに失敗しました', 'error')
    }
  }

  /**
   * 設定からUIを更新
   * @param {Settings} settings - 設定オブジェクト
   * @private
   */
  updateUIFromSettings(settings) {
    // 基本設定
    this.updateElement('enabled', settings.enabled, 'checked')
    this.updateElement('strokeColor', settings.strokeColor, 'value')
    this.updateElement('strokeWidth', settings.strokeWidth, 'value')
    this.updateElement('strokeWidthValue', `${settings.strokeWidth}px`)
    this.updateElement('gestureThreshold', settings.gestureThreshold, 'value')
    this.updateElement('gestureThresholdValue', `${settings.gestureThreshold}px`)
    
    // デバッグ設定
    const debugSettings = settings.debugSettings || {}
    this.updateElement('debugEnabled', debugSettings.enabled || false, 'checked')
    this.updateElement('debugLogLevel', debugSettings.logLevel || 2, 'value')
    this.updateElement('debugShowStatus', debugSettings.showStatus || false, 'checked')
    this.updateElement('debugStatusPosition', debugSettings.statusPosition || 'top-right', 'value')
    
    // プレビュー更新
    this.updatePreview()
  }

  /**
   * 依存クラスの読み込み（テスト環境対応）
   * @private
   */
  loadDependencies() {
    // Node.js/テスト環境での依存クラス読み込み
    if (typeof module !== 'undefined' && typeof require !== 'undefined') {
      try {
        const { GesturePatternFormatter } = require('../controllers/GesturePatternFormatter')
        const { OptionsRenderController } = require('../controllers/OptionsRenderController')
        const { OptionsEventController } = require('../controllers/OptionsEventController')
        
        // グローバルに定義（既に定義されていない場合のみ）
        if (typeof global !== 'undefined') {
          global.GesturePatternFormatter = global.GesturePatternFormatter || GesturePatternFormatter
          global.OptionsRenderController = global.OptionsRenderController || OptionsRenderController
          global.OptionsEventController = global.OptionsEventController || OptionsEventController
        }
      } catch (error) {
        console.warn('Failed to load dependencies in test environment:', error)
      }
    }
  }

  // ========== ユーティリティメソッド ==========

  /**
   * 要素更新
   * @param {string} elementId - 要素ID
   * @param {*} value - 設定値
   * @param {string} property - プロパティ名
   */
  updateElement(elementId, value, property = 'textContent') {
    const element = document.getElementById(elementId)
    if (element) {
      if (property === 'checked') {
        element.checked = value
      } else {
        element[property] = value
      }
    }
  }

  /**
   * プレビュー更新
   */
  updatePreview() {
    const canvas = document.getElementById('previewCanvas')
    const color = document.getElementById('strokeColor')?.value || '#2196F3'
    const width = parseInt(document.getElementById('strokeWidth')?.value || 3)
    
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.beginPath()
      ctx.moveTo(20, 50)
      ctx.lineTo(80, 30)
      ctx.lineTo(140, 70)
      ctx.lineTo(180, 50)
      ctx.stroke()
    }
  }

  /**
   * ステータス表示
   * @param {string} message - メッセージ
   * @param {string} type - タイプ（success, error, info）
   * @param {number} duration - 表示時間（ms）
   */
  showStatus(message, type = 'info', duration = 3000) {
    const statusElement = document.getElementById('saveStatus')
    if (statusElement) {
      statusElement.textContent = message
      statusElement.className = `save-status ${type}`
      statusElement.style.display = 'block'
      
      if (duration > 0) {
        setTimeout(() => {
          statusElement.style.display = 'none'
        }, duration)
      }
    }
  }

  /**
   * 確認ダイアログ
   * @param {string} message - 確認メッセージ
   * @returns {Promise<boolean>} 確認結果
   */
  showConfirm(message) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('confirmDialog')
      const messageEl = document.getElementById('confirmMessage')
      const okBtn = document.getElementById('confirmOk')
      const cancelBtn = document.getElementById('confirmCancel')
      
      if (dialog && messageEl && okBtn && cancelBtn) {
        messageEl.textContent = message
        dialog.style.display = 'flex'
        
        const handleOk = () => {
          dialog.style.display = 'none'
          okBtn.removeEventListener('click', handleOk)
          cancelBtn.removeEventListener('click', handleCancel)
          resolve(true)
        }
        
        const handleCancel = () => {
          dialog.style.display = 'none'
          okBtn.removeEventListener('click', handleOk)
          cancelBtn.removeEventListener('click', handleCancel)
          resolve(false)
        }
        
        okBtn.addEventListener('click', handleOk)
        cancelBtn.addEventListener('click', handleCancel)
        okBtn.focus()
      } else {
        // フォールバック
        // eslint-disable-next-line no-alert
        resolve(confirm(message))
      }
    })
  }

  /**
   * カスタムジェスチャー編集
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<void>}
   */
  async editCustomGesture(gestureId) {
    try {
      // 編集ダイアログの表示（実装省略）
      console.log('Edit gesture:', gestureId)
      this.showStatus('編集機能は実装中です', 'info')
    } catch (error) {
      console.error('カスタムジェスチャー編集エラー:', error)
      this.showStatus('編集に失敗しました', 'error')
    }
  }

  /**
   * HTMLエスケープ
   * @param {string} text - エスケープ対象文字列
   * @returns {string} エスケープ済み文字列
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // ========== 公開API（後方互換性のため） ==========

  /**
   * ジェスチャー一覧を再描画
   * @returns {Promise<void>}
   */
  async renderGestureList() {
    return await this.renderController.renderGestureList()
  }

  /**
   * カスタムジェスチャー一覧を再描画
   * @returns {Promise<void>}
   */
  async renderCustomGestureList() {
    return await this.renderController.renderCustomGestureList()
  }

  /**
   * 除外サイト一覧を再描画
   * @returns {Promise<void>}
   */
  async renderExcludeList() {
    return await this.renderController.renderExcludeList()
  }
}

// CommonJS用のエクスポート（テスト対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThinOptionsController }
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.ThinOptionsController = ThinOptionsController
}