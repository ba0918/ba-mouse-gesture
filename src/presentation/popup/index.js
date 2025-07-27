/**
 * Clean Architecture - Popup/Options エントリーポイント
 * LegacyIntegrationAdapter を使用して段階的に新アーキテクチャに移行
 */

// LegacyIntegrationAdapter のインポート
const { getOrCreateAdapter } = require('../adapters/LegacyIntegrationAdapter')

/**
 * Clean Architecture 対応オプション画面マネージャー
 */
class CleanOptionsManager {
  constructor() {
    this.adapter = null
    this.isInitialized = false
    this.legacyFallback = null
  }

  /**
   * 初期化
   */
  async initialize() {
    try {
      console.log('🏗️ Clean Architecture Options: Initializing...')
      
      // LegacyIntegrationAdapter を初期化
      this.adapter = await getOrCreateAdapter({
        initializeViews: true,
        forceOptionsView: true
      })
      
      // 設定UIのイベント設定
      this.setupEventListeners()
      
      // 初期データ読み込み
      await this.loadInitialData()
      
      this.isInitialized = true
      
      // デバッグ情報表示
      this.updateDebugInfo()
      
      console.log('✅ Clean Architecture Options: Initialization complete')
      
    } catch (error) {
      console.error('❌ Clean Architecture Options: Initialization failed:', error)
      
      // フォールバック: 既存のOptionsManagerを使用
      this.initializeLegacyFallback()
    }
  }

  /**
   * イベントリスナー設定
   */
  setupEventListeners() {
    if (!this.adapter) return

    // 基本設定
    this.setupBasicSettings()
    
    // 除外サイト管理
    this.setupExcludeSiteManagement()
    
    // アドバンス設定
    this.setupAdvancedSettings()
  }

  /**
   * 基本設定のイベントリスナー
   */
  setupBasicSettings() {
    // 機能有効/無効
    const enabledElement = document.getElementById('enabled')
    if (enabledElement) {
      enabledElement.addEventListener('change', async (e) => {
        try {
          await this.adapter.updateLegacySettings({ enabled: e.target.checked })
          this.showStatus('設定を保存しました', 'success')
        } catch (error) {
          console.error('Settings update failed:', error)
          this.showStatus('設定の保存に失敗しました', 'error')
        }
      })
    }

    // 軌跡色
    const strokeColorElement = document.getElementById('strokeColor')
    if (strokeColorElement) {
      strokeColorElement.addEventListener('change', async (e) => {
        try {
          await this.adapter.updateLegacySettings({ strokeColor: e.target.value })
          this.updatePreview()
          this.showStatus('軌跡色を変更しました', 'success')
        } catch (error) {
          console.error('Stroke color update failed:', error)
          this.showStatus('軌跡色の変更に失敗しました', 'error')
        }
      })
    }

    // 軌跡幅
    const strokeWidthElement = document.getElementById('strokeWidth')
    if (strokeWidthElement) {
      strokeWidthElement.addEventListener('input', async (e) => {
        const width = parseInt(e.target.value)
        try {
          await this.adapter.updateLegacySettings({ strokeWidth: width })
          
          // UI更新
          const valueElement = document.getElementById('strokeWidthValue')
          if (valueElement) valueElement.textContent = `${width}px`
          
          this.updatePreview()
          this.showStatus('軌跡幅を変更しました', 'success', 1500)
        } catch (error) {
          console.error('Stroke width update failed:', error)
          this.showStatus('軌跡幅の変更に失敗しました', 'error')
        }
      })
    }

    // ジェスチャー閾値
    const gestureThresholdElement = document.getElementById('gestureThreshold')
    if (gestureThresholdElement) {
      gestureThresholdElement.addEventListener('input', async (e) => {
        const threshold = parseInt(e.target.value)
        try {
          await this.adapter.updateLegacySettings({ gestureThreshold: threshold })
          
          // UI更新
          const valueElement = document.getElementById('gestureThresholdValue')
          if (valueElement) valueElement.textContent = `${threshold}px`
          
          this.showStatus('ジェスチャー感度を変更しました', 'success', 1500)
        } catch (error) {
          console.error('Gesture threshold update failed:', error)
          this.showStatus('ジェスチャー感度の変更に失敗しました', 'error')
        }
      })
    }
  }

  /**
   * 除外サイト管理
   */
  setupExcludeSiteManagement() {
    // 除外サイト追加
    const addExcludeBtn = document.getElementById('addExcludeBtn')
    const newExcludeUrl = document.getElementById('newExcludeUrl')
    
    if (addExcludeBtn && newExcludeUrl) {
      const addSite = async () => {
        const pattern = newExcludeUrl.value.trim()
        if (pattern) {
          try {
            await this.adapter.updateLegacySettings({ addExcludeSite: pattern })
            newExcludeUrl.value = ''
            this.renderExcludeList()
            this.showStatus('除外サイトを追加しました', 'success')
          } catch (error) {
            console.error('Exclude site addition failed:', error)
            this.showStatus('除外サイトの追加に失敗しました', 'error')
          }
        }
      }
      
      addExcludeBtn.addEventListener('click', addSite)
      newExcludeUrl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addSite()
      })
    }
  }

  /**
   * アドバンス設定
   */
  setupAdvancedSettings() {
    // 設定リセット
    const resetBtn = document.getElementById('resetBtn')
    if (resetBtn) {
      resetBtn.addEventListener('click', async () => {
        const confirmed = await this.showConfirm('すべての設定をリセットしますか？この操作は元に戻せません。')
        if (confirmed) {
          try {
            // TODO: Reset機能をアダプターに実装
            this.showStatus('リセット機能は実装中です', 'info')
          } catch (error) {
            console.error('Settings reset failed:', error)
            this.showStatus('設定のリセットに失敗しました', 'error')
          }
        }
      })
    }
  }

  /**
   * 初期データの読み込み
   */
  async loadInitialData() {
    if (!this.adapter) return

    try {
      // 現在の設定を取得
      const settings = this.adapter.legacyState.currentSettings
      if (settings) {
        this.updateUIFromSettings(settings)
      }

      // 除外リストの表示
      this.renderExcludeList()

      // 統計情報の表示
      const statistics = await this.adapter.getLegacyStatistics()
      this.updateStatistics(statistics)

    } catch (error) {
      console.error('Initial data loading failed:', error)
      this.showStatus('データの読み込みに失敗しました', 'error')
    }
  }

  /**
   * 設定からUIを更新
   */
  updateUIFromSettings(settings) {
    // 基本設定
    const enabledElement = document.getElementById('enabled')
    if (enabledElement) enabledElement.checked = settings.enabled

    const strokeColorElement = document.getElementById('strokeColor')
    if (strokeColorElement) strokeColorElement.value = settings.strokeColor || settings.stroke?.color

    const strokeWidthElement = document.getElementById('strokeWidth')
    if (strokeWidthElement) {
      const width = settings.strokeWidth || settings.stroke?.width
      strokeWidthElement.value = width
      const valueElement = document.getElementById('strokeWidthValue')
      if (valueElement) valueElement.textContent = `${width}px`
    }

    const gestureThresholdElement = document.getElementById('gestureThreshold')
    if (gestureThresholdElement) {
      const threshold = settings.gestureThreshold
      gestureThresholdElement.value = threshold
      const valueElement = document.getElementById('gestureThresholdValue')
      if (valueElement) valueElement.textContent = `${threshold}px`
    }

    // プレビュー更新
    this.updatePreview()
  }

  /**
   * プレビュー更新
   */
  updatePreview() {
    const previewElement = document.getElementById('strokePreview')
    const colorElement = document.getElementById('strokeColor')
    const widthElement = document.getElementById('strokeWidth')
    
    if (previewElement && colorElement && widthElement) {
      previewElement.style.borderColor = colorElement.value
      previewElement.style.borderWidth = `${widthElement.value}px`
    }
  }

  /**
   * 除外リスト表示
   */
  renderExcludeList() {
    if (!this.adapter) return

    try {
      const settings = this.adapter.legacyState.currentSettings
      const excludeList = settings?.excludeList || []
      
      const listElement = document.getElementById('excludeList')
      if (!listElement) return

      listElement.innerHTML = ''
      
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
        removeBtn.addEventListener('click', async () => {
          try {
            await this.adapter.updateLegacySettings({ removeExcludeSite: pattern })
            this.renderExcludeList()
            this.showStatus('除外サイトを削除しました', 'success')
          } catch (error) {
            console.error('Exclude site removal failed:', error)
            this.showStatus('除外サイトの削除に失敗しました', 'error')
          }
        })

        listElement.appendChild(listItem)
      })

    } catch (error) {
      console.error('Exclude list rendering failed:', error)
    }
  }

  /**
   * 統計情報更新
   */
  updateStatistics(statistics) {
    // 統計情報の表示（後で実装）
    console.log('Statistics:', statistics)
  }

  /**
   * デバッグ情報更新
   */
  updateDebugInfo() {
    const debugElement = document.getElementById('debugInfo')
    if (debugElement && this.adapter) {
      const adapterState = this.adapter.getAdapterState()
      debugElement.textContent = `✅ Clean Architecture 初期化完了

アダプター状態:
- 初期化済み: ${adapterState.isInitialized}
- ServiceFactory: ${adapterState.hasServiceFactory}
- Services: ${adapterState.services.join(', ')}
- Presenters: ${adapterState.presenters.join(', ')}
- Views: ${adapterState.views.join(', ')}

設定:
- カスタムジェスチャー: ${adapterState.legacyState.customGesturesCount}個
- エラー: ${adapterState.legacyState.hasError ? 'あり' : 'なし'}

最終更新: ${new Date().toLocaleString()}`
    }
  }

  /**
   * ステータス表示
   */
  showStatus(message, type = 'info', duration = 3000) {
    const statusElement = document.getElementById('saveStatus')
    const messageElement = document.getElementById('statusMessage')
    
    if (statusElement && messageElement) {
      messageElement.textContent = message
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
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * カスタム確認ダイアログ表示
   */
  showConfirm(message) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('confirmDialog')
      const messageElement = document.getElementById('confirmMessage')
      const okBtn = document.getElementById('confirmOk')
      const cancelBtn = document.getElementById('confirmCancel')
      const overlay = dialog.querySelector('.confirm-overlay')
      
      if (!dialog || !messageElement || !okBtn || !cancelBtn) {
        // フォールバック: 標準confirm
        // eslint-disable-next-line no-alert
        resolve(confirm(message))
        return
      }
      
      // メッセージ設定
      messageElement.textContent = message
      
      // ダイアログ表示
      dialog.style.display = 'flex'
      
      // イベントリスナー設定
      const handleOk = () => {
        cleanup()
        resolve(true)
      }
      
      const handleCancel = () => {
        cleanup()
        resolve(false)
      }
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          cleanup()
          resolve(false)
        }
      }
      
      const cleanup = () => {
        dialog.style.display = 'none'
        okBtn.removeEventListener('click', handleOk)
        cancelBtn.removeEventListener('click', handleCancel)
        overlay.removeEventListener('click', handleCancel)
        document.removeEventListener('keydown', handleEscape)
      }
      
      // イベントリスナー追加
      okBtn.addEventListener('click', handleOk)
      cancelBtn.addEventListener('click', handleCancel)
      overlay.addEventListener('click', handleCancel)
      document.addEventListener('keydown', handleEscape)
      
      // OKボタンにフォーカス
      okBtn.focus()
    })
  }

  /**
   * レガシーフォールバック初期化
   */
  initializeLegacyFallback() {
    console.warn('Falling back to legacy OptionsManager')
    
    // 既存のOptionsManagerを使用（グローバルに存在する場合）
    if (typeof OptionsManager !== 'undefined') {
      this.legacyFallback = new OptionsManager()
      this.showStatus('レガシーモードで動作中', 'info', 5000)
    } else {
      this.showStatus('設定画面の初期化に失敗しました', 'error', 10000)
    }
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasAdapter: Boolean(this.adapter),
      hasLegacyFallback: Boolean(this.legacyFallback),
      adapterState: this.adapter ? this.adapter.getAdapterState() : null
    }
  }
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const manager = new CleanOptionsManager()
    await manager.initialize()
    
    // グローバルアクセス用
    window.cleanOptionsManager = manager
    
  } catch (error) {
    console.error('Clean Options Manager initialization failed:', error)
  }
})

// CommonJS export（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CleanOptionsManager }
}