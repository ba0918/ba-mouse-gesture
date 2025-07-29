/**
 * URL解析アダプター
 * Infrastructure層 - ブラウザURL APIの抽象化
 */

export class URLParserAdapter {
  /**
   * URLからホスト名を取得
   */
  getHostname(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    try {
      // ブラウザ環境でのURL解析
      if (typeof window !== 'undefined' && window.URL) {
        const urlObj = new window.URL(url);
        return urlObj.hostname;
      }
      
      // Node.js環境またはURL APIが利用できない場合
      if (typeof globalThis !== 'undefined' && globalThis.URL) {
        const urlObj = new globalThis.URL(url);
        return urlObj.hostname;
      }
      
      // フォールバック: 正規表現による解析
      return this.parseHostnameWithRegex(url);
      
    } catch (error) {
      console.warn('URLParserAdapter: Failed to parse URL:', url, error);
      return this.parseHostnameWithRegex(url);
    }
  }

  /**
   * URLのパスを取得
   */
  getPathname(url: string): string {
    if (!url || typeof url !== 'string') {
      return '/';
    }

    try {
      if (typeof window !== 'undefined' && window.URL) {
        const urlObj = new window.URL(url);
        return urlObj.pathname;
      }
      
      if (typeof globalThis !== 'undefined' && globalThis.URL) {
        const urlObj = new globalThis.URL(url);
        return urlObj.pathname;
      }
      
      return this.parsePathnameWithRegex(url);
      
    } catch (error) {
      console.warn('URLParserAdapter: Failed to parse pathname:', url, error);
      return this.parsePathnameWithRegex(url);
    }
  }

  /**
   * URLが有効かチェック
   */
  isValidURL(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return false;
    }

    try {
      if (typeof window !== 'undefined' && window.URL) {
        new window.URL(url);
        return true;
      }
      
      if (typeof globalThis !== 'undefined' && globalThis.URL) {
        new globalThis.URL(url);
        return true;
      }
      
      // 基本的なURL形式チェック
      return /^https?:\/\/.+/.test(url);
      
    } catch {
      return false;
    }
  }

  /**
   * ドメインマッチング（ワイルドカード対応）
   */
  isMatchingDomain(url: string, pattern: string): boolean {
    if (!url || !pattern) {
      return false;
    }

    const hostname = this.getHostname(url);
    if (!hostname) {
      return false;
    }

    // 完全一致
    if (hostname === pattern) {
      return true;
    }

    // ワイルドカード対応
    if (pattern.startsWith('*.')) {
      const domain = pattern.substring(2);
      return hostname === domain || hostname.endsWith('.' + domain);
    }

    return false;
  }

  /**
   * URLパラメータを解析
   */
  getSearchParams(url: string): Record<string, string> {
    try {
      if (typeof window !== 'undefined' && window.URL) {
        const urlObj = new window.URL(url);
        const params: Record<string, string> = {};
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value;
        });
        return params;
      }
      
      if (typeof globalThis !== 'undefined' && globalThis.URL) {
        const urlObj = new globalThis.URL(url);
        const params: Record<string, string> = {};
        urlObj.searchParams.forEach((value, key) => {
          params[key] = value;
        });
        return params;
      }

      // フォールバック: 正規表現による解析
      return this.parseSearchParamsWithRegex(url);
      
    } catch (error) {
      console.warn('URLParserAdapter: Failed to parse search params:', url, error);
      return {};
    }
  }

  /**
   * URLを正規化
   */
  normalizeURL(url: string): string {
    try {
      if (typeof window !== 'undefined' && window.URL) {
        return new window.URL(url).href;
      }
      
      if (typeof globalThis !== 'undefined' && globalThis.URL) {
        return new globalThis.URL(url).href;
      }
      
      return url;
      
    } catch (error) {
      console.warn('URLParserAdapter: Failed to normalize URL:', url, error);
      return url;
    }
  }

  /**
   * 正規表現によるホスト名解析（フォールバック）
   */
  private parseHostnameWithRegex(url: string): string {
    try {
      const match = url.match(/^https?:\/\/([^/?#]+)/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }

  /**
   * 正規表現によるパス解析（フォールバック）
   */
  private parsePathnameWithRegex(url: string): string {
    try {
      const match = url.match(/^https?:\/\/[^/?#]+(\/[^?#]*)?/);
      return match && match[1] ? match[1] : '/';
    } catch {
      return '/';
    }
  }

  /**
   * 正規表現によるパラメータ解析（フォールバック）
   */
  private parseSearchParamsWithRegex(url: string): Record<string, string> {
    try {
      const params: Record<string, string> = {};
      const match = url.match(/\?([^#]*)/);
      
      if (match && match[1]) {
        const pairs = match[1].split('&');
        for (const pair of pairs) {
          const [key, value] = pair.split('=');
          if (key) {
            params[decodeURIComponent(key)] = value ? decodeURIComponent(value) : '';
          }
        }
      }
      
      return params;
    } catch {
      return {};
    }
  }
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  (window as any).URLParserAdapter = URLParserAdapter;
}