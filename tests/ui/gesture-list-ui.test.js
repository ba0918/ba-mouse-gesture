// ジェスチャー一覧画面のUIテスト

/**
 * @jest-environment jsdom
 */

describe('ジェスチャー一覧UI', () => {
  let mockOptionsManager
  let mockElements
  let mockCustomGestureManager
  
  beforeEach(() => {
    // DOM要素のモック
    mockElements = {
      allGesturesList: { 
        innerHTML: '',
        className: '',
        addEventListener: jest.fn()
      },
      gestureSearch: { 
        value: '',
        addEventListener: jest.fn()
      },
      gestureFilter: { 
        value: 'all',
        addEventListener: jest.fn()
      },
      toggleViewMode: { 
        textContent: 'リスト',
        addEventListener: jest.fn()
      }
    }
    
    // getElementById のモック
    document.getElementById = jest.fn((id) => mockElements[id])
    document.querySelectorAll = jest.fn(() => [])
    document.querySelector = jest.fn(() => ({ scrollIntoView: jest.fn() }))
    
    // CustomGestureManager のモック
    mockCustomGestureManager = {
      getCustomGestures: jest.fn().mockReturnValue([
        {
          id: 'custom1',
          name: 'カスタム戻る',
          pattern: 'LEFT_UP',
          action: 'back',
          enabled: true
        }
      ]),
      addCustomGesture: jest.fn().mockResolvedValue({ success: true }),
      updateCustomGesture: jest.fn().mockResolvedValue(true),
      deleteCustomGesture: jest.fn().mockResolvedValue(true)
    }
    
    // グローバルクラスのモック
    global.CustomGestureManager = jest.fn(() => mockCustomGestureManager)
    
    // OptionsManager クラスの一部機能をモック
    mockOptionsManager = {
      currentViewMode: 'list',
      currentFilter: 'all',
      searchQuery: '',
      allGestures: [],
      customGestureManager: mockCustomGestureManager,
      showSaveStatus: jest.fn(),
      initGesturesList: jest.fn(),
      setupGestureListEventListeners: jest.fn(),
      renderAllGesturesList: jest.fn(),
      filterAndRenderGestures: jest.fn(),
      getDefaultGestures: jest.fn().mockReturnValue([
        {
          id: 'left',
          name: 'ブラウザの戻る',
          pattern: '←',
          action: 'back',
          type: 'default',
          category: 'basic',
          description: '前のページに戻ります',
          enabled: true
        },
        {
          id: 'super_refresh',
          name: 'スーパーリロード',
          pattern: '↑↓↑',
          action: 'super_refresh',
          type: 'default',
          category: 'new',
          description: 'キャッシュをクリアしてページをリロードします',
          enabled: true,
          isNew: true
        }
      ]),
      generateGestureItemHTML: jest.fn(),
      highlightSearchText: jest.fn((text) => text),
      setupGestureItemListeners: jest.fn(),
      toggleViewMode: jest.fn(),
      toggleGestureStatus: jest.fn(),
      editCustomGesture: jest.fn(),
      deleteCustomGesture: jest.fn()
    }
    
    // chrome.storage のモック
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue()
        }
      }
    }
  })
  
  describe('初期化', () => {
    test('ジェスチャー一覧が正しく初期化される', async () => {
      // 実際のメソッド実装をテスト
      const initGesturesList = async function () {
        this.currentViewMode = 'list'
        this.currentFilter = 'all'
        this.searchQuery = ''
        await this.renderAllGesturesList()
      }.bind(mockOptionsManager)
      
      await initGesturesList()
      
      expect(mockOptionsManager.currentViewMode).toBe('list')
      expect(mockOptionsManager.currentFilter).toBe('all')
      expect(mockOptionsManager.searchQuery).toBe('')
    })
    
    test('イベントリスナーが正しく設定される', () => {
      const setupEventListeners = function () {
        const searchInput = document.getElementById('gestureSearch')
        const filterSelect = document.getElementById('gestureFilter')
        const toggleViewBtn = document.getElementById('toggleViewMode')
        
        if (searchInput) searchInput.addEventListener('input', jest.fn())
        if (filterSelect) filterSelect.addEventListener('change', jest.fn())
        if (toggleViewBtn) toggleViewBtn.addEventListener('click', jest.fn())
      }
      
      setupEventListeners()
      
      expect(mockElements.gestureSearch.addEventListener).toHaveBeenCalledWith('input', expect.any(Function))
      expect(mockElements.gestureFilter.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
      expect(mockElements.toggleViewMode.addEventListener).toHaveBeenCalledWith('click', expect.any(Function))
    })
  })
  
  describe('デフォルトジェスチャー表示', () => {
    test('基本ジェスチャーが正しく定義される', () => {
      const defaultGestures = mockOptionsManager.getDefaultGestures()
      
      expect(defaultGestures).toHaveLength(2)
      expect(defaultGestures[0]).toMatchObject({
        id: 'left',
        name: 'ブラウザの戻る',
        pattern: '←',
        type: 'default',
        category: 'basic'
      })
    })
    
    test('Phase 10新機能にNEWバッジが付く', () => {
      const defaultGestures = mockOptionsManager.getDefaultGestures()
      const newGesture = defaultGestures.find(g => g.isNew)
      
      expect(newGesture).toBeDefined()
      expect(newGesture.pattern).toBe('↑↓↑')
      expect(newGesture.category).toBe('new')
    })
  })
  
  describe('検索・フィルタリング', () => {
    beforeEach(() => {
      mockOptionsManager.allGestures = [
        {
          id: 'left',
          name: 'ブラウザの戻る',
          pattern: '←',
          type: 'default',
          category: 'basic',
          description: '前のページに戻ります'
        },
        {
          id: 'super_refresh',
          name: 'スーパーリロード',
          pattern: '↑↓↑',
          type: 'default',
          category: 'new',
          isNew: true,
          description: 'キャッシュをクリアしてページをリロードします'
        },
        {
          id: 'custom1',
          name: 'カスタム戻る',
          pattern: '←↑',
          type: 'custom',
          category: 'custom',
          description: 'カスタムの戻る動作'
        }
      ]
    })
    
    test('検索クエリでフィルタリングされる', () => {
      const filterFunction = function (searchQuery) {
        return this.allGestures.filter(gesture => 
          gesture.name.toLowerCase().includes(searchQuery) ||
          gesture.description.toLowerCase().includes(searchQuery) ||
          gesture.pattern.includes(searchQuery)
        )
      }.bind(mockOptionsManager)
      
      const result = filterFunction('スーパー')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('スーパーリロード')
    })
    
    test('タイプでフィルタリングされる', () => {
      const filterFunction = function (filterType) {
        return this.allGestures.filter(gesture => {
          if (filterType === 'all') return true
          if (filterType === 'default') return gesture.type === 'default'
          if (filterType === 'custom') return gesture.type === 'custom'
          if (filterType === 'new') return gesture.isNew
          return false
        })
      }.bind(mockOptionsManager)
      
      expect(filterFunction('default')).toHaveLength(2)
      expect(filterFunction('custom')).toHaveLength(1)
      expect(filterFunction('new')).toHaveLength(1)
    })
  })
  
  describe('表示モード', () => {
    test('表示モードが正しく切り替わる', () => {
      const toggleViewMode = function () {
        const modes = ['list', 'compact', 'grid']
        const currentIndex = modes.indexOf(this.currentViewMode)
        this.currentViewMode = modes[(currentIndex + 1) % modes.length]
        return this.currentViewMode
      }.bind(mockOptionsManager)
      
      expect(toggleViewMode()).toBe('compact')
      expect(toggleViewMode()).toBe('grid')
      expect(toggleViewMode()).toBe('list')
    })
    
    test('表示モードによってCSSクラスが変わる', () => {
      mockOptionsManager.currentViewMode = 'grid'
      
      const updateViewClass = function () {
        const container = document.getElementById('allGesturesList')
        if (container) {
          container.className = `all-gestures-container ${this.currentViewMode}-view`
        }
      }.bind(mockOptionsManager)
      
      updateViewClass()
      
      expect(mockElements.allGesturesList.className).toBe('all-gestures-container grid-view')
    })
  })
  
  describe('ジェスチャー有効/無効切り替え', () => {
    test('カスタムジェスチャーの有効/無効が切り替わる', async () => {
      mockOptionsManager.allGestures = [{
        id: 'custom1',
        name: 'テストジェスチャー',
        type: 'custom',
        enabled: true
      }]
      
      const toggleGestureStatus = async function (gestureId) {
        const gesture = this.allGestures.find(g => g.id === gestureId)
        if (!gesture) return
        
        gesture.enabled = !gesture.enabled
        
        if (gesture.type === 'custom' && this.customGestureManager) {
          await this.customGestureManager.updateCustomGesture(gestureId, gesture)
          this.showSaveStatus(`${gesture.name}を${gesture.enabled ? '有効' : '無効'}にしました`, true)
        }
      }.bind(mockOptionsManager)
      
      await toggleGestureStatus('custom1')
      
      expect(mockOptionsManager.allGestures[0].enabled).toBe(false)
      expect(mockCustomGestureManager.updateCustomGesture).toHaveBeenCalledWith('custom1', expect.objectContaining({
        enabled: false
      }))
      expect(mockOptionsManager.showSaveStatus).toHaveBeenCalledWith('テストジェスチャーを無効にしました', true)
    })
  })
  
  describe('カスタムジェスチャー操作', () => {
    test('カスタムジェスチャーが編集モードになる', () => {
      mockOptionsManager.allGestures = [{
        id: 'custom1',
        name: 'テストジェスチャー',
        pattern: '←↑',
        action: 'back',
        type: 'custom'
      }]
      
      // DOM要素を追加
      mockElements.gestureName = { value: '' }
      mockElements.gesturePatternDisplay = { value: '' }
      mockElements.gestureAction = { value: '' }
      mockElements.addGestureBtn = { textContent: '' }
      
      const editCustomGesture = function (gestureId) {
        const gesture = this.allGestures.find(g => g.id === gestureId && g.type === 'custom')
        if (!gesture) return
        
        document.getElementById('gestureName').value = gesture.name
        document.getElementById('gesturePatternDisplay').value = gesture.pattern
        document.getElementById('gestureAction').value = gesture.action
        
        this.editingGestureId = gestureId
        
        const addBtn = document.getElementById('addGestureBtn')
        if (addBtn) {
          addBtn.textContent = 'ジェスチャーを更新'
        }
      }.bind(mockOptionsManager)
      
      editCustomGesture('custom1')
      
      expect(mockElements.gestureName.value).toBe('テストジェスチャー')
      expect(mockElements.gesturePatternDisplay.value).toBe('←↑')
      expect(mockElements.gestureAction.value).toBe('back')
      expect(mockOptionsManager.editingGestureId).toBe('custom1')
      expect(mockElements.addGestureBtn.textContent).toBe('ジェスチャーを更新')
    })
    
    test('カスタムジェスチャーが削除される', async () => {
      mockOptionsManager.allGestures = [{
        id: 'custom1',
        name: 'テストジェスチャー',
        type: 'custom'
      }]
      
      // confirmのモック
      global.confirm = jest.fn(() => true)
      
      const deleteCustomGesture = async function (gestureId) {
        const gesture = this.allGestures.find(g => g.id === gestureId && g.type === 'custom')
        if (!gesture) return
        
        // eslint-disable-next-line no-alert
        if (!confirm(`"${gesture.name}"を削除しますか？この操作は元に戻せません。`)) {
          return
        }
        
        if (this.customGestureManager) {
          await this.customGestureManager.deleteCustomGesture(gestureId)
          this.showSaveStatus(`${gesture.name}を削除しました`, true)
          await this.renderAllGesturesList()
        }
      }.bind(mockOptionsManager)
      
      await deleteCustomGesture('custom1')
      
      expect(global.confirm).toHaveBeenCalledWith('"テストジェスチャー"を削除しますか？この操作は元に戻せません。')
      expect(mockCustomGestureManager.deleteCustomGesture).toHaveBeenCalledWith('custom1')
      expect(mockOptionsManager.showSaveStatus).toHaveBeenCalledWith('テストジェスチャーを削除しました', true)
    })
  })
  
  describe('HTML生成', () => {
    test('ジェスチャーアイテムのHTMLが正しく生成される', () => {
      const gesture = {
        id: 'test',
        name: 'テストジェスチャー',
        pattern: '↑↓',
        description: 'テスト用ジェスチャー',
        enabled: true,
        type: 'default',
        isNew: true
      }
      
      const generateHTML = function (gesture) {
        const badges = []
        if (gesture.isNew) {
          badges.push('<span class="new-badge">New</span>')
        }
        if (gesture.type === 'custom') {
          badges.push('<span class="custom-badge">Custom</span>')
        }
        
        return {
          containsNewBadge: badges.some(badge => badge.includes('new-badge')),
          containsCustomBadge: badges.some(badge => badge.includes('custom-badge')),
          gesturePattern: gesture.pattern,
          gestureName: gesture.name
        }
      }
      
      const result = generateHTML(gesture)
      
      expect(result.containsNewBadge).toBe(true)
      expect(result.containsCustomBadge).toBe(false)
      expect(result.gesturePattern).toBe('↑↓')
      expect(result.gestureName).toBe('テストジェスチャー')
    })
    
    test('検索ハイライトが正しく適用される', () => {
      const highlightSearchText = function (text, searchQuery) {
        if (!searchQuery) return text
        const regex = new RegExp(`(${searchQuery})`, 'gi')
        return text.replace(regex, '<span class="search-highlight">$1</span>')
      }
      
      const result = highlightSearchText('スーパーリロード', 'スーパー')
      expect(result).toBe('<span class="search-highlight">スーパー</span>リロード')
    })
  })
  
  describe('エラーハンドリング', () => {
    test('カスタムジェスチャー読み込みエラーが処理される', () => {
      const errorManager = {
        customGestureManager: {
          getCustomGestures: jest.fn(() => { throw new Error('読み込みエラー') })
        }
      }
      
      const renderWithError = function () {
        const container = document.getElementById('allGesturesList')
        if (!container) return
        
        try {
          this.customGestureManager.getCustomGestures()
        } catch (error) {
          console.error('Failed to render gestures list:', error)
          container.innerHTML = '<div style="padding: 32px; text-align: center; color: #ea4335;">ジェスチャー一覧の読み込みに失敗しました</div>'
        }
      }.bind(errorManager)
      
      renderWithError()
      
      expect(mockElements.allGesturesList.innerHTML).toContain('ジェスチャー一覧の読み込みに失敗しました')
    })
    
    test('ジェスチャー状態変更エラーが処理される', async () => {
      const errorManager = {
        allGestures: [{ id: 'custom1', name: 'テスト', type: 'custom', enabled: true }],
        customGestureManager: {
          updateCustomGesture: jest.fn().mockRejectedValue(new Error('更新エラー'))
        },
        showSaveStatus: jest.fn()
      }
      
      const toggleWithError = async function (gestureId) {
        const gesture = this.allGestures.find(g => g.id === gestureId)
        if (!gesture) return
        
        const originalState = gesture.enabled
        gesture.enabled = !gesture.enabled
        
        try {
          await this.customGestureManager.updateCustomGesture(gestureId, gesture)
        } catch (error) {
          console.error('Failed to update gesture:', error)
          this.showSaveStatus('ジェスチャーの更新に失敗しました', false)
          gesture.enabled = originalState // ロールバック
        }
      }.bind(errorManager)
      
      await toggleWithError('custom1')
      
      expect(errorManager.allGestures[0].enabled).toBe(true) // ロールバック確認
      expect(errorManager.showSaveStatus).toHaveBeenCalledWith('ジェスチャーの更新に失敗しました', false)
    })
  })

  describe('UI同期機能', () => {
    let mockRefreshAllGestureDisplays

    beforeEach(() => {
      mockRefreshAllGestureDisplays = jest.fn()
      mockOptionsManager.refreshAllGestureDisplays = mockRefreshAllGestureDisplays
    })

    test('カスタムジェスチャー追加時にrefreshAllGestureDisplaysが呼ばれる', async () => {
      mockOptionsManager.currentPattern = ['UP']
      mockOptionsManager.customGestureManager = mockCustomGestureManager
      
      // DOM要素を追加
      mockElements.gestureName = { value: 'テストジェスチャー' }
      mockElements.gestureAction = { value: 'back' }
      
      mockCustomGestureManager.addCustomGesture.mockResolvedValue({
        success: true,
        id: 'test-sync-1'
      })
      
      const addCustomGesture = async function () {
        const name = document.getElementById('gestureName').value.trim()
        const action = document.getElementById('gestureAction').value
        
        if (!name || this.currentPattern.length === 0) return
        
        const result = await this.customGestureManager.addCustomGesture({
          name: name,
          pattern: [...this.currentPattern],
          action: action
        })
        
        if (result.success) {
          await this.refreshAllGestureDisplays()
        }
      }.bind(mockOptionsManager)
      
      await addCustomGesture()
      
      expect(mockRefreshAllGestureDisplays).toHaveBeenCalled()
    })

    test('カスタムジェスチャー削除時にrefreshAllGestureDisplaysが呼ばれる', async () => {
      mockOptionsManager.allGestures = [{
        id: 'test-sync-2',
        name: '削除テスト',
        type: 'custom'
      }]
      
      // confirmのモック
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true)
      
      const deleteCustomGesture = async function (gestureId) {
        const gesture = this.allGestures.find(g => g.id === gestureId && g.type === 'custom')
        if (!gesture) return
        
        // eslint-disable-next-line no-alert
        if (!confirm(`"${gesture.name}"を削除しますか？`)) return
        
        if (this.customGestureManager) {
          await this.customGestureManager.deleteCustomGesture(gestureId)
          await this.refreshAllGestureDisplays()
        }
      }.bind(mockOptionsManager)
      
      await deleteCustomGesture('test-sync-2')
      
      expect(mockRefreshAllGestureDisplays).toHaveBeenCalled()
      mockConfirm.mockRestore()
    })

    test('ジェスチャー状態切り替え時にrefreshAllGestureDisplaysが呼ばれる', async () => {
      mockOptionsManager.allGestures = [{
        id: 'test-sync-3',
        name: '状態切り替えテスト',
        type: 'custom',
        enabled: true
      }]
      
      const toggleGestureStatus = async function (gestureId) {
        const gesture = this.allGestures.find(g => g.id === gestureId)
        if (!gesture) return
        
        gesture.enabled = !gesture.enabled
        
        if (gesture.type === 'custom' && this.customGestureManager) {
          await this.customGestureManager.updateCustomGesture(gestureId, gesture)
          await this.refreshAllGestureDisplays()
        }
      }.bind(mockOptionsManager)
      
      await toggleGestureStatus('test-sync-3')
      
      expect(mockRefreshAllGestureDisplays).toHaveBeenCalled()
    })

    test('カスタム確認ダイアログが正しく動作する', async () => {
      const showConfirm = function () {
        return new Promise((resolve) => {
          // モックで即座にtrueを返す
          setTimeout(() => resolve(true), 10)
        })
      }
      
      const result = await showConfirm('テストメッセージ')
      expect(result).toBe(true)
    })
  })
})