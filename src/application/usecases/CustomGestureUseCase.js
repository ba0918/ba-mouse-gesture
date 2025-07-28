/**
 * カスタムジェスチャー管理ユースケース
 * Application層 - ビジネスロジックの調整
 * 
 * 🎯 Clean Architecture準拠: カスタムジェスチャーデータの永続化管理
 */

class CustomGestureUseCase {
  constructor() {
    this.STORAGE_KEY = 'customGestures'
    this.defaultData = []
  }

  /**
   * カスタムジェスチャーを取得
   */
  async getCustomGestures() {
    try {
      const result = await this.chromeStorageGet([this.STORAGE_KEY])
      
      if (result[this.STORAGE_KEY]) {
        return result[this.STORAGE_KEY]
      }
      
      // デフォルトデータを返す
      return [...this.defaultData]
      
    } catch (error) {
      console.error('❌ CustomGestureUseCase: Failed to load custom gestures:', error)
      return [...this.defaultData]
    }
  }

  /**
   * カスタムジェスチャーを保存
   */
  async saveCustomGestures(customGestures) {
    try {
      await this.chromeStorageSet({ 
        [this.STORAGE_KEY]: customGestures 
      })
      
      console.log('✅ CustomGestureUseCase: Custom gestures saved successfully')
      return customGestures
      
    } catch (error) {
      console.error('❌ CustomGestureUseCase: Failed to save custom gestures:', error)
      throw error
    }
  }

  /**
   * カスタムジェスチャーを削除/リセット
   */
  async resetCustomGestures() {
    try {
      await this.chromeStorageSet({ 
        [this.STORAGE_KEY]: this.defaultData 
      })
      
      console.log('✅ CustomGestureUseCase: Custom gestures reset successfully')
      return this.defaultData
      
    } catch (error) {
      console.error('❌ CustomGestureUseCase: Failed to reset custom gestures:', error)
      throw error
    }
  }

  /**
   * Chrome Storage APIの統一インターフェース
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

// モジュールとして使用可能にする
if (typeof window !== 'undefined') {
  window.CustomGestureUseCase = window.CustomGestureUseCase || CustomGestureUseCase
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CustomGestureUseCase
}