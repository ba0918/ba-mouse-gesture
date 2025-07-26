// マウスジェスチャーツール - 設定画面のスクリプト

class OptionsManager {
  constructor() {
    this.defaultSettings = {
      enabled: true,
      strokeColor: '#2196F3',
      strokeWidth: 3,
      excludeList: []
    }
        
    this.init()
  }
    
  async init() {
    // 現在の設定を読み込み
    await this.loadSettings()
        
    // UIイベントの設定
    this.setupEventListeners()
        
    // プレビューの初期化
    this.updatePreview()
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
}

// DOMが読み込まれたら初期化
document.addEventListener('DOMContentLoaded', () => {
  // eslint-disable-next-line no-unused-vars
  const optionsManager = new OptionsManager()
})