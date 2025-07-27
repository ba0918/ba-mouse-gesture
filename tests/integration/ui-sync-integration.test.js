// UI同期の統合テスト

/**
 * @jest-environment jsdom
 */

describe('UI同期統合テスト', () => {
  let optionsManager
  let mockCustomGestureManager
  // let customConfirmResolve

  beforeEach(() => {
    // DOM環境をセットアップ
    document.body.innerHTML = `
      <div id="customGestureList"></div>
      <div id="allGesturesList"></div>
      <input type="text" id="gestureName">
      <input type="text" id="gesturePatternDisplay" readonly>
      <select id="gestureAction">
        <option value="back">戻る</option>
        <option value="forward">進む</option>
      </select>
      <button id="addGestureBtn">追加</button>
      <div id="saveStatus" style="display: none;"></div>
      
      <!-- カスタム確認ダイアログ -->
      <div id="confirmDialog" class="confirm-dialog" style="display: none;">
        <div class="confirm-overlay"></div>
        <div class="confirm-content">
          <h3 class="confirm-title">確認</h3>
          <p id="confirmMessage" class="confirm-message"></p>
          <div class="confirm-buttons">
            <button id="confirmCancel" class="confirm-btn confirm-btn-cancel">キャンセル</button>
            <button id="confirmOk" class="confirm-btn confirm-btn-ok">OK</button>
          </div>
        </div>
      </div>
    `

    // Chrome APIのモック
    global.chrome = {
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue()
        }
      }
    }

    // CustomGestureManagerのモック
    mockCustomGestureManager = {
      customGestures: [],
      getCustomGestures: jest.fn(() => mockCustomGestureManager.customGestures),
      addCustomGesture: jest.fn(),
      updateCustomGesture: jest.fn(),
      deleteCustomGesture: jest.fn(),
      loadCustomGestures: jest.fn()
    }

    // カスタム確認ダイアログのモック用ヘルパー
    const setupCustomConfirm = () => {
      return new Promise((resolve) => {
        // 確認ダイアログがすぐにOKされるようにモック
        setTimeout(() => resolve(true), 10)
      })
    }

    // OptionsManagerのモック
    global.OptionsManager = class MockOptionsManager {
      constructor() {
        this.customGestureManager = mockCustomGestureManager
        this.allGestures = []
        this.currentPattern = []
        this.currentViewMode = 'list'
        this.currentFilter = 'all'
        this.searchQuery = ''
      }

      async refreshAllGestureDisplays() {
        console.log('Mock: Refreshing all gesture displays...')
        
        if (this.customGestureManager) {
          await this.customGestureManager.loadCustomGestures()
        }
        
        this.renderCustomGestureList()
        await this.renderAllGesturesList()
        
        console.log('Mock: All gesture displays refreshed')
      }

      renderCustomGestureList() {
        const container = document.getElementById('customGestureList')
        const gestures = this.customGestureManager.getCustomGestures()
        
        if (gestures.length === 0) {
          container.innerHTML = '<div class="empty-state">カスタムジェスチャーがありません</div>'
          return
        }
        
        container.innerHTML = ''
        gestures.forEach(gesture => {
          const item = document.createElement('div')
          item.className = 'gesture-item'
          item.innerHTML = `
            <div class="gesture-info">
              <div class="gesture-name">${gesture.name}</div>
            </div>
            <div class="gesture-controls">
              <button class="delete-btn" data-id="${gesture.id}">削除</button>
            </div>
          `
          container.appendChild(item)
        })
      }

      renderAllGesturesList() {
        const container = document.getElementById('allGesturesList')
        const defaultGestures = this.getDefaultGestures()
        const customGestures = this.customGestureManager.getCustomGestures()
        
        this.allGestures = [...defaultGestures, ...customGestures.map(g => ({ ...g, type: 'custom' }))]
        
        let html = ''
        this.allGestures.forEach(gesture => {
          html += `
            <div class="all-gesture-item" data-gesture-id="${gesture.id}">
              <div class="gesture-details">
                <div class="gesture-title">${gesture.name}</div>
              </div>
              <div class="gesture-actions">
                ${gesture.type === 'custom' ? `
                  <button class="delete-btn" data-gesture-id="${gesture.id}">削除</button>
                ` : ''}
              </div>
            </div>
          `
        })
        
        container.innerHTML = html
      }

      getDefaultGestures() {
        return [
          {
            id: 'left',
            name: 'ブラウザの戻る',
            pattern: '←',
            action: 'back',
            type: 'default'
          }
        ]
      }

      async addCustomGesture() {
        const name = document.getElementById('gestureName').value.trim()
        const action = document.getElementById('gestureAction').value
        
        if (!name || this.currentPattern.length === 0) {
          this.showSaveStatus('入力が不正です', false)
          return
        }
        
        const result = await this.customGestureManager.addCustomGesture({
          name: name,
          pattern: [...this.currentPattern],
          action: action
        })
        
        if (result.success) {
          this.showSaveStatus('カスタムジェスチャーを追加しました', true)
          await this.refreshAllGestureDisplays()
          
          // フォームをクリア
          document.getElementById('gestureName').value = ''
          this.currentPattern = []
        }
      }

      showConfirm(message) {
        const dialog = document.getElementById('confirmDialog')
        const messageElement = document.getElementById('confirmMessage')
        
        // メッセージを設定
        messageElement.textContent = message
        
        // ダイアログを表示
        dialog.style.display = 'flex'
        
        return setupCustomConfirm()
      }

      async deleteCustomGesture(gestureId) {
        const gesture = this.allGestures.find(g => g.id === gestureId && g.type === 'custom')
        if (!gesture) return

        const confirmed = await this.showConfirm(`"${gesture.name}"を削除しますか？`)
        if (!confirmed) return

        if (this.customGestureManager) {
          await this.customGestureManager.deleteCustomGesture(gestureId)
          this.showSaveStatus(`${gesture.name}を削除しました`, true)
          await this.refreshAllGestureDisplays()
        }
      }

      showSaveStatus(message, isSuccess) {
        const statusElement = document.getElementById('saveStatus')
        statusElement.textContent = message
        statusElement.className = `save-status ${isSuccess ? 'success' : 'error'}`
        statusElement.style.display = 'block'
      }
    }

    optionsManager = new OptionsManager()
  })

  describe('カスタムジェスチャー追加時の同期', () => {
    test('追加時に両方のUIが更新される', async () => {
      // 初期状態で両方のUIが空であることを確認
      await optionsManager.renderCustomGestureList()
      await optionsManager.renderAllGesturesList()
      
      expect(document.getElementById('customGestureList').innerHTML).toContain('カスタムジェスチャーがありません')
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(0)

      // カスタムジェスチャーを追加
      document.getElementById('gestureName').value = 'テストジェスチャー'
      document.getElementById('gestureAction').value = 'back'
      optionsManager.currentPattern = ['UP']

      // addCustomGestureのモック設定
      mockCustomGestureManager.addCustomGesture.mockResolvedValue({
        success: true,
        id: 'test-id'
      })
      mockCustomGestureManager.customGestures.push({
        id: 'test-id',
        name: 'テストジェスチャー',
        pattern: ['UP'],
        action: 'back'
      })

      await optionsManager.addCustomGesture()

      // 両方のUIが更新されることを確認
      expect(document.getElementById('customGestureList').innerHTML).toContain('テストジェスチャー')
      expect(document.getElementById('allGesturesList').innerHTML).toContain('テストジェスチャー')
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(1)
    })

    test('追加失敗時は同期されない', async () => {
      // 初期状態を明示的に設定
      await optionsManager.renderCustomGestureList()
      await optionsManager.renderAllGesturesList()
      
      document.getElementById('gestureName').value = 'テストジェスチャー'
      optionsManager.currentPattern = ['UP']

      // 失敗をモック
      mockCustomGestureManager.addCustomGesture.mockResolvedValue({
        success: false,
        error: 'エラーが発生しました'
      })

      await optionsManager.addCustomGesture()

      // UIは更新されないことを確認（初期状態のまま）
      expect(document.getElementById('customGestureList').innerHTML).toContain('カスタムジェスチャーがありません')
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(0)
    })
  })

  describe('カスタムジェスチャー管理セクションからの削除時の同期', () => {
    beforeEach(async () => {
      // テスト用ジェスチャーを追加
      mockCustomGestureManager.customGestures.push({
        id: 'test-delete-1',
        name: '削除テスト1',
        pattern: ['UP'],
        action: 'back'
      })

      await optionsManager.refreshAllGestureDisplays()
    })

    test('管理セクションからの削除で両方のUIが更新される', async () => {
      // 削除前に両方のUIにジェスチャーが存在することを確認
      expect(document.getElementById('customGestureList').innerHTML).toContain('削除テスト1')
      expect(document.getElementById('allGesturesList').innerHTML).toContain('削除テスト1')

      // 削除実行
      mockCustomGestureManager.deleteCustomGesture.mockResolvedValue()
      mockCustomGestureManager.customGestures = [] // 削除後の状態をモック

      await optionsManager.deleteCustomGesture('test-delete-1')

      // 両方のUIからジェスチャーが削除されることを確認
      expect(document.getElementById('customGestureList').innerHTML).toContain('カスタムジェスチャーがありません')
      expect(document.getElementById('allGesturesList').innerHTML).not.toContain('削除テスト1')
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(0)
    })
  })

  describe('ジェスチャー一覧からの削除時の同期', () => {
    beforeEach(async () => {
      // テスト用ジェスチャーを追加
      mockCustomGestureManager.customGestures.push({
        id: 'test-delete-2',
        name: '削除テスト2',
        pattern: ['DOWN'],
        action: 'forward'
      })

      await optionsManager.refreshAllGestureDisplays()
    })

    test('一覧からの削除で両方のUIが更新される', async () => {
      // 削除前の状態確認
      expect(document.getElementById('customGestureList').innerHTML).toContain('削除テスト2')
      expect(document.getElementById('allGesturesList').innerHTML).toContain('削除テスト2')

      // 削除実行（確認ダイアログをOKで通過）
      mockCustomGestureManager.deleteCustomGesture.mockResolvedValue()
      mockCustomGestureManager.customGestures = [] // 削除後の状態をモック

      await optionsManager.deleteCustomGesture('test-delete-2')

      // 両方のUIから削除されることを確認
      expect(document.getElementById('customGestureList').innerHTML).toContain('カスタムジェスチャーがありません')
      expect(document.getElementById('allGesturesList').innerHTML).not.toContain('削除テスト2')
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(0)
    })
  })

  describe('カスタム確認ダイアログの動作', () => {
    test('確認ダイアログが正しく表示・動作する', async () => {
      const confirmDialog = document.getElementById('confirmDialog')
      const confirmMessage = document.getElementById('confirmMessage')
      
      // 初期状態では非表示
      expect(confirmDialog.style.display).toBe('none')

      // showConfirmを呼び出し
      const resultPromise = optionsManager.showConfirm('テストメッセージ')

      // メッセージが設定されることを確認
      expect(confirmMessage.textContent).toBe('テストメッセージ')
      
      // ダイアログが表示されることを確認
      expect(confirmDialog.style.display).toBe('flex')

      // 結果がtrueであることを確認（モックで自動的にOKされる）
      const result = await resultPromise
      expect(result).toBe(true)
    })
  })

  describe('refreshAllGestureDisplays関数の動作', () => {
    test('最新データで両方のUIが更新される', async () => {
      // 初期状態
      await optionsManager.refreshAllGestureDisplays()
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(0)

      // カスタムジェスチャーを追加（内部状態のみ）
      mockCustomGestureManager.customGestures.push({
        id: 'refresh-test',
        name: 'リフレッシュテスト',
        pattern: ['LEFT'],
        action: 'back'
      })

      // refreshAllGestureDisplaysで更新
      await optionsManager.refreshAllGestureDisplays()

      // 両方のUIが最新データで更新されることを確認
      expect(document.getElementById('customGestureList').innerHTML).toContain('リフレッシュテスト')
      expect(document.getElementById('allGesturesList').innerHTML).toContain('リフレッシュテスト')
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(1)
    })

    test('loadCustomGesturesが確実に呼ばれる', async () => {
      await optionsManager.refreshAllGestureDisplays()

      expect(mockCustomGestureManager.loadCustomGestures).toHaveBeenCalled()
    })
  })

  describe('非同期処理の順序', () => {
    test('追加→削除→追加の連続操作が正しく同期される', async () => {
      // 1. 追加
      document.getElementById('gestureName').value = '順序テスト1'
      optionsManager.currentPattern = ['UP']
      
      mockCustomGestureManager.addCustomGesture.mockResolvedValue({ success: true, id: 'order-1' })
      mockCustomGestureManager.customGestures.push({
        id: 'order-1',
        name: '順序テスト1',
        pattern: ['UP'],
        action: 'back'
      })

      await optionsManager.addCustomGesture()
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(1)

      // 2. 削除
      mockCustomGestureManager.deleteCustomGesture.mockResolvedValue()
      mockCustomGestureManager.customGestures = []

      await optionsManager.deleteCustomGesture('order-1')
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(0)

      // 3. 再追加
      document.getElementById('gestureName').value = '順序テスト2'
      optionsManager.currentPattern = ['DOWN']
      
      mockCustomGestureManager.addCustomGesture.mockResolvedValue({ success: true, id: 'order-2' })
      mockCustomGestureManager.customGestures.push({
        id: 'order-2',
        name: '順序テスト2',
        pattern: ['DOWN'],
        action: 'forward'
      })

      await optionsManager.addCustomGesture()
      expect(optionsManager.allGestures.filter(g => g.type === 'custom')).toHaveLength(1)
      expect(document.getElementById('allGesturesList').innerHTML).toContain('順序テスト2')
    })
  })
})