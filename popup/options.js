// マウスジェスチャーツール - 設定画面のスクリプト

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
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
  
  // === カスタムジェスチャー管理メソッド ===
  
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
      
      item.innerHTML = `
        <div class="gesture-info">
          <div class="gesture-name">${this.escapeHtml(gesture.name)}</div>
          <div>
            <span class="gesture-pattern">${gesture.pattern.join(' → ')}</span>
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
    // 有効/無効切り替え
    document.querySelectorAll('.gesture-toggle').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        const gesture = this.customGestureManager.getCustomGestures().find(g => g.id === id)
        if (gesture) {
          await this.customGestureManager.updateCustomGesture(id, { enabled: !gesture.enabled })
          this.renderCustomGestureList()
        }
      })
    })
    
    // 編集ボタン
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id
        this.editCustomGesture(id)
      })
    })
    
    // 削除ボタン
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id
        const gesture = this.customGestureManager.getCustomGestures().find(g => g.id === id)
        if (gesture && confirm(`「${gesture.name}」を削除しますか？`)) {
          await this.customGestureManager.deleteCustomGesture(id)
          this.renderCustomGestureList()
          this.showSaveStatus('カスタムジェスチャーを削除しました', true)
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
        this.renderCustomGestureList()
        
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
        this.renderCustomGestureList()
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
    if (!confirm('学習データを完全にリセットしますか？この操作は元に戻せません。')) {
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
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line no-unused-vars
  const optionsManager = new OptionsManager()
})