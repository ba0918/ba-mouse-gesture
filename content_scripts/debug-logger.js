/**
 * デバッグログ管理システム
 * オプション画面の設定に基づいてログ出力と画面表示を制御
 */
class DebugLogger {
  /**
   * デバッグ設定を初期化
   */
  static async init() {
    // 静的プロパティの初期化
    this.LOG_LEVELS = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3
    }

    this.DISPLAY_POSITIONS = {
      TOP_RIGHT: 'top-right',
      TOP_LEFT: 'top-left',
      BOTTOM_RIGHT: 'bottom-right',
      BOTTOM_LEFT: 'bottom-left'
    }

    this.settings = {
      enabled: true, // 開発時はデフォルトでON（本番ビルド時に自動変更）
      logLevel: this.LOG_LEVELS.INFO,
      showStatus: true, // 開発時はデフォルトで表示
      statusPosition: this.DISPLAY_POSITIONS.TOP_RIGHT
    }

    this.isInitialized = false

    if (this.isInitialized) return

    try {
      // 🔧 論理的矛盾を修正: 統一されたキー名で設定を取得
      const syncResult = await chrome.storage.sync.get(['debugSettings'])
      console.log('🔧 DebugLogger: Loading from sync storage:', syncResult)
      
      if (syncResult.debugSettings) {
        // sync storageから統合設定を読み込み
        this.settings = { 
          ...this.settings, 
          ...syncResult.debugSettings
        }
        console.log('🔧 DebugLogger: Settings loaded from sync:', this.settings)
      } else {
        // 旧形式との互換性維持（段階的移行）
        const legacyResult = await chrome.storage.sync.get(['enableDebugMode'])
        if (legacyResult.enableDebugMode !== undefined) {
          this.settings.enabled = legacyResult.enableDebugMode
          this.settings.showStatus = legacyResult.enableDebugMode
          console.log('🔧 DebugLogger: Legacy format detected, migrating...', this.settings)
        }
      }
      
      await this.saveSettings()
      
      // storage変更の監視を開始
      this.startStorageListener()
      
      // 初期化時にデバッグ表示を確認
      if (this.settings.enabled && this.settings.showStatus) {
        this.showOnScreenDebug()
      }
      
      this.isInitialized = true
    } catch (error) {
      console.error('DebugLogger initialization failed:', error)
      this.isInitialized = true // エラー時も初期化完了とする
    }
  }

  /**
   * storage変更の監視を開始
   */
  static startStorageListener() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener((changes, namespace) => {
        // 🔧 論理的矛盾を修正: 統一されたキー名で変更を監視
        if (namespace === 'sync' && changes.debugSettings) {
          const newSettings = changes.debugSettings.newValue
          console.log('🔧 DebugLogger: Settings changed:', newSettings)
          
          if (newSettings) {
            this.settings = { ...this.settings, ...newSettings }
            
            // デバッグ表示の状態を更新
            if (this.settings.enabled && this.settings.showStatus) {
              this.showOnScreenDebug()
            } else {
              this.hideOnScreenDebug()
            }
            
            this.saveSettings()
          }
        }
        
        // 🔄 旧形式との互換性維持
        if (namespace === 'sync' && changes.enableDebugMode && !changes.debugSettings) {
          const newValue = changes.enableDebugMode.newValue
          console.log('🔧 DebugLogger: Legacy format change detected:', newValue)
          this.settings.enabled = newValue
          this.settings.showStatus = newValue
          
          if (newValue) {
            this.showOnScreenDebug()
          } else {
            this.hideOnScreenDebug()
          }
          
          this.saveSettings()
        }
      })
    }
  }

  /**
   * 設定を保存
   */
  static async saveSettings() {
    try {
      await chrome.storage.local.set({ debugSettings: this.settings })
    } catch (error) {
      console.error('Failed to save debug settings:', error)
    }
  }

  /**
   * 設定を更新
   */
  static async updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
    await this.saveSettings()
  }

  /**
   * ログレベルをチェック
   */
  static shouldLog(level) {
    if (!this.isInitialized) return true // 初期化前はログを出力
    return this.settings.enabled && level <= this.settings.logLevel
  }

  /**
   * エラーログ
   */
  static error(message, ...args) {
    if (this.shouldLog(this.LOG_LEVELS.ERROR)) {
      console.error('🚨 [ERROR]', message, ...args)
    }
  }

  /**
   * 警告ログ
   */
  static warn(message, ...args) {
    if (this.shouldLog(this.LOG_LEVELS.WARN)) {
      console.warn('⚠️ [WARN]', message, ...args)
    }
  }

  /**
   * 情報ログ
   */
  static info(message, ...args) {
    if (this.shouldLog(this.LOG_LEVELS.INFO)) {
      console.log('ℹ️ [INFO]', message, ...args)
    }
  }

  /**
   * デバッグログ
   */
  static debug(message, ...args) {
    if (this.shouldLog(this.LOG_LEVELS.DEBUG)) {
      console.log('🔧 [DEBUG]', message, ...args)
    }
  }

  /**
   * 画面ステータス表示
   */
  static showStatus(message, level = this.LOG_LEVELS.INFO) {
    // ログも出力
    this.log(level, 'Status:', message)

    // 画面表示が無効の場合は表示しない
    if (!this.isInitialized || !this.settings.enabled || !this.settings.showStatus) {
      return
    }

    // 既存のステータス要素を削除
    const existing = document.getElementById('gesture-debug-status')
    if (existing) {
      existing.remove()
    }

    // 新しいステータス要素を作成
    const statusDiv = document.createElement('div')
    statusDiv.id = 'gesture-debug-status'
    statusDiv.style.cssText = this.getStatusStyle()
    
    // ログレベルに応じて色を変更
    const colors = {
      [this.LOG_LEVELS.ERROR]: '#ff4444',
      [this.LOG_LEVELS.WARN]: '#ff8800',
      [this.LOG_LEVELS.INFO]: '#2563eb',
      [this.LOG_LEVELS.DEBUG]: '#666666'
    }
    statusDiv.style.backgroundColor = colors[level] || colors[this.LOG_LEVELS.INFO]
    
    statusDiv.textContent = message
    document.body.appendChild(statusDiv)

    // 3秒後に自動削除
    setTimeout(() => {
      if (statusDiv.parentNode) {
        statusDiv.parentNode.removeChild(statusDiv)
      }
    }, 3000)
  }

  /**
   * ログレベルに応じたログ出力
   */
  static log(level, message, ...args) {
    switch (level) {
    case this.LOG_LEVELS.ERROR:
      this.error(message, ...args)
      break
    case this.LOG_LEVELS.WARN:
      this.warn(message, ...args)
      break
    case this.LOG_LEVELS.INFO:
      this.info(message, ...args)
      break
    case this.LOG_LEVELS.DEBUG:
      this.debug(message, ...args)
      break
    default:
      this.info(message, ...args)
    }
  }

  /**
   * ステータス表示のスタイルを取得
   */
  static getStatusStyle() {
    const baseStyle = `
      position: fixed;
      z-index: 999999;
      padding: 8px 12px;
      background: rgba(37, 99, 235, 0.9);
      color: white;
      border-radius: 6px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 12px;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      backdrop-filter: blur(8px);
      max-width: 300px;
      word-wrap: break-word;
      pointer-events: none;
      transition: all 0.2s ease;
    `

    // 位置に応じてスタイルを調整
    const positionStyles = {
      [this.DISPLAY_POSITIONS.TOP_RIGHT]: 'top: 20px; right: 20px;',
      [this.DISPLAY_POSITIONS.TOP_LEFT]: 'top: 20px; left: 20px;',
      [this.DISPLAY_POSITIONS.BOTTOM_RIGHT]: 'bottom: 20px; right: 20px;',
      [this.DISPLAY_POSITIONS.BOTTOM_LEFT]: 'bottom: 20px; left: 20px;'
    }

    return baseStyle + (positionStyles[this.settings.statusPosition] || positionStyles[this.DISPLAY_POSITIONS.TOP_RIGHT])
  }

  /**
   * オンスクリーンデバッグ表示を表示
   */
  static showOnScreenDebug() {
    console.log('🛠️ showOnScreenDebug called, showStatus:', this.settings.showStatus)
    
    if (!this.settings.showStatus) {
      console.log('🛠️ showStatus is false, not showing debug display')
      return
    }
    
    let debugElement = document.getElementById('mouse-gesture-debug-status')
    if (!debugElement) {
      console.log('🛠️ Creating new debug element')
      debugElement = document.createElement('div')
      debugElement.id = 'mouse-gesture-debug-status'
      debugElement.style.cssText = this.getStatusStyle()
      document.body.appendChild(debugElement)
    } else {
      console.log('🛠️ Using existing debug element')
    }
    
    debugElement.textContent = '🖱️ デバッグモード: ON'
    debugElement.style.display = 'block'
    console.log('🛠️ Debug element displayed:', debugElement.style.display)
  }

  /**
   * オンスクリーンデバッグ表示を非表示
   */
  static hideOnScreenDebug() {
    const debugElement = document.getElementById('mouse-gesture-debug-status')
    if (debugElement) {
      debugElement.style.display = 'none'
    }
  }

  /**
   * デバッグ情報の取得
   */
  static getDebugInfo() {
    return {
      settings: this.settings,
      isInitialized: this.isInitialized,
      logLevels: this.LOG_LEVELS,
      displayPositions: this.DISPLAY_POSITIONS
    }
  }
}

// モジュールとして使用可能にする
if (typeof window !== 'undefined') {
  window.DebugLogger = DebugLogger
}

// 初期化を実行
if (typeof chrome !== 'undefined' && chrome.storage) {
  DebugLogger.init()
}