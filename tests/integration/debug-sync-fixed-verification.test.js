/**
 * デバッグ有効化問題の修正検証テスト
 * ✅ これらのテストはPASSするはず（修正が成功）
 * 
 * 修正内容の検証：
 * 1. 統一されたストレージアクセス（sync storageのみ）
 * 2. popup-content script間の完全同期
 * 3. 状態保持の確実性
 */

require('jest-environment-jsdom')

describe('デバッグ有効化問題の修正検証テスト', () => {
  let consoleLogSpy
  let mockChrome
  let syncStorageData

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    
    // テスト環境での window オブジェクト設定
    global.window = global
    
    // ストレージデータの初期化（sync storageのみ）
    syncStorageData = {}

    // Chrome APIのモック（統一されたsync storage）
    mockChrome = {
      storage: {
        sync: {
          get: jest.fn().mockImplementation((keys, callback) => {
            const result = {}
            if (Array.isArray(keys)) {
              keys.forEach(key => {
                result[key] = syncStorageData[key]
              })
            } else if (keys) {
              Object.keys(keys).forEach(key => {
                result[key] = syncStorageData[key] || keys[key]
              })
            }
            if (callback) callback(result)
            return Promise.resolve(result)
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            Object.assign(syncStorageData, data)
            console.log('🔧 Mock sync.set called:', data)
            if (callback) callback()
            // storage変更イベントを発火
            if (mockChrome.storage.onChanged.listeners) {
              mockChrome.storage.onChanged.listeners.forEach(listener => {
                const changes = {}
                Object.keys(data).forEach(key => {
                  changes[key] = { newValue: data[key] }
                })
                listener(changes, 'sync')
              })
            }
            return Promise.resolve()
          })
        },
        local: {
          get: jest.fn().mockImplementation((keys, callback) => {
            // 修正：local storageは使用しない（空の結果を返す）
            const result = {}
            if (callback) callback(result)
            return Promise.resolve(result)
          }),
          set: jest.fn().mockImplementation((data, callback) => {
            // 修正：local storageは使用しない（何も保存しない）
            console.log('⚠️ Local storage access detected (should not happen):', data)
            if (callback) callback()
            return Promise.resolve()
          })
        },
        onChanged: {
          listeners: [],
          addListener: jest.fn().mockImplementation((listener) => {
            mockChrome.storage.onChanged.listeners.push(listener)
          }),
          removeListener: jest.fn()
        }
      },
      runtime: {
        lastError: null,
        sendMessage: jest.fn()
      }
    }
    global.chrome = mockChrome

    // HTML構造設定
    document.body.innerHTML = `
      <div id="debugEnabled-container">
        <input type="checkbox" id="debugEnabled">
      </div>
      <div id="debugOptions" style="display: none;">
        <select id="debugLogLevel">
          <option value="2" selected>情報以上</option>
        </select>
        <input type="checkbox" id="debugShowStatus">
      </div>
    `
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    delete global.chrome
    delete global.window
  })

  // ✅ FIXED: 統一されたストレージアクセスによる同期実現
  test('FIXED: popup-content script間で統一されたストレージアクセス', async () => {
    // クリーンアーキテクチャの新しい実装を使用
    const DebugSettingsUseCase = require('../../src/application/usecases/DebugSettingsUseCase')
    
    // popup側での操作（統一されたUseCaseを使用）
    const popupUseCase = new DebugSettingsUseCase()
    
    // 設定を変更
    const updatedSettings = await popupUseCase.updateMultipleSettings({
      enabled: true,
      showStatus: true,
      logLevel: 3
    })
    
    // ✅ 修正確認：sync storageのみに保存
    expect(mockChrome.storage.sync.set).toHaveBeenCalled()
    
    // 実際に保存されたデータを確認
    expect(syncStorageData.debugSettings).toEqual(expect.objectContaining({
      enabled: true,
      showStatus: true,
      logLevel: 3,
      statusPosition: 'top-right'
    }))
    
    // ✅ 修正確認：local storageは使用されない
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled()
    
    // content script側での操作（同じUseCaseを使用）
    const contentScriptUseCase = new DebugSettingsUseCase()
    const contentScriptSettings = await contentScriptUseCase.getDebugSettings()
    
    // ✅ 修正確認：両者で完全に同じ設定を持つ
    expect(contentScriptSettings.enabled).toBe(updatedSettings.enabled)
    expect(contentScriptSettings.showStatus).toBe(updatedSettings.showStatus)
    expect(contentScriptSettings.logLevel).toBe(updatedSettings.logLevel)
    
    // ✅ 修正確認：同期状態の検証
    const syncConsistency = updatedSettings.validateSyncConsistency(contentScriptSettings)
    expect(syncConsistency.isConsistent).toBe(true)
    expect(syncConsistency.syncStatus).toBe('SYNCED')
  })

  // ✅ FIXED: 状態保持の完全実現
  test('FIXED: popup再起動時にデバッグ設定が確実に保持される', async () => {
    // 1. 初回popup起動でデバッグを有効化
    const DebugSettingsUseCase1 = require('../../src/application/usecases/DebugSettingsUseCase')
    const useCase1 = new DebugSettingsUseCase1()
    
    await useCase1.updateMultipleSettings({
      enabled: true,
      showStatus: true,
      logLevel: 2
    })
    
    // sync storageに保存される
    expect(syncStorageData.debugSettings.enabled).toBe(true)
    expect(syncStorageData.debugSettings.showStatus).toBe(true)
    
    // 2. popup再起動（新しいUseCaseインスタンス）
    delete require.cache[require.resolve('../../src/application/usecases/DebugSettingsUseCase')]
    const DebugSettingsUseCase2 = require('../../src/application/usecases/DebugSettingsUseCase')
    const useCase2 = new DebugSettingsUseCase2()
    
    const reloadedSettings = await useCase2.getDebugSettings()
    
    // ✅ 修正確認：前回の設定が完全に保持されている
    expect(reloadedSettings.enabled).toBe(true)
    expect(reloadedSettings.showStatus).toBe(true)
    expect(reloadedSettings.logLevel).toBe(2)
    
    // ✅ 修正確認：UI状態も正しく反映される
    const debugCheckbox = document.getElementById('debugEnabled')
    // NOTE: UIの更新は実際のpopup実装で行われる
    // ここではデータ層の整合性を確認
    expect(reloadedSettings.enabled).toBe(true)
  })

  // ✅ FIXED: リアルタイム同期の実現
  test('FIXED: popup-content script間でリアルタイム同期が動作', async () => {
    const DebugSettingsUseCase = require('../../src/application/usecases/DebugSettingsUseCase')
    
    // popup側とcontent script側のUseCaseを作成
    const popupUseCase = new DebugSettingsUseCase()
    const contentUseCase = new DebugSettingsUseCase()
    
    // content script側で変更監視を開始
    let syncedSettings = null
    contentUseCase.startSyncListener((newSettings) => {
      syncedSettings = newSettings
    })
    
    // popup側で設定を変更
    await popupUseCase.updateMultipleSettings({
      enabled: true,
      logLevel: 1
    })
    
    // 短い待機時間で同期を確認
    await new Promise(resolve => setTimeout(resolve, 50))
    
    // ✅ 修正確認：content script側でリアルタイム同期を受信
    expect(syncedSettings).not.toBeNull()
    expect(syncedSettings.enabled).toBe(true)
    expect(syncedSettings.logLevel).toBe(1)
    
    // ✅ 修正確認：同期状態の確認
    const popupSettings = await popupUseCase.getDebugSettings()
    const contentSettings = await contentUseCase.getDebugSettings()
    
    expect(popupSettings.equals(contentSettings)).toBe(true)
  })

  // ✅ FIXED: 旧形式データの自動移行
  test('FIXED: 旧形式local storageデータの検出と移行', async () => {
    // 旧形式のlocal storageデータをモック
    const mockLegacyData = {
      enabled: false,
      logLevel: 1,
      showStatus: false
    }
    
    // local storageのモックを一時的に変更
    mockChrome.storage.local.get = jest.fn().mockImplementation((keys, callback) => {
      const result = { debugSettings: mockLegacyData }
      if (callback) callback(result)
      return Promise.resolve(result)
    })
    
    const DebugSettingsUseCase = require('../../src/application/usecases/DebugSettingsUseCase')
    const useCase = new DebugSettingsUseCase()
    
    // 移行処理を実行
    const migrationResult = await useCase.checkAndMigrateLegacyData()
    
    // ✅ 修正確認：旧データが検出される
    expect(migrationResult.hadLegacyData).toBe(true)
    
    // ✅ 修正確認：統一されたストレージから正常に読み込める
    const currentSettings = await useCase.getDebugSettings()
    expect(currentSettings).toBeDefined()
    expect(typeof currentSettings.enabled).toBe('boolean')
  })

  // ✅ INTEGRATION: 全体的な同期システムの正常動作
  test('INTEGRATION: デバッグ機能全体が統一され正常動作', async () => {
    const DebugSettingsUseCase = require('../../src/application/usecases/DebugSettingsUseCase')
    
    // 複数のUseCaseインスタンス（popup, content script, backgroundを想定）
    const popupUseCase = new DebugSettingsUseCase()
    const contentUseCase = new DebugSettingsUseCase()
    const backgroundUseCase = new DebugSettingsUseCase()
    
    // 複数回の設定変更を実行
    const changeHistory = []
    
    for (let i = 0; i < 3; i++) {
      const isEnabled = i % 2 === 0
      
      await popupUseCase.updateMultipleSettings({
        enabled: isEnabled,
        logLevel: i + 1,
        showStatus: isEnabled
      })
      
      // 全てのUseCaseで設定を取得
      const popupSettings = await popupUseCase.getDebugSettings()
      const contentSettings = await contentUseCase.getDebugSettings()
      const backgroundSettings = await backgroundUseCase.getDebugSettings()
      
      changeHistory.push({
        iteration: i,
        popup: popupSettings.toStorageFormat(),
        content: contentSettings.toStorageFormat(),
        background: backgroundSettings.toStorageFormat()
      })
      
      // ✅ 修正確認：全てのUseCaseで同じ設定を持つ
      expect(popupSettings.equals(contentSettings)).toBe(true)
      expect(contentSettings.equals(backgroundSettings)).toBe(true)
      
      await new Promise(resolve => setTimeout(resolve, 20))
    }
    
    // ✅ 修正確認：最終状態で全体の整合性が保たれている
    const finalPopup = await popupUseCase.getDebugSettings()
    const finalContent = await contentUseCase.getDebugSettings()
    const finalBackground = await backgroundUseCase.getDebugSettings()
    
    // 全て同じ設定を持っている
    expect(finalPopup.equals(finalContent)).toBe(true)
    expect(finalContent.equals(finalBackground)).toBe(true)
    
    // sync storageのみが使用されている
    expect(mockChrome.storage.sync.set).toHaveBeenCalled()
    expect(mockChrome.storage.local.set).not.toHaveBeenCalled()
    
    // システム全体で一貫性が保たれている状態
    const isSystemConsistent = 
      finalPopup.enabled === finalContent.enabled &&
      finalContent.enabled === finalBackground.enabled &&
      finalPopup.logLevel === finalContent.logLevel &&
      finalContent.logLevel === finalBackground.logLevel
    
    expect(isSystemConsistent).toBe(true) // ✅ システム全体で一貫性保持
    
    console.log('✅ Final consistent state:', {
      popup: finalPopup.toStorageFormat(),
      content: finalContent.toStorageFormat(),
      background: finalBackground.toStorageFormat(),
      changeHistory
    })
  })
})