/**
 * SimpleGestureUseCase
 * 現在動作しているジェスチャー機能のApplication層実装
 */

// 依存関係のインポート
let SimpleGestureRecognizer
if (typeof require !== 'undefined') {
  ({ SimpleGestureRecognizer } = require('../../domain/services/SimpleGestureRecognizer'))
}

class SimpleGestureUseCase {
  constructor(gestureRecognizer = null, messagingService = null) {
    this.gestureRecognizer = gestureRecognizer || new SimpleGestureRecognizer()
    this.messagingService = messagingService
    this.settings = {
      enabled: true,
      gestureThreshold: 15
    }
  }

  /**
   * 軌跡からジェスチャーを認識して実行
   * @param {Point[]|Object[]} trail - 軌跡データ  
   * @returns {Promise<Object>} 実行結果
   */
  async executeGesture(trail) {
    try {
      // 設定チェック
      if (!this.settings.enabled) {
        return { 
          success: false, 
          error: 'Gesture recognition is disabled' 
        }
      }

      // ジェスチャー認識
      const gestureType = this.gestureRecognizer.recognizeGesture(trail)
      if (!gestureType) {
        return { 
          success: false, 
          error: 'Gesture not recognized' 
        }
      }

      console.log('Recognized gesture:', gestureType)

      // アクション実行
      const result = await this.executeAction(gestureType)
      
      return {
        success: result.success,
        gestureType: gestureType,
        action: result.action,
        error: result.error
      }

    } catch (error) {
      console.error('Gesture execution failed:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * ジェスチャーアクションを実行
   * @param {string} gestureType
   * @returns {Promise<Object>}
   */
  async executeAction(gestureType) {
    if (!this.messagingService) {
      return {
        success: false,
        error: 'Messaging service not available'
      }
    }

    try {
      // メッセージ作成
      const message = this.createActionMessage(gestureType)
      
      // backgroundスクリプトにメッセージ送信
      const response = await this.messagingService.sendMessage(message)
      
      return {
        success: response.success,
        action: response.action,
        error: response.error
      }

    } catch (error) {
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * ジェスチャータイプからアクションメッセージを作成
   * @param {string} gestureType
   * @returns {Object}
   */
  createActionMessage(gestureType) {
    if (this.gestureRecognizer.isSimpleGestureType(gestureType)) {
      return {
        type: 'simpleGesture',
        direction: gestureType
      }
    } else {
      return {
        type: 'complexGesture',
        gestureType: gestureType
      }
    }
  }

  /**
   * 設定を更新
   * @param {Object} newSettings
   */
  updateSettings(newSettings) {
    this.settings = { ...this.settings, ...newSettings }
    
    // 認識閾値の更新
    if (newSettings.gestureThreshold) {
      this.gestureRecognizer.setThreshold(newSettings.gestureThreshold)
    }
  }

  /**
   * メッセージングサービスを設定
   * @param {Object} messagingService
   */
  setMessagingService(messagingService) {
    this.messagingService = messagingService
  }

  /**
   * ジェスチャー認識サービスを設定
   * @param {SimpleGestureRecognizer} recognizer
   */
  setGestureRecognizer(recognizer) {
    this.gestureRecognizer = recognizer
  }

  /**
   * ジェスチャー認識が有効かどうか
   * @returns {boolean}
   */
  isEnabled() {
    return this.settings.enabled
  }

  /**
   * ジェスチャー認識を有効/無効に設定
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this.settings.enabled = enabled
  }

  /**
   * 現在の設定を取得
   * @returns {Object}
   */
  getSettings() {
    return { ...this.settings }
  }

  /**
   * デバッグ情報を取得
   * @returns {Object}
   */
  getDebugInfo() {
    return {
      settings: this.settings,
      hasMessagingService: Boolean(this.messagingService),
      recognizerThreshold: this.gestureRecognizer.getThreshold(),
      className: 'SimpleGestureUseCase'
    }
  }
}

// ブラウザ環境対応
if (typeof window !== 'undefined') {
  window.SimpleGestureUseCase = SimpleGestureUseCase
}

// Node.js環境対応
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SimpleGestureUseCase }
}