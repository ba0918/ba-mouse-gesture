/**
 * カスタムジェスチャーの追加→削除→追加問題のデバッグテスト
 * 学習機能削除後のテスト
 */

const { ChromeStorageAdapter } = require('./src/infrastructure/adapters/ChromeStorageAdapter')
const { GestureRepository } = require('./src/infrastructure/storage/repositories/GestureRepository')
const { CustomGestureManagementUseCase } = require('./src/application/usecases/CustomGestureManagementUseCase')
const { SettingsRepository } = require('./src/infrastructure/storage/repositories/SettingsRepository')

// ドメインエンティティの読み込み
const { CustomGesture } = require('./src/domain/entities/CustomGesture')
const { GesturePattern } = require('./src/domain/valueObjects/GesturePattern')
const { Point } = require('./src/domain/valueObjects/Point')
const { PatternMatcher } = require('./src/domain/services/PatternMatcher')

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

async function testAddDeleteAddScenario() {
  console.log('=== カスタムジェスチャー追加→削除→追加テスト ===')
  
  // セットアップ
  const storageAdapter = new ChromeStorageAdapter()
  const gestureRepository = new GestureRepository(storageAdapter)
  const settingsRepository = new SettingsRepository(storageAdapter)
  const useCase = new CustomGestureManagementUseCase(gestureRepository, settingsRepository)
  
  // テスト用のポイントデータ
  const testPoints = [
    { x: 100, y: 100, timestamp: Date.now() },
    { x: 150, y: 100, timestamp: Date.now() + 100 },
    { x: 200, y: 100, timestamp: Date.now() + 200 }
  ]
  
  try {
    console.log('\n1. 初期状態確認')
    const initialGestures = await useCase.getAllCustomGestures()
    console.log('初期ジェスチャー数:', initialGestures.length)
    
    console.log('\n2. 第1回目の追加')
    const gesture1 = await useCase.createCustomGesture('テストジェスチャー', testPoints, 'back')
    console.log('追加されたジェスチャー:', { id: gesture1.id, name: gesture1.name })
    
    const afterAdd1 = await useCase.getAllCustomGestures()
    console.log('追加後のジェスチャー数:', afterAdd1.length)
    
    console.log('\n3. 削除')
    await useCase.deleteCustomGesture(gesture1.id)
    console.log('ジェスチャーを削除:', gesture1.id)
    
    const afterDelete = await useCase.getAllCustomGestures()
    console.log('削除後のジェスチャー数:', afterDelete.length)
    
    console.log('\n4. 第2回目の追加（同じ名前）')
    try {
      const gesture2 = await useCase.createCustomGesture('テストジェスチャー', testPoints, 'forward')
      console.log('2回目追加成功:', { id: gesture2.id, name: gesture2.name })
      
      const afterAdd2 = await useCase.getAllCustomGestures()
      console.log('2回目追加後のジェスチャー数:', afterAdd2.length)
      
    } catch (error) {
      console.error('❌ 2回目追加エラー:', error.message)
      
      // エラー後の状態確認
      const finalState = await useCase.getAllCustomGestures()
      console.log('エラー後のジェスチャー一覧:', finalState.map(g => ({ id: g.id, name: g.name })))
    }
    
    console.log('\n=== テスト完了 ===')
    
  } catch (error) {
    console.error('テスト中にエラーが発生:', error)
  }
}

// テスト実行
testAddDeleteAddScenario().catch(console.error)