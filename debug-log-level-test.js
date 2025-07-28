/**
 * logLevel: 0設定時のログ出力抑制テスト
 * 修正後の実装が正しく動作するか確認
 */

// 必要なクラスをインポート
const { DebugSettingsEntity } = require('./src/domain/entities/DebugSettingsEntity')
const { DebugLogger } = require('./src/infrastructure/adapters/DebugLogger')
const { ChromeStorageAdapter } = require('./src/infrastructure/adapters/ChromeStorageAdapter')
const { DebugStorageAdapter } = require('./src/infrastructure/adapters/DebugStorageAdapter')
const { DebugSettingsUseCase } = require('./src/application/usecases/DebugSettingsUseCase')

// Mock chrome API
const mockStorage = new Map()
global.chrome = {
  storage: {
    sync: {
      get: function (keys, callback) {
        const result = {}
        if (typeof keys === 'string') {
          keys = [keys]
        }
        if (Array.isArray(keys)) {
          keys.forEach(key => {
            if (mockStorage.has(key)) {
              result[key] = mockStorage.get(key)
            }
          })
        }
        callback(result)
      },
      set: function (items, callback) {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value)
        })
        callback && callback()
      }
    }
  }
}

async function testLogLevelZeroSuppression() {
  console.log('🧪 Testing logLevel: 0 log suppression...')
  
  // Step 1: 静的ログ制御のテスト
  console.log('\n📋 Step 1: Static log control test')
  console.log('DebugSettingsEntity.shouldLogStatic(0):', DebugSettingsEntity.shouldLogStatic(0)) // true (ERROR)
  console.log('DebugSettingsEntity.shouldLogStatic(1):', DebugSettingsEntity.shouldLogStatic(1)) // false (WARN)
  console.log('DebugSettingsEntity.shouldLogStatic(2):', DebugSettingsEntity.shouldLogStatic(2)) // false (INFO)
  console.log('DebugSettingsEntity.shouldLogStatic(3):', DebugSettingsEntity.shouldLogStatic(3)) // false (DEBUG)
  
  // Step 2: DebugLoggerのテスト（logLevel: 0）
  console.log('\n📋 Step 2: DebugLogger with logLevel: 0')
  const debugSettings = new DebugSettingsEntity({ enabled: true, logLevel: 0 })
  const logger = new DebugLogger(debugSettings)
  
  console.log('Testing DebugLogger with logLevel: 0:')
  logger.error('This ERROR should be shown')    // level 0 - 表示される
  logger.warn('This WARN should be hidden')     // level 1 - 表示されない
  logger.info('This INFO should be hidden')     // level 2 - 表示されない  
  logger.debug('This DEBUG should be hidden')   // level 3 - 表示されない
  
  // Step 3: ChromeStorageAdapterのテスト（logger未初期化）
  console.log('\n📋 Step 3: ChromeStorageAdapter without logger (static control)')
  const storageAdapter = new ChromeStorageAdapter() // loggerなし
  
  console.log('Testing ChromeStorageAdapter without logger:')
  storageAdapter.logWithLevel(0, 'ERROR message - should be shown')   // level 0 - 表示される
  storageAdapter.logWithLevel(1, 'WARN message - should be hidden')   // level 1 - 表示されない
  storageAdapter.logWithLevel(2, 'INFO message - should be hidden')   // level 2 - 表示されない
  storageAdapter.logWithLevel(3, 'DEBUG message - should be hidden')  // level 3 - 表示されない
  
  // Step 4: ChromeStorageAdapterのテスト（logger初期化済み）
  console.log('\n📋 Step 4: ChromeStorageAdapter with logger (logLevel: 0)')
  storageAdapter.setLogger(logger)
  
  console.log('Testing ChromeStorageAdapter with logger (logLevel: 0):')
  storageAdapter.logWithLevel(0, 'ERROR message - should be shown')   // level 0 - 表示される
  storageAdapter.logWithLevel(1, 'WARN message - should be hidden')   // level 1 - 表示されない
  storageAdapter.logWithLevel(2, 'INFO message - should be hidden')   // level 2 - 表示されない
  storageAdapter.logWithLevel(3, 'DEBUG message - should be hidden')  // level 3 - 表示されない
  
  // Step 5: 実際のストレージ操作テスト
  console.log('\n📋 Step 5: Actual storage operations with logLevel: 0')
  
  // appSettingsにlogLevel: 0を設定
  mockStorage.set('appSettings', {
    debugSettings: {
      enabled: true,
      logLevel: 0,
      showStatus: false,
      statusPosition: 'top-right'
    }
  })
  
  console.log('Performing storage operations (should only show errors):')
  try {
    await storageAdapter.get(['appSettings'])
    await storageAdapter.set({ testKey: 'testValue' })
  } catch (error) {
    console.error('Storage operation failed:', error)
  }
  
  console.log('\n✅ Test completed! Check console output above.')
  console.log('Expected: Only ERROR level messages (❌) should be visible.')
  console.log('WARN (⚠️), INFO (🔧), DEBUG (🐛) messages should be suppressed.')
}

// テスト実行
testLogLevelZeroSuppression().catch(console.error)