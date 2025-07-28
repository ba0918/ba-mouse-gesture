/**
 * デバッグ設定の保存・取得テスト
 */

const { ChromeStorageAdapter } = require('./src/infrastructure/adapters/ChromeStorageAdapter')
const { SettingsRepository } = require('./src/infrastructure/storage/repositories/SettingsRepository')
const { SettingsManagementUseCase } = require('./src/application/usecases/SettingsManagementUseCase')

// Mock chrome API with both local and sync storage
const mockStorage = new Map()

global.chrome = {
  storage: {
    local: {
      get: function (keys) {
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
      set: function (items) {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value)
        })
        return Promise.resolve()
      }
    },
    sync: {
      get: function (keys) {
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
      set: function (items) {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value)
        })
        return Promise.resolve()
      }
    }
  }
}

async function testDebugSettings() {
  console.log('=== デバッグ設定保存・取得テスト ===')
  
  // セットアップ
  const storageAdapter = new ChromeStorageAdapter()
  const settingsRepository = new SettingsRepository(storageAdapter)
  const useCase = new SettingsManagementUseCase(settingsRepository, null)
  
  try {
    console.log('\n1. 初期状態のデバッグ設定確認')
    const initialSettings = await useCase.getCurrentSettings()
    console.log('初期デバッグ設定:', JSON.stringify(initialSettings.debugSettings, null, 2))
    
    console.log('\n2. デバッグ設定を有効化')
    const debugConfig = {
      enabled: true,
      logLevel: 2,
      showStatus: true,
      statusPosition: 'top-right'
    }
    
    console.log('更新するデバッグ設定:', JSON.stringify(debugConfig, null, 2))
    await useCase.updateDebugSettings(debugConfig)
    
    console.log('\n3. 更新後の設定確認')
    const updatedSettings = await useCase.getCurrentSettings()
    console.log('更新後デバッグ設定:', JSON.stringify(updatedSettings.debugSettings, null, 2))
    
    console.log('\n4. 保存されたストレージデータを直接確認')
    const storageData = await storageAdapter.get(['appSettings'])
    console.log('ストレージの生データ:', JSON.stringify(storageData.appSettings?.debugSettings, null, 2))
    
    console.log('\n5. コンテンツスクリプトでの取得をシミュレート')
    const contentScriptData = await storageAdapter.get(['appSettings'])
    const debugSettings = contentScriptData.appSettings?.debugSettings || {
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
    
    console.log('コンテンツスクリプト側のデバッグ設定:', JSON.stringify(debugSettings, null, 2))
    console.log('shouldShowStatus()の結果:', debugSettings.shouldShowStatus())
    
    console.log('\n=== テスト完了 ===')
    
  } catch (error) {
    console.error('テスト中にエラーが発生:', error)
  }
}

// テスト実行
testDebugSettings().catch(console.error)