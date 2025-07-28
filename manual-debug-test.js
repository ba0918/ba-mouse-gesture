/**
 * 手動デバッグテスト
 * 実際にオプション画面でデバッグ設定を有効にした場合の動作をシミュレート
 */

const { ChromeStorageAdapter } = require('./src/infrastructure/adapters/ChromeStorageAdapter')
const { SettingsRepository } = require('./src/infrastructure/storage/repositories/SettingsRepository')
const { SettingsManagementUseCase } = require('./src/application/usecases/SettingsManagementUseCase')

// Mock chrome API with both local and sync storage
const mockStorage = new Map()

global.chrome = {
  storage: {
    local: {
      get: function(keys) {
        const result = {}
        if (typeof keys === 'string') {
          keys = [keys]
        }
        keys.forEach(key => {
          if (mockStorage.has(key)) {
            result[key] = mockStorage.get(key)
          }
        })
        return Promise.resolve(result)
      },
      set: function(items) {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value)
        })
        return Promise.resolve()
      }
    },
    sync: {
      get: function(keys) {
        const result = {}
        if (typeof keys === 'string') {
          keys = [keys]
        }
        keys.forEach(key => {
          if (mockStorage.has(key)) {
            result[key] = mockStorage.get(key)
          }
        })
        return Promise.resolve(result)
      },
      set: function(items) {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value)
        })
        return Promise.resolve()
      }
    }
  }
}

async function manualDebugTest() {
  console.log('=== 手動デバッグテスト ===')
  
  // セットアップ
  const storageAdapter = new ChromeStorageAdapter()
  const settingsRepository = new SettingsRepository(storageAdapter)
  const useCase = new SettingsManagementUseCase(settingsRepository, null)
  
  try {
    console.log('\n1. デバッグ設定を手動で有効化（オプション画面での操作をシミュレート）')
    
    // getCurrentDebugConfig() の実装を模倣
    const getCurrentDebugConfig = () => {
      return {
        enabled: true,      // チェックボックスをONにした状態
        logLevel: 2,        // デフォルト値
        showStatus: true,   // 画面表示をONにした状態
        statusPosition: 'top-right'  // デフォルト値
      }
    }
    
    const debugConfig = getCurrentDebugConfig()
    console.log('設定する値:', JSON.stringify(debugConfig, null, 2))
    
    await useCase.updateDebugSettings(debugConfig)
    console.log('✅ デバッグ設定を保存しました')
    
    console.log('\n2. 保存後の確認')
    const settings = await useCase.getCurrentSettings()
    console.log('保存されたデバッグ設定:', JSON.stringify(settings.debugSettings, null, 2))
    
    console.log('\n3. コンテンツスクリプトから見た設定（実際の動作をシミュレート）')
    const data = await storageAdapter.get(['appSettings'])
    console.log('ストレージから取得したrawデータ:', JSON.stringify(data, null, 2))
    
    const debugSettings = data.appSettings?.debugSettings || {
      enabled: false,
      logLevel: 2,
      showStatus: false,
      statusPosition: 'top-right'
    }
    
    // shouldShowStatus メソッドを追加
    debugSettings.shouldShowStatus = function () {
      const result = this.enabled && this.showStatus
      console.log('shouldShowStatus calculation:', {
        enabled: this.enabled,
        showStatus: this.showStatus,
        result: result
      })
      return result
    }
    
    console.log('コンテンツスクリプト側のデバッグ設定:', JSON.stringify({
      enabled: debugSettings.enabled,
      showStatus: debugSettings.showStatus,
      logLevel: debugSettings.logLevel,
      statusPosition: debugSettings.statusPosition
    }, null, 2))
    
    console.log('画面表示が有効か:', debugSettings.shouldShowStatus())
    
    console.log('\n4. 実際のshowDebugStatus処理をシミュレート')
    if (debugSettings.shouldShowStatus()) {
      console.log('🎉 画面にデバッグ情報が表示されます')
    } else {
      console.log('❌ 画面にデバッグ情報は表示されません')
      console.log('原因:')
      console.log('  - enabled:', debugSettings.enabled)
      console.log('  - showStatus:', debugSettings.showStatus)
    }
    
    console.log('\n=== テスト完了 ===')
    
  } catch (error) {
    console.error('テスト中にエラーが発生:', error)
  }
}

// テスト実行
manualDebugTest().catch(console.error)