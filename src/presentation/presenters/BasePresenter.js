/**
 * BasePresenter
 * すべてのPresenterの基底クラス
 * 共通的なUIロジックと状態管理を提供
 */

class BasePresenter {
  constructor() {
    this.isInitialized = false
    this.errorHandlers = []
    this.statusHandlers = []
    this.eventListeners = []
  }

  /**
   * Presenterの初期化
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) {
      return
    }

    try {
      await this.onInitialize()
      this.isInitialized = true
    } catch (error) {
      this.handleError('Presenter initialization failed', error)
      throw error
    }
  }

  /**
   * 初期化時に呼ばれるフック（サブクラスでオーバーライド）
   * @protected
   * @returns {Promise<void>}
   */
  async onInitialize() {
    // Override in subclasses
  }

  /**
   * Presenterの破棄
   * @returns {Promise<void>}
   */
  async dispose() {
    try {
      await this.onDispose()
      this.cleanup()
      this.isInitialized = false
    } catch (error) {
      this.handleError('Presenter disposal failed', error)
    }
  }

  /**
   * 破棄時に呼ばれるフック（サブクラスでオーバーライド）
   * @protected
   * @returns {Promise<void>}
   */
  async onDispose() {
    // Override in subclasses
  }

  /**
   * リソースのクリーンアップ
   * @protected
   */
  cleanup() {
    // イベントリスナーの削除
    this.eventListeners.forEach(({ element, event, handler, options }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler, options)
      }
    })
    this.eventListeners = []

    // ハンドラーのクリア
    this.errorHandlers = []
    this.statusHandlers = []
  }

  /**
   * イベントリスナーを安全に追加
   * @protected
   * @param {Element} element - DOM要素
   * @param {string} event - イベント名
   * @param {Function} handler - ハンドラー関数
   * @param {Object} [options] - イベントオプション
   */
  addEventListener(element, event, handler, options = {}) {
    if (!element || !element.addEventListener) {
      this.handleError('Invalid element for event listener', new Error('Element is null or not a DOM element'))
      return
    }

    // エラーハンドリングを含むラッパー関数
    const wrappedHandler = (e) => {
      try {
        return handler(e)
      } catch (error) {
        this.handleError(`Event handler error for ${event}`, error)
      }
    }

    element.addEventListener(event, wrappedHandler, options)
    
    // 後でクリーンアップできるように記録
    this.eventListeners.push({
      element,
      event,
      handler: wrappedHandler,
      options
    })
  }

  /**
   * エラーハンドリング
   * @protected
   * @param {string} context - エラーコンテキスト
   * @param {Error} error - エラーオブジェクト
   */
  handleError(context, error) {
    const errorInfo = {
      context: context,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      presenter: this.constructor.name
    }

    // コンソールにログ出力
    console.error(`[${this.constructor.name}] ${context}:`, error)

    // 登録されたエラーハンドラーに通知
    this.errorHandlers.forEach(handler => {
      try {
        handler(errorInfo)
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError)
      }
    })
  }

  /**
   * ステータス更新
   * @protected
   * @param {string} message - ステータスメッセージ
   * @param {string} type - ステータスタイプ ('success', 'error', 'warning', 'info')
   * @param {number} [duration] - 表示時間（ミリ秒）
   */
  updateStatus(message, type = 'info', duration = 3000) {
    const statusInfo = {
      message: message,
      type: type,
      duration: duration,
      timestamp: new Date().toISOString(),
      presenter: this.constructor.name
    }

    // 登録されたステータスハンドラーに通知
    this.statusHandlers.forEach(handler => {
      try {
        handler(statusInfo)
      } catch (handlerError) {
        console.error('Status handler failed:', handlerError)
      }
    })
  }

  /**
   * エラーハンドラーを登録
   * @param {Function} handler - エラーハンドラー関数
   */
  onError(handler) {
    if (typeof handler === 'function') {
      this.errorHandlers.push(handler)
    }
  }

  /**
   * ステータスハンドラーを登録
   * @param {Function} handler - ステータスハンドラー関数
   */
  onStatus(handler) {
    if (typeof handler === 'function') {
      this.statusHandlers.push(handler)
    }
  }

  /**
   * DOM要素を安全に取得
   * @protected
   * @param {string} selector - CSSセレクター
   * @param {Element} [parent] - 親要素（デフォルト: document）
   * @returns {Element|null}
   */
  querySelector(selector, parent = document) {
    try {
      return parent.querySelector(selector)
    } catch (error) {
      this.handleError(`Failed to query selector: ${selector}`, error)
      return null
    }
  }

  /**
   * 複数のDOM要素を安全に取得
   * @protected
   * @param {string} selector - CSSセレクター
   * @param {Element} [parent] - 親要素（デフォルト: document）
   * @returns {NodeList}
   */
  querySelectorAll(selector, parent = document) {
    try {
      return parent.querySelectorAll(selector)
    } catch (error) {
      this.handleError(`Failed to query selector all: ${selector}`, error)
      return []
    }
  }

  /**
   * 要素の表示/非表示を切り替え
   * @protected
   * @param {Element} element - DOM要素
   * @param {boolean} visible - 表示するか
   */
  setElementVisibility(element, visible) {
    if (!element) return

    if (visible) {
      element.style.display = ''
      element.removeAttribute('hidden')
    } else {
      element.style.display = 'none'
      element.setAttribute('hidden', 'true')
    }
  }

  /**
   * 要素の有効/無効を切り替え
   * @protected
   * @param {Element} element - DOM要素
   * @param {boolean} enabled - 有効にするか
   */
  setElementEnabled(element, enabled) {
    if (!element) return

    if (enabled) {
      element.removeAttribute('disabled')
      element.classList.remove('disabled')
    } else {
      element.setAttribute('disabled', 'true')
      element.classList.add('disabled')
    }
  }

  /**
   * 要素のテキストを安全に設定
   * @protected
   * @param {Element} element - DOM要素
   * @param {string} text - 設定するテキスト
   */
  setElementText(element, text) {
    if (!element) return

    // XSS対策のためtextContentを使用
    element.textContent = String(text || '')
  }

  /**
   * 要素の属性を安全に設定
   * @protected
   * @param {Element} element - DOM要素
   * @param {string} attribute - 属性名
   * @param {string} value - 属性値
   */
  setElementAttribute(element, attribute, value) {
    if (!element || !attribute) return

    try {
      element.setAttribute(attribute, String(value || ''))
    } catch (error) {
      this.handleError(`Failed to set attribute ${attribute}`, error)
    }
  }

  /**
   * 非同期処理を安全に実行
   * @protected
   * @param {Function} asyncFn - 非同期関数
   * @param {string} [context] - エラー時のコンテキスト
   * @returns {Promise<*>}
   */
  async safeAsync(asyncFn, context = 'Async operation') {
    try {
      return await asyncFn()
    } catch (error) {
      this.handleError(context, error)
      throw error
    }
  }

  /**
   * デバウンス処理
   * @protected
   * @param {Function} func - 実行する関数
   * @param {number} delay - 遅延時間（ミリ秒）
   * @returns {Function}
   */
  debounce(func, delay) {
    let timeoutId
    return (...args) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => func.apply(this, args), delay)
    }
  }

  /**
   * スロットル処理
   * @protected
   * @param {Function} func - 実行する関数
   * @param {number} limit - 制限時間（ミリ秒）
   * @returns {Function}
   */
  throttle(func, limit) {
    let inThrottle
    return (...args) => {
      if (!inThrottle) {
        func.apply(this, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  /**
   * Presenterの状態確認
   * @returns {Object}
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      eventListenersCount: this.eventListeners.length,
      errorHandlersCount: this.errorHandlers.length,
      statusHandlersCount: this.statusHandlers.length
    }
  }
}

// ES6 Module export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BasePresenter }
}