/**
 * ChromeStorage インフラストラクチャ単体テスト
 */

const { ChromeStorage } = require('../../../src/infrastructure/storage/ChromeStorage')

// Chrome API のモック
const mockChromeStorage = {
  sync: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    getBytesInUse: jest.fn()
  },
  local: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    getBytesInUse: jest.fn()
  },
  onChanged: {
    addListener: jest.fn(),
    removeListener: jest.fn()
  }
}

// グローバルなchrome API モック
global.chrome = {
  storage: mockChromeStorage,
  runtime: {
    lastError: null
  }
}

describe('ChromeStorage Infrastructure', () => {
  let storage

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks()
    global.chrome.runtime.lastError = null
    
    storage = new ChromeStorage()
  })

  describe('Constructor', () => {
    test('should create with default options', () => {
      expect(storage.defaultArea).toBe('sync')
      expect(storage.retryAttempts).toBe(3)
      expect(storage.retryDelay).toBe(1000)
    })

    test('should create with custom options', () => {
      const customStorage = new ChromeStorage({
        defaultArea: 'local',
        retryAttempts: 5,
        retryDelay: 2000
      })
      
      expect(customStorage.defaultArea).toBe('local')
      expect(customStorage.retryAttempts).toBe(5)
      expect(customStorage.retryDelay).toBe(2000)
    })
  })

  describe('Get operations', () => {
    test('should get data from sync storage', async () => {
      const testData = { key1: 'value1', key2: 'value2' }
      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        callback(testData)
      })

      const result = await storage.get(['key1', 'key2'])
      
      expect(mockChromeStorage.sync.get).toHaveBeenCalledWith(['key1', 'key2'])
      expect(result).toEqual(testData)
    })

    test('should get data from local storage', async () => {
      const testData = { localKey: 'localValue' }
      mockChromeStorage.local.get.mockImplementation((keys, callback) => {
        callback(testData)
      })

      const result = await storage.get('localKey', 'local')
      
      expect(mockChromeStorage.local.get).toHaveBeenCalledWith('localKey')
      expect(result).toEqual(testData)
    })

    test('should handle chrome runtime errors', async () => {
      global.chrome.runtime.lastError = { message: 'Storage error' }
      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        callback({})
      })

      await expect(storage.get('testKey')).rejects.toThrow('Storage error')
    })

    test('should retry on failure', async () => {
      let attempts = 0
      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        attempts++
        if (attempts < 2) {
          global.chrome.runtime.lastError = { message: 'Temporary error' }
        } else {
          global.chrome.runtime.lastError = null
        }
        callback({ testKey: 'testValue' })
      })

      const result = await storage.get('testKey')
      
      expect(attempts).toBe(2)
      expect(result).toEqual({ testKey: 'testValue' })
    })
  })

  describe('Set operations', () => {
    test('should set data to sync storage', async () => {
      const testData = { key1: 'value1', key2: 'value2' }
      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        callback()
      })

      await storage.set(testData)
      
      expect(mockChromeStorage.sync.set).toHaveBeenCalledWith(testData)
    })

    test('should set data to local storage', async () => {
      const testData = { localKey: 'localValue' }
      mockChromeStorage.local.set.mockImplementation((data, callback) => {
        callback()
      })

      await storage.set(testData, 'local')
      
      expect(mockChromeStorage.local.set).toHaveBeenCalledWith(testData)
    })

    test('should validate data size', async () => {
      const largeData = { 
        key: 'x'.repeat(10000) // 10KB のデータ
      }

      await expect(storage.set(largeData)).rejects.toThrow('Data size')
    })

    test('should reject invalid data', async () => {
      await expect(storage.set(null)).rejects.toThrow('Items must be an object')
      await expect(storage.set('string')).rejects.toThrow('Items must be an object')
    })
  })

  describe('Remove operations', () => {
    test('should remove single key', async () => {
      mockChromeStorage.sync.remove.mockImplementation((keys, callback) => {
        callback()
      })

      await storage.remove('testKey')
      
      expect(mockChromeStorage.sync.remove).toHaveBeenCalledWith('testKey')
    })

    test('should remove multiple keys', async () => {
      mockChromeStorage.sync.remove.mockImplementation((keys, callback) => {
        callback()
      })

      await storage.remove(['key1', 'key2'])
      
      expect(mockChromeStorage.sync.remove).toHaveBeenCalledWith(['key1', 'key2'])
    })
  })

  describe('Clear operations', () => {
    test('should clear sync storage', async () => {
      mockChromeStorage.sync.clear.mockImplementation((callback) => {
        callback()
      })

      await storage.clear()
      
      expect(mockChromeStorage.sync.clear).toHaveBeenCalled()
    })

    test('should clear local storage', async () => {
      mockChromeStorage.local.clear.mockImplementation((callback) => {
        callback()
      })

      await storage.clear('local')
      
      expect(mockChromeStorage.local.clear).toHaveBeenCalled()
    })
  })

  describe('Storage monitoring', () => {
    test('should listen to storage changes', () => {
      const callback = jest.fn()
      const removeListener = storage.onChanged(callback)

      expect(mockChromeStorage.onChanged.addListener).toHaveBeenCalled()
      expect(typeof removeListener).toBe('function')

      // リスナー削除の確認
      removeListener()
      expect(mockChromeStorage.onChanged.removeListener).toHaveBeenCalled()
    })

    test('should filter changes by area', () => {
      const callback = jest.fn()
      storage.onChanged(callback, 'sync')

      // モックのコールバックを直接呼び出して動作確認
      const addedCallback = mockChromeStorage.onChanged.addListener.mock.calls[0][0]
      
      // sync の変更 - コールバックが呼ばれる
      addedCallback({ key: { newValue: 'test' } }, 'sync')
      expect(callback).toHaveBeenCalledWith({ key: { newValue: 'test' } }, 'sync')
      
      // local の変更 - コールバックが呼ばれない
      callback.mockClear()
      addedCallback({ key: { newValue: 'test' } }, 'local')
      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('Advanced operations', () => {
    test('should update data with merge', async () => {
      const existingData = { 
        settings: { theme: 'dark', lang: 'en' },
        version: '1.0.0' 
      }
      const updates = { 
        settings: { theme: 'light' },
        lastModified: '2023-01-01' 
      }

      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        callback(existingData)
      })
      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        callback()
      })

      const result = await storage.update(updates)
      
      expect(result.settings).toEqual({ theme: 'light', lang: 'en' })
      expect(result.lastModified).toBe('2023-01-01')
      expect(result.version).toBe('1.0.0')
    })

    test('should get safe with default value', async () => {
      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        callback({}) // 空のレスポンス
      })

      const result = await storage.getSafe('nonexistentKey', 'defaultValue')
      
      expect(result).toBe('defaultValue')
    })

    test('should return default on error in getSafe', async () => {
      global.chrome.runtime.lastError = { message: 'Storage error' }
      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        callback({})
      })

      const result = await storage.getSafe('testKey', 'defaultValue')
      
      expect(result).toBe('defaultValue')
    })
  })

  describe('Storage statistics', () => {
    test('should get usage stats', async () => {
      mockChromeStorage.sync.getBytesInUse.mockImplementation((keys, callback) => {
        callback(1024)
      })
      mockChromeStorage.local.getBytesInUse.mockImplementation((keys, callback) => {
        callback(2048)
      })

      // Chrome storage quota をモック
      mockChromeStorage.sync.QUOTA_BYTES = 102400
      mockChromeStorage.local.QUOTA_BYTES = 5242880

      const stats = await storage.getUsageStats()
      
      expect(stats.sync.bytesInUse).toBe(1024)
      expect(stats.sync.quota).toBe(102400)
      expect(stats.sync.percentUsed).toBe(1)
      
      expect(stats.local.bytesInUse).toBe(2048)
      expect(stats.local.quota).toBe(5242880)
    })
  })

  describe('Health check', () => {
    test('should pass health check when API is working', async () => {
      mockChromeStorage.sync.set.mockImplementation((data, callback) => {
        callback()
      })
      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        const testData = { test_key: 'test_value' }
        const key = Object.keys(testData)[0]
        callback({ [key]: testData[key] })
      })
      mockChromeStorage.sync.remove.mockImplementation((keys, callback) => {
        callback()
      })

      // 同様に local storage もモック
      mockChromeStorage.local.set.mockImplementation((data, callback) => {
        callback()
      })
      mockChromeStorage.local.get.mockImplementation((keys, callback) => {
        const testData = { test_key: 'test_value' }
        const key = Object.keys(testData)[0]
        callback({ [key]: testData[key] })
      })
      mockChromeStorage.local.remove.mockImplementation((keys, callback) => {
        callback()
      })

      const health = await storage.healthCheck()
      
      expect(health.apiAvailable).toBe(true)
      expect(health.syncWorking).toBe(true)
      expect(health.localWorking).toBe(true)
      expect(health.errors).toHaveLength(0)
    })

    test('should fail health check when API is not available', async () => {
      const originalChrome = global.chrome
      global.chrome = undefined

      const health = await storage.healthCheck()
      
      expect(health.apiAvailable).toBe(false)
      expect(health.errors.length).toBeGreaterThan(0)

      global.chrome = originalChrome
    })
  })

  describe('Error handling', () => {
    test('should handle extension context invalidated error', async () => {
      global.chrome.runtime.lastError = { 
        message: 'Extension context invalidated' 
      }
      mockChromeStorage.sync.get.mockImplementation((keys, callback) => {
        callback({})
      })

      await expect(storage.get('testKey')).rejects.toThrow('Extension context invalidated')
    })

    test('should validate storage area', () => {
      expect(() => storage.getStorageArea('invalid')).toThrow('Invalid storage area: invalid')
    })

    test('should calculate data size correctly', () => {
      const testData = { key: 'value', number: 123 }
      const size = storage.calculateDataSize(testData)
      
      expect(size).toBeGreaterThan(0)
      expect(typeof size).toBe('number')
    })
  })
})