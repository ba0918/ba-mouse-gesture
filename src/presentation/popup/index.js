/**
 * Clean Architecture - Popup/Options エントリーポイント
 * 薄いPresentation層で適切に責任分離した実装
 */

// UseCase のインポート
const { SettingsManagementUseCase } = require('../../application/usecases/SettingsManagementUseCase')
const { CustomGestureManagementUseCase } = require('../../application/usecases/CustomGestureManagementUseCase')
const { GestureListUseCase } = require('../../application/usecases/GestureListUseCase')

// Repository のインポート
const { SettingsRepository } = require('../../infrastructure/storage/repositories/SettingsRepository')
const { GestureRepository } = require('../../infrastructure/storage/repositories/GestureRepository')

// Storage Adapter のインポート
const { ChromeStorageAdapter } = require('../../infrastructure/adapters/ChromeStorageAdapter')

// ThinController のインポート
const { ThinOptionsController } = require('./ThinOptionsController')

/**
 * Clean Architecture エントリーポイント
 * 依存関係の注入とControllerの初期化のみ
 */
class CleanOptionsEntry {
  constructor() {
    this.controller = null
    this.isInitialized = false
  }

  /**
   * 初期化 - 依存関係の注入とController初期化
   */
  async initialize() {
    try {
      console.log('🏗️ Clean Architecture Entry: Initializing...')
      
      // Infrastructure層の初期化
      const storageAdapter = new ChromeStorageAdapter()
      const settingsRepository = new SettingsRepository(storageAdapter)
      const gestureRepository = new GestureRepository(storageAdapter)
      
      // Application層の初期化
      const settingsUseCase = new SettingsManagementUseCase(settingsRepository)
      const customGestureUseCase = new CustomGestureManagementUseCase(gestureRepository, settingsRepository)
      const gestureListUseCase = new GestureListUseCase(gestureRepository, settingsRepository)
      
      // 学習統計用UseCase（簡易実装）
      const learningStatsUseCase = {
        getLearningStatistics: async () => ({
          learnedPatternsCount: 0,
          averagePatternLength: 2.5,
          totalGestures: 0
        }),
        resetLearningData: async () => {
          // Chrome storageから学習データを削除
          if (typeof chrome !== 'undefined' && chrome.storage) {
            await chrome.storage.sync.remove([
              'learningStats',
              'adaptiveThresholds', 
              'learnedPatterns',
              'gestureStatistics'
            ])
          }
        }
      }
      
      // Presentation層の初期化（薄いController）
      this.controller = new ThinOptionsController({
        settingsUseCase,
        customGestureUseCase,
        gestureListUseCase,
        learningStatsUseCase
      })
      
      // Controller初期化
      await this.controller.initialize()
      
      this.isInitialized = true
      console.log('✅ Clean Architecture Entry: Initialization complete')
      
    } catch (error) {
      console.error('❌ Clean Architecture Entry: Initialization failed:', error)
      this.showError('設定画面の初期化に失敗しました: ' + error.message)
    }
  }

  /**
   * エラー表示
   */
  showError(message) {
    const statusElement = document.getElementById('saveStatus')
    if (statusElement) {
      statusElement.textContent = message
      statusElement.className = 'save-status error'
      statusElement.style.display = 'block'
    }
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo() {
    return {
      isInitialized: this.isInitialized,
      hasController: Boolean(this.controller),
      architecture: 'Clean Architecture with proper layer separation'
    }
  }
}

// DOMContentLoaded時に初期化
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const optionsEntry = new CleanOptionsEntry()
    await optionsEntry.initialize()
    
    // グローバルアクセス用（デバッグ目的）
    window.cleanOptionsEntry = optionsEntry
    
  } catch (error) {
    console.error('Clean Options Entry initialization failed:', error)
  }
})

// CommonJS export（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CleanOptionsEntry }
}