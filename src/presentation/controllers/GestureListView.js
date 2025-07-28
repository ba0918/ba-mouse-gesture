/**
 * GestureListView
 * ジェスチャー一覧のHTML描画専用クラス
 * Clean Architecture - Presentation層
 */

class GestureListView {
  /**
   * @param {Object} options - 設定オプション
   * @param {Function} options.onToggleGesture - ジェスチャートグル時のコールバック
   * @param {Function} options.onDeleteCustomGesture - カスタムジェスチャー削除時のコールバック
   */
  constructor(options = {}) {
    this.onToggleGesture = options.onToggleGesture
    this.onDeleteCustomGesture = options.onDeleteCustomGesture
    this.searchQuery = ''
  }

  /**
   * ジェスチャー一覧を描画
   * @param {Array} gestures - ジェスチャー配列
   * @param {string} filter - フィルター条件
   * @param {string} searchQuery - 検索クエリ
   * @param {string} viewMode - 表示モード
   * @returns {string} 生成されたHTML
   */
  renderGestures(gestures, filter = 'all', searchQuery = '', viewMode = 'list') {
    console.log('🔧 GestureListView: Rendering gestures')
    
    this.searchQuery = searchQuery.toLowerCase()
    
    // フィルタリング
    const filteredGestures = gestures.filter(gesture => {
      // 検索フィルター
      if (this.searchQuery) {
        const matchesName = gesture.name.toLowerCase().includes(this.searchQuery)
        const matchesDescription = gesture.description.toLowerCase().includes(this.searchQuery)
        if (!matchesName && !matchesDescription) return false
      }
      
      // ステータスフィルター
      if (filter === 'enabled') return gesture.enabled
      if (filter === 'disabled') return !gesture.enabled
      if (filter === 'custom') return gesture.category === 'custom'
      if (filter === 'default') return gesture.category !== 'custom'
      
      return true // 'all'
    })

    if (filteredGestures.length === 0) {
      return this.renderEmptyState(filter, this.searchQuery)
    }

    // カテゴリ別にグループ化
    const groupedGestures = this.groupGesturesByCategory(filteredGestures)
    
    // HTML生成
    const html = Object.entries(groupedGestures)
      .map(([category, gestures]) => this.renderGestureCategory(category, gestures, viewMode))
      .join('')

    console.log('🔧 GestureListView: Gestures rendered successfully')
    return html
  }

  /**
   * カテゴリ別ジェスチャーのHTML生成
   * @param {string} category - カテゴリ名
   * @param {Array} gestures - ジェスチャー配列
   * @param {string} viewMode - 表示モード
   * @returns {string} カテゴリHTMLに
   */
  renderGestureCategory(category, gestures, viewMode = 'list') {
    const categoryNames = {
      basic: '基本ジェスチャー',
      advanced: '高度ジェスチャー',
      custom: 'カスタムジェスチャー'
    }
    
    const categoryName = categoryNames[category] || category
    const itemsHtml = gestures.map(gesture => this.renderGestureItem(gesture, viewMode)).join('')
    
    return `
      <div class="gesture-category">
        <div class="category-header">${categoryName} (${gestures.length})</div>
        <div class="gesture-items ${viewMode}">
          ${itemsHtml}
        </div>
      </div>
    `
  }

  /**
   * 個別ジェスチャーアイテムのHTML生成
   * @param {Object} gesture - ジェスチャーオブジェクト
   * @param {string} viewMode - 表示モード
   * @returns {string} アイテムHTML
   */
  renderGestureItem(gesture, viewMode = 'list') {
    const highlightedName = this.highlightSearchText(gesture.name)
    const highlightedDescription = this.highlightSearchText(gesture.description)
    
    const patternDisplay = gesture.getFormattedPattern ? 
      gesture.getFormattedPattern(6) : 
      this.formatPattern(gesture.pattern)
    
    const isCustom = gesture.category === 'custom'
    const statusClass = gesture.enabled ? 'enabled' : 'disabled'
    
    if (viewMode === 'card') {
      return this.renderGestureCard(gesture, highlightedName, highlightedDescription, patternDisplay, statusClass, isCustom)
    }
    
    return this.renderGestureListItem(gesture, highlightedName, highlightedDescription, patternDisplay, statusClass, isCustom)
  }

  /**
   * リスト形式のジェスチャーアイテムHTML生成
   * @param {Object} gesture - ジェスチャーオブジェクト
   * @param {string} highlightedName - ハイライト済み名前
   * @param {string} highlightedDescription - ハイライト済み説明
   * @param {string} patternDisplay - パターン表示
   * @param {string} statusClass - ステータスクラス
   * @param {boolean} isCustom - カスタムジェスチャーかどうか
   * @returns {string} リストアイテムHTML
   */
  renderGestureListItem(gesture, highlightedName, highlightedDescription, patternDisplay, statusClass, isCustom) {
    const deleteButton = isCustom ? `
      <button class="delete-gesture-btn" data-gesture-id="${gesture.id}" title="削除">
        ✕
      </button>
    ` : ''
    
    return `
      <div class="gesture-item ${statusClass}" data-gesture-id="${gesture.id}">
        <div class="gesture-pattern" title="ジェスチャーパターン">
          ${patternDisplay}
        </div>
        <div class="gesture-info">
          <div class="gesture-name">${highlightedName}</div>
          <div class="gesture-description">${highlightedDescription}</div>
        </div>
        <div class="gesture-controls">
          <label class="switch" title="${gesture.enabled ? '無効にする' : '有効にする'}">
            <input type="checkbox" 
                   data-gesture-id="${gesture.id}" 
                   ${gesture.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
          ${deleteButton}
        </div>
      </div>
    `
  }

  /**
   * カード形式のジェスチャーアイテムHTML生成
   * @param {Object} gesture - ジェスチャーオブジェクト
   * @param {string} highlightedName - ハイライト済み名前
   * @param {string} highlightedDescription - ハイライト済み説明
   * @param {string} patternDisplay - パターン表示
   * @param {string} statusClass - ステータスクラス
   * @param {boolean} isCustom - カスタムジェスチャーかどうか
   * @returns {string} カードアイテムHTML
   */
  renderGestureCard(gesture, highlightedName, highlightedDescription, patternDisplay, statusClass, isCustom) {
    const deleteButton = isCustom ? `
      <button class="delete-gesture-btn card-delete" data-gesture-id="${gesture.id}" title="削除">
        ✕
      </button>
    ` : ''
    
    return `
      <div class="gesture-card ${statusClass}" data-gesture-id="${gesture.id}">
        ${deleteButton}
        <div class="gesture-card-pattern">${patternDisplay}</div>
        <div class="gesture-card-info">
          <div class="gesture-card-name">${highlightedName}</div>
          <div class="gesture-card-description">${highlightedDescription}</div>
        </div>
        <div class="gesture-card-toggle">
          <label class="switch" title="${gesture.enabled ? '無効にする' : '有効にする'}">
            <input type="checkbox" 
                   data-gesture-id="${gesture.id}" 
                   ${gesture.enabled ? 'checked' : ''}>
            <span class="slider"></span>
          </label>
        </div>
      </div>
    `
  }

  /**
   * 空の状態のHTML生成
   * @param {string} filter - 現在のフィルター
   * @param {string} searchQuery - 検索クエリ
   * @returns {string} 空状態のHTML
   */
  renderEmptyState(filter, searchQuery) {
    let message = 'ジェスチャーが見つかりませんでした'
    let icon = '🔍'
    
    if (searchQuery) {
      message = `「${searchQuery}」に一致するジェスチャーが見つかりませんでした`
      icon = '🔍'
    } else if (filter === 'enabled') {
      message = '有効なジェスチャーがありません'
      icon = '✅'
    } else if (filter === 'disabled') {
      message = '無効なジェスチャーがありません'
      icon = '❌'
    } else if (filter === 'custom') {
      message = 'カスタムジェスチャーがありません'
      icon = '🎨'
    }
    
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon}</div>
        <div class="empty-message">${message}</div>
        <div class="empty-suggestion">
          ${filter === 'custom' ? 
            'カスタムジェスチャー作成で新しいジェスチャーを追加できます' : 
            'フィルターを変更するか、検索条件を調整してください'
          }
        </div>
      </div>
    `
  }

  /**
   * ジェスチャーをカテゴリ別にグループ化
   * @param {Array} gestures - ジェスチャー配列
   * @returns {Object} カテゴリ別のジェスチャー
   */
  groupGesturesByCategory(gestures) {
    const groups = {
      basic: [],
      advanced: [],
      custom: []
    }
    
    gestures.forEach(gesture => {
      const category = gesture.category || 'basic'
      if (groups[category]) {
        groups[category].push(gesture)
      } else {
        groups.basic.push(gesture)
      }
    })
    
    // 空のカテゴリを除去
    Object.keys(groups).forEach(key => {
      if (groups[key].length === 0) {
        delete groups[key]
      }
    })
    
    return groups
  }

  /**
   * 検索テキストをハイライト
   * @param {string} text - 対象テキスト
   * @returns {string} ハイライト済みテキスト
   */
  highlightSearchText(text) {
    if (!this.searchQuery || !text) return text
    
    const regex = new RegExp(`(${this.escapeRegex(this.searchQuery)})`, 'gi')
    return text.replace(regex, '<mark class="search-highlight">$1</mark>')
  }

  /**
   * パターンをフォーマット
   * @param {*} pattern - パターンデータ
   * @returns {string} フォーマット済みパターン
   */
  formatPattern(pattern) {
    if (typeof pattern === 'string') {
      return pattern
    }
    
    if (Array.isArray(pattern)) {
      const arrows = { 'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→' }
      return pattern.map(dir => arrows[dir] || dir).join('')
    }
    
    if (pattern && pattern._directions) {
      const arrows = { 'UP': '↑', 'DOWN': '↓', 'LEFT': '←', 'RIGHT': '→' }
      return pattern._directions.map(dir => arrows[dir] || dir).join('')
    }
    
    return String(pattern || '')
  }

  /**
   * 正規表現のエスケープ
   * @param {string} string - エスケープ対象文字列
   * @returns {string} エスケープ済み文字列
   */
  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * DOMにHTMLを挿入し、イベントリスナーを設定
   * @param {string} containerId - コンテナ要素のID
   * @param {string} html - 挿入するHTML
   */
  renderToDOM(containerId, html) {
    const container = document.getElementById(containerId)
    if (!container) {
      console.error(`Container not found: ${containerId}`)
      return
    }
    
    container.innerHTML = html
    this.setupEventListeners(container)
  }

  /**
   * イベントリスナーの設定
   * @param {HTMLElement} container - コンテナ要素
   */
  setupEventListeners(container) {
    // チェックボックス変更イベント（イベント委譲）
    container.addEventListener('change', (e) => {
      if (e.target.type === 'checkbox' && e.target.dataset.gestureId) {
        const gestureId = e.target.dataset.gestureId
        const enabled = e.target.checked
        
        if (this.onToggleGesture) {
          this.onToggleGesture(gestureId, enabled)
        }
      }
    })
    
    // 削除ボタンクリックイベント（イベント委譲）
    container.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-gesture-btn')) {
        const gestureId = e.target.dataset.gestureId
        
        if (this.onDeleteCustomGesture) {
          this.onDeleteCustomGesture(gestureId)
        }
      }
    })
  }
}

// CommonJS用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GestureListView
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.GestureListView = GestureListView
}