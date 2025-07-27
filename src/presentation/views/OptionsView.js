/**
 * OptionsView
 * 設定画面のDOM操作とイベントハンドリングを担当
 */

class OptionsView {
  constructor() {
    this.presenter = null
    this.elements = {}
    this.eventHandlers = []
    this.isInitialized = false

    // イベントハンドラーのバインド
    this.boundHandlers = {
      onExtensionToggle: this.onExtensionToggle.bind(this),
      onStrokeColorChange: this.onStrokeColorChange.bind(this),
      onStrokeWidthChange: this.onStrokeWidthChange.bind(this),
      onGestureThresholdChange: this.onGestureThresholdChange.bind(this),
      onGestureToggle: this.onGestureToggle.bind(this),
      onAddExcludeSite: this.onAddExcludeSite.bind(this),
      onRemoveExcludeSite: this.onRemoveExcludeSite.bind(this),
      onDebugSettingChange: this.onDebugSettingChange.bind(this),
      onResetSettings: this.onResetSettings.bind(this),
      onExportSettings: this.onExportSettings.bind(this),
      onImportSettings: this.onImportSettings.bind(this),
      onValidateSettings: this.onValidateSettings.bind(this)
    }
  }

  /**
   * Presenterを設定
   * @param {OptionsPresenter} presenter
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
      // DOM要素を取得
      await this.findElements()

      // イベントリスナーを設定
      await this.setupEventListeners()

      // Presenterからの通知を受信
      await this.setupPresenterListeners()

      // 初期表示を更新
      await this.updateDisplay()

      this.isInitialized = true

    } catch (error) {
      console.error('Failed to initialize OptionsView:', error)
      throw error
    }
  }

  /**
   * 破棄
   */
  dispose() {
    // イベントリスナーを削除
    this.removeEventListeners()

    // 要素参照をクリア
    this.elements = {}
    this.presenter = null
    this.isInitialized = false
  }

  /**
   * DOM要素を取得
   * @private
   */
  findElements() {
    this.elements = {
      // 基本設定
      enabled: document.getElementById('enabled'),
      strokeColor: document.getElementById('strokeColor'),
      strokeWidth: document.getElementById('strokeWidth'),
      strokeWidthValue: document.getElementById('strokeWidthValue'),
      gestureThreshold: document.getElementById('gestureThreshold'),
      gestureThresholdValue: document.getElementById('gestureThresholdValue'),

      // プレビュー
      strokePreview: document.getElementById('strokePreview'),

      // ジェスチャー設定
      gestureToggles: document.querySelectorAll('[data-gesture-id]'),

      // 除外サイト
      newExcludeUrl: document.getElementById('newExcludeUrl'),
      addExcludeBtn: document.getElementById('addExcludeBtn'),
      excludeList: document.getElementById('excludeList'),

      // デバッグ設定
      debugEnabled: document.getElementById('debugEnabled'),
      debugLogLevel: document.getElementById('debugLogLevel'),
      debugShowStatus: document.getElementById('debugShowStatus'),
      debugStatusPosition: document.getElementById('debugStatusPosition'),

      // 操作ボタン
      resetBtn: document.getElementById('resetBtn'),
      exportBtn: document.getElementById('exportBtn'),
      importBtn: document.getElementById('importBtn'),
      validateBtn: document.getElementById('validateBtn'),

      // ステータス表示
      saveStatus: document.getElementById('saveStatus'),
      statusMessage: document.getElementById('statusMessage'),

      // 統計表示
      statsEnabled: document.getElementById('statsEnabled'),
      statsEnabledGestures: document.getElementById('statsEnabledGestures'),
      statsExcludeCount: document.getElementById('statsExcludeCount'),
      statsLastModified: document.getElementById('statsLastModified')
    }

    // 必須要素の存在チェック
    const requiredElements = ['enabled', 'strokeColor', 'strokeWidth', 'gestureThreshold']
    for (const elementId of requiredElements) {
      if (!this.elements[elementId]) {
        throw new Error(`Required element not found: ${elementId}`)
      }
    }
  }

  /**
   * イベントリスナーを設定
   * @private
   */
  setupEventListeners() {
    // 基本設定のイベント
    this.addEventListener(this.elements.enabled, 'change', this.boundHandlers.onExtensionToggle)
    this.addEventListener(this.elements.strokeColor, 'change', this.boundHandlers.onStrokeColorChange)
    this.addEventListener(this.elements.strokeWidth, 'input', this.boundHandlers.onStrokeWidthChange)
    this.addEventListener(this.elements.gestureThreshold, 'input', this.boundHandlers.onGestureThresholdChange)

    // ジェスチャー切り替え
    this.elements.gestureToggles.forEach(toggle => {
      this.addEventListener(toggle, 'change', this.boundHandlers.onGestureToggle)
    })

    // 除外サイト管理
    if (this.elements.addExcludeBtn) {
      this.addEventListener(this.elements.addExcludeBtn, 'click', this.boundHandlers.onAddExcludeSite)
    }
    if (this.elements.newExcludeUrl) {
      this.addEventListener(this.elements.newExcludeUrl, 'keypress', (e) => {
        if (e.key === 'Enter') {
          this.boundHandlers.onAddExcludeSite()
        }
      })
    }

    // デバッグ設定
    if (this.elements.debugEnabled) {
      this.addEventListener(this.elements.debugEnabled, 'change', this.boundHandlers.onDebugSettingChange)
    }
    if (this.elements.debugLogLevel) {
      this.addEventListener(this.elements.debugLogLevel, 'change', this.boundHandlers.onDebugSettingChange)
    }
    if (this.elements.debugShowStatus) {
      this.addEventListener(this.elements.debugShowStatus, 'change', this.boundHandlers.onDebugSettingChange)
    }
    if (this.elements.debugStatusPosition) {
      this.addEventListener(this.elements.debugStatusPosition, 'change', this.boundHandlers.onDebugSettingChange)
    }

    // 操作ボタン
    if (this.elements.resetBtn) {
      this.addEventListener(this.elements.resetBtn, 'click', this.boundHandlers.onResetSettings)
    }
    if (this.elements.exportBtn) {
      this.addEventListener(this.elements.exportBtn, 'click', this.boundHandlers.onExportSettings)
    }
    if (this.elements.importBtn) {
      this.addEventListener(this.elements.importBtn, 'change', this.boundHandlers.onImportSettings)
    }
    if (this.elements.validateBtn) {
      this.addEventListener(this.elements.validateBtn, 'click', this.boundHandlers.onValidateSettings)
    }
  }

  /**
   * Presenterからの通知を受信
   * @private
   */
  setupPresenterListeners() {
    if (!this.presenter) return

    // ViewModelの変更を監視
    const viewModel = this.presenter.getViewModel()
    if (viewModel) {
      viewModel.onChange((key, newValue) => {
        this.updateDisplayForProperty(key, newValue)
      })
    }

    // Presenterのステータス変更を監視
    this.presenter.onStatus((statusInfo) => {
      this.updateStatus(statusInfo.message, statusInfo.type, statusInfo.duration)
    })

    // Presenterのエラーを監視
    this.presenter.onError((errorInfo) => {
      this.updateStatus(`エラー: ${errorInfo.message}`, 'error')
    })
  }

  /**
   * イベントリスナーを安全に追加
   * @private
   * @param {Element} element
   * @param {string} event
   * @param {Function} handler
   * @param {Object} options
   */
  addEventListener(element, event, handler, options = {}) {
    if (!element) return

    element.addEventListener(event, handler, options)
    this.eventHandlers.push({ element, event, handler, options })
  }

  /**
   * イベントリスナーを削除
   * @private
   */
  removeEventListeners() {
    this.eventHandlers.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options)
      }
    })
    this.eventHandlers = []
  }

  /**
   * 表示を更新
   */
  updateDisplay() {
    if (!this.presenter) return

    const viewModel = this.presenter.getViewModel()
    if (!viewModel) return

    // 基本設定の表示更新
    this.updateBasicSettings(viewModel)

    // ジェスチャー設定の表示更新
    this.updateGestureSettings(viewModel)

    // 除外サイト一覧の表示更新
    this.updateExcludeList(viewModel)

    // デバッグ設定の表示更新
    this.updateDebugSettings(viewModel)

    // 統計情報の表示更新
    this.updateStatistics(viewModel)

    // プレビューの更新
    this.updatePreview(viewModel)
  }

  /**
   * 特定プロパティの表示を更新
   * @param {string} property
   * @param {*} value
   */
  updateDisplayForProperty(property, value) {
    switch (property) {
    case 'enabled':
      if (this.elements.enabled) {
        this.elements.enabled.checked = value
      }
      break

    case 'strokeColor':
      if (this.elements.strokeColor) {
        this.elements.strokeColor.value = value
      }
      this.updatePreview()
      break

    case 'strokeWidth':
      if (this.elements.strokeWidth) {
        this.elements.strokeWidth.value = value
      }
      if (this.elements.strokeWidthValue) {
        this.elements.strokeWidthValue.textContent = `${value}px`
      }
      this.updatePreview()
      break

    case 'gestureThreshold':
      if (this.elements.gestureThreshold) {
        this.elements.gestureThreshold.value = value
      }
      if (this.elements.gestureThresholdValue) {
        this.elements.gestureThresholdValue.textContent = `${value}px`
      }
      break

    case 'gestureStates':
      this.updateGestureToggles(value)
      break

    case 'excludeList':
      this.renderExcludeList(value)
      break

    case 'debugSettings':
      this.updateDebugControls(value)
      break

    case 'saveStatus':
      this.displaySaveStatus(value)
      break
    }
  }

  /**
   * 基本設定の表示更新
   * @private
   * @param {SettingsViewModel} viewModel
   */
  updateBasicSettings(viewModel) {
    if (this.elements.enabled) {
      this.elements.enabled.checked = viewModel.get('enabled')
    }

    if (this.elements.strokeColor) {
      this.elements.strokeColor.value = viewModel.get('strokeColor')
    }

    if (this.elements.strokeWidth) {
      this.elements.strokeWidth.value = viewModel.get('strokeWidth')
    }
    if (this.elements.strokeWidthValue) {
      this.elements.strokeWidthValue.textContent = `${viewModel.get('strokeWidth')}px`
    }

    if (this.elements.gestureThreshold) {
      this.elements.gestureThreshold.value = viewModel.get('gestureThreshold')
    }
    if (this.elements.gestureThresholdValue) {
      this.elements.gestureThresholdValue.textContent = `${viewModel.get('gestureThreshold')}px`
    }
  }

  /**
   * ジェスチャー設定の表示更新
   * @private
   * @param {SettingsViewModel} viewModel
   */
  updateGestureSettings(viewModel) {
    const gestureStates = viewModel.get('gestureStates') || {}
    this.updateGestureToggles(gestureStates)
  }

  /**
   * ジェスチャートグルの更新
   * @private
   * @param {Object} gestureStates
   */
  updateGestureToggles(gestureStates) {
    this.elements.gestureToggles.forEach(toggle => {
      const gestureId = toggle.dataset.gestureId
      if (gestureId && Object.prototype.hasOwnProperty.call(gestureStates, gestureId)) {
        toggle.checked = gestureStates[gestureId]
      }
    })
  }

  /**
   * 除外サイト一覧の表示更新
   * @private
   * @param {SettingsViewModel} viewModel
   */
  updateExcludeList(viewModel) {
    const excludeList = viewModel.get('excludeList') || []
    this.renderExcludeList(excludeList)
  }

  /**
   * 除外サイト一覧をレンダリング
   * @private
   * @param {Array} excludeList
   */
  renderExcludeList(excludeList) {
    if (!this.elements.excludeList) return

    this.elements.excludeList.innerHTML = ''

    excludeList.forEach(pattern => {
      const listItem = document.createElement('div')
      listItem.className = 'exclude-item'
      listItem.innerHTML = `
        <span class="exclude-pattern">${this.escapeHtml(pattern)}</span>
        <button type="button" class="remove-exclude-btn" data-pattern="${this.escapeHtml(pattern)}">
          削除
        </button>
      `

      // 削除ボタンのイベントリスナー
      const removeBtn = listItem.querySelector('.remove-exclude-btn')
      this.addEventListener(removeBtn, 'click', () => {
        this.boundHandlers.onRemoveExcludeSite(pattern)
      })

      this.elements.excludeList.appendChild(listItem)
    })
  }

  /**
   * デバッグ設定の表示更新
   * @private
   * @param {SettingsViewModel} viewModel
   */
  updateDebugSettings(viewModel) {
    const debugSettings = viewModel.get('debugSettings') || {}
    this.updateDebugControls(debugSettings)
  }

  /**
   * デバッグコントロールの更新
   * @private
   * @param {Object} debugSettings
   */
  updateDebugControls(debugSettings) {
    if (this.elements.debugEnabled) {
      this.elements.debugEnabled.checked = debugSettings.enabled || false
    }

    if (this.elements.debugLogLevel) {
      this.elements.debugLogLevel.value = debugSettings.logLevel || 2
    }

    if (this.elements.debugShowStatus) {
      this.elements.debugShowStatus.checked = debugSettings.showStatus || false
    }

    if (this.elements.debugStatusPosition) {
      this.elements.debugStatusPosition.value = debugSettings.statusPosition || 'top-right'
    }
  }

  /**
   * 統計情報の表示更新
   * @private
   * @param {SettingsViewModel} viewModel
   */
  updateStatistics(viewModel) {
    const stats = viewModel.getStatistics()

    if (this.elements.statsEnabled) {
      this.elements.statsEnabled.textContent = viewModel.get('enabled') ? '有効' : '無効'
    }

    if (this.elements.statsEnabledGestures) {
      this.elements.statsEnabledGestures.textContent =
        `${stats.enabledGesturesCount} / ${stats.totalGesturesCount}`
    }

    if (this.elements.statsExcludeCount) {
      this.elements.statsExcludeCount.textContent = stats.excludeListCount
    }

    if (this.elements.statsLastModified) {
      const lastModified = viewModel.get('lastModified')
      this.elements.statsLastModified.textContent = lastModified ?
        new Date(lastModified).toLocaleString() : '未設定'
    }
  }

  /**
   * プレビューの更新
   * @private
   * @param {SettingsViewModel} [viewModel]
   */
  updatePreview(viewModel) {
    if (!this.elements.strokePreview) return

    if (!viewModel && this.presenter) {
      viewModel = this.presenter.getViewModel()
    }
    if (!viewModel) return

    const previewStyle = viewModel.get('previewStyle')
    if (previewStyle) {
      this.elements.strokePreview.style.borderColor = previewStyle.color
      this.elements.strokePreview.style.borderWidth = `${previewStyle.width}px`
    }
  }

  /**
   * ステータス表示を更新
   * @param {string} message
   * @param {string} type
   * @param {number} [duration]
   */
  updateStatus(message, type = 'info', duration = 3000) {
    if (!this.elements.saveStatus || !this.elements.statusMessage) return

    this.elements.statusMessage.textContent = message
    this.elements.saveStatus.className = `status-message ${type}`
    this.elements.saveStatus.style.display = 'block'

    if (duration > 0) {
      setTimeout(() => {
        this.elements.saveStatus.style.display = 'none'
      }, duration)
    }
  }

  /**
   * 保存ステータスを表示
   * @private
   * @param {Object} saveStatus
   */
  displaySaveStatus(saveStatus) {
    if (!saveStatus.visible) {
      if (this.elements.saveStatus) {
        this.elements.saveStatus.style.display = 'none'
      }
      return
    }

    this.updateStatus(saveStatus.message, saveStatus.type, 0) // 自動非表示しない
  }

  // Event handlers

  /**
   * 拡張機能の有効/無効切り替え
   * @private
   * @param {Event} e
   */
  async onExtensionToggle(e) {
    if (this.presenter) {
      await this.presenter.toggleExtension(e.target.checked)
    }
  }

  /**
   * 軌跡色の変更
   * @private
   * @param {Event} e
   */
  async onStrokeColorChange(e) {
    if (this.presenter) {
      const width = this.presenter.getViewModel().get('strokeWidth')
      await this.presenter.updateStrokeSettings(e.target.value, width)
    }
  }

  /**
   * 軌跡太さの変更
   * @private
   * @param {Event} e
   */
  async onStrokeWidthChange(e) {
    const width = parseInt(e.target.value)
    if (this.presenter) {
      const color = this.presenter.getViewModel().get('strokeColor')
      await this.presenter.updateStrokeSettings(color, width)
    }
  }

  /**
   * ジェスチャー閾値の変更
   * @private
   * @param {Event} e
   */
  async onGestureThresholdChange(e) {
    const threshold = parseInt(e.target.value)
    if (this.presenter) {
      await this.presenter.updateGestureThreshold(threshold)
    }
  }

  /**
   * ジェスチャー有効/無効の切り替え
   * @private
   * @param {Event} e
   */
  async onGestureToggle(e) {
    const gestureId = e.target.dataset.gestureId
    if (this.presenter && gestureId) {
      await this.presenter.toggleGesture(gestureId, e.target.checked)
    }
  }

  /**
   * 除外サイトの追加
   * @private
   */
  async onAddExcludeSite() {
    if (!this.presenter || !this.elements.newExcludeUrl) return

    const pattern = this.elements.newExcludeUrl.value.trim()
    if (pattern) {
      await this.presenter.addExcludeSite(pattern)
      this.elements.newExcludeUrl.value = '' // 入力欄をクリア
    }
  }

  /**
   * 除外サイトの削除
   * @private
   * @param {string} pattern
   */
  async onRemoveExcludeSite(pattern) {
    if (this.presenter) {
      await this.presenter.removeExcludeSite(pattern)
    }
  }

  /**
   * デバッグ設定の変更
   * @private
   */
  async onDebugSettingChange() {
    if (!this.presenter) return

    const debugUpdates = {}

    if (this.elements.debugEnabled) {
      debugUpdates.enabled = this.elements.debugEnabled.checked
    }
    if (this.elements.debugLogLevel) {
      debugUpdates.logLevel = parseInt(this.elements.debugLogLevel.value)
    }
    if (this.elements.debugShowStatus) {
      debugUpdates.showStatus = this.elements.debugShowStatus.checked
    }
    if (this.elements.debugStatusPosition) {
      debugUpdates.statusPosition = this.elements.debugStatusPosition.value
    }

    await this.presenter.updateDebugSettings(debugUpdates)
  }

  /**
   * 設定のリセット
   * @private
   */
  async onResetSettings() {
    if (this.presenter) {
      await this.presenter.resetToDefaults()
    }
  }

  /**
   * 設定のエクスポート
   * @private
   */
  async onExportSettings() {
    if (!this.presenter) return

    try {
      const backup = await this.presenter.createSettingsBackup()

      // ダウンロード用のリンクを作成
      const dataStr = JSON.stringify(backup, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr)

      const exportFileName = `gesture-settings-${new Date().toISOString().split('T')[0]}.json`

      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileName)
      linkElement.click()

    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  /**
   * 設定のインポート
   * @private
   * @param {Event} e
   */
  async onImportSettings(e) {
    if (!this.presenter) return

    const file = e.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const backup = JSON.parse(text)

      await this.presenter.restoreFromBackup(backup)

      // ファイル入力をリセット
      e.target.value = ''

    } catch (error) {
      console.error('Import failed:', error)
      this.updateStatus('設定ファイルの読み込みに失敗しました', 'error')
    }
  }

  /**
   * 設定の検証
   * @private
   */
  async onValidateSettings() {
    if (this.presenter) {
      await this.presenter.validateSettings()
    }
  }

  /**
   * HTMLエスケープ
   * @private
   * @param {string} text
   * @returns {string}
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OptionsView }
}