/**
 * ジェスチャー学習データ管理ユースケース
 * Application層 - ビジネスロジックの調整
 * 
 * 🎯 Clean Architecture準拠: ジェスチャー学習データの永続化管理
 */

class GestureLearningUseCase {
  constructor() {
    this.STORAGE_KEY = 'gestureLearningData'
    this.defaultData = {}
  }

  /**
   * 学習データを取得
   */
  async getLearningData() {
    try {
      const result = await this.chromeStorageGet([this.STORAGE_KEY])
      
      if (result[this.STORAGE_KEY]) {
        return result[this.STORAGE_KEY]
      }
      
      // デフォルトデータを返す
      return { ...this.defaultData }
      
    } catch (error) {
      console.error('❌ GestureLearningUseCase: Failed to load learning data:', error)
      return { ...this.defaultData }
    }
  }

  /**
   * 学習データを保存
   */
  async saveLearningData(learningData) {
    try {
      await this.chromeStorageSet({ 
        [this.STORAGE_KEY]: learningData 
      })
      
      console.log('✅ GestureLearningUseCase: Learning data saved successfully')
      return learningData
      
    } catch (error) {
      console.error('❌ GestureLearningUseCase: Failed to save learning data:', error)
      throw error
    }
  }

  /**
   * 学習データを削除/リセット
   */
  async resetLearningData() {
    try {
      await this.chromeStorageSet({ 
        [this.STORAGE_KEY]: this.defaultData 
      })
      
      console.log('✅ GestureLearningUseCase: Learning data reset successfully')
      return this.defaultData
      
    } catch (error) {
      console.error('❌ GestureLearningUseCase: Failed to reset learning data:', error)
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
  window.GestureLearningUseCase = window.GestureLearningUseCase || GestureLearningUseCase
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GestureLearningUseCase }
}