/**
 * GestureRepository
 * ジェスチャーデータ（カスタムジェスチャー・学習データ）の永続化を担当するリポジトリ
 */
class GestureRepository {
  /**
   * @param {ChromeStorage} storage - ストレージインターフェース
   */
  constructor(storage) {
    this.storage = storage
    this.customGesturesKey = 'customGestures'
    this.learningDataKey = 'gestureLearningData'
    this.cache = new Map()
    this.cacheTimeout = 3000 // 3秒でキャッシュ無効化
  }

  /**
   * カスタムジェスチャーを全て取得
   * @returns {Promise<CustomGesture[]>}
   */
  async getCustomGestures() {
    // キャッシュチェック
    const cachedData = this.cache.get(this.customGesturesKey)
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return cachedData.data
    }

    try {
      const result = await this.storage.get(this.customGesturesKey)
      const gesturesData = result[this.customGesturesKey] || []

      const gestures = gesturesData.map(data => this.deserializeCustomGesture(data))

      // キャッシュに保存
      this.cache.set(this.customGesturesKey, {
        data: gestures,
        timestamp: Date.now()
      })

      return gestures
    } catch (error) {
      console.error('Failed to load custom gestures:', error)
      return []
    }
  }

  /**
   * カスタムジェスチャーを保存
   * @param {CustomGesture[]} gestures - カスタムジェスチャー配列
   * @returns {Promise<void>}
   */
  async saveCustomGestures(gestures) {
    try {
      // バリデーション
      if (!Array.isArray(gestures)) {
        throw new Error('Gestures must be an array')
      }

      for (const gesture of gestures) {
        // バリデーション実行
        
        if (!gesture) {
          console.error('❌ Gesture is null/undefined')
          throw new Error('Invalid gesture: gesture is null/undefined')
        }
        
        if (typeof gesture.isValid !== 'function') {
          console.error('❌ Gesture does not have isValid method:', typeof gesture.isValid)
          throw new Error(`Invalid gesture: ${gesture?.id || 'unknown'} - no isValid method`)
        }
        
        const isValidResult = gesture.isValid()
        
        if (!isValidResult) {
          console.error('❌ Gesture.isValid() returned false for:', gesture?.id)
          throw new Error(`Invalid gesture: ${gesture?.id || 'unknown'} - isValid() returned false`)
        }
      }

      const serializedData = gestures.map(gesture => this.serializeCustomGesture(gesture))
      await this.storage.set({ [this.customGesturesKey]: serializedData })

      // キャッシュ更新
      this.cache.set(this.customGesturesKey, {
        data: gestures,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('Failed to save custom gestures:', error)
      throw new GestureRepositoryError('Failed to save custom gestures', error)
    }
  }

  /**
   * カスタムジェスチャーを追加
   * @param {CustomGesture} gesture - 追加するジェスチャー
   * @returns {Promise<CustomGesture[]>}
   */
  async addCustomGesture(gesture) {
    
    const gestures = await this.getCustomGestures()

    // 重複チェック
    const existingGesture = gestures.find(g => g.id === gesture.id || g.name === gesture.name)
    
    if (existingGesture) {
      const errorMessage = `Gesture with id '${gesture.id}' or name '${gesture.name}' already exists`
      console.error('🔧 [Debug] Duplicate gesture error:', errorMessage)
      throw new Error(errorMessage)
    }

    gestures.push(gesture)
    
    await this.saveCustomGestures(gestures)
    
    return gestures
  }

  /**
   * カスタムジェスチャーを更新
   * @param {string} gestureId - ジェスチャーID
   * @param {Object} updates - 更新データ
   * @returns {Promise<CustomGesture>}
   */
  async updateCustomGesture(gestureId, updates) {
    const gestures = await this.getCustomGestures()
    const gestureIndex = gestures.findIndex(g => g.id === gestureId)

    if (gestureIndex === -1) {
      throw new Error(`Gesture with id '${gestureId}' not found`)
    }

    const gesture = gestures[gestureIndex]

    // 更新の適用
    Object.keys(updates).forEach(key => {
      if (key in gesture && key !== 'id') { // IDは変更不可
        gesture[key] = updates[key]
      }
    })

    await this.saveCustomGestures(gestures)
    return gesture
  }

  /**
   * カスタムジェスチャーを削除
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<CustomGesture[]>}
   */
  async deleteCustomGesture(gestureId) {
    
    const gestures = await this.getCustomGestures()
    
    const filteredGestures = gestures.filter(g => g.id !== gestureId)

    if (filteredGestures.length === gestures.length) {
      const errorMessage = `Gesture with id '${gestureId}' not found`
      console.error('🔧 [Debug] Delete failed - gesture not found:', errorMessage)
      throw new Error(errorMessage)
    }

    await this.saveCustomGestures(filteredGestures)
    
    return filteredGestures
  }

  /**
   * カスタムジェスチャーの有効/無効を切り替え
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<CustomGesture>}
   */
  async toggleCustomGesture(gestureId, enabled) {
    await this.updateCustomGesture(gestureId, { enabled })
  }

  /**
   * ジェスチャー使用統計を記録
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} success - 実行成功
   * @returns {Promise<void>}
   */
  async recordGestureUsage(gestureId, success) {
    const gestures = await this.getCustomGestures()
    const gesture = gestures.find(g => g.id === gestureId)

    if (gesture) {
      gesture.recordUsage(success)
      await this.saveCustomGestures(gestures)
    }
  }

  /**
   * 学習データを取得
   * @returns {Promise<Object>}
   */
  async getLearningData() {
    // キャッシュチェック
    const cachedData = this.cache.get(this.learningDataKey)
    if (cachedData && Date.now() - cachedData.timestamp < this.cacheTimeout) {
      return cachedData.data
    }

    try {
      const result = await this.storage.get(this.learningDataKey)
      const learningData = result[this.learningDataKey] || {}

      // キャッシュに保存
      this.cache.set(this.learningDataKey, {
        data: learningData,
        timestamp: Date.now()
      })

      return learningData
    } catch (error) {
      console.error('Failed to load learning data:', error)
      return {}
    }
  }

  /**
   * 学習データを保存
   * @param {Object} learningData - 学習データ
   * @returns {Promise<void>}
   */
  async saveLearningData(learningData) {
    try {
      if (!learningData || typeof learningData !== 'object') {
        throw new Error('Learning data must be an object')
      }

      await this.storage.set({ [this.learningDataKey]: learningData })

      // キャッシュ更新
      this.cache.set(this.learningDataKey, {
        data: learningData,
        timestamp: Date.now()
      })

    } catch (error) {
      console.error('Failed to save learning data:', error)
      throw new GestureRepositoryError('Failed to save learning data', error)
    }
  }

  /**
   * 学習データをリセット
   * @param {string} gestureId - 特定ジェスチャーのリセット（省略時は全体）
   * @returns {Promise<void>}
   */
  async resetLearningData(gestureId = null) {
    if (gestureId) {
      const learningData = await this.getLearningData()
      delete learningData[gestureId]
      await this.saveLearningData(learningData)
    } else {
      await this.saveLearningData({})
    }
  }

  /**
   * ジェスチャーパフォーマンス統計を取得
   * @returns {Promise<Object>}
   */
  async getPerformanceStats() {
    const customGestures = await this.getCustomGestures()
    const learningData = await this.getLearningData()

    const stats = {
      totalCustomGestures: customGestures.length,
      enabledGestures: customGestures.filter(g => g.enabled).length,
      totalUsage: 0,
      averageSuccessRate: 0,
      topPerformers: [],
      learningDataSize: Object.keys(learningData).length
    }

    // 使用統計の計算
    const usageStats = customGestures.map(gesture => ({
      id: gesture.id,
      name: gesture.name,
      totalUsage: gesture.usage.totalCount,
      successRate: gesture.getSuccessRate(),
      enabled: gesture.enabled
    }))

    stats.totalUsage = usageStats.reduce((sum, stat) => sum + stat.totalUsage, 0)

    const enabledStats = usageStats.filter(stat => stat.enabled && stat.totalUsage > 0)
    if (enabledStats.length > 0) {
      stats.averageSuccessRate = enabledStats.reduce((sum, stat) =>
        sum + stat.successRate, 0) / enabledStats.length
    }

    // トップパフォーマーの特定
    stats.topPerformers = usageStats
      .filter(stat => stat.totalUsage >= 5) // 十分な使用回数がある
      .sort((a, b) => (b.successRate * b.totalUsage) - (a.successRate * a.totalUsage))
      .slice(0, 5)

    return stats
  }

  /**
   * データ容量の最適化
   * @returns {Promise<Object>}
   */
  async optimizeStorage() {
    const result = {
      beforeSize: 0,
      afterSize: 0,
      optimizations: []
    }

    try {
      // 現在のサイズを測定
      result.beforeSize = await this.storage.getBytesInUse([
        this.customGesturesKey,
        this.learningDataKey
      ])

      // カスタムジェスチャーの最適化
      const gestures = await this.getCustomGestures()
      const optimizedGestures = gestures.filter(gesture => {
        // 使用されていないジェスチャーを除去（長期間未使用）
        if (!gesture.enabled && gesture.usage.totalCount === 0) {
          result.optimizations.push(`Removed unused gesture: ${gesture.name}`)
          return false
        }
        return true
      })

      if (optimizedGestures.length !== gestures.length) {
        await this.saveCustomGestures(optimizedGestures)
      }

      // 学習データの最適化
      const learningData = await this.getLearningData()
      const optimizedLearningData = {}

      Object.keys(learningData).forEach(gestureId => {
        const data = learningData[gestureId]
        // 古いデータの除去（30日以上前）
        if (data.lastUpdated) {
          const daysSinceUpdate = (Date.now() - new Date(data.lastUpdated).getTime()) / (1000 * 60 * 60 * 24)
          if (daysSinceUpdate <= 30) {
            optimizedLearningData[gestureId] = data
          } else {
            result.optimizations.push(`Removed old learning data: ${gestureId}`)
          }
        } else {
          optimizedLearningData[gestureId] = data
        }
      })

      if (Object.keys(optimizedLearningData).length !== Object.keys(learningData).length) {
        await this.saveLearningData(optimizedLearningData)
      }

      // 最適化後のサイズを測定
      result.afterSize = await this.storage.getBytesInUse([
        this.customGesturesKey,
        this.learningDataKey
      ])

    } catch (error) {
      result.error = error.message
    }

    return result
  }

  /**
   * データのバックアップを作成
   * @returns {Promise<Object>}
   */
  async createBackup() {
    const customGestures = await this.getCustomGestures()
    const learningData = await this.getLearningData()

    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      customGestures: customGestures.map(g => this.serializeCustomGesture(g)),
      learningData: learningData
    }
  }

  /**
   * バックアップからデータを復元
   * @param {Object} backup - バックアップデータ
   * @returns {Promise<void>}
   */
  async restoreFromBackup(backup) {
    if (!backup.customGestures && !backup.learningData) {
      throw new Error('Invalid backup data')
    }

    if (backup.customGestures) {
      const gestures = backup.customGestures.map(data =>
        this.deserializeCustomGesture(data))
      await this.saveCustomGestures(gestures)
    }

    if (backup.learningData) {
      await this.saveLearningData(backup.learningData)
    }
  }

  /**
   * ジェスチャー変更を監視
   * @param {Function} callback - 変更時コールバック
   * @returns {Function} リスナー削除関数
   */
  onGesturesChanged(callback) {
    return this.storage.onChanged((changes, namespace) => {
      if (namespace === 'sync') {
        let changed = false

        if (changes[this.customGesturesKey]) {
          this.cache.delete(this.customGesturesKey)
          changed = true
        }

        if (changes[this.learningDataKey]) {
          this.cache.delete(this.learningDataKey)
          changed = true
        }

        if (changed) {
          callback(changes)
        }
      }
    }, 'sync')
  }

  /**
   * カスタムジェスチャーをシリアライズ
   * @param {CustomGesture} gesture
   * @returns {Object}
   */
  serializeCustomGesture(gesture) {
    return gesture.toJSON()
  }

  /**
   * カスタムジェスチャーをデシリアライズ
   * @param {Object} data
   * @returns {CustomGesture}
   */
  deserializeCustomGesture(data) {
    const { CustomGesture } = require('../../../domain/entities/CustomGesture')
    return CustomGesture.fromJSON(data)
  }

  /**
   * キャッシュをクリア
   */
  clearCache() {
    this.cache.clear()
  }

  /**
   * リポジトリの状態確認
   * @returns {Promise<Object>}
   */
  async getRepositoryStatus() {
    try {
      const customGestures = await this.getCustomGestures()
      const learningData = await this.getLearningData()
      const storageStats = await this.storage.getUsageStats()

      return {
        isHealthy: true,
        customGesturesCount: customGestures.length,
        learningDataEntries: Object.keys(learningData).length,
        cacheSize: this.cache.size,
        storage: storageStats.sync || {}
      }
    } catch (error) {
      return {
        isHealthy: false,
        error: error.message,
        cacheSize: this.cache.size
      }
    }
  }
}

/**
 * GestureRepository専用エラークラス
 */
class GestureRepositoryError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'GestureRepositoryError'
    this.originalError = originalError
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GestureRepository, GestureRepositoryError }
}