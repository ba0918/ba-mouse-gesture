/**
 * デバッグ設定コントローラー
 * Presentation層 - UI制御とユーザーインタラクション
 */

class DebugSettingsController {
  constructor(debugSettingsUseCase) {
    this.debugSettingsUseCase = debugSettingsUseCase
    this.currentSettings = null
  }

  /**
   * デバッグ設定の初期化
   */
  async initialize() {
    try {
      console.log('🔧 DebugSettingsController: Initializing debug settings')
      
      // デバッグ設定を読み込み
      await this.loadDebugSettings()
      
      // UIイベントリスナーを設定
      this.setupEventListeners()
      
      // 初期UI状態を更新
      this.updateUI()
      
      console.log('🔧 DebugSettingsController: Initialization completed')
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Initialization failed:', error)
      this.showError(error.message)
      throw error
    }
  }

  /**
   * デバッグ設定を読み込み
   */
  async loadDebugSettings() {
    try {
      console.log('🔧 DebugSettingsController: Loading debug settings')
      
      this.currentSettings = await this.debugSettingsUseCase.getDebugSettings()
      
      console.log('🔧 DebugSettingsController: Debug settings loaded:', this.currentSettings.toPlainObject())
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to load debug settings:', error)
      throw new Error(`Failed to load debug settings: ${error.message}`)
    }
  }

  /**
   * デバッグ設定を保存
   */
  async saveDebugSettings() {
    try {
      console.log('🔧 DebugSettingsController: Saving debug settings')
      
      if (!this.currentSettings) {
        throw new Error('Current settings not loaded')
      }

      await this.debugSettingsUseCase.saveDebugSettings(this.currentSettings)
      
      // UI更新
      this.updateUI()
      
      // 成功メッセージ
      this.showMessage('デバッグ設定を保存しました', 'success')
      
      console.log('🔧 DebugSettingsController: Debug settings saved successfully')
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to save debug settings:', error)
      this.showMessage('デバッグ設定の保存に失敗しました', 'error')
    }
  }

  /**
   * UIの更新
   */
  updateUI() {
    if (!this.currentSettings) return

    try {
      console.log('🔧 DebugSettingsController: Updating UI')
      
      const settings = this.currentSettings.toPlainObject()

      // デバッグ有効化チェックボックス
      const enabledCheckbox = document.getElementById('enableDebugMode')
      if (enabledCheckbox) {
        enabledCheckbox.checked = settings.enabled
      }

      // 画面表示チェックボックス
      const showStatusCheckbox = document.getElementById('showDebugStatus')
      if (showStatusCheckbox) {
        showStatusCheckbox.checked = settings.showStatus
        showStatusCheckbox.disabled = !settings.enabled // デバッグ無効時は無効化
      }

      // ログレベル選択
      const logLevelSelect = document.getElementById('debugLogLevel')
      if (logLevelSelect) {
        logLevelSelect.value = settings.logLevel
        logLevelSelect.disabled = !settings.enabled
      }

      // 表示位置選択
      const positionSelect = document.getElementById('debugStatusPosition')
      if (positionSelect) {
        positionSelect.value = settings.statusPosition
        positionSelect.disabled = !settings.enabled || !settings.showStatus
      }

      // 設定状態の表示更新
      this.updateSettingsStatus()
      
      console.log('🔧 DebugSettingsController: UI updated successfully')
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to update UI:', error)
    }
  }

  /**
   * 設定状態の表示更新
   */
  updateSettingsStatus() {
    try {
      const statusElement = document.getElementById('debugSettingsStatus')
      if (!statusElement || !this.currentSettings) return

      const settings = this.currentSettings.toPlainObject()
      const now = new Date().toLocaleTimeString()

      const statusHTML = `
        <div style="font-size: 12px; color: #5f6368;">
          最終更新: ${now}
        </div>
        <div style="margin-top: 8px;">
          <div>デバッグモード: <span style="font-weight: 600; color: ${settings.enabled ? '#34a853' : '#ea4335'}">${settings.enabled ? '有効' : '無効'}</span></div>
          <div>画面表示: <span style="font-weight: 600; color: ${settings.showStatus ? '#34a853' : '#5f6368'}">${settings.showStatus ? '有効' : '無効'}</span></div>
          <div>ログレベル: <span style="font-weight: 600;">${this.getLogLevelName(settings.logLevel)}</span></div>
          <div>表示位置: <span style="font-weight: 600;">${this.getPositionName(settings.statusPosition)}</span></div>
        </div>
      `

      statusElement.innerHTML = statusHTML
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to update settings status:', error)
    }
  }

  /**
   * ログレベル名を取得
   */
  getLogLevelName(level) {
    const levels = {
      0: 'ERROR',
      1: 'WARN',
      2: 'INFO',
      3: 'DEBUG'
    }
    return levels[level] || 'Unknown'
  }

  /**
   * 表示位置名を取得
   */
  getPositionName(position) {
    const positions = {
      'top-right': '右上',
      'top-left': '左上',
      'bottom-right': '右下',
      'bottom-left': '左下'
    }
    return positions[position] || 'Unknown'
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // デバッグ有効化切り替え
    const enabledCheckbox = document.getElementById('enableDebugMode')
    if (enabledCheckbox) {
      enabledCheckbox.addEventListener('change', async (e) => {
        if (this.currentSettings) {
          if (e.target.checked) {
            this.currentSettings.enabled = true
          } else {
            // デバッグ無効時は画面表示も無効化
            this.currentSettings.enabled = false
            this.currentSettings.showStatus = false
          }
          await this.saveDebugSettings()
        }
      })
    }

    // 画面表示切り替え
    const showStatusCheckbox = document.getElementById('showDebugStatus')
    if (showStatusCheckbox) {
      showStatusCheckbox.addEventListener('change', async (e) => {
        if (this.currentSettings && this.currentSettings.enabled) {
          this.currentSettings.showStatus = e.target.checked
          await this.saveDebugSettings()
        }
      })
    }

    // ログレベル変更
    const logLevelSelect = document.getElementById('debugLogLevel')
    if (logLevelSelect) {
      logLevelSelect.addEventListener('change', async (e) => {
        if (this.currentSettings && this.currentSettings.enabled) {
          this.currentSettings.setLogLevel(parseInt(e.target.value))
          await this.saveDebugSettings()
        }
      })
    }

    // 表示位置変更
    const positionSelect = document.getElementById('debugStatusPosition')
    if (positionSelect) {
      positionSelect.addEventListener('change', async (e) => {
        if (this.currentSettings && this.currentSettings.enabled && this.currentSettings.showStatus) {
          this.currentSettings.setStatusPosition(e.target.value)
          await this.saveDebugSettings()
        }
      })
    }

    console.log('🔧 DebugSettingsController: Event listeners setup completed')
  }

  /**
   * デバッグモードの切り替え
   */
  async toggleDebugEnabled() {
    try {
      console.log('🔧 DebugSettingsController: Toggling debug enabled')
      
      const newState = await this.debugSettingsUseCase.toggleDebugEnabled()
      
      // 設定を再読み込み
      await this.loadDebugSettings()
      
      // UI更新
      this.updateUI()
      
      this.showMessage(`デバッグモードを${newState ? '有効' : '無効'}にしました`, 'success')
      
      console.log('🔧 DebugSettingsController: Debug enabled toggled:', newState)
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to toggle debug enabled:', error)
      this.showMessage('デバッグモードの切り替えに失敗しました', 'error')
    }
  }

  /**
   * 画面表示の切り替え
   */
  async toggleShowStatus() {
    try {
      console.log('🔧 DebugSettingsController: Toggling show status')
      
      const newState = await this.debugSettingsUseCase.toggleShowStatus()
      
      // 設定を再読み込み
      await this.loadDebugSettings()
      
      // UI更新
      this.updateUI()
      
      this.showMessage(`デバッグ画面表示を${newState ? '有効' : '無効'}にしました`, 'success')
      
      console.log('🔧 DebugSettingsController: Show status toggled:', newState)
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to toggle show status:', error)
      this.showMessage('画面表示の切り替えに失敗しました', 'error')
    }
  }

  /**
   * デバッグ設定のリセット
   */
  async resetDebugSettings() {
    try {
      console.log('🔧 DebugSettingsController: Resetting debug settings')
      
      if (!confirm('デバッグ設定をデフォルトに戻しますか？')) {
        return
      }

      // デフォルト設定を作成
      const DebugSettingsEntity = require('../../domain/entities/DebugSettingsEntity')
      this.currentSettings = DebugSettingsEntity.getDefault()
      
      // 保存
      await this.saveDebugSettings()
      
      this.showMessage('デバッグ設定をリセットしました', 'success')
      
      console.log('🔧 DebugSettingsController: Debug settings reset successfully')
      
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to reset debug settings:', error)
      this.showMessage('デバッグ設定のリセットに失敗しました', 'error')
    }
  }

  /**
   * 現在の設定を取得
   */
  getCurrentSettings() {
    return this.currentSettings
  }

  /**
   * 設定の手動更新（外部から）
   */
  async updateSettings(newSettings) {
    try {
      this.currentSettings = newSettings
      await this.saveDebugSettings()
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to update settings:', error)
      throw error
    }
  }

  /**
   * エラー表示
   */
  showError(message) {
    console.error('🚨 DebugSettingsController Error:', message)
    this.showMessage(`エラー: ${message}`, 'error')
  }

  /**
   * メッセージ表示
   */
  showMessage(message, type = 'info') {
    // 既存のshowSaveStatus機能と統合する必要がある
    console.log(`🔧 DebugSettingsController: ${type.toUpperCase()}: ${message}`)
    
    // 一時的な実装（後で適切なUI通知システムに統合）
    const statusElement = document.getElementById('debugSettingsSaveStatus')
    if (statusElement) {
      const colors = {
        success: '#34a853',
        error: '#ea4335',
        info: '#1a73e8',
        warn: '#fbbc04'
      }
      
      statusElement.style.color = colors[type] || colors.info
      statusElement.textContent = message
      
      // 3秒後にクリア
      setTimeout(() => {
        if (statusElement.textContent === message) {
          statusElement.textContent = ''
        }
      }, 3000)
    }
  }

  /**
   * デバッグ設定をリフレッシュ
   */
  async refresh() {
    try {
      await this.loadDebugSettings()
      this.updateUI()
    } catch (error) {
      console.error('🚨 DebugSettingsController: Failed to refresh:', error)
      this.showError(error.message)
    }
  }
}

module.exports = DebugSettingsController