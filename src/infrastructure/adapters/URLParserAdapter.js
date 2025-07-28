/**
 * URL解析アダプター
 * Infrastructure層 - ブラウザURL APIの抽象化
 */

class URLParserAdapter {
  /**
   * URLからホスト名を取得
   * @param {string} url - 解析対象URL
   * @returns {string} ホスト名（取得失敗時は空文字）
   */
  getHostname(url) {
    if (!url || typeof url !== 'string') {
      return ''
    }

    try {
      // ブラウザ環境でのURL解析
      if (typeof window !== 'undefined' && window.URL) {
        const urlObj = new window.URL(url)
        return urlObj.hostname
      }
      
      // Node.js環境またはURL APIが利用できない場合
      if (typeof globalThis !== 'undefined' && globalThis.URL) {
        const urlObj = new globalThis.URL(url)
        return urlObj.hostname
      }
      
      // フォールバック: 正規表現による解析
      return this.parseHostnameWithRegex(url)
      
    } catch (error) {
      console.warn('URLParserAdapter: Failed to parse URL:', url, error)
      return this.parseHostnameWithRegex(url)
    }
  }

  /**
   * URLのパスを取得
   * @param {string} url - 解析対象URL
   * @returns {string} パス（取得失敗時は'/'）
   */
  getPathname(url) {
    if (!url || typeof url !== 'string') {
      return '/'
    }

    try {
      if (typeof window !== 'undefined' && window.URL) {
        const urlObj = new window.URL(url)
        return urlObj.pathname
      }
      
      if (typeof globalThis !== 'undefined' && globalThis.URL) {
        const urlObj = new globalThis.URL(url)
        return urlObj.pathname
      }
      
      return this.parsePathnameWithRegex(url)
      
    } catch (error) {
      console.warn('URLParserAdapter: Failed to parse pathname:', url, error)
      return this.parsePathnameWithRegex(url)
    }
  }

  /**
   * URLが有効かチェック
   * @param {string} url - チェック対象URL
   * @returns {boolean} 有効かどうか
   */
  isValidURL(url) {
    if (!url || typeof url !== 'string') {
      return false
    }

    try {
      if (typeof window !== 'undefined' && window.URL) {
        new window.URL(url)
        return true
      }
      
      if (typeof globalThis !== 'undefined' && globalThis.URL) {
        new globalThis.URL(url)
        return true
      }
      
      // 基本的なURL形式チェック
      return /^https?:\/\/.+/.test(url)
      
    } catch {
      return false
    }
  }

  /**
   * 正規表現によるホスト名解析（フォールバック）
   * @param {string} url
   * @returns {string}
   * @private
   */
  parseHostnameWithRegex(url) {
    try {
      const match = url.match(/^https?:\/\/([^/?#]+)/)
      return match ? match[1] : ''
    } catch {
      return ''
    }
  }

  /**
   * 正規表現によるパス解析（フォールバック）
   * @param {string} url
   * @returns {string}
   * @private
   */
  parsePathnameWithRegex(url) {
    try {
      const match = url.match(/^https?:\/\/[^/?#]+(\/[^?#]*)?/)
      return match && match[1] ? match[1] : '/'
    } catch {
      return '/'
    }
  }
}

// CommonJS用のエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = URLParserAdapter
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.URLParserAdapter = URLParserAdapter
}