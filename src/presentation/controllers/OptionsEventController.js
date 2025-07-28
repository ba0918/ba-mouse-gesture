/**
 * OptionsEventController
 * 設定画面のUIイベント処理専用クラス
 * Clean Architecture - Presentation層
 */

class OptionsEventController {
  /**
   * @param {Object} dependencies - 依存関係
   * @param {Object} dependencies.settingsUseCase - 設定UseCase
   * @param {Object} dependencies.customGestureUseCase - カスタムジェスチャーUseCase
   * @param {Function} dependencies.showStatus - ステータス表示関数
   * @param {Function} dependencies.updateElement - 要素更新関数
   * @param {Function} dependencies.updatePreview - プレビュー更新関数
   * @param {Function} dependencies.renderExcludeList - 除外リスト描画関数
   */
  constructor(dependencies) {
    this.settingsUseCase = dependencies.settingsUseCase
    this.customGestureUseCase = dependencies.customGestureUseCase
    this.showStatus = dependencies.showStatus
    this.updateElement = dependencies.updateElement
    this.updatePreview = dependencies.updatePreview
    this.renderExcludeList = dependencies.renderExcludeList
    
    // カスタムジェスチャー作成用の状態
    this.currentPattern = []
  }

  /**
   * 基本設定のイベントを設定
   */
  setupBasicSettingsEvents() {
    // 機能有効/無効
    this.bindEvent('enabled', 'change', async (e) => {
      await this.settingsUseCase.toggleExtension(e.target.checked)
      this.showStatus('設定を保存しました', 'success')
    })

    // 軌跡色
    this.bindEvent('strokeColor', 'change', async (e) => {
      const width = document.getElementById('strokeWidth')?.value || 3
      await this.settingsUseCase.updateStrokeSettings(e.target.value, parseInt(width))
      this.updatePreview()
      this.showStatus('軌跡色を変更しました', 'success')
    })

    // 軌跡幅
    this.bindEvent('strokeWidth', 'input', async (e) => {
      const width = parseInt(e.target.value)
      const color = document.getElementById('strokeColor')?.value || '#2196F3'
      
      await this.settingsUseCase.updateStrokeSettings(color, width)
      this.updateElement('strokeWidthValue', `${width}px`)
      this.updatePreview()
      this.showStatus('軌跡幅を変更しました', 'success', 1500)
    })

    // ジェスチャー閾値
    this.bindEvent('gestureThreshold', 'input', async (e) => {
      const threshold = parseInt(e.target.value)
      await this.settingsUseCase.updateGestureThreshold(threshold)
      this.updateElement('gestureThresholdValue', `${threshold}px`)
      this.showStatus('ジェスチャー感度を変更しました', 'success', 1500)
    })
  }

  /**
   * ジェスチャー一覧のイベントを設定
   */
  setupGestureListEvents() {
    // 検索
    this.bindEvent('gestureSearch', 'input', (e) => {
      this.filterGestures(e.target.value)
    })

    // フィルター
    this.bindEvent('gestureFilter', 'change', (e) => {
      this.filterGesturesByType(e.target.value)
    })
  }

  /**
   * カスタムジェスチャーのイベントを設定
   */
  setupCustomGestureEvents() {
    this.currentPattern = []

    // 方向ボタン
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.addDirectionToPattern(e.target.dataset.direction)
      })
    })

    // クリア・追加ボタン
    this.bindEvent('clearPatternBtn', 'click', () => this.clearPattern())
    this.bindEvent('addGestureBtn', 'click', () => this.handleAddGesture())
  }

  /**
   * 除外サイトのイベントを設定
   */
  setupExcludeSiteEvents() {
    const addSite = async () => {
      const input = document.getElementById('newExcludeUrl')
      const pattern = input?.value.trim()
      if (pattern) {
        await this.settingsUseCase.addExcludeSite(pattern)
        input.value = ''
        await this.renderExcludeList()
        this.showStatus('除外サイトを追加しました', 'success')
      }
    }

    this.bindEvent('addExcludeBtn', 'click', addSite)
    this.bindEvent('newExcludeUrl', 'keypress', (e) => {
      if (e.key === 'Enter') addSite()
    })
  }

  /**
   * デバッグ設定のイベントを設定
   */
  setupDebugEvents() {
    // デバッグ設定を取得する共通関数
    const getCurrentDebugConfig = () => {
      return {
        enabled: document.getElementById('debugEnabled')?.checked || false,
        logLevel: parseInt(document.getElementById('debugLogLevel')?.value || '2'),
        showStatus: document.getElementById('debugShowStatus')?.checked || false,
        statusPosition: document.getElementById('debugStatusPosition')?.value || 'top-right'
      }
    }

    // デバッグ有効/無効の切り替え
    this.bindEvent('debugEnabled', 'change', async (e) => {
      const enabled = e.target.checked
      const debugConfig = getCurrentDebugConfig()
      
      // デバッグ無効時は画面表示も自動的に無効化
      if (!enabled) {
        debugConfig.showStatus = false
        this.updateElement('debugShowStatus', false, 'checked')
      }
      
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus(`デバッグモードを${enabled ? '有効' : '無効'}にしました`, 'success')
    })

    // ステータス表示設定
    this.bindEvent('debugShowStatus', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('デバッグ設定を更新しました', 'success')
    })

    // ログレベル設定
    this.bindEvent('debugLogLevel', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('ログレベルを変更しました', 'success')
    })

    // ステータス位置設定
    this.bindEvent('debugStatusPosition', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('ステータス表示位置を変更しました', 'success')
    })
  }

  /**
   * イベントバインディングのヘルパーメソッド
   * @param {string} elementId - 要素ID
   * @param {string} eventType - イベントタイプ
   * @param {Function} handler - イベントハンドラー
   */
  bindEvent(elementId, eventType, handler) {
    const element = document.getElementById(elementId)
    if (element) {
      element.addEventListener(eventType, async (e) => {
        try {
          await handler(e)
        } catch (error) {
          console.error(`Event handler error for ${elementId}:`, error)
          this.showStatus('操作に失敗しました', 'error')
        }
      })
    } else {
      console.warn(`Element not found: ${elementId}`)
    }
  }

  /**
   * ジェスチャーの検索フィルター
   * @param {string} query - 検索クエリ
   */
  filterGestures(query) {
    const items = document.querySelectorAll('.all-gesture-item')
    const lowerQuery = query.toLowerCase()

    items.forEach(item => {
      const name = item.querySelector('.gesture-name')?.textContent.toLowerCase() || ''
      const description = item.querySelector('.gesture-description')?.textContent.toLowerCase() || ''
      
      if (name.includes(lowerQuery) || description.includes(lowerQuery)) {
        item.style.display = ''
      } else {
        item.style.display = 'none'
      }
    })

    // カテゴリーヘッダーの表示制御
    document.querySelectorAll('.gesture-category').forEach(category => {
      const visibleItems = category.querySelectorAll('.all-gesture-item:not([style*="display: none"])')
      category.style.display = visibleItems.length > 0 ? '' : 'none'
    })
  }

  /**
   * ジェスチャーのタイプフィルター
   * @param {string} type - フィルタータイプ
   */
  filterGesturesByType(type) {
    const items = document.querySelectorAll('.all-gesture-item')

    items.forEach(item => {
      const gestureId = item.querySelector('input[data-gesture-id]')?.dataset.gestureId || ''
      
      if (type === 'all') {
        item.style.display = ''
      } else if (type === 'enabled') {
        const isEnabled = !item.classList.contains('disabled')
        item.style.display = isEnabled ? '' : 'none'
      } else if (type === 'disabled') {
        const isDisabled = item.classList.contains('disabled')
        item.style.display = isDisabled ? '' : 'none'
      } else if (type === 'custom') {
        const isCustom = gestureId.startsWith('custom_')
        item.style.display = isCustom ? '' : 'none'
      } else if (type === 'default') {
        const isDefault = !gestureId.startsWith('custom_')
        item.style.display = isDefault ? '' : 'none'
      }
    })

    // カテゴリーヘッダーの表示制御
    document.querySelectorAll('.gesture-category').forEach(category => {
      const visibleItems = category.querySelectorAll('.all-gesture-item:not([style*="display: none"])')
      category.style.display = visibleItems.length > 0 ? '' : 'none'
    })
  }

  /**
   * カスタムジェスチャーパターンに方向を追加
   * @param {string} direction - 方向（UP, DOWN, LEFT, RIGHT）
   */
  addDirectionToPattern(direction) {
    if (this.currentPattern.length < 10) { // 最大10方向まで
      this.currentPattern.push(direction)
      this.updatePatternDisplay()
    } else {
      this.showStatus('パターンが長すぎます（最大10方向）', 'error')
    }
  }

  /**
   * カスタムジェスチャーパターンをクリア
   */
  clearPattern() {
    this.currentPattern = []
    this.updatePatternDisplay()
  }

  /**
   * パターン表示を更新
   */
  updatePatternDisplay() {
    const display = document.getElementById('gesturePatternDisplay')
    if (display) {
      const arrows = { 'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→' }
      display.value = this.currentPattern.map(dir => arrows[dir] || dir).join('')
    }
  }

  /**
   * カスタムジェスチャー追加処理
   */
  async handleAddGesture() {
    try {
      const name = document.getElementById('gestureName')?.value.trim()
      const action = document.getElementById('gestureAction')?.value
      
      if (!name) {
        this.showStatus('ジェスチャー名を入力してください', 'error')
        return
      }
      
      if (this.currentPattern.length === 0) {
        this.showStatus('ジェスチャーパターンを設定してください', 'error')
        return
      }
      
      if (!action) {
        this.showStatus('アクションを選択してください', 'error')
        return
      }

      // パターンをPoint配列形式に変換（簡易実装）
      const rawPoints = this.currentPattern.map((direction, index) => ({
        x: index * 50, // 仮の座標
        y: direction === 'UP' ? -50 : direction === 'DOWN' ? 50 : 0,
        timestamp: Date.now() + index * 100
      }))

      await this.customGestureUseCase.createCustomGesture(name, rawPoints, action)
      
      // フォームをリセット
      document.getElementById('gestureName').value = ''
      document.getElementById('gestureAction').value = ''
      this.clearPattern()
      
      // 描画更新（外部コントローラーに委譲）
      if (this.onGestureAdded) {
        await this.onGestureAdded()
      }
      
      this.showStatus('カスタムジェスチャーを追加しました', 'success')
      
    } catch (error) {
      console.error('カスタムジェスチャー追加エラー:', error)
      this.showStatus('カスタムジェスチャーの追加に失敗しました', 'error')
    }
  }

  /**
   * 外部コールバックの設定
   * @param {Function} gestureAddedCallback - ジェスチャー追加後のコールバック
   */
  setCallbacks(gestureAddedCallback) {
    this.onGestureAdded = gestureAddedCallback
  }
}

// CommonJS用のエクスポート（テスト対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OptionsEventController }
  // グローバル定義もテスト環境で必要
  global.OptionsEventController = OptionsEventController
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.OptionsEventController = OptionsEventController
}