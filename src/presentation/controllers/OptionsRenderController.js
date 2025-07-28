/**
 * OptionsRenderController
 * 設定画面の描画・HTML生成専用クラス
 * Clean Architecture - Presentation層
 */

class OptionsRenderController {
  /**
   * @param {Object} dependencies - 依存関係
   * @param {Object} dependencies.settingsUseCase - 設定UseCase
   * @param {Object} dependencies.customGestureUseCase - カスタムジェスチャーUseCase
   * @param {Object} dependencies.gestureListUseCase - ジェスチャー一覧UseCase
   * @param {GesturePatternFormatter} dependencies.patternFormatter - パターンフォーマッター
   * @param {Function} dependencies.showStatus - ステータス表示関数
   */
  constructor(dependencies) {
    this.settingsUseCase = dependencies.settingsUseCase
    this.customGestureUseCase = dependencies.customGestureUseCase
    this.gestureListUseCase = dependencies.gestureListUseCase
    this.patternFormatter = dependencies.patternFormatter
    this.showStatus = dependencies.showStatus
  }

  /**
   * ジェスチャー一覧を描画
   * @returns {Promise<void>}
   */
  async renderGestureList() {
    try {
      const gestures = await this.gestureListUseCase.getAllGestures()
      const listElement = document.getElementById('allGesturesList')
      
      if (!listElement) return

      const html = this.buildGestureListHTML(gestures)
      listElement.innerHTML = html

      this.setupGestureListEvents(listElement)

    } catch (error) {
      console.error('ジェスチャー一覧表示エラー:', error)
      this.showStatus('ジェスチャー一覧の表示に失敗しました', 'error')
    }
  }

  /**
   * カスタムジェスチャー一覧を描画
   * @returns {Promise<void>}
   */
  async renderCustomGestureList() {
    try {
      const customGestures = await this.customGestureUseCase.getAllCustomGestures()
      const listElement = document.getElementById('customGestureList')
      
      if (!listElement) return

      const html = this.buildCustomGestureListHTML(customGestures)
      listElement.innerHTML = html

      this.setupCustomGestureListEvents(listElement)

    } catch (error) {
      console.error('カスタムジェスチャー一覧表示エラー:', error)
      this.showStatus('カスタムジェスチャー一覧の表示に失敗しました', 'error')
    }
  }

  /**
   * 除外サイト一覧を描画
   * @returns {Promise<void>}
   */
  async renderExcludeList() {
    try {
      const settings = await this.settingsUseCase.getCurrentSettings()
      const excludedSites = settings.getExcludeList()
      const listElement = document.getElementById('excludeList')
      
      if (!listElement) return

      if (excludedSites.length === 0) {
        listElement.innerHTML = '<div style="text-align: center; color: #5f6368; padding: 16px;">除外サイトが設定されていません</div>'
        return
      }

      let html = ''
      excludedSites.forEach(pattern => {
        html += `
          <div class="exclude-item">
            <span class="exclude-pattern">${this.escapeHtml(pattern)}</span>
            <button class="remove-exclude-btn" data-pattern="${this.escapeHtml(pattern)}">削除</button>
          </div>
        `
      })

      listElement.innerHTML = html
      this.setupExcludeListEvents(listElement)

    } catch (error) {
      console.error('除外サイト一覧表示エラー:', error)
      this.showStatus('除外サイト一覧の表示に失敗しました', 'error')
    }
  }

  /**
   * ジェスチャー一覧のHTMLを生成
   * @param {Array} gestures - ジェスチャー配列
   * @returns {string} HTML文字列
   */
  buildGestureListHTML(gestures) {
    let html = ''
    
    const categories = this.groupGesturesByCategory(gestures)
    
    Object.entries(categories).forEach(([categoryName, categoryGestures]) => {
      if (categoryGestures.length > 0) {
        html += `<div class="gesture-category"><div class="category-header">${categoryName} (${categoryGestures.length})</div>`
        
        categoryGestures.forEach(gesture => {
          const pattern = gesture.getFormattedPattern ? gesture.getFormattedPattern(8) : this.patternFormatter.formatPatternToArrows(gesture.pattern, 8)
          
          html += `
            <div class="all-gesture-item ${gesture.enabled ? '' : 'disabled'}">
              <div class="gesture-pattern">${pattern}</div>
              <div class="gesture-info">
                <div class="gesture-name">${gesture.name}${gesture.isNew ? ' <span class="new-badge">NEW</span>' : ''}</div>
                <div class="gesture-description">${gesture.getActionDisplayName ? gesture.getActionDisplayName() : this.patternFormatter.getActionDisplayName(gesture.action)}</div>
              </div>
              <div class="gesture-actions">
                <label class="switch">
                  <input type="checkbox" data-gesture-id="${gesture.id}" ${gesture.enabled ? 'checked' : ''}>
                  <span class="slider"></span>
                </label>
              </div>
            </div>
          `
        })
        
        html += '</div>'
      }
    })
    
    return html || '<div style="padding: 32px; text-align: center; color: #5f6368;">表示するジェスチャーがありません</div>'
  }

  /**
   * カスタムジェスチャー一覧のHTMLを生成
   * @param {Array} customGestures - カスタムジェスチャー配列
   * @returns {string} HTML文字列
   */
  buildCustomGestureListHTML(customGestures) {
    if (customGestures.length === 0) {
      return `
        <div style="padding: 24px; text-align: center; color: #5f6368;">
          <div style="font-size: 14px; margin-bottom: 8px;">カスタムジェスチャーがありません</div>
          <div style="font-size: 12px;">下のフォームから新しいジェスチャーを追加してください</div>
        </div>
      `
    }

    let html = ''
    customGestures.forEach(gesture => {
      // パターンを矢印表記に統一変換
      const formattedPattern = this.patternFormatter.formatPatternToArrows(gesture.pattern, 8)
      const actionDisplayName = this.patternFormatter.getActionDisplayName(gesture.action)
      
      html += `
        <div class="gesture-item ${gesture.enabled ? '' : 'disabled'}">
          <div class="gesture-info">
            <div class="gesture-name">${this.escapeHtml(gesture.name)}</div>
            <div>
              <span class="gesture-pattern">${formattedPattern}</span>
              <span class="gesture-action">${actionDisplayName}</span>
            </div>
          </div>
          <div class="gesture-controls">
            <label class="switch">
              <input type="checkbox" data-gesture-id="${gesture.id}" ${gesture.enabled ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
            <button class="edit-btn" data-gesture-id="${gesture.id}">編集</button>
            <button class="delete-btn" data-gesture-id="${gesture.id}">削除</button>
          </div>
        </div>
      `
    })

    return html
  }

  /**
   * ジェスチャーをカテゴリ別に分類
   * @param {Array} gestures - ジェスチャー配列
   * @returns {Object} カテゴリ別のジェスチャー
   */
  groupGesturesByCategory(gestures) {
    const categories = {
      '標準ジェスチャー': [],
      'カスタムジェスチャー': []
    }

    gestures.forEach(gesture => {
      if (gesture.category === 'custom' || gesture.id.startsWith('custom_')) {
        categories['カスタムジェスチャー'].push(gesture)
      } else {
        categories['標準ジェスチャー'].push(gesture)
      }
    })

    return categories
  }

  /**
   * ジェスチャー一覧のイベント設定
   * @param {HTMLElement} listElement - リスト要素
   * @private
   */
  setupGestureListEvents(listElement) {
    // イベント委譲でトグル処理
    listElement.addEventListener('change', async (e) => {
      if (e.target.type === 'checkbox' && e.target.dataset.gestureId) {
        const gestureId = e.target.dataset.gestureId
        
        // カスタムジェスチャーかデフォルトジェスチャーかを判別
        const isCustomGesture = gestureId.startsWith('custom_')
        
        try {
          if (isCustomGesture) {
            await this.customGestureUseCase.toggleCustomGesture(gestureId, e.target.checked)
            await this.renderCustomGestureList() // カスタムジェスチャーセクションも更新
          } else {
            await this.settingsUseCase.toggleGesture(gestureId, e.target.checked)
          }
          
          this.showStatus(`ジェスチャー「${gestureId}」を${e.target.checked ? '有効' : '無効'}にしました`, 'success')
        } catch (error) {
          console.error('ジェスチャートグルエラー:', error)
          this.showStatus('ジェスチャー設定の変更に失敗しました', 'error')
          // チェック状態を元に戻す
          e.target.checked = !e.target.checked
        }
      }
    })
  }

  /**
   * カスタムジェスチャー一覧のイベント設定
   * @param {HTMLElement} listElement - リスト要素
   * @private
   */
  setupCustomGestureListEvents(listElement) {
    // クリックイベント（編集・削除）
    listElement.addEventListener('click', async (e) => {
      const gestureId = e.target.dataset.gestureId
      
      try {
        if (e.target.classList.contains('edit-btn')) {
          // 編集処理は別のコントローラーに委譲
          if (this.editCustomGesture) {
            await this.editCustomGesture(gestureId)
          }
        } else if (e.target.classList.contains('delete-btn')) {
          const confirmed = await this.showConfirm('このカスタムジェスチャーを削除しますか？')
          if (confirmed) {
            await this.customGestureUseCase.deleteCustomGesture(gestureId)
            await this.renderCustomGestureList()
            await this.renderGestureList() // ジェスチャー一覧も同期更新
            this.showStatus('カスタムジェスチャーを削除しました', 'success')
          }
        }
      } catch (error) {
        console.error('カスタムジェスチャー操作エラー:', error)
        this.showStatus('操作に失敗しました', 'error')
      }
    })

    // 変更イベント（トグル）
    listElement.addEventListener('change', async (e) => {
      if (e.target.type === 'checkbox' && e.target.dataset.gestureId) {
        const gestureId = e.target.dataset.gestureId
        
        try {
          await this.customGestureUseCase.toggleCustomGesture(gestureId, e.target.checked)
          await this.renderGestureList() // ジェスチャー一覧も同期更新
          this.showStatus('ジェスチャー状態を変更しました', 'success')
        } catch (error) {
          console.error('カスタムジェスチャートグルエラー:', error)
          this.showStatus('ジェスチャー設定の変更に失敗しました', 'error')
          // チェック状態を元に戻す
          e.target.checked = !e.target.checked
        }
      }
    })
  }

  /**
   * 除外サイト一覧のイベント設定
   * @param {HTMLElement} listElement - リスト要素
   * @private
   */
  setupExcludeListEvents(listElement) {
    listElement.addEventListener('click', async (e) => {
      if (e.target.classList.contains('remove-exclude-btn')) {
        const pattern = e.target.dataset.pattern
        
        try {
          await this.settingsUseCase.removeExcludeSite(pattern)
          await this.renderExcludeList()
          this.showStatus('除外サイトを削除しました', 'success')
        } catch (error) {
          console.error('除外サイト削除エラー:', error)
          this.showStatus('除外サイトの削除に失敗しました', 'error')
        }
      }
    })
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

  /**
   * 確認ダイアログの表示（外部から注入される）
   * @param {string} message - 確認メッセージ
   * @returns {Promise<boolean>} 確認結果
   */
  async showConfirm(message) {
    if (this.showConfirmDialog) {
      return await this.showConfirmDialog(message)
    }
    // フォールバック
    // eslint-disable-next-line no-alert
    return confirm(message)
  }

  /**
   * 外部ハンドラーの設定
   * @param {Function} editHandler - 編集ハンドラー
   * @param {Function} confirmHandler - 確認ダイアログハンドラー
   */
  setExternalHandlers(editHandler, confirmHandler) {
    this.editCustomGesture = editHandler
    this.showConfirmDialog = confirmHandler
  }
}

// CommonJS用のエクスポート（テスト対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OptionsRenderController }
  // グローバル定義もテスト環境で必要
  global.OptionsRenderController = OptionsRenderController
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.OptionsRenderController = OptionsRenderController
}