// マウスジェスチャーツール - 設定画面のスクリプト

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      // デバッグ設定
      debugSettings: {
        enabled: true, // 開発時はデフォルトでON
        logLevel: 2, // INFO
        showStatus: true,
        statusPosition: 'top-right'
      }
    }
    
    // カスタムジェスチャー管理
    this.customGestureManager = null
    this.currentPattern = []
    this.isRecording = false
        
    this.init()
  }
    
  async init() {
    // カスタムジェスチャーマネージャーを初期化
    this.initCustomGestureManager()
    
    // 学習マネージャーを初期化
    this.initLearningManager()
    
    // 現在の設定を読み込み
    await this.loadSettings()
        
    // UIイベントの設定
    this.setupEventListeners()
        
    // プレビューの初期化
    this.updatePreview()
    
    // カスタムジェスチャーを読み込み
    await this.loadCustomGestures()
    
    // 学習統計を読み込み
    await this.loadLearningStats()
    
    // ジェスチャー一覧を初期化
    await this.initGesturesList()
  }
  
  initCustomGestureManager() {
    // CustomGestureManagerクラスが利用可能かチェック
    if (typeof CustomGestureManager !== 'undefined') {
      this.customGestureManager = new CustomGestureManager()
    } else {
      console.warn('CustomGestureManager not available')
    }
  }
  
  initLearningManager() {
    // 学習マネージャーとパターンマッチャーを初期化
    if (typeof GestureLearningManager !== 'undefined' && this.customGestureManager) {
      this.learningManager = new GestureLearningManager()
      this.patternMatcher = new CustomPatternMatcher(this.customGestureManager)
    } else {
      console.warn('Learning managers not available')
    }
  }
    
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(this.defaultSettings)
      this.currentSettings = { ...this.defaultSettings, ...result }
            
      // UIに設定を反映
      document.getElementById('enabled').checked = this.currentSettings.enabled
      document.getElementById('strokeColor').value = this.currentSettings.strokeColor
      document.getElementById('strokeWidth').value = this.currentSettings.strokeWidth
      document.getElementById('strokeWidthValue').textContent = `${this.currentSettings.strokeWidth}px`
      document.getElementById('gestureThreshold').value = this.currentSettings.gestureThreshold
      document.getElementById('gestureThresholdValue').textContent = `${this.currentSettings.gestureThreshold}px`
            
      // 除外リストを表示
      this.renderExcludeList()
      
      // デバッグ設定をUIに反映
      this.loadDebugSettings()
            
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error)
      this.showSaveStatus('設定の読み込みに失敗しました', false)
    }
  }
    
  async saveSettings() {
    try {
      await chrome.storage.sync.set(this.currentSettings)
      this.showSaveStatus('設定を保存しました', true)
            
      // バックグラウンドスクリプトに設定変更を通知
      chrome.runtime.sendMessage({
        type: 'SETTINGS_UPDATED',
        settings: this.currentSettings
      })
            
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
      this.showSaveStatus('設定の保存に失敗しました', false)
    }
  }
    
  setupEventListeners() {
    // 有効/無効切り替え
    document.getElementById('enabled').addEventListener('change', (e) => {
      this.currentSettings.enabled = e.target.checked
      this.saveSettings()
    })
        
    // 軌跡の色変更
    document.getElementById('strokeColor').addEventListener('change', (e) => {
      this.currentSettings.strokeColor = e.target.value
      this.updatePreview()
      this.saveSettings()
    })
        
    // 軌跡の太さ変更
    document.getElementById('strokeWidth').addEventListener('input', (e) => {
      const width = parseInt(e.target.value)
      this.currentSettings.strokeWidth = width
      document.getElementById('strokeWidthValue').textContent = `${width}px`
      this.updatePreview()
      this.saveSettings()
    })
        
    // ジェスチャー感度変更
    document.getElementById('gestureThreshold').addEventListener('input', (e) => {
      const threshold = parseInt(e.target.value)
      this.currentSettings.gestureThreshold = threshold
      document.getElementById('gestureThresholdValue').textContent = `${threshold}px`
      this.saveSettings()
    })
        
    // 除外サイト追加
    document.getElementById('addExcludeBtn').addEventListener('click', () => {
      this.addExcludeUrl()
    })
        
    // Enterキーで除外サイト追加
    document.getElementById('newExcludeUrl').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addExcludeUrl()
      }
    })
    
    // カスタムジェスチャー関連のイベントリスナーを追加
    this.setupCustomGestureListeners()
    
    // デバッグ設定のイベントリスナーを追加
    this.setupDebugListeners()
    
    // ジェスチャー一覧のイベントリスナーを追加
    this.setupGestureListEventListeners()
  }
  
  setupCustomGestureListeners() {
    // パターン方向ボタン
    document.querySelectorAll('.direction-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const direction = btn.dataset.direction
        this.addDirectionToPattern(direction)
      })
    })
    
    // パターンクリアボタン
    document.getElementById('clearPatternBtn').addEventListener('click', () => {
      this.clearPattern()
    })
    
    // ジェスチャー追加ボタン
    document.getElementById('addGestureBtn').addEventListener('click', () => {
      this.addCustomGesture()
    })
    
    // 記録ボタン（将来の拡張用）
    document.getElementById('recordPatternBtn').addEventListener('click', () => {
      this.toggleRecording()
    })
    
    // 学習統計の更新ボタン
    const refreshStatsBtn = document.getElementById('refreshStats')
    if (refreshStatsBtn) {
      refreshStatsBtn.addEventListener('click', () => {
        this.loadLearningStats()
      })
    }
    
    // 学習データリセットボタン
    const resetLearningBtn = document.getElementById('resetLearning')
    if (resetLearningBtn) {
      resetLearningBtn.addEventListener('click', () => {
        this.resetLearningData()
      })
    }
  }

  setupDebugListeners() {
    // デバッグモード有効/無効切り替え
    const debugEnabled = document.getElementById('debugEnabled')
    if (debugEnabled) {
      debugEnabled.addEventListener('change', (e) => {
        this.currentSettings.debugSettings.enabled = e.target.checked
        this.updateDebugOptions()
        this.saveDebugSettings()
      })
    }

    // ログレベル変更
    const debugLogLevel = document.getElementById('debugLogLevel')
    if (debugLogLevel) {
      debugLogLevel.addEventListener('change', (e) => {
        this.currentSettings.debugSettings.logLevel = parseInt(e.target.value)
        this.saveDebugSettings()
      })
    }

    // 画面表示有効/無効切り替え
    const debugShowStatus = document.getElementById('debugShowStatus')
    if (debugShowStatus) {
      debugShowStatus.addEventListener('change', (e) => {
        this.currentSettings.debugSettings.showStatus = e.target.checked
        this.saveDebugSettings()
      })
    }

    // 表示位置変更
    const debugStatusPosition = document.getElementById('debugStatusPosition')
    if (debugStatusPosition) {
      debugStatusPosition.addEventListener('change', (e) => {
        this.currentSettings.debugSettings.statusPosition = e.target.value
        this.saveDebugSettings()
      })
    }
  }

  updateDebugOptions() {
    const debugOptions = document.getElementById('debugOptions')
    const debugEnabled = document.getElementById('debugEnabled')
    
    if (debugOptions && debugEnabled) {
      debugOptions.style.display = debugEnabled.checked ? 'block' : 'none'
    }
  }

  async saveDebugSettings() {
    try {
      // DebugLoggerの設定を更新
      if (typeof DebugLogger !== 'undefined') {
        await DebugLogger.updateSettings(this.currentSettings.debugSettings)
      }
      
      // 通常の設定も保存
      await this.saveSettings()
      
      this.showSaveStatus('デバッグ設定を保存しました', true)
    } catch (error) {
      console.error('Failed to save debug settings:', error)
      this.showSaveStatus('デバッグ設定の保存に失敗しました', false)
    }
  }

  loadDebugSettings() {
    // デバッグ設定が存在しない場合はデフォルト値を使用
    if (!this.currentSettings.debugSettings) {
      this.currentSettings.debugSettings = this.defaultSettings.debugSettings
    }

    const settings = this.currentSettings.debugSettings

    // UIに設定を反映
    const debugEnabled = document.getElementById('debugEnabled')
    if (debugEnabled) {
      debugEnabled.checked = settings.enabled
    }

    const debugLogLevel = document.getElementById('debugLogLevel')
    if (debugLogLevel) {
      debugLogLevel.value = settings.logLevel.toString()
    }

    const debugShowStatus = document.getElementById('debugShowStatus')
    if (debugShowStatus) {
      debugShowStatus.checked = settings.showStatus
    }

    const debugStatusPosition = document.getElementById('debugStatusPosition')
    if (debugStatusPosition) {
      debugStatusPosition.value = settings.statusPosition
    }

    // デバッグオプションの表示/非表示を更新
    this.updateDebugOptions()
  }
    
  updatePreview() {
    const canvas = document.getElementById('previewCanvas')
    const ctx = canvas.getContext('2d')
        
    // キャンバスをクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height)
        
    // 軌跡のサンプルを描画
    ctx.strokeStyle = this.currentSettings.strokeColor
    ctx.lineWidth = this.currentSettings.strokeWidth
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
        
    // サンプルの軌跡パターン（右→下の動き）
    ctx.beginPath()
    ctx.moveTo(20, 30)
    ctx.lineTo(80, 30)  // 右へ
    ctx.lineTo(80, 70)  // 下へ
    ctx.stroke()
        
    // 軌跡の説明テキスト
    ctx.fillStyle = '#666'
    ctx.font = '12px Arial'
    ctx.fillText('サンプル: →↓', 100, 35)
    ctx.fillText(`色: ${this.currentSettings.strokeColor}`, 100, 50)
    ctx.fillText(`太さ: ${this.currentSettings.strokeWidth}px`, 100, 65)
  }
    
  addExcludeUrl() {
    const input = document.getElementById('newExcludeUrl')
    const url = input.value.trim()
        
    if (!url) {
      this.showSaveStatus('URLを入力してください', false)
      return
    }
        
    // 既に存在するかチェック
    if (this.currentSettings.excludeList.includes(url)) {
      this.showSaveStatus('そのURLは既に追加されています', false)
      return
    }
        
    // 除外リストに追加
    this.currentSettings.excludeList.push(url)
    input.value = ''
        
    // 表示を更新
    this.renderExcludeList()
    this.saveSettings()
  }
    
  removeExcludeUrl(url) {
    const index = this.currentSettings.excludeList.indexOf(url)
    if (index > -1) {
      this.currentSettings.excludeList.splice(index, 1)
      this.renderExcludeList()
      this.saveSettings()
    }
  }
    
  renderExcludeList() {
    const container = document.getElementById('excludeList')
    container.innerHTML = ''
        
    if (this.currentSettings.excludeList.length === 0) {
      container.innerHTML = '<div style="color: #666; font-style: italic; padding: 8px;">除外サイトはありません</div>'
      return
    }
        
    this.currentSettings.excludeList.forEach((url) => {
      const item = document.createElement('div')
      item.className = 'exclude-item'
            
      const urlSpan = document.createElement('span')
      urlSpan.className = 'exclude-url'
      urlSpan.textContent = url
            
      const removeBtn = document.createElement('button')
      removeBtn.className = 'remove-btn'
      removeBtn.textContent = '削除'
      removeBtn.addEventListener('click', () => {
        this.removeExcludeUrl(url)
      })
            
      item.appendChild(urlSpan)
      item.appendChild(removeBtn)
      container.appendChild(item)
    })
  }
    
  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
    
  showSaveStatus(message, isSuccess) {
    const statusElement = document.getElementById('saveStatus')
    statusElement.textContent = message
    statusElement.className = `save-status ${isSuccess ? 'success' : 'error'}`
    statusElement.style.display = 'block'
        
    // 3秒後に非表示
    setTimeout(() => {
      statusElement.style.display = 'none'
    }, 3000)
  }
  
  showConfirm(message) {
    return new Promise((resolve) => {
      const dialog = document.getElementById('confirmDialog')
      const messageElement = document.getElementById('confirmMessage')
      const okButton = document.getElementById('confirmOk')
      const cancelButton = document.getElementById('confirmCancel')
      const overlay = dialog.querySelector('.confirm-overlay')

      // メッセージを設定
      messageElement.textContent = message

      // ダイアログを表示
      dialog.style.display = 'flex'

      // イベントリスナーを設定
      const handleOk = () => {
        dialog.style.display = 'none'
        cleanup()
        resolve(true)
      }

      const handleCancel = () => {
        dialog.style.display = 'none'
        cleanup()
        resolve(false)
      }

      const handleOverlayClick = (e) => {
        if (e.target === overlay) {
          handleCancel()
        }
      }

      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          handleCancel()
        } else if (e.key === 'Enter') {
          handleOk()
        }
      }

      // イベントリスナーを追加
      okButton.addEventListener('click', handleOk)
      cancelButton.addEventListener('click', handleCancel)
      overlay.addEventListener('click', handleOverlayClick)
      document.addEventListener('keydown', handleKeydown)

      // クリーンアップ関数
      const cleanup = () => {
        okButton.removeEventListener('click', handleOk)
        cancelButton.removeEventListener('click', handleCancel)
        overlay.removeEventListener('click', handleOverlayClick)
        document.removeEventListener('keydown', handleKeydown)
      }

      // OKボタンにフォーカス
      setTimeout(() => okButton.focus(), 100)
    })
  }
  
  // === カスタムジェスチャー管理メソッド ===

  // 全てのジェスチャー表示を更新する統一メソッド
  async refreshAllGestureDisplays() {
    console.log('Refreshing all gesture displays...')
    
    // カスタムジェスチャーマネージャーの最新データを強制的に再読み込み
    if (this.customGestureManager) {
      await this.customGestureManager.loadCustomGestures()
    }
    
    // 従来のカスタムジェスチャー管理セクションを更新
    this.renderCustomGestureList()
    
    // 新しいジェスチャー一覧画面を更新（最新データで再構築）
    await this.renderAllGesturesList()
    
    console.log('All gesture displays refreshed with latest data')
  }
  
  async loadCustomGestures() {
    if (!this.customGestureManager) return
    
    try {
      await this.customGestureManager.loadCustomGestures()
      this.renderCustomGestureList()
    } catch (error) {
      console.error('Failed to load custom gestures:', error)
      this.showSaveStatus('カスタムジェスチャーの読み込みに失敗しました', false)
    }
  }
  
  renderCustomGestureList() {
    const container = document.getElementById('customGestureList')
    if (!this.customGestureManager) {
      container.innerHTML = '<div class="empty-state">カスタムジェスチャー機能は利用できません</div>'
      return
    }
    
    const gestures = this.customGestureManager.getCustomGestures()
    
    if (gestures.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🖱️</div>
          <div>カスタムジェスチャーがありません</div>
          <div style="font-size: 12px; margin-top: 8px;">下のフォームから新しいジェスチャーを追加できます</div>
        </div>
      `
      return
    }
    
    container.innerHTML = ''
    
    gestures.forEach(gesture => {
      const item = document.createElement('div')
      item.className = `gesture-item ${gesture.enabled ? '' : 'disabled'}`
      
      // パターンの表示を安全に処理
      let patternDisplay
      if (Array.isArray(gesture.pattern)) {
        patternDisplay = gesture.pattern.join(' → ')
      } else if (typeof gesture.pattern === 'string') {
        patternDisplay = gesture.pattern
      } else {
        patternDisplay = String(gesture.pattern || '')
      }

      item.innerHTML = `
        <div class="gesture-info">
          <div class="gesture-name">${this.escapeHtml(gesture.name)}</div>
          <div>
            <span class="gesture-pattern">${patternDisplay}</span>
            <span class="gesture-action">${this.getActionDisplayName(gesture.action)}</span>
          </div>
        </div>
        <div class="gesture-controls">
          <button class="gesture-toggle ${gesture.enabled ? 'enabled' : 'disabled'}" data-id="${gesture.id}">
            ${gesture.enabled ? '有効' : '無効'}
          </button>
          <button class="edit-btn" data-id="${gesture.id}">編集</button>
          <button class="delete-btn" data-id="${gesture.id}">削除</button>
        </div>
      `
      
      container.appendChild(item)
    })
    
    // イベントリスナーを追加
    this.setupGestureItemListeners()
  }
  
  setupGestureItemListeners() {
    console.log('Setting up gesture item listeners...')
    
    // 有効/無効切り替え
    const toggleButtons = document.querySelectorAll('.gesture-toggle')
    console.log('Found toggle buttons:', toggleButtons.length)
    toggleButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        console.log('Toggle clicked for gesture:', id)
        const gesture = this.customGestureManager.getCustomGestures().find(g => g.id === id)
        if (gesture) {
          await this.customGestureManager.updateCustomGesture(id, { enabled: !gesture.enabled })
          await this.refreshAllGestureDisplays()
        }
      })
    })
    
    // 編集ボタン
    const editButtons = document.querySelectorAll('.edit-btn')
    console.log('Found edit buttons:', editButtons.length)
    editButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        console.log('Edit clicked for gesture:', id)
        this.editCustomGesture(id)
      })
    })
    
    // 削除ボタン
    const deleteButtons = document.querySelectorAll('.delete-btn')
    console.log('Found delete buttons:', deleteButtons.length)
    deleteButtons.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        console.log('Delete clicked for gesture:', id)
        const gesture = this.customGestureManager.getCustomGestures().find(g => g.id === id)
        console.log('Found gesture for deletion:', gesture)
        if (gesture) {
          const confirmMessage = `「${gesture.name}」を削除しますか？この操作は元に戻せません。`
          console.log('Showing confirm dialog with message:', confirmMessage)
          const confirmed = await this.showConfirm(confirmMessage)
          console.log('User confirmation result:', confirmed)
          
          if (confirmed) {
            console.log('Deletion confirmed, proceeding...')
            await this.customGestureManager.deleteCustomGesture(id)
            await this.refreshAllGestureDisplays()
            this.showSaveStatus('カスタムジェスチャーを削除しました', true)
          } else {
            console.log('Deletion cancelled by user')
          }
        } else {
          console.log('Gesture not found')
        }
      })
    })
  }
  
  addDirectionToPattern(direction) {
    this.currentPattern.push(direction)
    this.updatePatternDisplay()
  }
  
  clearPattern() {
    this.currentPattern = []
    this.updatePatternDisplay()
  }
  
  updatePatternDisplay() {
    const display = document.getElementById('gesturePatternDisplay')
    if (this.currentPattern.length === 0) {
      display.value = ''
      display.placeholder = 'パターンをクリックして入力'
    } else {
      display.value = this.currentPattern.join(' → ')
    }
  }
  
  async addCustomGesture() {
    const name = document.getElementById('gestureName').value.trim()
    const action = document.getElementById('gestureAction').value
    
    if (!name) {
      this.showSaveStatus('ジェスチャー名を入力してください', false)
      return
    }
    
    if (this.currentPattern.length === 0) {
      this.showSaveStatus('パターンを入力してください', false)
      return
    }
    
    if (!this.customGestureManager) {
      this.showSaveStatus('カスタムジェスチャー機能は利用できません', false)
      return
    }
    
    try {
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
        document.getElementById('gestureAction').selectedIndex = 0
        this.clearPattern()
      } else {
        this.showSaveStatus(result.error || 'ジェスチャーの追加に失敗しました', false)
      }
    } catch (error) {
      console.error('Failed to add custom gesture:', error)
      this.showSaveStatus('ジェスチャーの追加に失敗しました', false)
    }
  }
  
  editCustomGesture(id) {
    const gesture = this.customGestureManager.getCustomGestures().find(g => g.id === id)
    if (!gesture) return
    
    // フォームに既存の値を設定
    document.getElementById('gestureName').value = gesture.name
    document.getElementById('gestureAction').value = gesture.action
    this.currentPattern = [...gesture.pattern]
    this.updatePatternDisplay()
    
    // 追加ボタンを編集モードに変更
    const addBtn = document.getElementById('addGestureBtn')
    addBtn.textContent = '変更を保存'
    addBtn.onclick = () => this.saveEditedGesture(id)
    
    this.showSaveStatus('編集モードになりました', true)
  }
  
  async saveEditedGesture(id) {
    const name = document.getElementById('gestureName').value.trim()
    const action = document.getElementById('gestureAction').value
    
    if (!name || this.currentPattern.length === 0) {
      this.showSaveStatus('名前とパターンを入力してください', false)
      return
    }
    
    try {
      const result = await this.customGestureManager.updateCustomGesture(id, {
        name: name,
        pattern: [...this.currentPattern],
        action: action
      })
      
      if (result.success) {
        this.showSaveStatus('カスタムジェスチャーを更新しました', true)
        await this.refreshAllGestureDisplays()
        this.resetAddForm()
      } else {
        this.showSaveStatus(result.error || 'ジェスチャーの更新に失敗しました', false)
      }
    } catch (error) {
      console.error('Failed to update custom gesture:', error)
      this.showSaveStatus('ジェスチャーの更新に失敗しました', false)
    }
  }
  
  resetAddForm() {
    document.getElementById('gestureName').value = ''
    document.getElementById('gestureAction').selectedIndex = 0
    this.clearPattern()
    
    const addBtn = document.getElementById('addGestureBtn')
    addBtn.textContent = 'カスタムジェスチャーを追加'
    addBtn.onclick = () => this.addCustomGesture()
  }
  
  toggleRecording() {
    // 将来の拡張：実際のマウス動作を記録する機能
    this.showSaveStatus('記録機能は今後のバージョンで対応予定です', false)
  }
  
  getActionDisplayName(action) {
    const actionNames = {
      'back': '戻る',
      'forward': '進む',
      'scroll_up': '上スクロール',
      'scroll_down': '下スクロール',
      'close_tab': 'タブを閉じる',
      'new_tab': '新しいタブ',
      'refresh': '更新',
      'super_refresh': 'スーパーリロード（キャッシュクリア）',
      'prev_tab': '前のタブ',
      'next_tab': '次のタブ',
      'duplicate_tab': 'タブを複製'
    }
    return actionNames[action] || action
  }
  
  // 学習統計を読み込み
  async loadLearningStats() {
    if (!this.patternMatcher || !this.learningManager) {
      console.warn('Learning managers not initialized')
      return
    }
    
    try {
      // 学習マネージャーのデータを読み込み
      await this.learningManager.loadLearningData()
      
      // 統計データを取得
      const stats = this.patternMatcher.getLearningStats()
      
      if (stats) {
        this.renderLearningStats(stats)
      } else {
        this.renderEmptyLearningStats()
      }
    } catch (error) {
      console.error('Failed to load learning stats:', error)
      this.renderEmptyLearningStats()
    }
  }
  
  // 学習統計を表示
  renderLearningStats(stats) {
    // 基本統計の表示
    document.getElementById('learnedGesturesCount').textContent = stats.totalGestures || 0
    document.getElementById('avgPatternLength').textContent = 
      stats.userProfile.averagePatternLength ? stats.userProfile.averagePatternLength.toFixed(1) : '-'
    
    // 総使用回数を計算
    const totalUsage = stats.gestureStats.reduce((sum, stat) => sum + stat.usage, 0)
    document.getElementById('totalUsage').textContent = totalUsage
    
    // 好みの方向を表示
    const preferredDirs = stats.userProfile.preferredDirections
    const directionDisplay = preferredDirs && preferredDirs.length > 0 ? 
      preferredDirs.join(', ') : 'データなし'
    document.getElementById('preferredDirections').textContent = directionDisplay
    
    // ジェスチャー別統計を表示
    this.renderGestureStatsList(stats.gestureStats)
  }
  
  // 空の学習統計を表示
  renderEmptyLearningStats() {
    document.getElementById('learnedGesturesCount').textContent = '0'
    document.getElementById('avgPatternLength').textContent = '-'
    document.getElementById('totalUsage').textContent = '0'
    document.getElementById('preferredDirections').textContent = 'データなし'
    
    const statsList = document.getElementById('gestureStatsList')
    statsList.innerHTML = '<div style="padding: 16px; text-align: center; color: #5f6368;">学習データがありません</div>'
  }
  
  // ジェスチャー別統計リストを表示
  renderGestureStatsList(gestureStats) {
    const container = document.getElementById('gestureStatsList')
    
    if (!gestureStats || gestureStats.length === 0) {
      container.innerHTML = '<div style="padding: 16px; text-align: center; color: #5f6368;">学習データがありません</div>'
      return
    }
    
    const html = gestureStats.map(stat => {
      const successRate = stat.successRate * 100
      const successColor = successRate >= 80 ? '#34a853' : successRate >= 60 ? '#fbbc04' : '#ea4335'
      
      return `
        <div style="padding: 8px 12px; border-bottom: 1px solid #f1f3f4; display: flex; justify-content: space-between; align-items: center;">
          <div style="flex: 1;">
            <div style="font-weight: 500; font-size: 13px;">${stat.name}</div>
            <div style="font-size: 11px; color: #5f6368;">
              使用: ${stat.usage}回 | 
              閾値: ${stat.threshold.toFixed(2)} | 
              学習済み: ${stat.learnedVariations}種類
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 14px; font-weight: bold; color: ${successColor};">
              ${successRate.toFixed(1)}%
            </div>
            <div style="font-size: 10px; color: #5f6368;">成功率</div>
          </div>
        </div>
      `
    }).join('')
    
    container.innerHTML = html
  }
  
  // 学習データをリセット
  async resetLearningData() {
    const confirmed = await this.showConfirm('学習データを完全にリセットしますか？この操作は元に戻せません。')
    if (!confirmed) {
      return
    }
    
    try {
      // Chrome storageから学習データを削除
      await chrome.storage.sync.remove('gestureLearningData')
      
      // 学習マネージャーをリセット
      if (this.learningManager) {
        this.learningManager = new GestureLearningManager()
      }
      
      // パターンマッチャーを再初期化
      if (this.patternMatcher) {
        this.patternMatcher = new CustomPatternMatcher(this.customGestureManager)
      }
      
      // 統計表示を更新
      this.renderEmptyLearningStats()
      
      this.showSaveStatus('学習データをリセットしました', true)
    } catch (error) {
      console.error('Failed to reset learning data:', error)
      this.showSaveStatus('学習データのリセットに失敗しました', false)
    }
  }

  // ジェスチャー一覧の初期化
  async initGesturesList() {
    this.currentViewMode = 'list' // 'list' または 'grid' または 'compact'
    this.currentFilter = 'all'
    this.searchQuery = ''
    
    await this.renderAllGesturesList()
  }

  // ジェスチャー一覧のイベントリスナー設定
  setupGestureListEventListeners() {
    // 検索
    const searchInput = document.getElementById('gestureSearch')
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase()
        this.filterAndRenderGestures()
      })
    }

    // フィルター
    const filterSelect = document.getElementById('gestureFilter')
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        this.currentFilter = e.target.value
        this.filterAndRenderGestures()
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

  // デフォルトジェスチャーの定義
  getDefaultGestures() {
    return [
      // 基本ジェスチャー
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
        id: 'right',
        name: 'ブラウザの進む',
        pattern: '→',
        action: 'forward',
        type: 'default',
        category: 'basic',
        description: '次のページに進みます',
        enabled: true
      },
      {
        id: 'up',
        name: 'ページトップへスクロール',
        pattern: '↑',
        action: 'scroll_up',
        type: 'default',
        category: 'basic',
        description: 'ページの最上部にスクロールします',
        enabled: true
      },
      {
        id: 'down',
        name: 'ページボトムへスクロール',
        pattern: '↓',
        action: 'scroll_down',
        type: 'default',
        category: 'basic',
        description: 'ページの最下部にスクロールします',
        enabled: true
      },
      // 複合ジェスチャー
      {
        id: 'downright',
        name: 'タブを閉じる',
        pattern: '↓→',
        action: 'close_tab',
        type: 'default',
        category: 'advanced',
        description: '現在のタブを閉じます',
        enabled: true
      },
      {
        id: 'upright',
        name: '新しいタブ',
        pattern: '↑→',
        action: 'new_tab',
        type: 'default',
        category: 'advanced',
        description: '新しいタブを開きます',
        enabled: true
      },
      {
        id: 'rightdown',
        name: 'タブを複製',
        pattern: '→↓',
        action: 'duplicate_tab',
        type: 'default',
        category: 'advanced',
        description: '現在のタブを複製します',
        enabled: true
      },
      {
        id: 'updown',
        name: 'ページ更新',
        pattern: '↑↓',
        action: 'refresh',
        type: 'default',
        category: 'advanced',
        description: 'ページをリロードします',
        enabled: true
      },
      // Phase 10 新機能
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
      },
      {
        id: 'prev_tab',
        name: '前のタブ',
        pattern: '←→',
        action: 'prev_tab',
        type: 'default',
        category: 'new',
        description: '前のタブに切り替えます',
        enabled: true,
        isNew: true
      },
      {
        id: 'next_tab',
        name: '次のタブ',
        pattern: '→←',
        action: 'next_tab',
        type: 'default',
        category: 'new',
        description: '次のタブに切り替えます',
        enabled: true,
        isNew: true
      }
    ]
  }

  // 全ジェスチャー一覧の表示
  async renderAllGesturesList() {
    const container = document.getElementById('allGesturesList')
    if (!container) {
      console.error('allGesturesList container not found')
      return
    }

    try {
      console.log('Starting renderAllGesturesList...')
      
      // デフォルトジェスチャー
      const defaultGestures = this.getDefaultGestures()
      console.log('Default gestures loaded:', defaultGestures.length)
      
      // カスタムジェスチャー
      let customGestures = []
      if (this.customGestureManager) {
        console.log('CustomGestureManager available, loading custom gestures...')
        customGestures = this.customGestureManager.getCustomGestures() || []
        console.log('Custom gestures loaded:', customGestures.length)
        console.log('Raw custom gestures:', customGestures)
        
        customGestures = customGestures.map(gesture => {
          // patternが文字列かどうかチェック
          let displayPattern = gesture.pattern
          if (typeof gesture.pattern === 'string') {
            displayPattern = gesture.pattern
              .replace(/UP/g, '↑')
              .replace(/DOWN/g, '↓')
              .replace(/LEFT/g, '←')
              .replace(/RIGHT/g, '→')
          } else if (Array.isArray(gesture.pattern)) {
            // パターンが配列の場合は結合
            displayPattern = gesture.pattern.join('')
              .replace(/UP/g, '↑')
              .replace(/DOWN/g, '↓')
              .replace(/LEFT/g, '←')
              .replace(/RIGHT/g, '→')
          } else {
            console.warn('Unknown pattern format for gesture:', gesture)
            displayPattern = String(gesture.pattern || '')
          }
          
          return {
            ...gesture,
            type: 'custom',
            category: 'custom',
            pattern: displayPattern
          }
        })
      } else {
        console.log('CustomGestureManager not available')
      }

      // 全ジェスチャーをマージ
      this.allGestures = [...defaultGestures, ...customGestures]
      console.log('Total gestures:', this.allGestures.length)
      
      this.filterAndRenderGestures()
    } catch (error) {
      console.error('Failed to render gestures list:', error)
      container.innerHTML = '<div style="padding: 32px; text-align: center; color: #ea4335;">ジェスチャー一覧の読み込みに失敗しました</div>'
    }
  }

  // フィルタリングして表示
  filterAndRenderGestures() {
    console.log('Starting filterAndRenderGestures...')
    const container = document.getElementById('allGesturesList')
    if (!container) {
      console.error('allGesturesList container not found in filterAndRenderGestures')
      return
    }
    if (!this.allGestures) {
      console.error('allGestures not available')
      return
    }
    console.log('Filtering', this.allGestures.length, 'gestures')

    // フィルタリング
    const filteredGestures = this.allGestures.filter(gesture => {
      // 検索クエリでフィルタリング
      const matchesSearch = !this.searchQuery || 
        gesture.name.toLowerCase().includes(this.searchQuery) ||
        gesture.description.toLowerCase().includes(this.searchQuery) ||
        gesture.pattern.includes(this.searchQuery)

      // カテゴリでフィルタリング
      const matchesFilter = this.currentFilter === 'all' ||
        (this.currentFilter === 'default' && gesture.type === 'default') ||
        (this.currentFilter === 'custom' && gesture.type === 'custom') ||
        (this.currentFilter === 'new' && gesture.isNew)

      return matchesSearch && matchesFilter
    })

    // カテゴリ別にグループ化
    const groupedGestures = {}
    filteredGestures.forEach(gesture => {
      if (!groupedGestures[gesture.category]) {
        groupedGestures[gesture.category] = []
      }
      groupedGestures[gesture.category].push(gesture)
    })

    // HTML生成
    let html = ''
    const categoryNames = {
      'basic': '基本ジェスチャー',
      'advanced': '複合ジェスチャー',
      'new': '新機能 (Phase 10)',
      'custom': 'カスタムジェスチャー'
    }

    Object.keys(groupedGestures).forEach(category => {
      const gestures = groupedGestures[category]
      if (gestures.length === 0) return

      html += `<div class="gesture-category">
        <div class="category-header">${categoryNames[category] || category}</div>`

      gestures.forEach(gesture => {
        html += this.generateGestureItemHTML(gesture)
      })

      html += '</div>'
    })

    if (html === '') {
      html = '<div style="padding: 32px; text-align: center; color: #5f6368;">該当するジェスチャーが見つかりません</div>'
    }

    container.innerHTML = html
    container.className = `all-gestures-container ${this.currentViewMode}-view`

    console.log('filterAndRenderGestures completed successfully. HTML length:', html.length)

    // イベントリスナーを再設定
    this.setupAllGestureItemListeners()
  }

  // 個別ジェスチャーアイテムのHTML生成
  generateGestureItemHTML(gesture) {
    const badges = []
    if (gesture.isNew) {
      badges.push('<span class="new-badge">New</span>')
    }
    if (gesture.type === 'custom') {
      badges.push('<span class="custom-badge">Custom</span>')
    }

    const highlightedName = this.highlightSearchText(gesture.name)
    const highlightedDescription = this.highlightSearchText(gesture.description)

    return `
      <div class="all-gesture-item ${gesture.enabled ? '' : 'disabled'}" data-gesture-id="${gesture.id}">
        <div class="gesture-visual">
          <div class="gesture-pattern-large">${gesture.pattern}</div>
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
                  title="${gesture.enabled ? '無効にする' : '有効にする'}">
          </button>
          ${gesture.type === 'custom' ? `
            <button class="edit-btn" data-gesture-id="${gesture.id}" title="編集">編集</button>
            <button class="delete-btn" data-gesture-id="${gesture.id}" title="削除">削除</button>
          ` : ''}
        </div>
      </div>
    `
  }

  // 検索テキストのハイライト
  highlightSearchText(text) {
    if (!this.searchQuery) return text
    const regex = new RegExp(`(${this.searchQuery})`, 'gi')
    return text.replace(regex, '<span class="search-highlight">$1</span>')
  }

  // ジェスチャーアイテムのイベントリスナー設定
  setupAllGestureItemListeners() {
    // 有効/無効切り替え
    document.querySelectorAll('.gesture-status-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gestureId = e.target.dataset.gestureId
        this.toggleGestureStatus(gestureId)
      })
    })

    // カスタムジェスチャーの編集
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const gestureId = e.target.dataset.gestureId
        this.editCustomGestureFromList(gestureId)
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

  // 表示モード切り替え
  toggleViewMode() {
    const modes = ['list', 'compact', 'grid']
    const currentIndex = modes.indexOf(this.currentViewMode)
    this.currentViewMode = modes[(currentIndex + 1) % modes.length]
    
    const toggleBtn = document.getElementById('toggleViewMode')
    if (toggleBtn) {
      const modeNames = { list: 'リスト', compact: 'コンパクト', grid: 'グリッド' }
      toggleBtn.textContent = modeNames[this.currentViewMode]
    }
    
    this.filterAndRenderGestures()
  }

  // ジェスチャー有効/無効切り替え
  async toggleGestureStatus(gestureId) {
    const gesture = this.allGestures.find(g => g.id === gestureId)
    if (!gesture) return

    gesture.enabled = !gesture.enabled

    if (gesture.type === 'custom' && this.customGestureManager) {
      try {
        await this.customGestureManager.updateCustomGesture(gestureId, gesture)
        this.showSaveStatus(`${gesture.name}を${gesture.enabled ? '有効' : '無効'}にしました`, true)
        await this.refreshAllGestureDisplays()
      } catch (error) {
        console.error('Failed to update gesture:', error)
        this.showSaveStatus('ジェスチャーの更新に失敗しました', false)
        gesture.enabled = !gesture.enabled // ロールバック
      }
    } else {
      // デフォルトジェスチャーの場合は設定に保存（将来的に実装）
      this.showSaveStatus(`${gesture.name}を${gesture.enabled ? '有効' : '無効'}にしました`, true)
    }

    this.filterAndRenderGestures()
  }

  // カスタムジェスチャー編集（既存のフォームを使用）
  editCustomGestureFromList(gestureId) {
    const gesture = this.allGestures.find(g => g.id === gestureId && g.type === 'custom')
    if (!gesture) return

    // 既存のフォームに値を設定
    document.getElementById('gestureName').value = gesture.name
    document.getElementById('gesturePatternDisplay').value = gesture.pattern
    document.getElementById('gestureAction').value = gesture.action

    // 編集モードを示すため、フォームをスクロール表示
    document.querySelector('.add-gesture-form').scrollIntoView({ behavior: 'smooth' })
    
    // 一時的に編集中のIDを保存
    this.editingGestureId = gestureId
    
    const addBtn = document.getElementById('addGestureBtn')
    if (addBtn) {
      addBtn.textContent = 'ジェスチャーを更新'
    }
  }

  // カスタムジェスチャー削除
  async deleteCustomGesture(gestureId) {
    const gesture = this.allGestures.find(g => g.id === gestureId && g.type === 'custom')
    if (!gesture) return

    const confirmed = await this.showConfirm(`"${gesture.name}"を削除しますか？この操作は元に戻せません。`)
    if (!confirmed) {
      return
    }

    if (this.customGestureManager) {
      try {
        await this.customGestureManager.deleteCustomGesture(gestureId)
        this.showSaveStatus(`${gesture.name}を削除しました`, true)
        await this.refreshAllGestureDisplays() // 全ての表示を更新
      } catch (error) {
        console.error('Failed to delete gesture:', error)
        this.showSaveStatus('ジェスチャーの削除に失敗しました', false)
      }
    }
  }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line no-unused-vars
  const optionsManager = new OptionsManager()
})