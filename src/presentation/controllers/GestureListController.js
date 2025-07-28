/**
 * GestureListController (リファクタリング後)
 * ジェスチャー一覧の状態管理・イベント処理専用クラス
 * Clean Architecture - Presentation層
 */

const { GestureListView } = require('./GestureListView')

class GestureListController {
  /**
   * @param {Object} gestureListUseCase - ジェスチャー一覧UseCase
   */
  constructor(gestureListUseCase) {
    this.gestureListUseCase = gestureListUseCase
    this.currentViewMode = 'list'
    this.currentFilter = 'all'
    this.searchQuery = ''
    this.allGestures = []
    
    // 依存クラスの読み込み（テスト環境対応）
    this.loadDependencies()
    
    // 描画コンポーネントの初期化
    this.view = new GestureListView({
      onToggleGesture: (gestureId, enabled) => this.handleToggleGesture(gestureId, enabled),
      onDeleteCustomGesture: (gestureId) => this.handleDeleteCustomGesture(gestureId)
    })
  }

  /**
   * ジェスチャー一覧の初期化
   * @returns {Promise<void>}
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
   * @returns {Promise<void>}
   */
  async loadGestures() {
    try {
      console.log('🔧 GestureListController: Loading gestures')
      this.allGestures = await this.gestureListUseCase.getAllGestures()
      console.log(`🔧 GestureListController: Loaded ${this.allGestures.length} gestures`)
    } catch (error) {
      console.error('🚨 GestureListController: Failed to load gestures:', error)
      this.allGestures = []
      throw error
    }
  }

  /**
   * ジェスチャーを描画（Viewに委譲）
   * @returns {void}
   */
  renderGestures() {
    try {
      const html = this.view.renderGestures(
        this.allGestures, 
        this.currentFilter, 
        this.searchQuery, 
        this.currentViewMode
      )
      
      this.view.renderToDOM('allGesturesList', html)
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to render gestures:', error)
      this.showError('ジェスチャー一覧の表示に失敗しました')
    }
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

    // 全選択/全解除
    const selectAllBtn = document.getElementById('selectAllGestures')
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        this.toggleAllGestures()
      })
    }

    // リフレッシュボタン
    const refreshBtn = document.getElementById('refreshGestures')
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.refresh()
      })
    }
  }

  /**
   * ジェスチャーの有効/無効を切り替え
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効かどうか
   * @returns {Promise<void>}
   */
  async handleToggleGesture(gestureId, enabled) {
    try {
      console.log(`🔧 GestureListController: Toggling gesture ${gestureId} to ${enabled}`)
      
      await this.gestureListUseCase.toggleGesture(gestureId, enabled)
      
      // ローカル状態を更新
      const gesture = this.allGestures.find(g => g.id === gestureId)
      if (gesture) {
        gesture.enabled = enabled
      }
      
      // 表示を更新
      await this.renderGestures()
      
      this.showMessage(`ジェスチャー「${gestureId}」を${enabled ? '有効' : '無効'}にしました`, 'success')
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to toggle gesture:', error)
      this.showError('ジェスチャーの設定変更に失敗しました')
      
      // 表示を元に戻す
      await this.renderGestures()
    }
  }

  /**
   * カスタムジェスチャーの削除
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<void>}
   */
  async handleDeleteCustomGesture(gestureId) {
    try {
      // 確認ダイアログ
      const confirmed = await this.showConfirm('このカスタムジェスチャーを削除しますか？')
      if (!confirmed) return
      
      console.log(`🔧 GestureListController: Deleting custom gesture ${gestureId}`)
      
      await this.gestureListUseCase.deleteCustomGesture(gestureId)
      
      // データを再読み込みして表示更新
      await this.loadGestures()
      await this.renderGestures()
      
      this.showMessage('カスタムジェスチャーを削除しました', 'success')
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to delete custom gesture:', error)
      this.showError('カスタムジェスチャーの削除に失敗しました')
    }
  }

  /**
   * 表示モードの切り替え
   */
  toggleViewMode() {
    this.currentViewMode = this.currentViewMode === 'list' ? 'card' : 'list'
    
    // ボタンのテキストを更新
    const toggleBtn = document.getElementById('toggleViewMode')
    if (toggleBtn) {
      const modeNames = {
        list: 'リスト表示',
        card: 'カード表示'
      }
      toggleBtn.textContent = modeNames[this.currentViewMode]
    }
    
    this.renderGestures()
  }

  /**
   * 全ジェスチャーの有効/無効を切り替え
   * @returns {Promise<void>}
   */
  async toggleAllGestures() {
    try {
      const visibleGestures = this.getVisibleGestures()
      const allEnabled = visibleGestures.every(g => g.enabled)
      const newState = !allEnabled
      
      console.log(`🔧 GestureListController: Toggling all gestures to ${newState}`)
      
      // 並列で処理
      await Promise.all(
        visibleGestures.map(gesture => 
          this.gestureListUseCase.toggleGesture(gesture.id, newState)
        )
      )
      
      // ローカル状態を更新
      visibleGestures.forEach(gesture => {
        gesture.enabled = newState
      })
      
      await this.renderGestures()
      
      this.showMessage(`表示中のジェスチャーを${newState ? '有効' : '無効'}にしました`, 'success')
      
    } catch (error) {
      console.error('🚨 GestureListController: Failed to toggle all gestures:', error)
      this.showError('一括設定に失敗しました')
    }
  }

  /**
   * 現在表示中のジェスチャーを取得
   * @returns {Array} フィルタリング済みジェスチャー配列
   */
  getVisibleGestures() {
    return this.allGestures.filter(gesture => {
      // 検索フィルター
      if (this.searchQuery) {
        const matchesName = gesture.name.toLowerCase().includes(this.searchQuery)
        const matchesDescription = gesture.description.toLowerCase().includes(this.searchQuery)
        if (!matchesName && !matchesDescription) return false
      }
      
      // ステータスフィルター
      if (this.currentFilter === 'enabled') return gesture.enabled
      if (this.currentFilter === 'disabled') return !gesture.enabled
      if (this.currentFilter === 'custom') return gesture.category === 'custom'
      if (this.currentFilter === 'default') return gesture.category !== 'custom'
      
      return true // 'all'
    })
  }

  /**
   * データをリフレッシュ
   * @returns {Promise<void>}
   */
  async refresh() {
    try {
      console.log('🔧 GestureListController: Refreshing gesture list')
      await this.loadGestures()
      await this.renderGestures()
      this.showMessage('ジェスチャー一覧を更新しました', 'success')
    } catch (error) {
      console.error('🚨 GestureListController: Failed to refresh:', error)
      this.showError('ジェスチャー一覧の更新に失敗しました')
    }
  }

  /**
   * 検索クエリを設定
   * @param {string} query - 検索クエリ
   */
  setSearchQuery(query) {
    this.searchQuery = query.toLowerCase()
    this.renderGestures()
  }

  /**
   * フィルターを設定
   * @param {string} filter - フィルター値
   */
  setFilter(filter) {
    this.currentFilter = filter
    this.renderGestures()
  }

  /**
   * 統計情報を取得
   * @returns {Object} 統計情報
   */
  getStatistics() {
    const total = this.allGestures.length
    const enabled = this.allGestures.filter(g => g.enabled).length
    const custom = this.allGestures.filter(g => g.category === 'custom').length
    
    return {
      total,
      enabled,
      disabled: total - enabled,
      custom,
      default: total - custom
    }
  }

  /**
   * 依存クラスの読み込み（テスト環境対応）
   * @private
   */
  loadDependencies() {
    // Node.js/テスト環境での依存クラス読み込み
    if (typeof module !== 'undefined' && typeof require !== 'undefined') {
      try {
        const { GestureListView } = require('./GestureListView')
        
        // グローバルに定義（既に定義されていない場合のみ）
        if (typeof global !== 'undefined') {
          global.GestureListView = global.GestureListView || GestureListView
        }
      } catch (error) {
        console.warn('Failed to load GestureListView in test environment:', error)
      }
    }
  }

  // ========== UI ユーティリティメソッド ==========

  /**
   * エラーメッセージの表示
   * @param {string} message - エラーメッセージ
   */
  showError(message) {
    this.showMessage(message, 'error')
  }

  /**
   * メッセージの表示
   * @param {string} message - メッセージ
   * @param {string} type - メッセージタイプ
   */
  showMessage(message, type = 'info') {
    // 簡易実装（実際の実装では適切なUI要素に表示）
    console.log(`${type.toUpperCase()}: ${message}`)
    
    // ステータス要素が存在する場合は表示
    const statusElement = document.getElementById('gestureListStatus')
    if (statusElement) {
      statusElement.textContent = message
      statusElement.className = `status ${type}`
      
      setTimeout(() => {
        statusElement.textContent = ''
        statusElement.className = 'status'
      }, 3000)
    }
  }

  /**
   * 確認ダイアログの表示
   * @param {string} message - 確認メッセージ
   * @returns {boolean} 確認結果
   */
  showConfirm(message) {
    // 簡易実装
    // eslint-disable-next-line no-alert
    return confirm(message)
  }
}

// CommonJS用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GestureListController
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.GestureListController = GestureListController
}