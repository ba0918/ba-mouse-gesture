/**
 * デバッグログ管理システム
 * オプション画面の設定に基づいてログ出力と画面表示を制御
 * 🎯 Clean Architecture完全準拠: UseCase経由でのみストレージアクセス
 */
class DebugLogger {
  /**
   * デバッグ設定を初期化
   */
  static async init() {
    // Clean ArchitectureのUseCaseを初期化
    if (!window.DebugSettingsUseCase) {
      console.error('❌ FATAL: DebugSettingsUseCase not loaded in content script')
      throw new Error('DebugSettingsUseCase is required for Clean Architecture compliance')
    }
    
    try {
      this.debugSettingsUseCase = new window.DebugSettingsUseCase()
      console.log('✅ DebugLogger: UseCase initialized')
    } catch (error) {
      console.error('❌ FATAL: Failed to initialize DebugSettingsUseCase:', error)
      throw error
    }
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
      enabled: false, // 🎯 修正: デフォルトはfalse（prod環境対応）
      logLevel: this.LOG_LEVELS.INFO,
      showStatus: false, // 🎯 修正: デフォルトはfalse
      statusPosition: this.DISPLAY_POSITIONS.TOP_RIGHT
    }

    this.isInitialized = false

    if (this.isInitialized) return

    try {
      // 🎯 Clean Architecture準拠: UseCase経由で設定を取得
      const debugSettingsEntity = await this.debugSettingsUseCase.getDebugSettings()
      this.settings = debugSettingsEntity.toStorageFormat()
      console.log('✅ DebugLogger: Settings loaded via UseCase:', this.settings)
      
      // 旧データの移行チェック（UseCase内で処理される）
      await this.debugSettingsUseCase.checkAndMigrateLegacyData()
      
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
    // 🎯 Clean Architecture準拠: UseCase経由で変更監視
    this.debugSettingsUseCase.startSyncListener((newSettings, oldSettings) => {
      console.log('🔧 DebugLogger: Settings changed via UseCase:', {
        old: oldSettings ? oldSettings.toStorageFormat() : null,
        new: newSettings.toStorageFormat()
      })
      
      // 設定を更新
      this.settings = newSettings.toStorageFormat()
      
      // デバッグ表示の状態を更新
      if (this.settings.enabled && this.settings.showStatus) {
        this.showOnScreenDebug()
      } else {
        this.hideOnScreenDebug()
      }
    })
    
    console.log('✅ DebugLogger: Storage listener started via UseCase')
  }

  /**
   * 設定を保存
   */
  static async saveSettings() {
    try {
      // 🎯 Clean Architecture準拠: UseCase経由で保存
      await this.debugSettingsUseCase.saveDebugSettings(this.settings)
      console.log('✅ DebugLogger: Settings saved via UseCase')
    } catch (error) {
      console.error('❌ DebugLogger: Failed to save debug settings:', error)
    }
  }

  /**
   * 設定を更新
   */
  static async updateSettings(newSettings) {
    // 🎯 Clean Architecture準拠: UseCase経由で更新
    await this.debugSettingsUseCase.updateMultipleSettings(newSettings)
    const updatedEntity = await this.debugSettingsUseCase.getDebugSettings()
    this.settings = updatedEntity.toStorageFormat()
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
  // Clean Architecture実装がロードされるまで少し待つ
  setTimeout(() => {
    DebugLogger.init().catch(error => {
      console.error('❌ DebugLogger initialization failed:', error)
    })
  }, 100)
}