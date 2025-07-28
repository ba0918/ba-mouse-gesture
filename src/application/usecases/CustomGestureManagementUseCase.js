/**
 * CustomGestureManagementUseCase
 * カスタムジェスチャー管理のビジネスロジックを統合するUseCaseクラス
 */

// 依存関係のインポート
let CustomGesture, GesturePattern, Point, PatternMatcher
if (typeof require !== 'undefined') {
  ({ CustomGesture } = require('../../domain/entities/CustomGesture'));
  ({ GesturePattern } = require('../../domain/valueObjects/GesturePattern'));
  ({ Point } = require('../../domain/valueObjects/Point'));
  ({ PatternMatcher } = require('../../domain/services/PatternMatcher'))
}

class CustomGestureManagementUseCase {
  /**
   * @param {GestureRepository} gestureRepository
   * @param {SettingsRepository} settingsRepository
   */
  constructor(gestureRepository, settingsRepository) {
    this.gestureRepository = gestureRepository
    this.settingsRepository = settingsRepository
    this.patternMatcher = new PatternMatcher()
    this.isInitialized = false
  }

  /**
   * UseCaseの初期化
   * @returns {void}
   */
  initialize() {
    try {
      this.isInitialized = true
    } catch (error) {
      throw new CustomGestureManagementError('Failed to initialize custom gesture use case', error)
    }
  }

  /**
   * すべてのカスタムジェスチャーを取得
   * @returns {Promise<CustomGesture[]>}
   */
  async getAllCustomGestures() {
    try {
      return await this.gestureRepository.getCustomGestures()
    } catch (error) {
      throw new CustomGestureManagementError('Failed to get all custom gestures', error)
    }
  }

  /**
   * 有効なカスタムジェスチャーのみを取得
   * @returns {Promise<CustomGesture[]>}
   */
  async getEnabledCustomGestures() {
    try {
      const allGestures = await this.gestureRepository.getCustomGestures()
      return allGestures.filter(gesture => gesture.enabled)
    } catch (error) {
      throw new CustomGestureManagementError('Failed to get enabled custom gestures', error)
    }
  }

  /**
   * 特定のカスタムジェスチャーを取得
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<CustomGesture>}
   */
  async getCustomGesture(gestureId) {
    try {
      const allGestures = await this.gestureRepository.getCustomGestures()
      const gesture = allGestures.find(g => g.id === gestureId)
      
      if (!gesture) {
        throw new Error(`カスタムジェスチャーが見つかりません: ${gestureId}`)
      }
      
      return gesture
    } catch (error) {
      throw new CustomGestureManagementError('Failed to get custom gesture', error)
    }
  }

  /**
   * 新しいカスタムジェスチャーを作成
   * @param {string} name - ジェスチャー名
   * @param {Array} rawPoints - マウス軌跡データ [{x, y, timestamp}, ...]
   * @param {string} action - 実行アクション
   * @returns {Promise<CustomGesture>}
   */
  async createCustomGesture(name, rawPoints, action) {
    
    if (!this.isInitialized) {
      this.initialize()
    }

    try {
      
      // 入力値の検証
      this.validateGestureCreation(name, rawPoints, action)

      // 重複チェック
      await this.checkDuplicateName(name)

      // 軌跡をPointオブジェクトに変換
      const points = this.convertToPoints(rawPoints)

      // パターンを生成
      const threshold = await this.getThreshold()
      const pattern = GesturePattern.fromPoints(points, threshold)

      if (pattern.isEmpty()) {
        const errorMessage = 'Invalid gesture pattern. Insufficient movement detected'
        console.error('🔧 [Debug] Pattern validation failed:', errorMessage)
        throw new Error(errorMessage)
      }

      // 既存パターンとの類似度チェック
      await this.checkPatternSimilarity(pattern, name)

      // カスタムジェスチャーエンティティを作成
      const gestureId = this.generateGestureId(name)
      const customGesture = new CustomGesture(gestureId, name, pattern, action, true, 1) // enabled=true, priority=1

      // 保存
      await this.gestureRepository.addCustomGesture(customGesture)

      return customGesture

    } catch (error) {
      throw new CustomGestureManagementError('Failed to create custom gesture', error)
    }
  }

  /**
   * 方向配列からカスタムジェスチャーを作成（UI向け）
   * @param {string} name - ジェスチャー名
   * @param {string[]} directions - 方向配列 ['up', 'down', 'left', 'right']
   * @param {string} action - アクション
   * @param {string} description - 説明
   * @returns {Promise<CustomGesture>}
   */
  async addCustomGesture({ name, pattern, action, description = '' }) {
    if (!this.isInitialized) {
      this.initialize()
    }

    try {
      // 入力値の検証
      if (!name || typeof name !== 'string') {
        throw new Error('Gesture name is required and must be string')
      }
      if (!Array.isArray(pattern) || pattern.length === 0) {
        throw new Error('Pattern must be a non-empty array')
      }
      if (!action || typeof action !== 'string') {
        throw new Error('Action is required and must be string')
      }

      // 重複チェック
      await this.checkDuplicateName(name)

      // 方向配列をGesturePatternに変換

      let gesturePattern
      try {
        gesturePattern = GesturePattern.fromArray(pattern)
      } catch (patternError) {
        console.error('❌ Failed to create GesturePattern:', patternError)
        throw new Error(`Failed to create gesture pattern: ${patternError.message}`)
      }

      if (!gesturePattern || gesturePattern.isEmpty()) {
        throw new Error('Invalid gesture pattern. Pattern cannot be empty')
      }

      if (!gesturePattern.isValid()) {
        throw new Error('Invalid gesture pattern. Pattern validation failed')
      }

      // 既存パターンとの類似度チェック
      await this.checkPatternSimilarity(gesturePattern, name)

      // カスタムジェスチャーエンティティを作成
      const gestureId = this.generateGestureId(name)
      const customGesture = new CustomGesture(gestureId, name, gesturePattern, action, true, 1) // enabled=true, priority=1
      
      // descriptionは使用しないか、別途設定する場合は後で追加

      // カスタムジェスチャー作成完了

      // 保存
      await this.gestureRepository.addCustomGesture(customGesture)

      // 学習機能は削除済み

      return customGesture

    } catch (error) {
      console.error('CustomGestureManagementUseCase.addCustomGesture: Error details:', error)
      console.error('CustomGestureManagementUseCase.addCustomGesture: Stack trace:', error.stack)
      console.error('CustomGestureManagementUseCase.addCustomGesture: Input data:', { name, pattern, action, description })
      throw new CustomGestureManagementError(`Failed to add custom gesture: ${error.message}`, error)
    }
  }

  /**
   * カスタムジェスチャーを更新
   * @param {string} gestureId - ジェスチャーID
   * @param {Object} updates - 更新データ
   * @returns {Promise<CustomGesture>}
   */
  async updateCustomGesture(gestureId, updates) {
    try {
      // 更新データの検証
      this.validateGestureUpdate(updates)

      // 名前の重複チェック（名前が変更される場合）
      if (updates.name) {
        await this.checkDuplicateName(updates.name, gestureId)
      }

      // 更新実行
      const updatedGesture = await this.gestureRepository.updateCustomGesture(gestureId, updates)

      return updatedGesture

    } catch (error) {
      throw new CustomGestureManagementError('Failed to update custom gesture', error)
    }
  }

  /**
   * カスタムジェスチャーを削除
   * @param {string} gestureId - ジェスチャーID
   * @returns {Promise<CustomGesture[]>}
   */
  async deleteCustomGesture(gestureId) {
    
    try {
      // 削除実行
      const remainingGestures = await this.gestureRepository.deleteCustomGesture(gestureId)

      return remainingGestures

    } catch (error) {
      console.error('🔧 [Debug] deleteCustomGesture failed:', error)
      throw new CustomGestureManagementError('Failed to delete custom gesture', error)
    }
  }

  /**
   * カスタムジェスチャーの有効/無効を切り替え
   * @param {string} gestureId - ジェスチャーID
   * @param {boolean} enabled - 有効/無効
   * @returns {Promise<CustomGesture>}
   */
  async toggleCustomGesture(gestureId, enabled) {
    try {
      return await this.gestureRepository.toggleCustomGesture(gestureId, enabled)
    } catch (error) {
      throw new CustomGestureManagementError('Failed to toggle custom gesture', error)
    }
  }

  /**
   * パターンマッチングを実行
   * @param {Array} rawPoints - 入力軌跡
   * @returns {Promise<Object>}
   */
  async matchPattern(rawPoints) {
    if (!this.isInitialized) {
      this.initialize()
    }

    try {
      // 軌跡をPointオブジェクトに変換
      const points = this.convertToPoints(rawPoints)

      // パターンを生成
      const threshold = await this.getThreshold()
      const inputPattern = GesturePattern.fromPoints(points, threshold)

      if (inputPattern.isEmpty()) {
        return {
          match: null,
          similarity: 0,
          confidence: 0,
          message: 'No valid pattern detected'
        }
      }

      // カスタムジェスチャーとマッチング
      const customGestures = await this.getEnabledCustomGestures()
      let bestMatch = null
      let bestSimilarity = 0
      let bestConfidence = 0

      for (const gesture of customGestures) {
        const similarity = this.patternMatcher.calculateSimilarity(inputPattern, gesture.pattern)
        
        if (similarity > bestSimilarity) {
          bestMatch = gesture
          bestSimilarity = similarity
          
          // 基本的な信頼度計算（学習機能は削除済み）
          bestConfidence = similarity
        }
      }

      // マッチング結果
      const matchThreshold = 0.6 // 設定から取得すべき
      const confidenceThreshold = 0.5 // 設定から取得すべき

      if (bestSimilarity >= matchThreshold && bestConfidence >= confidenceThreshold) {
        // 使用統計を更新
        await this.gestureRepository.recordGestureUsage(bestMatch.id, true)
        
        // 学習機能は削除済み

        return {
          match: bestMatch,
          similarity: bestSimilarity,
          confidence: bestConfidence,
          message: 'Pattern matched successfully'
        }
      } else {
        return {
          match: null,
          similarity: bestSimilarity,
          confidence: bestConfidence,
          message: 'No confident match found'
        }
      }

    } catch (error) {
      throw new CustomGestureManagementError('Failed to match pattern', error)
    }
  }

  /**
   * カスタムジェスチャーの統計情報を取得
   * @returns {Promise<Object>}
   */
  async getGestureStatistics() {
    try {
      const performanceStats = await this.gestureRepository.getPerformanceStats()
      
      return {
        performance: performanceStats,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      throw new CustomGestureManagementError('Failed to get gesture statistics', error)
    }
  }

  /**
   * カスタムジェスチャーのデータをエクスポート
   * @returns {Promise<Object>}
   */
  async exportCustomGestures() {
    try {
      return await this.gestureRepository.createBackup()
    } catch (error) {
      throw new CustomGestureManagementError('Failed to export custom gestures', error)
    }
  }

  /**
   * カスタムジェスチャーのデータをインポート
   * @param {Object} backup - バックアップデータ
   * @returns {Promise<void>}
   */
  async importCustomGestures(backup) {
    try {
      // バックアップデータの検証
      this.validateBackupData(backup)

      // インポート実行
      await this.gestureRepository.restoreFromBackup(backup)

      // 学習エンジンは削除済み

    } catch (error) {
      throw new CustomGestureManagementError('Failed to import custom gestures', error)
    }
  }

  /**
   * ストレージ最適化を実行
   * @returns {Promise<Object>}
   */
  async optimizeStorage() {
    try {
      return await this.gestureRepository.optimizeStorage()
    } catch (error) {
      throw new CustomGestureManagementError('Failed to optimize storage', error)
    }
  }

  // Private methods

  /**
   * ジェスチャー作成時の検証
   * @param {string} name
   * @param {Array} rawPoints
   * @param {string} action
   */
  validateGestureCreation(name, rawPoints, action) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw new Error('Gesture name is required')
    }
    
    if (name.length > 50) {
      throw new Error('Gesture name too long (max 50 characters)')
    }

    if (!Array.isArray(rawPoints) || rawPoints.length < 2) {
      throw new Error('Insufficient points for gesture creation')
    }

    if (!action || typeof action !== 'string') {
      throw new Error('Action is required')
    }

    // アクションの形式チェック
    const validActions = [
      // ブラウザ操作
      'back', 'forward', 'refresh',
      'browser_back', 'browser_forward', // 旧形式対応
      // タブ操作
      'new_tab', 'close_tab', 'duplicate_tab',
      'prev_tab', 'next_tab', 'super_refresh',
      // スクロール操作
      'scroll_up', 'scroll_down',
      'scroll_top', 'scroll_bottom', // 旧形式対応
      // 拡張可能なアクション
      'url:', 'script:'
    ]
    const isValidAction = validActions.some(valid => action === valid || action.startsWith(valid))
    
    if (!isValidAction) {
      throw new Error(`Invalid action format: ${action}. Valid actions: ${validActions.filter(a => !a.includes(':')).join(', ')}`)
    }
  }

  /**
   * ジェスチャー更新時の検証
   * @param {Object} updates
   */
  validateGestureUpdate(updates) {
    if (updates.name !== undefined) {
      if (!updates.name || typeof updates.name !== 'string' || updates.name.trim().length === 0) {
        throw new Error('Invalid gesture name')
      }
      if (updates.name.length > 50) {
        throw new Error('Gesture name too long (max 50 characters)')
      }
    }

    if (updates.action !== undefined) {
      if (!updates.action || typeof updates.action !== 'string') {
        throw new Error('Invalid action')
      }
    }

    if (updates.enabled !== undefined) {
      if (typeof updates.enabled !== 'boolean') {
        throw new Error('Invalid enabled value')
      }
    }
  }

  /**
   * 名前の重複をチェック
   * @param {string} name
   * @param {string} excludeId - 除外するジェスチャーID
   */
  async checkDuplicateName(name, excludeId = null) {
    
    const existingGestures = await this.gestureRepository.getCustomGestures()
    
    const duplicate = existingGestures.find(g => 
      g.name.toLowerCase() === name.toLowerCase() && g.id !== excludeId
    )
    
    if (duplicate) {
      const errorMessage = `Gesture name "${name}" already exists`
      console.error('🔧 [Debug] Duplicate name error:', errorMessage)
      throw new Error(errorMessage)
    }
    
  }

  /**
   * パターンの類似度をチェック
   * @param {GesturePattern} pattern
   * @param {string} name
   */
  async checkPatternSimilarity(pattern) {
    const existingGestures = await this.gestureRepository.getCustomGestures()
    const similarityThreshold = 0.9 // 90%以上類似していたら警告
    
    for (const existing of existingGestures) {
      const similarity = this.patternMatcher.calculateSimilarity(pattern, existing.pattern)
      if (similarity >= similarityThreshold) {
        throw new Error(`Pattern too similar to existing gesture "${existing.name}" (${Math.round(similarity * 100)}% similarity)`)
      }
    }
  }

  /**
   * 生データをPointオブジェクトに変換
   * @param {Array} rawPoints
   * @returns {Point[]}
   */
  convertToPoints(rawPoints) {
    return rawPoints.map(point => new Point(point.x, point.y, point.timestamp))
  }

  /**
   * 現在の閾値設定を取得
   * @returns {Promise<Threshold>}
   */
  async getThreshold() {
    const settings = await this.settingsRepository.getSettings()
    return settings.getThreshold()
  }

  /**
   * ジェスチャーIDを生成
   * @param {string} name
   * @returns {string}
   */
  generateGestureId(name) {
    const timestamp = Date.now()
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20)
    return `custom_${sanitized}_${timestamp}`
  }

  // 学習関連の信頼度計算は削除済み

  // 学習関連機能は削除済み


  /**
   * バックアップデータの検証
   * @param {Object} backup
   */
  validateBackupData(backup) {
    if (!backup || !backup.customGestures) {
      throw new Error('Invalid backup data. Missing custom gestures')
    }
    
    if (!backup.timestamp || !backup.version) {
      throw new Error('Invalid backup data. Missing metadata')
    }

    // カスタムジェスチャーデータの基本検証
    if (!Array.isArray(backup.customGestures)) {
      throw new Error('Invalid backup data. Custom gestures must be array')
    }
  }

  // ========================================
  // 旧CustomGestureUseCase互換メソッド（統合後）
  // ========================================

  /**
   * カスタムジェスチャーを取得（旧CustomGestureUseCaseインターフェース互換）
   * @returns {Promise<Array>}
   */
  async getCustomGestures() {
    try {
      const customGestures = await this.getAllCustomGestures()
      // Entity形式から単純なオブジェクト形式に変換
      return customGestures.map(gesture => gesture.toJSON ? gesture.toJSON() : gesture)
    } catch (error) {
      console.error('❌ CustomGestureManagementUseCase: Failed to load custom gestures:', error)
      return []
    }
  }

  /**
   * カスタムジェスチャーを保存（旧CustomGestureUseCaseインターフェース互換）
   * @param {Array} customGestures - カスタムジェスチャー配列
   * @returns {Promise<Array>}
   */
  async saveCustomGestures(customGestures) {
    try {
      // 既存の全カスタムジェスチャーを削除
      const existingGestures = await this.getAllCustomGestures()
      for (const gesture of existingGestures) {
        await this.deleteCustomGesture(gesture.id)
      }

      // 新しいジェスチャーを追加
      const savedGestures = []
      for (const gestureData of customGestures) {
        try {
          const savedGesture = await this.addCustomGesture({
            name: gestureData.name,
            pattern: gestureData.pattern,
            action: gestureData.action,
            description: gestureData.description || ''
          })
          savedGestures.push(savedGesture.toJSON ? savedGesture.toJSON() : savedGesture)
        } catch (gestureError) {
          console.warn('Failed to save individual gesture:', gestureData.name, gestureError)
        }
      }

      return savedGestures

    } catch (error) {
      console.error('❌ CustomGestureManagementUseCase: Failed to save custom gestures:', error)
      throw error
    }
  }

  /**
   * カスタムジェスチャーを削除/リセット（旧CustomGestureUseCaseインターフェース互換）
   * @returns {Promise<Array>}
   */
  async resetCustomGestures() {
    try {
      // 全カスタムジェスチャーを削除
      const existingGestures = await this.getAllCustomGestures()
      for (const gesture of existingGestures) {
        await this.deleteCustomGesture(gesture.id)
      }

      return []

    } catch (error) {
      console.error('❌ CustomGestureManagementUseCase: Failed to reset custom gestures:', error)
      throw error
    }
  }

  /**
   * Chrome Storage APIの統一インターフェース（旧CustomGestureUseCaseインターフェース互換）
   * @param {Array|string} keys
   * @returns {Promise<Object>}
   */
  chromeStorageGet(keys) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API is not available'))
        return
      }
      
      chrome.storage.sync.get(keys, (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve(result)
        }
      })
    })
  }

  /**
   * Chrome Storage APIの統一インターフェース（旧CustomGestureUseCaseインターフェース互換）
   * @param {Object} data
   * @returns {Promise<void>}
   */
  chromeStorageSet(data) {
    return new Promise((resolve, reject) => {
      if (typeof chrome === 'undefined' || !chrome.storage) {
        reject(new Error('Chrome storage API is not available'))
        return
      }
      
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError)
        } else {
          resolve()
        }
      })
    })
  }
}

/**
 * カスタムジェスチャー管理専用エラークラス
 */
class CustomGestureManagementError extends Error {
  constructor(message, originalError) {
    super(message)
    this.name = 'CustomGestureManagementError'
    this.originalError = originalError
  }
}

// モジュールとして使用可能にする（window登録）
if (typeof window !== 'undefined') {
  window.CustomGestureUseCase = window.CustomGestureUseCase || CustomGestureManagementUseCase
  window.CustomGestureManagementUseCase = window.CustomGestureManagementUseCase || CustomGestureManagementUseCase
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CustomGestureManagementUseCase, CustomGestureManagementError }
}