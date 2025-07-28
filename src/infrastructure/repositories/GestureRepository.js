/**
 * ジェスチャーリポジトリ
 * Infrastructure層 - 外部システムとのインターフェース
 */

class GestureRepository {
  constructor(storageAdapter) {
    this.storageAdapter = storageAdapter
    this.CUSTOM_GESTURES_KEY = 'customGestures'
  }

  /**
   * カスタムジェスチャーを取得
   */
  async getCustomGestures() {
    try {
      console.log('🔧 GestureRepository: Loading custom gestures')
      
      const result = await this.storageAdapter.get([this.CUSTOM_GESTURES_KEY])
      const customGestures = result[this.CUSTOM_GESTURES_KEY] || []
      
      console.log('🔧 GestureRepository: Custom gestures loaded:', customGestures.length)
      return customGestures
      
    } catch (error) {
      console.error('🚨 GestureRepository: Failed to load custom gestures:', error)
      return []
    }
  }

  /**
   * カスタムジェスチャーを保存
   */
  async saveCustomGestures(gestures) {
    try {
      console.log('🔧 GestureRepository: Saving custom gestures:', gestures.length)
      
      // 妥当性検証
      this.validateCustomGestures(gestures)
      
      await this.storageAdapter.set({
        [this.CUSTOM_GESTURES_KEY]: gestures
      })
      
      console.log('🔧 GestureRepository: Custom gestures saved successfully')
      return true
      
    } catch (error) {
      console.error('🚨 GestureRepository: Failed to save custom gestures:', error)
      throw new Error(`Failed to save custom gestures: ${error.message}`)
    }
  }

  /**
   * カスタムジェスチャーを追加
   */
  async addCustomGesture(gesture) {
    try {
      console.log('🔧 GestureRepository: Adding custom gesture:', gesture.id)
      
      const currentGestures = await this.getCustomGestures()
      
      // 重複チェック
      if (currentGestures.find(g => g.id === gesture.id)) {
        throw new Error(`Gesture with ID ${gesture.id} already exists`)
      }
      
      // 追加
      const updatedGestures = [...currentGestures, gesture]
      await this.saveCustomGestures(updatedGestures)
      
      console.log('🔧 GestureRepository: Custom gesture added successfully')
      return true
      
    } catch (error) {
      console.error('🚨 GestureRepository: Failed to add custom gesture:', error)
      throw error
    }
  }

  /**
   * カスタムジェスチャーを更新
   */
  async updateCustomGesture(gestureId, updates) {
    try {
      console.log('🔧 GestureRepository: Updating custom gesture:', gestureId)
      
      const currentGestures = await this.getCustomGestures()
      const gestureIndex = currentGestures.findIndex(g => g.id === gestureId)
      
      if (gestureIndex === -1) {
        throw new Error(`Gesture with ID ${gestureId} not found`)
      }
      
      // 更新
      currentGestures[gestureIndex] = { ...currentGestures[gestureIndex], ...updates }
      await this.saveCustomGestures(currentGestures)
      
      console.log('🔧 GestureRepository: Custom gesture updated successfully')
      return true
      
    } catch (error) {
      console.error('🚨 GestureRepository: Failed to update custom gesture:', error)
      throw error
    }
  }

  /**
   * カスタムジェスチャーを削除
   */
  async deleteCustomGesture(gestureId) {
    try {
      console.log('🔧 GestureRepository: Deleting custom gesture:', gestureId)
      
      const currentGestures = await this.getCustomGestures()
      const updatedGestures = currentGestures.filter(g => g.id !== gestureId)
      
      if (currentGestures.length === updatedGestures.length) {
        throw new Error(`Gesture with ID ${gestureId} not found`)
      }
      
      await this.saveCustomGestures(updatedGestures)
      
      console.log('🔧 GestureRepository: Custom gesture deleted successfully')
      return true
      
    } catch (error) {
      console.error('🚨 GestureRepository: Failed to delete custom gesture:', error)
      throw error
    }
  }

  /**
   * 特定のカスタムジェスチャーを取得
   */
  async getCustomGesture(gestureId) {
    try {
      const customGestures = await this.getCustomGestures()
      const gesture = customGestures.find(g => g.id === gestureId)
      
      if (!gesture) {
        throw new Error(`Gesture with ID ${gestureId} not found`)
      }
      
      return gesture
      
    } catch (error) {
      console.error('🚨 GestureRepository: Failed to get custom gesture:', error)
      throw error
    }
  }

  /**
   * カスタムジェスチャーの存在確認
   */
  async existsCustomGesture(gestureId) {
    try {
      const customGestures = await this.getCustomGestures()
      return customGestures.some(g => g.id === gestureId)
    } catch (error) {
      console.error('🚨 GestureRepository: Failed to check gesture existence:', error)
      return false
    }
  }

  /**
   * パターンの重複チェック
   */
  async isPatternDuplicate(pattern, excludeId = null) {
    try {
      const customGestures = await this.getCustomGestures()
      return customGestures.some(g => 
        g.id !== excludeId && 
        JSON.stringify(g.pattern) === JSON.stringify(pattern)
      )
    } catch (error) {
      console.error('🚨 GestureRepository: Failed to check pattern duplicate:', error)
      return false
    }
  }

  /**
   * カスタムジェスチャーの妥当性検証
   */
  validateCustomGestures(gestures) {
    if (!Array.isArray(gestures)) {
      throw new Error('Custom gestures must be an array')
    }

    for (const gesture of gestures) {
      this.validateCustomGesture(gesture)
    }

    // ID重複チェック
    const ids = gestures.map(g => g.id)
    const uniqueIds = new Set(ids)
    if (ids.length !== uniqueIds.size) {
      throw new Error('Duplicate gesture IDs found')
    }

    return true
  }

  /**
   * 単一カスタムジェスチャーの妥当性検証
   */
  validateCustomGesture(gesture) {
    if (!gesture || typeof gesture !== 'object') {
      throw new Error('Gesture must be an object')
    }

    // 必須フィールドの検証
    const requiredFields = ['id', 'name', 'pattern', 'action']
    for (const field of requiredFields) {
      if (!gesture[field]) {
        throw new Error(`Required field missing: ${field}`)
      }
    }

    // 型の検証
    if (typeof gesture.id !== 'string') {
      throw new Error('Gesture ID must be string')
    }
    
    if (typeof gesture.name !== 'string') {
      throw new Error('Gesture name must be string')
    }
    
    if (typeof gesture.action !== 'string') {
      throw new Error('Gesture action must be string')
    }

    // パターンの検証（配列または文字列）
    if (!Array.isArray(gesture.pattern) && typeof gesture.pattern !== 'string') {
      throw new Error('Gesture pattern must be array or string')
    }

    // enabled フィールドの検証（存在する場合）
    if (gesture.enabled !== undefined && typeof gesture.enabled !== 'boolean') {
      throw new Error('Gesture enabled must be boolean')
    }

    return true
  }
}

module.exports = GestureRepository