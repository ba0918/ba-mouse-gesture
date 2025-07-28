/**
 * GesturePatternFormatter
 * ジェスチャーパターンの表示・フォーマット処理専用クラス
 * Clean Architecture - Presentation層
 */

class GesturePatternFormatter {
  /**
   * パターンを矢印表記に変換
   * @param {*} pattern - ジェスチャーパターン（文字列、配列、オブジェクト）
   * @param {number} maxLength - 最大表示長（省略表示用）
   * @returns {string} 矢印表記のパターン
   */
  formatPatternToArrows(pattern, maxLength = 8) {
    let arrowPattern = ''
    
    if (typeof pattern === 'string') {
      // 既に矢印文字列の場合はそのまま返す
      if (/^[↑↓←→]+$/.test(pattern)) {
        arrowPattern = pattern
      } else if (pattern.includes(',')) {
        // カンマ区切りの場合は分割して処理
        arrowPattern = pattern
          .split(',')
          .map(dir => dir.trim())
          .map(dir => this.directionToArrow(dir))
          .join('')
      } else {
        // 英語方向文字列の場合は変換
        arrowPattern = pattern
          .replace(/UP/gi, '↑')
          .replace(/DOWN/gi, '↓')
          .replace(/LEFT/gi, '←')
          .replace(/RIGHT/gi, '→')
      }
    } else if (Array.isArray(pattern)) {
      // 配列パターンの処理
      arrowPattern = pattern
        .map(dir => this.directionToArrow(dir))
        .join('')
    } else if (pattern && typeof pattern === 'object' && pattern._directions && Array.isArray(pattern._directions)) {
      // GesturePatternオブジェクトの処理
      arrowPattern = pattern._directions
        .map(dir => this.directionToArrow(dir))
        .join('')
    } else if (pattern && typeof pattern.toString === 'function') {
      // その他のオブジェクトでtoStringメソッドがある場合
      const stringPattern = pattern.toString()
      if (/^[↑↓←→]+$/.test(stringPattern)) {
        arrowPattern = stringPattern
      } else {
        arrowPattern = stringPattern
          .replace(/UP/gi, '↑')
          .replace(/DOWN/gi, '↓')
          .replace(/LEFT/gi, '←')
          .replace(/RIGHT/gi, '→')
      }
    } else {
      arrowPattern = String(pattern || '')
    }
    
    // 長すぎる場合は省略表示
    if (maxLength > 1 && arrowPattern.length > maxLength) {
      return arrowPattern.substring(0, maxLength - 1) + '…'
    }
    
    return arrowPattern
  }

  /**
   * 方向文字列を矢印に変換
   * @param {string} direction - 方向文字列
   * @returns {string} 矢印文字
   */
  directionToArrow(direction) {
    // 既に矢印の場合はそのまま
    if (/^[↑↓←→]$/.test(direction)) {
      return direction
    }
    
    const directionMap = {
      'UP': '↑', 'up': '↑', 'U': '↑',
      'DOWN': '↓', 'down': '↓', 'D': '↓',
      'LEFT': '←', 'left': '←', 'L': '←',
      'RIGHT': '→', 'right': '→', 'R': '→'
    }
    
    return directionMap[direction] || direction
  }

  /**
   * アクションの表示名を取得
   * @param {string} action - アクション名
   * @returns {string} 表示用アクション名
   */
  getActionDisplayName(action) {
    const actionNames = {
      back: 'ブラウザの戻る',
      forward: 'ブラウザの進む',
      scroll_top: 'ページ最上部スクロール',
      scroll_bottom: 'ページ最下部スクロール',
      close_tab: 'タブを閉じる',
      new_tab: '新しいタブを開く',
      duplicate_tab: 'タブ複製',
      refresh: 'ページ更新',
      hard_refresh: 'スーパーリロード',
      prev_tab: '前のタブ',
      next_tab: '次のタブ',
      
      // 追加のアクション名（将来拡張用）
      bookmark: 'ブックマーク追加',
      zoom_in: '拡大',
      zoom_out: '縮小',
      zoom_reset: 'ズームリセット',
      devtools: '開発者ツール',
      view_source: 'ソース表示',
      print: '印刷',
      find: '検索',
      fullscreen: 'フルスクリーン'
    }
    
    return actionNames[action] || action
  }

  /**
   * ジェスチャーをカテゴリ別に分類
   * @param {Array} gestures - ジェスチャー配列
   * @returns {Object} カテゴリ別のジェスチャー
   */
  groupGesturesByCategory(gestures) {
    const categories = {
      navigation: { name: 'ナビゲーション', gestures: [] },
      tabs: { name: 'タブ操作', gestures: [] },
      page: { name: 'ページ操作', gestures: [] },
      custom: { name: 'カスタム', gestures: [] }
    }

    gestures.forEach(gesture => {
      const action = gesture.action
      
      if (['back', 'forward'].includes(action)) {
        categories.navigation.gestures.push(gesture)
      } else if (['close_tab', 'new_tab', 'duplicate_tab', 'prev_tab', 'next_tab'].includes(action)) {
        categories.tabs.gestures.push(gesture)
      } else if (['scroll_top', 'scroll_bottom', 'refresh', 'hard_refresh'].includes(action)) {
        categories.page.gestures.push(gesture)
      } else {
        categories.custom.gestures.push(gesture)
      }
    })

    return categories
  }

  /**
   * パターン表示用の矢印マップを取得
   * @returns {Object} 方向→矢印のマップ
   */
  getArrowMap() {
    return {
      'UP': '↑',
      'DOWN': '↓', 
      'LEFT': '←',
      'RIGHT': '→'
    }
  }

  /**
   * パターンの複雑度を計算
   * @param {*} pattern - ジェスチャーパターン
   * @returns {number} 複雑度スコア（1-5）
   */
  calculatePatternComplexity(pattern) {
    const arrowPattern = this.formatPatternToArrows(pattern)
    const length = arrowPattern.length
    
    if (length <= 1) return 1
    if (length <= 2) return 2
    if (length <= 4) return 3
    if (length <= 6) return 4
    return 5
  }
}

// CommonJS用のエクスポート（テスト対応）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GesturePatternFormatter }
  // グローバル定義もテスト環境で必要
  global.GesturePatternFormatter = GesturePatternFormatter
}

// グローバル定義（ブラウザ環境用）
if (typeof window !== 'undefined') {
  window.GesturePatternFormatter = GesturePatternFormatter
}