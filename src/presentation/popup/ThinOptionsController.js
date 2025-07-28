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
    this.patternFormatter = new window.GesturePatternFormatter()
    
    // 描画コントローラー
    this.renderController = new window.OptionsRenderController({
      settingsUseCase: this.settingsUseCase,
      customGestureUseCase: this.customGestureUseCase,
      gestureListUseCase: this.gestureListUseCase,
      patternFormatter: this.patternFormatter,
      showStatus: (message, type, duration) => this.showStatus(message, type, duration)
    })
    
    // イベントコントローラー
    this.eventController = new window.OptionsEventController({
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
    
    // 外部レンダリングコールバックを設定
    this.renderController.externalRenderCustomGestureList = () => this.renderCustomGestureList()
    this.renderController.externalRenderGestureList = () => this.renderGestureList()
    
    // イベントコントローラーにコールバックを設定
    this.eventController.setCallbacks(
      async () => {
        await this.renderController.renderCustomGestureList()
        await this.renderController.renderGestureList()
      },
      (gestureId) => this.editCustomGesture(gestureId),
      (message) => this.showConfirm(message),
      () => this.eventController.getEditingGestureIdInternal(),
      () => this.exitEditMode(),
      async () => {
        // 削除時はアクションフィールドのみ保持、他はクリア
        console.log('🔧 [Debug] Delete callback: preserving action field only')
        
        // アクションフィールドの値を保存
        const actionField = document.getElementById('gestureAction')
        const preservedAction = actionField?.value || ''
        console.log('🔧 [Debug] Preserving action:', preservedAction)
        
        // UI更新
        await this.renderController.renderCustomGestureList()
        await this.renderController.renderGestureList()
        
        // アクションフィールドのみ復元（名前とパターンはクリア）
        const nameField = document.getElementById('gestureName')
        if (nameField) nameField.value = ''
        
        if (actionField && preservedAction) {
          actionField.value = preservedAction
          // changeイベントを発火して状態を同期
          actionField.dispatchEvent(new window.Event('change', { bubbles: true }))
          console.log('🔧 [Debug] Action field restored:', actionField.value)
        }
        
        // パターンをクリア
        if (this.eventController) {
          this.eventController.currentPattern = []
          this.eventController.updatePatternDisplay()
        }
        
        console.log('🔧 [Debug] Delete callback completed')
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
    console.log('🔧 [Debug] ThinOptionsController.updateUIFromSettings called with settings:', {
      fullSettings: settings,
      debugSettings: settings.debugSettings,
      debugSettingsLogLevel: settings.debugSettings?.logLevel,
      debugSettingsLogLevelType: typeof settings.debugSettings?.logLevel
    })
    
    // 基本設定
    this.updateElement('enabled', settings.enabled, 'checked')
    this.updateElement('strokeColor', settings.strokeColor, 'value')
    this.updateElement('strokeWidth', settings.strokeWidth, 'value')
    this.updateElement('strokeWidthValue', `${settings.strokeWidth}px`)
    this.updateElement('gestureThreshold', settings.gestureThreshold, 'value')
    this.updateElement('gestureThresholdValue', `${settings.gestureThreshold}px`)
    
    // デバッグ設定
    const debugSettings = settings.debugSettings || {}
    const debugEnabled = debugSettings.enabled || false
    // logLevelは数値0も有効なので、厳密にundefinedチェック
    const debugLogLevel = debugSettings.logLevel !== undefined ? debugSettings.logLevel : 2
    
    console.log('🔧 [Debug] ThinOptionsController.updateUIFromSettings - Debug settings processing:', {
      originalDebugSettings: debugSettings,
      originalLogLevel: debugSettings.logLevel,
      originalLogLevelType: typeof debugSettings.logLevel,
      processedDebugLogLevel: debugLogLevel,
      processedLogLevelType: typeof debugLogLevel,
      undefinedCheck: debugSettings.logLevel !== undefined,
      settingsSource: 'getCurrentSettings'
    })
    
    this.updateElement('debugEnabled', debugEnabled, 'checked')
    this.updateElement('debugLogLevel', debugLogLevel, 'value')
    this.updateElement('debugShowStatus', debugSettings.showStatus || false, 'checked')
    this.updateElement('debugStatusPosition', debugSettings.statusPosition || 'top-right', 'value')
    
    // デバッグオプションの表示/非表示制御
    const debugOptionsElement = document.getElementById('debugOptions')
    if (debugOptionsElement) {
      debugOptionsElement.style.display = debugEnabled ? 'block' : 'none'
    }
    
    // プレビュー更新
    this.updatePreview()
  }

  /**
   * 依存クラスの読み込み（テスト環境対応）
   * @private
   */
  loadDependencies() {
    // ブラウザ環境では何もしない（グローバルスコープから直接参照）
    // テスト環境ではrequireで読み込み
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
      if (elementId === 'debugLogLevel') {
        console.log('🔧 [Debug] ThinOptionsController.updateElement for debugLogLevel:', {
          elementId: elementId,
          value: value,
          valueType: typeof value,
          property: property,
          elementCurrentValue: element[property],
          elementType: element.tagName,
          isSelectElement: element.tagName === 'SELECT'
        })
      }
      
      if (property === 'checked') {
        element.checked = value
      } else if (element.tagName === 'SELECT' && property === 'value') {
        // SELECT要素の場合は明示的に文字列変換
        element[property] = String(value)
      } else {
        element[property] = value
      }
      
      if (elementId === 'debugLogLevel') {
        console.log('🔧 [Debug] ThinOptionsController.updateElement after update:', {
          elementFinalValue: element[property],
          elementFinalValueType: typeof element[property],
          stringConversion: String(value)
        })
      }
    } else if (elementId === 'debugLogLevel') {
      console.warn('🔧 [Debug] ThinOptionsController.updateElement - element not found:', elementId)
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
      // 編集対象のジェスチャーを取得
      const customGestures = await this.customGestureUseCase.getAllCustomGestures()
      const gesture = customGestures.find(g => g.id === gestureId)
      
      if (!gesture) {
        this.showStatus('編集対象のジェスチャーが見つかりません', 'error')
        return
      }

      // 編集フォームに値を設定
      this.updateElement('gestureName', gesture.name, 'value')
      this.updateElement('gestureAction', gesture.action, 'value')
      
      // パターンを設定（eventControllerの内部状態を更新）
      if (this.eventController) {
        this.eventController.currentPattern = this.convertPatternToDirectionArray(gesture.pattern)
        this.eventController.updatePatternDisplay()
      }
      
      // 編集モードに切り替え
      this.enterEditMode(gestureId)
      
      // カスタムジェスチャーセクションまでスクロール
      const customGestureSection = document.getElementById('customGestureSection')
      if (customGestureSection) {
        customGestureSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      
      this.showStatus('編集モードに入りました。フォームを変更して「更新」ボタンを押してください', 'info', 5000)
      
    } catch (error) {
      console.error('カスタムジェスチャー編集エラー:', error)
      this.showStatus('編集に失敗しました', 'error')
    }
  }

  /**
   * パターンを方向配列に変換
   * @param {Array|string} pattern - ジェスチャーパターン
   * @returns {Array} 方向配列
   * @private
   */
  convertPatternToDirectionArray(pattern) {
    if (Array.isArray(pattern)) {
      // 既に配列の場合はそのまま返す
      return pattern
    }
    
    if (typeof pattern === 'string') {
      // 文字列パターンの場合は方向に変換
      const directionMap = {
        '↑': 'UP',
        '↓': 'DOWN', 
        '←': 'LEFT',
        '→': 'RIGHT'
      }
      
      return pattern.split('').map(char => directionMap[char]).filter(Boolean)
    }
    
    // その他の形式の場合は空配列を返す
    return []
  }

  /**
   * 編集モードに入る（EventControllerに委譲）
   * @param {string} gestureId - 編集中のジェスチャーID
   * @private
   */
  enterEditMode(gestureId) {
    this.eventController.enterEditMode(gestureId)
  }

  /**
   * 編集モードを終了（EventControllerに委譲）
   * @private
   */
  exitEditMode() {
    this.eventController.exitEditModeInternal()
  }

  /**
   * HTMLエスケープ（RenderControllerに委譲）
   * @param {string} text - エスケープ対象文字列
   * @returns {string} エスケープ済み文字列
   */
  escapeHtml(text) {
    return this.renderController.escapeHtml(text)
  }

  // ========== 公開API（後方互換性のため） ==========

  /**
   * ジェスチャー一覧を再描画
   * @returns {Promise<void>}
   */
  renderGestureList() {
    return this.renderController.renderGestureList()
  }

  /**
   * カスタムジェスチャー一覧を再描画
   * @returns {Promise<void>}
   */
  renderCustomGestureList() {
    return this.renderController.renderCustomGestureList()
  }

  /**
   * 除外サイト一覧を再描画
   * @returns {Promise<void>}
   */
  renderExcludeList() {
    return this.renderController.renderExcludeList()
  }

  // ========== GesturePatternFormatter委譲メソッド（テスト互換性のため） ==========

  /**
   * パターンを矢印表記に変換（委譲）
   * @param {*} pattern - ジェスチャーパターン
   * @param {number} maxLength - 最大表示長
   * @returns {string} 矢印表記のパターン
   */
  formatPatternToArrows(pattern, maxLength = 8) {
    return this.patternFormatter.formatPatternToArrows(pattern, maxLength)
  }

  /**
   * アクションの表示名を取得（委譲）
   * @param {string} action - アクション名
   * @returns {string} 表示用アクション名
   */
  getActionDisplayName(action) {
    return this.patternFormatter.getActionDisplayName(action)
  }

  /**
   * カスタムジェスチャー一覧のHTML生成（委譲）
   * @param {Array} gestures - ジェスチャー配列
   * @returns {string} HTML文字列
   */
  buildCustomGestureListHTML(gestures) {
    return this.renderController.buildCustomGestureListHTML(gestures)
  }

  /**
   * 方向文字列を矢印に変換（委譲）
   * @param {string} direction - 方向文字列
   * @returns {string} 矢印文字
   */
  directionToArrow(direction) {
    return this.patternFormatter.directionToArrow(direction)
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