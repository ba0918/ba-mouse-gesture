// マウスジェスチャーツール - 設定画面のスクリプト

// 🎯 Clean Architectureの実装を読み込み（必須）
if (typeof window === 'undefined' || !window.DebugSettingsUseCase || !window.SettingsUseCase) {
  console.error('❌ FATAL: UseCase not loaded. Clean Architecture implementation missing.')
  throw new Error('UseCases are required for Clean Architecture compliance')
}

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      gestureThreshold: 15,
      excludeList: [],
      // デフォルトジェスチャーの有効/無効状態
      defaultGestureStates: {
        // 基本ジェスチャー
        left: true,
        right: true,
        up: true,
        down: true,
        // 複合ジェスチャー
        downright: true,
        upright: true,
        rightdown: true,
        updown: true,
        // Phase 10 新機能
        super_refresh: true,
        prev_tab: true,
        next_tab: true
      },
      // デバッグ設定
      debugSettings: {
        enabled: false, // 🎯 修正: デフォルトはfalse（prod環境対応）
        logLevel: 2, // INFO
        showStatus: false, // 🎯 修正: デフォルトはfalse
        statusPosition: 'top-right'
      }
    }
    
    // カスタムジェスチャー管理
    this.customGestureManager = null
    this.currentPattern = []
    this.isRecording = false
    
    // 🎯 Clean ArchitectureのUseCaseを初期化（必須）
    try {
      this.debugSettingsUseCase = new window.DebugSettingsUseCase()
      this.settingsUseCase = new window.SettingsUseCase()
      console.log('✅ UseCases initialized - Clean Architecture ready')
    } catch (error) {
      console.error('❌ FATAL: Failed to initialize UseCases:', error)
      throw error // Clean Architecture実装が必須なので、失敗時はエラーを投げる
    }
        
    this.init()
  }
    
  async init() {
    try {
      console.log('🔧 Options初期化開始')
      
      // 🔧 論理的矛盾を修正: 依存関係順に初期化
      // 1. カスタムジェスチャーマネージャーを初期化（他の全てが依存）
      this.initCustomGestureManager()
      
      // 2. 学習マネージャーを初期化（customGestureManager依存）
      this.initLearningManager()
      
      // 3. 現在の設定を読み込み
      await this.loadSettings()
          
      // 4. UIイベントの設定
      this.setupEventListeners()
          
      // 5. プレビューの初期化
      this.updatePreview()
      
      // 6. カスタムジェスチャーを読み込み（マネージャー初期化後）
      await this.loadCustomGestures()
      
      // 7. 学習統計を読み込み（学習マネージャー初期化後）
      await this.loadLearningStats()
      
      // 8. ジェスチャー一覧を初期化（全てのマネージャー初期化後）
      await this.initGesturesList()
      
      console.log('🔧 Options初期化完了')
    } catch (error) {
      console.error('🚨 Options初期化エラー:', error)
      // 🔧 エラーハンドリング強化: ユーザーに分かりやすいエラー表示
      this.showInitializationError(error)
    }
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
    try {
      if (typeof GestureLearningManager !== 'undefined' && this.customGestureManager) {
        this.learningManager = new GestureLearningManager()
        
        // 🔧 修正: CustomPatternMatcherの安全性チェック
        if (typeof CustomPatternMatcher !== 'undefined') {
          this.patternMatcher = new CustomPatternMatcher(this.customGestureManager)
          console.log('🔧 PatternMatcher initialized successfully')
        } else {
          console.warn('⚠️ CustomPatternMatcher not available, using fallback')
          this.patternMatcher = null
        }
      } else {
        console.warn('⚠️ Learning managers not available')
        this.learningManager = null
        this.patternMatcher = null
      }
    } catch (error) {
      console.error('🚨 Learning manager initialization failed:', error)
      this.learningManager = null
      this.patternMatcher = null
      // エラーがあっても初期化を継続（致命的ではない）
    }
  }
  
  // 🔧 エラーハンドリング強化: 初期化エラーのユーザーフレンドリー表示
  showInitializationError(error) {
    const errorContainer = document.getElementById('allGesturesList')
    if (errorContainer) {
      errorContainer.innerHTML = `
        <div style="padding: 32px; text-align: center; color: #ea4335;">
          <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
          <div style="font-weight: 600; margin-bottom: 8px;">初期化エラー</div>
          <div style="font-size: 12px; color: #5f6368;">
            ページをリロードしてもう一度お試しください
          </div>
        </div>
      `
    }
    
    // コンソールログでも詳細を出力
    console.error('🚨 Detailed error:', error.stack)
  }
    
  async loadSettings() {
    try {
      // 🎯 Clean Architecture準拠: UseCase経由で設定を取得
      const settings = await this.settingsUseCase.getSettings()
      this.currentSettings = { 
        ...this.currentSettings,  // デバッグ設定を保持
        ...settings 
      }
            
      // UIに設定を反映
      document.getElementById('enabled').checked = this.currentSettings.enabled
      document.getElementById('strokeColor').value = this.currentSettings.strokeColor
      document.getElementById('strokeWidth').value = this.currentSettings.strokeWidth
      document.getElementById('strokeWidthValue').textContent = `${this.currentSettings.strokeWidth}px`
      document.getElementById('gestureThreshold').value = this.currentSettings.gestureThreshold
      document.getElementById('gestureThresholdValue').textContent = `${this.currentSettings.gestureThreshold}px`
            
      // 除外リストを表示
      this.renderExcludeList()
      
      // デバッグ設定をUIに反映（非同期に変更）
      await this.loadDebugSettings()
            
    } catch (error) {
      console.error('設定の読み込みに失敗しました:', error)
      this.showSaveStatus('設定の読み込みに失敗しました', false)
    }
  }
    
  async saveSettings() {
    try {
      // 🎯 Clean Architecture準拠: UseCase経由で保存
      // デバッグ設定を除外して保存
      // eslint-disable-next-line no-unused-vars
      const { debugSettings, ...settingsToSave } = this.currentSettings
      await this.settingsUseCase.saveSettings(settingsToSave)
      this.showSaveStatus('設定を保存しました', true)
            
    } catch (error) {
      console.error('設定の保存に失敗しました:', error)
      this.showSaveStatus('設定の保存に失敗しました', false)
    }
  }
    
  // 🔧 修正: 安全なイベントリスナー設定ヘルパー
  safeAddEventListener(elementId, event, handler) {
    const element = document.getElementById(elementId)
    if (!element) {
      console.warn(`⚠️ Element not found for event listener: ${elementId}`)
      return false
    }
    element.addEventListener(event, handler)
    return true
  }

  setupEventListeners() {
    console.log('🔧 Setting up event listeners with safety checks')
    
    // 🔧 修正: 安全な有効/無効切り替え
    this.safeAddEventListener('enabled', 'change', (e) => {
      this.currentSettings.enabled = e.target.checked
      this.saveSettings()
    })
        
    // 🔧 修正: 安全な軌跡の色変更
    this.safeAddEventListener('strokeColor', 'change', (e) => {
      this.currentSettings.strokeColor = e.target.value
      this.updatePreview()
      this.saveSettings()
    })
        
    // 🔧 修正: 安全な軌跡の太さ変更
    this.safeAddEventListener('strokeWidth', 'input', (e) => {
      const width = parseInt(e.target.value)
      this.currentSettings.strokeWidth = width
      const valueElement = document.getElementById('strokeWidthValue')
      if (valueElement) {
        valueElement.textContent = `${width}px`
      }
      this.updatePreview()
      this.saveSettings()
    })
        
    // 🔧 修正: 安全なジェスチャー感度変更
    this.safeAddEventListener('gestureThreshold', 'input', (e) => {
      const threshold = parseInt(e.target.value)
      this.currentSettings.gestureThreshold = threshold
      const valueElement = document.getElementById('gestureThresholdValue')
      if (valueElement) {
        valueElement.textContent = `${threshold}px`
      }
      this.saveSettings()
    })
        
    // 🔧 修正: 安全な除外サイト追加
    this.safeAddEventListener('addExcludeBtn', 'click', () => {
      this.addExcludeUrl()
    })
        
    // 🔧 修正: 安全なEnterキーで除外サイト追加
    this.safeAddEventListener('newExcludeUrl', 'keypress', (e) => {
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
    console.log('🔧 Setting up custom gesture listeners with safety checks')
    
    // 🔧 修正: 安全なパターン方向ボタン
    const directionButtons = document.querySelectorAll('.direction-btn')
    if (directionButtons.length > 0) {
      directionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
          const direction = btn.dataset.direction
          this.addDirectionToPattern(direction)
        })
      })
    } else {
      console.warn('⚠️ Direction buttons not found')
    }
    
    // 🔧 修正: 安全なパターンクリアボタン
    this.safeAddEventListener('clearPatternBtn', 'click', () => {
      this.clearPattern()
    })
    
    // 🔧 修正: 安全なジェスチャー追加ボタン
    this.safeAddEventListener('addGestureBtn', 'click', () => {
      this.addCustomGesture()
    })
    
    // 🔧 修正: 安全な記録ボタン（将来の拡張用）
    this.safeAddEventListener('recordPatternBtn', 'click', () => {
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
      console.log('🔧 Options: Saving debug settings:', this.currentSettings.debugSettings)
      
      // 🎯 Clean Architecture準拠: UseCaseのみを使用（直接API呼び出し禁止）
      await this.debugSettingsUseCase.saveDebugSettings(this.currentSettings.debugSettings)
      console.log('✅ Options: Debug settings saved via UseCase (Clean Architecture)')
      
      // UIに即座に反映
      this.updateDebugUI()
      this.updateDebugOptions()
      
      this.showSaveStatus('デバッグ設定を保存しました', true)
      console.log('✅ Options: Debug settings sync completed')
      
    } catch (error) {
      console.error('❌ Options: Failed to save debug settings:', error)
      this.showSaveStatus('デバッグ設定の保存に失敗しました', false)
    }
  }

  async loadDebugSettings() {
    console.log('🔧 Options: Loading debug settings...')
    
    try {
      // 🎯 Clean Architecture準拠: UseCaseのみを使用（直接API呼び出し禁止）
      const debugSettingsEntity = await this.debugSettingsUseCase.getDebugSettings()
      this.currentSettings.debugSettings = debugSettingsEntity.toPlainObject()
      console.log('✅ Options: Debug settings loaded via UseCase (Clean Architecture):', this.currentSettings.debugSettings)
      
      // UIに設定を反映
      this.updateDebugUI()
      this.updateDebugOptions()
      
      console.log('✅ Options: Debug settings loaded and UI updated')
      
    } catch (error) {
      console.error('❌ Options: Failed to load debug settings:', error)
      // エラー時はデフォルト値で続行
      this.currentSettings.debugSettings = { ...this.defaultSettings.debugSettings }
      this.updateDebugUI()
      this.updateDebugOptions()
    }
  }
  
  // 🎯 依存性逆転原則: UI更新の責務を分離
  updateDebugUI() {
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
    // 🔧 修正: Canvas要素の存在チェック
    const canvas = document.getElementById('previewCanvas')
    if (!canvas) {
      console.warn('⚠️ Preview canvas not found')
      return
    }
    
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      console.warn('⚠️ Cannot get canvas context')
      return
    }
        
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
    // 🔧 修正: DOM要素の存在チェック
    const statusElement = document.getElementById('saveStatus')
    if (!statusElement) {
      console.warn('⚠️ saveStatus element not found')
      return
    }
    
    statusElement.textContent = message
    statusElement.className = `save-status ${isSuccess ? 'success' : 'error'}`
    statusElement.style.display = 'block'
        
    // 3秒後に非表示
    setTimeout(() => {
      if (statusElement) {
        statusElement.style.display = 'none'
      }
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
    try {
      // 🔧 修正: DOM要素の存在チェック
      const elements = {
        learnedGesturesCount: document.getElementById('learnedGesturesCount'),
        avgPatternLength: document.getElementById('avgPatternLength'),
        totalUsage: document.getElementById('totalUsage'),
        preferredDirections: document.getElementById('preferredDirections')
      }
      
      // DOM要素が存在しない場合は早期リターン
      for (const [name, element] of Object.entries(elements)) {
        if (!element) {
          console.warn(`⚠️ DOM element not found: ${name}`)
          return
        }
      }
      
      // 基本統計の表示
      elements.learnedGesturesCount.textContent = stats.totalGestures || 0
      elements.avgPatternLength.textContent = 
        stats.userProfile && stats.userProfile.averagePatternLength ? 
          stats.userProfile.averagePatternLength.toFixed(1) : '-'
      
      // 総使用回数を計算（安全性チェック付き）
      const totalUsage = stats.gestureStats && Array.isArray(stats.gestureStats) ? 
        stats.gestureStats.reduce((sum, stat) => sum + (stat.usage || 0), 0) : 0
      elements.totalUsage.textContent = totalUsage
      
      // 好みの方向を表示
      const preferredDirs = stats.userProfile && stats.userProfile.preferredDirections
      const directionDisplay = preferredDirs && preferredDirs.length > 0 ? 
        preferredDirs.join(', ') : 'データなし'
      elements.preferredDirections.textContent = directionDisplay
      
      // ジェスチャー別統計を表示
      this.renderGestureStatsList(stats.gestureStats)
      
    } catch (error) {
      console.error('🚨 Failed to render learning stats:', error)
      this.renderEmptyLearningStats() // フォールバック
    }
  }
  
  // 空の学習統計を表示
  renderEmptyLearningStats() {
    try {
      // 🔧 修正: DOM要素の存在チェック
      const elements = {
        learnedGesturesCount: document.getElementById('learnedGesturesCount'),
        avgPatternLength: document.getElementById('avgPatternLength'),
        totalUsage: document.getElementById('totalUsage'),
        preferredDirections: document.getElementById('preferredDirections'),
        gestureStatsList: document.getElementById('gestureStatsList')
      }
      
      // DOM要素が存在しない場合は警告のみ（エラーで停止しない）
      for (const [name, element] of Object.entries(elements)) {
        if (!element) {
          console.warn(`⚠️ DOM element not found in renderEmptyLearningStats: ${name}`)
          continue
        }
        
        // 各要素にデフォルト値を設定
        switch (name) {
        case 'learnedGesturesCount':
        case 'totalUsage':
          element.textContent = '0'
          break
        case 'avgPatternLength':
          element.textContent = '-'
          break
        case 'preferredDirections':
          element.textContent = 'データなし'
          break
        case 'gestureStatsList':
          element.innerHTML = '<div style="padding: 16px; text-align: center; color: #5f6368;">学習データがありません</div>'
          break
        }
      }
    } catch (error) {
      console.error('🚨 Failed to render empty learning stats:', error)
      // 空の統計表示に失敗しても致命的ではない
    }
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
      // Clean Architecture準拠: StorageAdapterを使用
      const storageAdapter = new window.ContentStorageAdapter()
      if (storageAdapter.isAvailable()) {
        await storageAdapter.remove('gestureLearningData')
      }
      
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
    // 設定から状態を取得（存在しない場合はデフォルトでtrue）
    const gestureStates = this.currentSettings?.defaultGestureStates || this.defaultSettings.defaultGestureStates
    
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
        enabled: gestureStates.left !== undefined ? gestureStates.left : true
      },
      {
        id: 'right',
        name: 'ブラウザの進む',
        pattern: '→',
        action: 'forward',
        type: 'default',
        category: 'basic',
        description: '次のページに進みます',
        enabled: gestureStates.right !== undefined ? gestureStates.right : true
      },
      {
        id: 'up',
        name: 'ページトップへスクロール',
        pattern: '↑',
        action: 'scroll_up',
        type: 'default',
        category: 'basic',
        description: 'ページの最上部にスクロールします',
        enabled: gestureStates.up !== undefined ? gestureStates.up : true
      },
      {
        id: 'down',
        name: 'ページボトムへスクロール',
        pattern: '↓',
        action: 'scroll_down',
        type: 'default',
        category: 'basic',
        description: 'ページの最下部にスクロールします',
        enabled: gestureStates.down !== undefined ? gestureStates.down : true
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
        enabled: gestureStates.downright !== undefined ? gestureStates.downright : true
      },
      {
        id: 'upright',
        name: '新しいタブ',
        pattern: '↑→',
        action: 'new_tab',
        type: 'default',
        category: 'advanced',
        description: '新しいタブを開きます',
        enabled: gestureStates.upright !== undefined ? gestureStates.upright : true
      },
      {
        id: 'rightdown',
        name: 'タブを複製',
        pattern: '→↓',
        action: 'duplicate_tab',
        type: 'default',
        category: 'advanced',
        description: '現在のタブを複製します',
        enabled: gestureStates.rightdown !== undefined ? gestureStates.rightdown : true
      },
      {
        id: 'updown',
        name: 'ページ更新',
        pattern: '↑↓',
        action: 'refresh',
        type: 'default',
        category: 'advanced',
        description: 'ページをリロードします',
        enabled: gestureStates.updown !== undefined ? gestureStates.updown : true
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
        enabled: gestureStates.super_refresh !== undefined ? gestureStates.super_refresh : true,
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
        enabled: gestureStates.prev_tab !== undefined ? gestureStates.prev_tab : true,
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
        enabled: gestureStates.next_tab !== undefined ? gestureStates.next_tab : true,
        isNew: true
      }
    ]
  }

  // 🔧 品質4象限チェック適用: 全ジェスチャー一覧の表示
  async renderAllGesturesList() {
    console.log('🔧 renderAllGesturesList開始')
    
    // 🔧 1. 論理的矛盾チェック: DOM要素の存在確認
    const container = document.getElementById('allGesturesList')
    if (!container) {
      console.error('🚨 allGesturesList container not found')
      return
    }

    try {
      // 🔧 2. 設計原則: 単一責任 - データ収集フェーズ
      const gestureData = await this.collectAllGestureData()
      
      // 🔧 3. ユースケース: 全ジェスチャーをマージして表示
      this.allGestures = [...gestureData.defaultGestures, ...gestureData.customGestures]
      console.log('🔧 Total gestures:', this.allGestures.length)
      
      // 🔧 4. テストケース: フィルタリングと表示
      this.filterAndRenderGestures()
      
    } catch (error) {
      console.error('🚨 Failed to render gestures list:', error)
      this.showGestureListError(container, error)
    }
  }
  
  // 🔧 単一責任原則: データ収集を分離
  collectAllGestureData() {
    console.log('🔧 データ収集開始')
    
    // デフォルトジェスチャー収集
    const defaultGestures = this.getDefaultGestures()
    console.log('🔧 Default gestures loaded:', defaultGestures.length)
    
    // カスタムジェスチャー収集
    let customGestures = []
    if (this.customGestureManager) {
      console.log('🔧 CustomGestureManager available, loading custom gestures...')
      const rawCustomGestures = this.customGestureManager.getCustomGestures() || []
      console.log('🔧 Raw custom gestures:', rawCustomGestures.length)
      
      // パターン正規化処理
      customGestures = rawCustomGestures.map(gesture => this.normalizeGesturePattern(gesture))
    } else {
      console.log('⚠️ CustomGestureManager not available')
    }
    
    return { defaultGestures, customGestures }
  }
  
  // 🔧 単一責任原則: パターン正規化を分離
  normalizeGesturePattern(gesture) {
    let displayPattern = gesture.pattern
    
    if (typeof gesture.pattern === 'string') {
      displayPattern = gesture.pattern
        .replace(/UP/g, '↑')
        .replace(/DOWN/g, '↓')
        .replace(/LEFT/g, '←')
        .replace(/RIGHT/g, '→')
    } else if (Array.isArray(gesture.pattern)) {
      displayPattern = gesture.pattern.join('')
        .replace(/UP/g, '↑')
        .replace(/DOWN/g, '↓')
        .replace(/LEFT/g, '←')
        .replace(/RIGHT/g, '→')
    } else {
      console.warn('⚠️ Unknown pattern format for gesture:', gesture)
      displayPattern = String(gesture.pattern || '')
    }
    
    return {
      ...gesture,
      type: 'custom',
      category: 'custom',
      pattern: displayPattern
    }
  }
  
  // 🔧 エラーハンドリング強化: ジェスチャー一覧エラー表示
  showGestureListError(container, error) {
    container.innerHTML = `
      <div style="padding: 32px; text-align: center; color: #ea4335;">
        <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
        <div style="font-weight: 600; margin-bottom: 8px;">ジェスチャー一覧の読み込みに失敗しました</div>
        <div style="font-size: 12px; color: #5f6368; margin-bottom: 16px;">
          ${error.message || '不明なエラーが発生しました'}
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

  // フィルタリングして表示
  filterAndRenderGestures() {
    console.log('Starting filterAndRenderGestures...')
    const container = document.getElementById('allGesturesList')
    if (!container) {
      console.error('allGesturesList container not found in filterAndRenderGestures')
      return
    }
    
    // 🔧 修正: allGesturesの安全性チェックとフォールバック
    if (!this.allGestures) {
      console.warn('⚠️ allGestures not available, initializing default gestures')
      // フォールバックとしてデフォルトジェスチャーリストを作成
      this.allGestures = this.getDefaultGestures()
      
      if (!this.allGestures || this.allGestures.length === 0) {
        console.error('🚨 Failed to initialize default gestures')
        container.innerHTML = `
          <div style="padding: 32px; text-align: center; color: #ea4335;">
            <div style="font-size: 24px; margin-bottom: 16px;">⚠️</div>
            <div style="font-weight: 600; margin-bottom: 8px;">ジェスチャーリストの読み込みに失敗しました</div>
            <div style="font-size: 12px; color: #5f6368;">設定を再読み込みしてください</div>
          </div>
        `
        return
      }
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
        // 🔧 修正: e.targetの代わりにe.currentTargetを使用（spanクリック対応）
        const gestureId = e.currentTarget.dataset.gestureId
        console.log('🔧 Toggle button clicked:', gestureId)
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
    
    // 🔧 修正: CSSクラスを実際に適用
    const gesturesList = document.getElementById('allGesturesList')
    if (gesturesList) {
      // 既存のview関連クラスを削除
      gesturesList.classList.remove('list-view', 'compact-view', 'grid-view')
      
      // 新しいviewクラスを追加
      gesturesList.classList.add(`${this.currentViewMode}-view`)
      
      console.log('🔧 View mode changed to:', this.currentViewMode)
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
        this.updateToggleButtonUI(gestureId, gesture.enabled) // 🔧 即座にUI更新
        await this.refreshAllGestureDisplays()
      } catch (error) {
        console.error('Failed to update gesture:', error)
        this.showSaveStatus('ジェスチャーの更新に失敗しました', false)
        gesture.enabled = !gesture.enabled // ロールバック
      }
    } else {
      // デフォルトジェスチャーの場合は設定に保存
      try {
        if (!this.currentSettings.defaultGestureStates) {
          this.currentSettings.defaultGestureStates = {}
        }
        this.currentSettings.defaultGestureStates[gestureId] = gesture.enabled
        await this.saveSettings()
        this.showSaveStatus(`${gesture.name}を${gesture.enabled ? '有効' : '無効'}にしました`, true)
        this.updateToggleButtonUI(gestureId, gesture.enabled) // 🔧 即座にUI更新
        this.filterAndRenderGestures() // UIを更新
      } catch (error) {
        console.error('Failed to save default gesture state:', error)
        this.showSaveStatus('ジェスチャー状態の保存に失敗しました', false)
        gesture.enabled = !gesture.enabled // ロールバック
      }
    }
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
  
  // 🔧 品質4象限チェック適用: トグルボタンUI即座更新
  updateToggleButtonUI(gestureId, enabled) {
    console.log('🔧 updateToggleButtonUI:', {gestureId, enabled})
    
    // 🔧 1. 論理的矛盾チェック: 該当するボタン要素を取得
    const button = document.querySelector(`[data-gesture-id="${gestureId}"].gesture-status-toggle`)
    if (!button) {
      console.warn('⚠️ Toggle button not found:', gestureId)
      return
    }
    
    // 🔧 2. 設計原則: 統一されたインターフェースでUI更新
    if (enabled) {
      button.classList.add('enabled')
      button.title = '無効にする'
      button.setAttribute('aria-label', 'ジェスチャーを無効にする')
    } else {
      button.classList.remove('enabled')
      button.title = '有効にする'  
      button.setAttribute('aria-label', 'ジェスチャーを有効にする')
    }
    
    // 🔧 3. ユースケース: テキスト表示を更新
    const toggleText = button.querySelector('.toggle-text')
    if (toggleText) {
      toggleText.textContent = enabled ? 'ON' : 'OFF'
    }
    
    console.log('🔧 Toggle button UI updated:', {gestureId, enabled, hasTextElement: Boolean(toggleText)})
  }
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line no-unused-vars
  const optionsManager = new OptionsManager()
})

// テスト用エクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OptionsManager
}