/**
 * OptionsPresenter
 * 設定画面のUIロジックとApplication層との橋渡しを担当
 */

// 依存関係のインポート
let BasePresenter, SettingsViewModel
if (typeof require !== 'undefined') {
  ({ BasePresenter } = require('./BasePresenter'));
  ({ SettingsViewModel } = require('../viewmodels/SettingsViewModel'))
}

class OptionsPresenter extends BasePresenter {
  /**
   * @param {ISettingsService} settingsService - 設定サービス
   * @param {ISystemService} systemService - システムサービス
   */
  constructor(settingsService, systemService) {
    super()

    this.settingsService = settingsService
    this.systemService = systemService
    this.viewModel = new SettingsViewModel()
    this.settingsWatcher = null
    this.autoSaveTimeout = null
    this.autoSaveDelay = 1000 // 1秒後に自動保存

    // ViewModelの変更を監視
    this.setupViewModelWatchers()
  }

  /**
   * 初期化処理
   * @protected
   * @returns {Promise<void>}
   */
  async onInitialize() {
    try {
      // 現在の設定を読み込み
      await this.loadCurrentSettings()

      // 設定変更の監視を開始
      this.startSettingsWatching()

      // システム状態の監視を開始
      this.startSystemMonitoring()

    } catch (error) {
      this.handleError('Failed to initialize options presenter', error)
      throw error
    }
  }

  /**
   * 破棄処理
   * @protected
   * @returns {Promise<void>}
   */
  async onDispose() {
    // 自動保存タイマーをクリア
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
      this.autoSaveTimeout = null
    }

    // 設定監視を停止
    if (this.settingsWatcher) {
      await this.settingsWatcher()
      this.settingsWatcher = null
    }

    // ViewModelを破棄
    if (this.viewModel) {
      await this.viewModel.dispose()
      this.viewModel = null
    }
  }

  /**
   * ViewModelの変更監視を設定
   * @private
   */
  setupViewModelWatchers() {
    // 設定値の変更を監視して自動保存
    this.viewModel.onChange((key) => {
      // メタデータの変更は無視
      if (key === 'saveStatus' || key === 'lastModified') {
        return
      }

      // 自動保存をスケジュール
      this.scheduleAutoSave()
    })
  }

  /**
   * 現在の設定を読み込み
   * @returns {Promise<void>}
   */
  async loadCurrentSettings() {
    try {
      this.updateStatus('設定を読み込み中...', 'info')

      const settingsDTO = await this.settingsService.getCurrentSettings()
      this.viewModel.loadFromDTO(settingsDTO)

      this.updateStatus('設定を読み込みました', 'success', 2000)

    } catch (error) {
      this.handleError('Failed to load settings', error)
      this.updateStatus('設定の読み込みに失敗しました', 'error')
      throw error
    }
  }

  /**
   * 設定を保存
   * @param {boolean} [showStatus=true] - ステータス表示するか
   * @returns {Promise<void>}
   */
  async saveSettings(showStatus = true) {
    try {
      if (showStatus) {
        this.updateStatus('設定を保存中...', 'info')
      }

      // 設定の検証
      const validation = this.viewModel.validate()
      if (!validation.isValid) {
        const errorMessages = validation.errors.map(e => e.message).join(', ')
        throw new Error(`設定が無効です: ${errorMessages}`)
      }

      // 個別設定を更新
      await this.saveIndividualSettings()

      // メタデータを更新
      this.viewModel.set('lastModified', new Date().toISOString())

      if (showStatus) {
        this.updateStatus('設定を保存しました', 'success', 2000)
        this.viewModel.showSaveStatus('設定を保存しました', 'success')
      }

    } catch (error) {
      this.handleError('Failed to save settings', error)

      const errorMessage = '設定の保存に失敗しました'
      if (showStatus) {
        this.updateStatus(errorMessage, 'error')
        this.viewModel.showSaveStatus(errorMessage, 'error')
      }
      throw error
    }
  }

  /**
   * 個別設定を保存
   * @private
   * @returns {Promise<void>}
   */
  async saveIndividualSettings() {
    const promises = []

    // 基本設定
    if (this.hasPropertyChanged('enabled')) {
      promises.push(this.settingsService.toggleExtension(this.viewModel.get('enabled')))
    }

    // 軌跡設定
    if (this.hasPropertyChanged('strokeColor') || this.hasPropertyChanged('strokeWidth')) {
      promises.push(this.settingsService.updateStrokeSettings(
        this.viewModel.get('strokeColor'),
        this.viewModel.get('strokeWidth')
      ))
    }

    // ジェスチャー閾値
    if (this.hasPropertyChanged('gestureThreshold')) {
      promises.push(this.settingsService.updateGestureThreshold(
        this.viewModel.get('gestureThreshold')
      ))
    }

    // デバッグ設定
    if (this.hasPropertyChanged('debugSettings')) {
      promises.push(this.settingsService.updateDebugSettings(
        this.viewModel.get('debugSettings')
      ))
    }

    // 並列実行
    await Promise.all(promises)
  }

  /**
   * 拡張機能の有効/無効を切り替え
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<void>}
   */
  async toggleExtension(enabled) {
    try {
      this.viewModel.set('enabled', enabled)
      await this.settingsService.toggleExtension(enabled)

      const message = enabled ? '拡張機能を有効にしました' : '拡張機能を無効にしました'
      this.updateStatus(message, 'success')

    } catch (error) {
      this.handleError('Failed to toggle extension', error)

      // 元の状態に戻す
      this.viewModel.set('enabled', !enabled)
      this.updateStatus('拡張機能の切り替えに失敗しました', 'error')
    }
  }

  /**
   * 軌跡設定を更新
   * @param {string} color - 色
   * @param {number} width - 太さ
   * @returns {Promise<void>}
   */
  async updateStrokeSettings(color, width) {
    try {
      this.viewModel.updateStrokeSettings(color, width)
      await this.settingsService.updateStrokeSettings(color, width)

    } catch (error) {
      this.handleError('Failed to update stroke settings', error)
      this.updateStatus('軌跡設定の更新に失敗しました', 'error')
    }
  }

  /**
   * ジェスチャー検出閾値を更新
   * @param {number} threshold - 閾値
   * @returns {Promise<void>}
   */
  async updateGestureThreshold(threshold) {
    try {
      this.viewModel.set('gestureThreshold', threshold)
      await this.settingsService.updateGestureThreshold(threshold)

    } catch (error) {
      this.handleError('Failed to update gesture threshold', error)
      this.updateStatus('ジェスチャー閾値の更新に失敗しました', 'error')
    }
  }

  /**
   * 特定ジェスチャーの有効/無効を切り替え
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<void>}
   */
  async toggleGesture(gestureId, enabled) {
    try {
      this.viewModel.toggleGesture(gestureId, enabled)
      await this.settingsService.toggleGesture(gestureId, enabled)

      const gestureNames = this.viewModel.getGestureDisplayName(gestureId)
      const message = enabled ?
        `${gestureNames}を有効にしました` :
        `${gestureNames}を無効にしました`

      this.updateStatus(message, 'success', 1500)

    } catch (error) {
      this.handleError('Failed to toggle gesture', error)

      // 元の状態に戻す
      this.viewModel.toggleGesture(gestureId, !enabled)
      this.updateStatus('ジェスチャー設定の変更に失敗しました', 'error')
    }
  }

  /**
   * 除外サイトを追加
   * @param {string} pattern - URLパターン
   * @returns {Promise<void>}
   */
  async addExcludeSite(pattern) {
    try {
      if (!pattern || pattern.trim().length === 0) {
        throw new Error('URLパターンを入力してください')
      }

      const trimmedPattern = pattern.trim()

      // ViewModelで重複チェック
      if (!this.viewModel.addExcludeSite(trimmedPattern)) {
        throw new Error('このパターンは既に登録されています')
      }

      await this.settingsService.addExcludeSite(trimmedPattern)
      this.updateStatus(`除外サイトを追加しました: ${trimmedPattern}`, 'success')

    } catch (error) {
      this.handleError('Failed to add exclude site', error)
      this.updateStatus(error.message, 'error')

      // 失敗した場合はViewModelからも削除
      this.viewModel.removeExcludeSite(pattern)
    }
  }

  /**
   * 除外サイトを削除
   * @param {string} pattern - URLパターン
   * @returns {Promise<void>}
   */
  async removeExcludeSite(pattern) {
    try {
      if (!this.viewModel.removeExcludeSite(pattern)) {
        throw new Error('指定されたパターンが見つかりません')
      }

      await this.settingsService.removeExcludeSite(pattern)
      this.updateStatus(`除外サイトを削除しました: ${pattern}`, 'success')

    } catch (error) {
      this.handleError('Failed to remove exclude site', error)
      this.updateStatus('除外サイトの削除に失敗しました', 'error')

      // 失敗した場合はViewModelに戻す
      this.viewModel.addExcludeSite(pattern)
    }
  }

  /**
   * デバッグ設定を更新
   * @param {Object} debugUpdates - デバッグ設定の更新
   * @returns {Promise<void>}
   */
  async updateDebugSettings(debugUpdates) {
    try {
      this.viewModel.updateDebugSettings(debugUpdates)
      await this.settingsService.updateDebugSettings(this.viewModel.get('debugSettings'))

      this.updateStatus('デバッグ設定を更新しました', 'success', 1500)

    } catch (error) {
      this.handleError('Failed to update debug settings', error)
      this.updateStatus('デバッグ設定の更新に失敗しました', 'error')
    }
  }

  /**
   * 設定をデフォルトにリセット
   * @returns {Promise<void>}
   */
  async resetToDefaults() {
    try {
      // eslint-disable-next-line no-alert
      const confirmed = confirm('設定をデフォルトに戻しますか？この操作は取り消せません。')
      if (!confirmed) {
        return
      }

      this.updateStatus('設定をリセット中...', 'info')

      await this.settingsService.resetToDefaults()

      // ViewModelもリセット
      this.viewModel.resetToDefaults()

      this.updateStatus('設定をデフォルトにリセットしました', 'success')
      this.viewModel.showSaveStatus('設定をデフォルトにリセットしました', 'success')

    } catch (error) {
      this.handleError('Failed to reset settings', error)
      this.updateStatus('設定のリセットに失敗しました', 'error')
    }
  }

  /**
   * 設定のバックアップを作成
   * @returns {Promise<Object>}
   */
  async createSettingsBackup() {
    try {
      this.updateStatus('バックアップを作成中...', 'info')

      const backup = await this.settingsService.createSettingsBackup()

      this.updateStatus('バックアップを作成しました', 'success')
      return backup

    } catch (error) {
      this.handleError('Failed to create backup', error)
      this.updateStatus('バックアップの作成に失敗しました', 'error')
      throw error
    }
  }

  /**
   * バックアップから設定を復元
   * @param {Object} backup - バックアップデータ
   * @returns {Promise<void>}
   */
  async restoreFromBackup(backup) {
    try {
      // eslint-disable-next-line no-alert
      const confirmed = confirm('バックアップから設定を復元しますか？現在の設定は上書きされます。')
      if (!confirmed) {
        return
      }

      this.updateStatus('設定を復元中...', 'info')

      const restoredSettings = await this.settingsService.restoreSettingsFromBackup(backup)

      // ViewModelを更新
      this.viewModel.loadFromDTO(restoredSettings)

      this.updateStatus('設定を復元しました', 'success')
      this.viewModel.showSaveStatus('設定を復元しました', 'success')

    } catch (error) {
      this.handleError('Failed to restore from backup', error)
      this.updateStatus('設定の復元に失敗しました', 'error')
    }
  }

  /**
   * 設定の整合性チェック
   * @returns {Promise<Object>}
   */
  async validateSettings() {
    try {
      const validation = await this.settingsService.validateCurrentSettings()

      if (validation.isValid) {
        this.updateStatus('設定は正常です', 'success', 2000)
      } else {
        const errorMessage = `設定に問題があります: ${validation.errors.join(', ')}`
        this.updateStatus(errorMessage, 'warning')
      }

      return validation

    } catch (error) {
      this.handleError('Failed to validate settings', error)
      this.updateStatus('設定の検証に失敗しました', 'error')
      throw error
    }
  }

  /**
   * 設定使用統計を取得
   * @returns {Promise<Object>}
   */
  async getUsageStats() {
    try {
      return await this.settingsService.getSettingsUsageStats()
    } catch (error) {
      this.handleError('Failed to get usage stats', error)
      return null
    }
  }

  /**
   * ViewModelを取得（Viewでの使用用）
   * @returns {SettingsViewModel}
   */
  getViewModel() {
    return this.viewModel
  }

  // Private methods

  /**
   * 自動保存をスケジュール
   * @private
   */
  scheduleAutoSave() {
    // 既存のタイマーをクリア
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout)
    }

    // 新しいタイマーを設定
    this.autoSaveTimeout = setTimeout(async () => {
      try {
        await this.saveSettings(false) // ステータス表示なし
      } catch (error) {
        // 自動保存のエラーは無視（ユーザーが手動保存時にエラーが表示される）
        console.log('Auto-save failed:', error)
      }
    }, this.autoSaveDelay)
  }

  /**
   * プロパティが変更されたかチェック
   * @private
   * @param {string} property - プロパティ名
   * @returns {boolean}
   */
  hasPropertyChanged() {
    // TODO: 元の値との比較ロジックを実装
    // 現在は常にtrueを返す（実際の実装では元の値を保持しておく）
    return true
  }

  /**
   * 設定変更の監視を開始
   * @private
   */
  startSettingsWatching() {
    try {
      this.settingsWatcher = this.settingsService.watchSettingsChanges((change) => {
        // 他の場所での設定変更を検知してViewModelを更新
        if (change.newSettings) {
          this.viewModel.loadFromDTO(change.newSettings)
          this.updateStatus('設定が他の場所で変更されました', 'info', 2000)
        }
      })
    } catch (error) {
      console.warn('Failed to start settings watching:', error)
    }
  }

  /**
   * システム状態監視を開始
   * @private
   */
  startSystemMonitoring() {
    // システムの健全性を定期的にチェック
    setInterval(async () => {
      try {
        const status = await this.systemService.getSystemStatus()
        if (!status.isInitialized) {
          this.updateStatus('システムが初期化されていません', 'warning')
        }
      } catch (error) {
        // システム監視のエラーは警告レベル
        console.warn('System monitoring error:', error)
      }
    }, 60000) // 1分間隔
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OptionsPresenter }
}