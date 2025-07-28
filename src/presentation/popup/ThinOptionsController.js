/**
 * ThinOptionsController - 薄いPresentation層
 * UIイベントハンドリングのみに特化し、UseCaseに処理を委譲
 */

class ThinOptionsController {
  constructor({ settingsUseCase, customGestureUseCase, gestureListUseCase }) {
    this.settingsUseCase = settingsUseCase
    this.customGestureUseCase = customGestureUseCase
    this.gestureListUseCase = gestureListUseCase
    this.isInitialized = false
  }

  /**
   * 初期化（UIイベントの設定のみ）
   */
  async initialize() {
    try {
      
      this.setupBasicSettingsEvents()
      this.setupGestureListEvents()
      this.setupCustomGestureEvents()
      this.setupExcludeSiteEvents()
      this.setupDebugEvents()
      
      await this.loadInitialData()
      
      this.isInitialized = true
      
    } catch (error) {
      console.error('❌ Thin Options Controller: Initialization failed:', error)
      this.showStatus('設定画面の初期化に失敗しました', 'error')
    }
  }

  /**
   * 基本設定のイベント設定
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
   * ジェスチャー一覧のイベント設定
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
   * カスタムジェスチャーのイベント設定
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
   * 除外サイトのイベント設定
   */
  setupExcludeSiteEvents() {
    const addSite = async () => {
      const input = document.getElementById('newExcludeUrl')
      const pattern = input?.value.trim()
      if (pattern) {
        await this.settingsUseCase.addExcludeSite(pattern)
        input.value = ''
        this.renderExcludeList()
        this.showStatus('除外サイトを追加しました', 'success')
      }
    }

    this.bindEvent('addExcludeBtn', 'click', addSite)
    this.bindEvent('newExcludeUrl', 'keypress', (e) => {
      if (e.key === 'Enter') addSite()
    })
  }


  /**
   * デバッグ設定のイベント設定
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
        const showStatusCheckbox = document.getElementById('debugShowStatus')
        if (showStatusCheckbox) {
          showStatusCheckbox.checked = false
        }
      }
      
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.toggleDebugOptions(enabled)
      this.showStatus('デバッグ設定を更新しました', 'success')
    })

    // 画面表示の切り替え
    this.bindEvent('debugShowStatus', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('デバッグ表示設定を更新しました', 'success')
    })

    // ログレベルの変更
    this.bindEvent('debugLogLevel', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('ログレベルを更新しました', 'success')
    })

    // 表示位置の変更
    this.bindEvent('debugStatusPosition', 'change', async () => {
      const debugConfig = getCurrentDebugConfig()
      await this.settingsUseCase.updateDebugSettings(debugConfig)
      this.showStatus('表示位置を更新しました', 'success')
    })
  }

  /**
   * 初期データ読み込み（UseCaseから取得）
   */
  async loadInitialData() {
    try {
      // 設定取得
      const settings = await this.settingsUseCase.getCurrentSettings()
      this.updateUIFromSettings(settings)

      // ジェスチャー一覧表示
      await this.renderGestureList()
      
      // カスタムジェスチャー一覧表示
      await this.renderCustomGestureList()

      // 除外サイト一覧表示
      await this.renderExcludeList()

      // 学習統計表示

    } catch (error) {
      console.error('Initial data loading failed:', error)
      this.showStatus('データの読み込みに失敗しました', 'error')
    }
  }

  /**
   * 設定からUIを更新（薄いロジック）
   */
  updateUIFromSettings(settings) {
    this.updateElement('enabled', settings.isEnabled(), 'checked')
    
    // 軌跡表示設定はgetStrokeSettings()メソッドから取得
    const strokeSettings = settings.getStrokeSettings()
    this.updateElement('strokeColor', strokeSettings.color, 'value')
    this.updateElement('strokeWidth', strokeSettings.width, 'value')
    this.updateElement('strokeWidthValue', `${strokeSettings.width}px`)
    
    // ジェスチャー閾値はgetThreshold()から取得してdetectionThresholdを使用
    const threshold = settings.getThreshold()
    this.updateElement('gestureThreshold', threshold.getDetectionThreshold(), 'value')
    this.updateElement('gestureThresholdValue', `${threshold.getDetectionThreshold()}px`)
    
    // デバッグ設定の反映
    const debugSettings = settings.getDebugSettings()
    this.updateElement('debugEnabled', debugSettings.enabled, 'checked')
    this.updateElement('debugLogLevel', debugSettings.logLevel, 'value')
    this.updateElement('debugShowStatus', debugSettings.showStatus, 'checked')
    this.updateElement('debugStatusPosition', debugSettings.statusPosition, 'value')
    this.toggleDebugOptions(debugSettings.enabled)
    
    this.updatePreview()
  }

  /**
   * ジェスチャー一覧表示（UseCaseから取得）
   */
  async renderGestureList() {
    try {
      const gestures = await this.gestureListUseCase.getAllGestures()
      const listElement = document.getElementById('allGesturesList')
      
      if (!listElement) return

      const html = this.buildGestureListHTML(gestures)
      listElement.innerHTML = html

      // イベント委譲でトグル処理
      listElement.addEventListener('change', async (e) => {
        if (e.target.type === 'checkbox' && e.target.dataset.gestureId) {
          const gestureId = e.target.dataset.gestureId
          
          // カスタムジェスチャーかデフォルトジェスチャーかを判別
          const isCustomGesture = gestureId.startsWith('custom_')
          
          if (isCustomGesture) {
            await this.customGestureUseCase.toggleCustomGesture(gestureId, e.target.checked)
            await this.renderCustomGestureList() // カスタムジェスチャーセクションも更新
          } else {
            await this.settingsUseCase.toggleGesture(gestureId, e.target.checked)
          }
          
          this.showStatus(`ジェスチャー「${gestureId}」を${e.target.checked ? '有効' : '無効'}にしました`, 'success')
        }
      })

    } catch (error) {
      console.error('ジェスチャー一覧表示エラー:', error)
    }
  }

  /**
   * カスタムジェスチャー一覧表示（UseCaseから取得）
   */
  async renderCustomGestureList() {
    try {
      const customGestures = await this.customGestureUseCase.getAllCustomGestures()
      const listElement = document.getElementById('customGestureList')
      
      if (!listElement) return


      const html = this.buildCustomGestureListHTML(customGestures)
      listElement.innerHTML = html

      // イベント委譲で編集・削除・トグル処理
      listElement.addEventListener('click', async (e) => {
        const gestureId = e.target.dataset.gestureId
        
        if (e.target.classList.contains('edit-btn')) {
          await this.editCustomGesture(gestureId)
        } else if (e.target.classList.contains('delete-btn')) {
          const confirmed = await this.showConfirm('このカスタムジェスチャーを削除しますか？')
          if (confirmed) {
            await this.customGestureUseCase.deleteCustomGesture(gestureId)
            await this.renderCustomGestureList()
            await this.renderGestureList() // ジェスチャー一覧も同期更新
            this.showStatus('カスタムジェスチャーを削除しました', 'success')
          }
        }
      })

      listElement.addEventListener('change', async (e) => {
        if (e.target.type === 'checkbox' && e.target.dataset.gestureId) {
          const gestureId = e.target.dataset.gestureId
          await this.customGestureUseCase.toggleCustomGesture(gestureId, e.target.checked)
          await this.renderGestureList() // ジェスチャー一覧も同期更新
          this.showStatus('ジェスチャー状態を変更しました', 'success')
        }
      })

    } catch (error) {
      console.error('カスタムジェスチャー一覧表示エラー:', error)
    }
  }

  /**
   * 除外サイト一覧表示（UseCaseから取得）
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
            <button type="button" class="remove-exclude-btn" data-pattern="${this.escapeHtml(pattern)}">削除</button>
          </div>
        `
      })

      listElement.innerHTML = html

      // イベント委譲で削除処理
      listElement.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-exclude-btn')) {
          const pattern = e.target.dataset.pattern
          await this.settingsUseCase.removeExcludeSite(pattern)
          this.renderExcludeList()
          this.showStatus('除外サイトを削除しました', 'success')
        }
      })

    } catch (error) {
      console.error('除外サイト一覧表示エラー:', error)
    }
  }


  // ========== ユーティリティメソッド（薄いUIロジック） ==========

  /**
   * イベントバインディング
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
    }
  }

  /**
   * 要素更新
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
   * HTMLエスケープ
   */
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
   * 確認ダイアログ
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
        // eslint-disable-next-line no-alert
        resolve(confirm(message))
      }
    })
  }

  // ========== HTML生成メソッド（薄いロジック） ==========

  buildGestureListHTML(gestures) {
    let html = ''
    
    const categories = this.groupGesturesByCategory(gestures)
    
    Object.entries(categories).forEach(([categoryName, categoryGestures]) => {
      if (categoryGestures.length > 0) {
        html += `<div class="gesture-category"><div class="category-header">${categoryName} (${categoryGestures.length})</div>`
        
        categoryGestures.forEach(gesture => {
          const pattern = gesture.getFormattedPattern(8) // 統一パターン表示
          
          html += `
            <div class="all-gesture-item ${gesture.enabled ? '' : 'disabled'}">
              <div class="gesture-visual">
                <div class="gesture-pattern-large">${pattern}</div>
              </div>
              <div class="gesture-info">
                <div class="gesture-name">${gesture.name}${gesture.isNew ? ' <span class="new-badge">NEW</span>' : ''}</div>
                <div class="gesture-description">${gesture.getActionDisplayName()}</div>
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
      const formattedPattern = this.formatPatternToArrows(gesture.pattern, 8)
      const actionDisplayName = this.getActionDisplayName(gesture.action)
      
      
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

  // ========== パターン表示ヘルパーメソッド ==========

  /**
   * パターンを矢印表記に変換
   */
  formatPatternToArrows(pattern, maxLength = 8) {
    let arrowPattern = ''
    
    if (typeof pattern === 'string') {
      // 既に矢印文字列の場合はそのまま返す
      if (/^[↑↓←→]+$/.test(pattern)) {
        arrowPattern = pattern
      } else if (pattern.includes(',')) {
        // カンマ区切りの場合は分割して処理
        arrowPattern = pattern
          .split(',')
          .map(dir => dir.trim())
          .map(dir => this.directionToArrow(dir))
          .join('')
      } else {
        // 英語方向文字列の場合は変換
        arrowPattern = pattern
          .replace(/UP/gi, '↑')
          .replace(/DOWN/gi, '↓')
          .replace(/LEFT/gi, '←')
          .replace(/RIGHT/gi, '→')
      }
    } else if (Array.isArray(pattern)) {
      // 配列パターンの処理
      arrowPattern = pattern
        .map(dir => this.directionToArrow(dir))
        .join('')
    } else if (pattern && typeof pattern === 'object' && pattern._directions && Array.isArray(pattern._directions)) {
      // GesturePatternオブジェクトの処理
      arrowPattern = pattern._directions
        .map(dir => this.directionToArrow(dir))
        .join('')
    } else if (pattern && typeof pattern.toString === 'function') {
      // その他のオブジェクトでtoStringメソッドがある場合
      const stringPattern = pattern.toString()
      if (/^[↑↓←→]+$/.test(stringPattern)) {
        arrowPattern = stringPattern
      } else {
        arrowPattern = stringPattern
          .replace(/UP/gi, '↑')
          .replace(/DOWN/gi, '↓')
          .replace(/LEFT/gi, '←')
          .replace(/RIGHT/gi, '→')
      }
    } else {
      arrowPattern = String(pattern || '')
    }
    
    // 長すぎる場合は省略表示
    if (maxLength > 1 && arrowPattern.length > maxLength) {
      return arrowPattern.substring(0, maxLength - 1) + '…'
    }
    
    return arrowPattern
  }

  /**
   * 方向文字列を矢印に変換
   */
  directionToArrow(direction) {
    // 既に矢印の場合はそのまま
    if (/^[↑↓←→]$/.test(direction)) {
      return direction
    }
    
    // 英語方向文字列を矢印に変換
    switch(direction.toLowerCase()) {
    case 'up': return '↑'
    case 'down': return '↓'
    case 'left': return '←'
    case 'right': return '→'
    default: return direction // 不明な場合はそのまま
    }
  }

  /**
   * アクションの表示名を取得
   */
  getActionDisplayName(action) {
    const actionNames = {
      back: 'ブラウザの戻る',
      forward: 'ブラウザの進む',
      scroll_up: 'ページ最上部スクロール',
      scroll_down: 'ページ最下部スクロール',
      close_tab: 'タブを閉じる',
      new_tab: '新しいタブを開く',
      refresh: 'ページ更新',
      duplicate_tab: 'タブ複製',
      super_refresh: 'スーパーリロード（キャッシュクリア付き）',
      prev_tab: '前のタブに切り替え',
      next_tab: '次のタブに切り替え'
    }
    
    return actionNames[action] || action
  }

  // ========== その他のUIロジック ==========

  filterGestures(searchTerm) {
    const items = document.querySelectorAll('.all-gesture-item')
    items.forEach(item => {
      const text = item.textContent.toLowerCase()
      item.style.display = text.includes(searchTerm.toLowerCase()) ? 'flex' : 'none'
    })
  }

  filterGesturesByType(type) {
    const categories = document.querySelectorAll('.gesture-category')
    categories.forEach(category => {
      const header = category.querySelector('.category-header')?.textContent || ''
      let show = type === 'all'
      if (type === 'default' && header.includes('標準')) show = true
      if (type === 'custom' && header.includes('カスタム')) show = true
      category.style.display = show ? 'block' : 'none'
    })
  }

  toggleDebugOptions(enabled) {
    const debugOptions = document.getElementById('debugOptions')
    if (debugOptions) {
      debugOptions.style.display = enabled ? 'block' : 'none'
    }
  }

  addDirectionToPattern(direction) {
    this.currentPattern.push(direction)
    this.updatePatternDisplay()
  }

  updatePatternDisplay() {
    const display = document.getElementById('gesturePatternDisplay')
    if (display) {
      const arrows = { 'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→' }
      display.value = this.currentPattern.map(dir => arrows[dir] || dir).join('')
    }
  }


  clearPattern() {
    this.currentPattern = []
    this.updatePatternDisplay()
    this.showStatus('パターンをクリアしました', 'success', 1500)
  }

  async handleAddGesture() {
    const name = document.getElementById('gestureName')?.value.trim()
    const action = document.getElementById('gestureAction')?.value
    
    if (!name || this.currentPattern.length === 0) {
      this.showStatus('ジェスチャー名とパターンを入力してください', 'error')
      return
    }

    try {
      // UI層の大文字方向値をdomain層の小文字に変換
      const normalizedPattern = this.currentPattern.map(direction => {
        switch(direction) {
        case 'UP': return 'up'
        case 'DOWN': return 'down'
        case 'LEFT': return 'left'
        case 'RIGHT': return 'right'
        default: return direction.toLowerCase()
        }
      })

      // addCustomGestureメソッドを使用（オブジェクト形式で呼び出し）
      await this.customGestureUseCase.addCustomGesture({
        name,
        pattern: normalizedPattern,
        action,
        description: ''
      })
      
      // フォームリセット
      document.getElementById('gestureName').value = ''
      document.getElementById('gestureAction').selectedIndex = 0
      this.clearPattern()
      
      await this.renderCustomGestureList()
      await this.renderGestureList() // ジェスチャー一覧も同期更新
      this.showStatus('新しいカスタムジェスチャーを追加しました', 'success')
      
    } catch (error) {
      console.error('ジェスチャー追加エラー:', error)
      console.error('エラーの詳細:', error.message)
      console.error('入力データ:', { name, pattern: this.currentPattern, action })
      
      // より詳細なエラーメッセージを表示
      const errorMessage = error.message || 'ジェスチャーの追加に失敗しました'
      this.showStatus(`エラー: ${errorMessage}`, 'error')
    }
  }

  async editCustomGesture(gestureId) {
    try {
      const gesture = await this.customGestureUseCase.getCustomGesture(gestureId)
      
      document.getElementById('gestureName').value = gesture.name
      document.getElementById('gestureAction').value = gesture.action
      this.currentPattern = Array.isArray(gesture.pattern) ? [...gesture.pattern] : []
      this.updatePatternDisplay()
      
      this.showStatus('編集モードに入りました', 'info')
      
    } catch (error) {
      console.error('ジェスチャー編集エラー:', error)
      this.showStatus('ジェスチャーの読み込みに失敗しました', 'error')
    }
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ThinOptionsController }
}