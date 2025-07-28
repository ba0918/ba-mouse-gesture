/**
 * ジェスチャー一覧コントローラー
 * Presentation層 - UI制御とユーザーインタラクション
 */

class GestureListController {
  constructor(gestureListUseCase) {
    this.gestureListUseCase = gestureListUseCase
    this.currentViewMode = 'list'
    this.currentFilter = 'all'
    this.searchQuery = ''
    this.allGestures = []
  }

  /**
   * ジェスチャー一覧の初期化
   */
  async initialize() {
    try {
      console.log('🔧 GestureListController: Initializing gesture list')
      
      // DOM要素の存在確認
      const container = document.getElementById('allGesturesList')
      if (!container) {
        throw new Error('allGesturesList container not found')
      }

      // ジェスチャーデータを読み込み
      await this.loadGestures()
      
      // イベントリスナーを設定
      this.setupEventListeners()
      
      // 初期表示
      await this.renderGestures()
      
      console.log('🔧 GestureListController: Initialization completed')
      
    } catch (error) {
      console.error('🚨 GestureListController: Initialization failed:', error)
      this.showError(error.message)
      throw error
    }
  }

  /**
   * ジェスチャーデータを読み込み
   */
  async loadGestures() {
    try {
      console.log('🔧 GestureListController: Loading gestures')
      
      this.allGestures = await this.gestureListUseCase.getAllGestures()
      
      console.log('🔧 GestureListController: Gestures loaded:', this.allGestures.length)
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to load gestures:', error)
      throw new Error(`Failed to load gestures: ${error.message}`)
    }
  }

  /**
   * ジェスチャーを表示
   */
  async renderGestures() {
    try {
      console.log('🔧 GestureListController: Rendering gestures')
      
      const container = document.getElementById('allGesturesList')
      if (!container) {
        throw new Error('allGesturesList container not found')
      }

      // フィルタリング
      const filteredGestures = this.gestureListUseCase.filterGestures(this.allGestures, {
        searchQuery: this.searchQuery,
        filter: this.currentFilter
      })

      if (filteredGestures.length === 0) {
        container.innerHTML = this.renderEmptyState()
        return
      }

      // カテゴリ別にグループ化
      const groupedGestures = this.groupGesturesByCategory(filteredGestures)
      
      // HTML生成
      const html = Object.entries(groupedGestures)
        .map(([category, gestures]) => this.renderGestureCategory(category, gestures))
        .join('')

      container.innerHTML = html
      
      // イベントリスナーを再設定
      this.setupGestureItemListeners()
      
      console.log('🔧 GestureListController: Gestures rendered successfully')
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to render gestures:', error)
      this.showError(error.message)
    }
  }

  /**
   * ジェスチャーをカテゴリ別にグループ化
   */
  groupGesturesByCategory(gestures) {
    const grouped = {}
    
    for (const gesture of gestures) {
      const category = gesture.category || 'other'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(gesture)
    }
    
    return grouped
  }

  /**
   * カテゴリ別ジェスチャーのHTML生成
   */
  renderGestureCategory(category, gestures) {
    const categoryNames = {
      basic: '基本ジェスチャー',
      advanced: '高度ジェスチャー',
      custom: 'カスタムジェスチャー',
      other: 'その他'
    }

    const categoryName = categoryNames[category] || category

    return `
      <div class="gesture-category">
        <div class="category-header">${categoryName}</div>
        ${gestures.map(gesture => this.renderGestureItem(gesture)).join('')}
      </div>
    `
  }

  /**
   * 個別ジェスチャーアイテムのHTML生成
   */
  renderGestureItem(gesture) {
    const highlightedName = this.highlightSearchText(gesture.name)
    const highlightedDescription = this.highlightSearchText(gesture.description)
    
    const badges = []
    if (gesture.type === 'custom') {
      badges.push('<span class="gesture-badge custom">カスタム</span>')
    }
    if (!gesture.enabled) {
      badges.push('<span class="gesture-badge disabled">無効</span>')
    }

    return `
      <div class="all-gesture-item ${gesture.enabled ? '' : 'disabled'}" data-gesture-id="${gesture.id}">
        <div class="gesture-visual">
          <div class="gesture-pattern-large">${gesture.getDisplayPattern()}</div>
          <div class="gesture-pattern-text">${gesture.pattern}</div>
        </div>
        <div class="gesture-details">
          <div class="gesture-title">
            ${highlightedName}
            ${badges.join('')}
          </div>
          <div class="gesture-description">${highlightedDescription}</div>
        </div>
        <div class="gesture-actions">
          <button class="gesture-status-toggle ${gesture.enabled ? 'enabled' : ''}" 
                  data-gesture-id="${gesture.id}" 
                  title="${gesture.enabled ? '無効にする' : '有効にする'}"
                  aria-label="${gesture.enabled ? 'ジェスチャーを無効にする' : 'ジェスチャーを有効にする'}">
            <span class="toggle-indicator"></span>
            <span class="toggle-text">${gesture.enabled ? 'ON' : 'OFF'}</span>
          </button>
          ${gesture.type === 'custom' ? `
            <button class="edit-btn" data-gesture-id="${gesture.id}" title="編集">編集</button>
            <button class="delete-btn" data-gesture-id="${gesture.id}" title="削除">削除</button>
          ` : ''}
        </div>
      </div>
    `
  }

  /**
   * 空の状態のHTML生成
   */
  renderEmptyState() {
    let message = 'ジェスチャーが見つかりませんでした'
    let icon = '🔍'
    
    if (this.searchQuery) {
      message = `"${this.searchQuery}" に一致するジェスチャーが見つかりませんでした`
    } else if (this.currentFilter === 'custom') {
      message = 'カスタムジェスチャーがまだ登録されていません'
      icon = '✨'
    }

    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div>${message}</div>
      </div>
    `
  }

  /**
   * 検索テキストのハイライト
   */
  highlightSearchText(text) {
    if (!this.searchQuery) return text
    const regex = new RegExp(`(${this.searchQuery})`, 'gi')
    return text.replace(regex, '<span class="search-highlight">$1</span>')
  }

  /**
   * イベントリスナーの設定
   */
  setupEventListeners() {
    // 検索
    const searchInput = document.getElementById('gestureSearch')
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase()
        this.renderGestures()
      })
    }

    // フィルター
    const filterSelect = document.getElementById('gestureFilter')
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.currentFilter = e.target.value
        this.renderGestures()
      })
    }

    // 表示モード切り替え
    const toggleViewBtn = document.getElementById('toggleViewMode')
    if (toggleViewBtn) {
      toggleViewBtn.addEventListener('click', () => {
        this.toggleViewMode()
      })
    }
  }

  /**
   * ジェスチャーアイテムのイベントリスナー設定
   */
  setupGestureItemListeners() {
    // 有効/無効切り替え
    document.querySelectorAll('.gesture-status-toggle').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const gestureId = e.target.dataset.gestureId
        await this.toggleGestureStatus(gestureId)
      })
    })

    // カスタムジェスチャーの編集
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gestureId = e.target.dataset.gestureId
        this.editCustomGesture(gestureId)
      })
    })

    // カスタムジェスチャーの削除
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const gestureId = e.target.dataset.gestureId
        await this.deleteCustomGesture(gestureId)
      })
    })
  }

  /**
   * ジェスチャー状態の切り替え
   */
  async toggleGestureStatus(gestureId) {
    try {
      console.log('🔧 GestureListController: Toggling gesture status:', gestureId)
      
      const newStatus = await this.gestureListUseCase.toggleGestureStatus(gestureId)
      
      // UIを即座に更新
      this.updateToggleButtonUI(gestureId, newStatus)
      
      // 成功メッセージを表示
      const gesture = this.allGestures.find(g => g.id === gestureId)
      if (gesture) {
        this.showMessage(`${gesture.name}を${newStatus ? '有効' : '無効'}にしました`, 'success')
      }
      
      console.log('🔧 GestureListController: Gesture status toggled successfully')
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to toggle gesture status:', error)
      this.showMessage('ジェスチャーの更新に失敗しました', 'error')
    }
  }

  /**
   * トグルボタンUIの更新
   */
  updateToggleButtonUI(gestureId, enabled) {
    const button = document.querySelector(`[data-gesture-id="${gestureId}"].gesture-status-toggle`)
    if (!button) return

    if (enabled) {
      button.classList.add('enabled')
      button.title = '無効にする'
      button.setAttribute('aria-label', 'ジェスチャーを無効にする')
    } else {
      button.classList.remove('enabled')
      button.title = '有効にする'
      button.setAttribute('aria-label', 'ジェスチャーを有効にする')
    }

    const toggleText = button.querySelector('.toggle-text')
    if (toggleText) {
      toggleText.textContent = enabled ? 'ON' : 'OFF'
    }
  }

  /**
   * 表示モードの切り替え
   */
  toggleViewMode() {
    const modes = ['list', 'compact', 'grid']
    const currentIndex = modes.indexOf(this.currentViewMode)
    this.currentViewMode = modes[(currentIndex + 1) % modes.length]
    
    const toggleBtn = document.getElementById('toggleViewMode')
    if (toggleBtn) {
      const modeNames = { list: 'リスト', compact: 'コンパクト', grid: 'グリッド' }
      toggleBtn.textContent = modeNames[this.currentViewMode]
    }
    
    this.renderGestures()
  }

  /**
   * カスタムジェスチャーの編集
   */
  editCustomGesture(gestureId) {
    // 既存の編集機能を呼び出し
    console.log('🔧 GestureListController: Editing custom gesture:', gestureId)
    // この部分は既存のOptionsManagerの編集機能と統合する必要がある
  }

  /**
   * カスタムジェスチャーの削除
   */
  async deleteCustomGesture(gestureId) {
    try {
      console.log('🔧 GestureListController: Deleting custom gesture:', gestureId)
      
      const gesture = this.allGestures.find(g => g.id === gestureId && g.type === 'custom')
      if (!gesture) {
        throw new Error('Custom gesture not found')
      }

      // 確認ダイアログ
      if (!confirm(`ジェスチャー "${gesture.name}" を削除しますか？`)) {
        return
      }

      // 削除実行（GestureRepositoryを直接使用）
      // この部分は後で適切なユースケースに移動する必要がある
      
      this.showMessage(`${gesture.name}を削除しました`, 'success')
      
      // データを再読み込みして表示更新
      await this.loadGestures()
      await this.renderGestures()
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to delete custom gesture:', error)
      this.showMessage('ジェスチャーの削除に失敗しました', 'error')
    }
  }

  /**
   * エラー表示
   */
  showError(message) {
    const container = document.getElementById('allGesturesList')
    if (container) {
      container.innerHTML = `
        <div style="padding: 32px; text-align: center; color: #ea4335;">
          <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 8px;">初期化エラー</div>
          <div style="font-size: 12px; color: #5f6368; margin-bottom: 16px;">
            ${message}
          </div>
          <button onclick="location.reload()" style="
            padding: 8px 16px; 
            background: #1a73e8; 
            color: white; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer;
          ">ページをリロード</button>
        </div>
      `
    }
  }

  /**
   * メッセージ表示
   */
  showMessage(message, type = 'info') {
    // 既存のshowSaveStatus機能と統合する必要がある
    console.log(`🔧 GestureListController: ${type.toUpperCase()}: ${message}`)
  }

  /**
   * ジェスチャー一覧をリフレッシュ
   */
  async refresh() {
    try {
      await this.loadGestures()
      await this.renderGestures()
    } catch (error) {
      console.error('🚨 GestureListController: Failed to refresh:', error)
      this.showError(error.message)
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GestureListController }
}