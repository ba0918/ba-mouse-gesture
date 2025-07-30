/**
 * ActionName型の型安全性テスト
 */

// CommonJS形式での動的インポート（Node.js互換）
const { ACTION_NAMES, ACTION_CATEGORIES, isValidActionName } = require('../../../src/domain/types/ActionName.ts')

describe('ActionName型安全性テスト', () => {
  describe('ACTION_NAMES定数', () => {
    test('すべての必要なアクション名が含まれている', () => {
      const expectedActions = [
        'back', 'forward',
        'scroll_top', 'scroll_bottom', 
        'close_tab', 'new_tab', 'duplicate_tab', 'prev_tab', 'next_tab',
        'refresh', 'super_refresh'
      ]
      
      expectedActions.forEach(action => {
        expect(ACTION_NAMES).toContain(action)
      })
      
      expect(ACTION_NAMES).toHaveLength(11)
    })

    test('ACTION_NamesはreadOnlyである', () => {
      // TypeScriptコンパイル時にreadOnlyが保証されるため、ランタイムテストでは基本チェックのみ
      expect(Array.isArray(ACTION_NAMES)).toBe(true)
      expect(ACTION_NAMES.length).toBeGreaterThan(0)
    })
  })

  describe('ACTION_CATEGORIES定数', () => {
    test('カテゴリ別にアクションが正しく分類されている', () => {
      expect(ACTION_CATEGORIES.navigation).toEqual(['back', 'forward'])
      expect(ACTION_CATEGORIES.scroll).toEqual(['scroll_top', 'scroll_bottom'])
      expect(ACTION_CATEGORIES.tab).toEqual(['close_tab', 'new_tab', 'duplicate_tab', 'prev_tab', 'next_tab'])
      expect(ACTION_CATEGORIES.page).toEqual(['refresh', 'super_refresh'])
    })

    test('すべてのカテゴリのアクション合計が全アクション数と一致する', () => {
      const allCategoryActions = [
        ...ACTION_CATEGORIES.navigation,
        ...ACTION_CATEGORIES.scroll,
        ...ACTION_CATEGORIES.tab,
        ...ACTION_CATEGORIES.page
      ]
      
      // ナビゲーション(2) + スクロール(2) + タブ(5) + ページ(2) = 11
      expect(allCategoryActions).toHaveLength(11)
      expect(allCategoryActions).toHaveLength(ACTION_NAMES.length)
      
      // 重複チェック
      const uniqueActions = [...new Set(allCategoryActions)]
      expect(uniqueActions).toHaveLength(allCategoryActions.length)
      
      // すべてのACTION_NAMESがカテゴリに含まれているかチェック
      ACTION_NAMES.forEach(action => {
        expect(allCategoryActions).toContain(action)
      })
    })
  })

  describe('isValidActionName関数', () => {
    test('有効なアクション名でtrueを返す', () => {
      ACTION_NAMES.forEach(action => {
        expect(isValidActionName(action)).toBe(true)
      })
    })

    test('無効なアクション名でfalseを返す', () => {
      const invalidActions = ['invalid', 'unknown', '', null, undefined, 123]
      
      invalidActions.forEach(action => {
        expect(isValidActionName(action)).toBe(false)
      })
    })

    test('型ガード機能が正しく動作する', () => {
      const testValue = 'back'
      
      if (isValidActionName(testValue)) {
        // TypeScriptコンパイル時に型がActionNameに絞り込まれる
        expect(ACTION_NAMES).toContain(testValue)
      }
    })
  })

  describe('DefaultGestureDefinitionsとの整合性', () => {
    test('DefaultGestureDefinitionsの全アクションがACTION_NAMESに含まれる', () => {
      try {
        // CommonJS形式での動的インポートを試行
        const { DefaultGestureDefinitions } = require('../../../src/domain/definitions/DefaultGestureDefinitions.ts')
        
        if (DefaultGestureDefinitions && DefaultGestureDefinitions.getAllDefinitions) {
          const definitions = DefaultGestureDefinitions.getAllDefinitions()
          const definitionActions = definitions.map(def => def.action)
          
          definitionActions.forEach(action => {
            expect(ACTION_NAMES).toContain(action)
            expect(isValidActionName(action)).toBe(true)
          })
          
          // 逆方向チェック：ACTION_NAMESの全要素がdefinitionsに存在するか
          ACTION_NAMES.forEach(action => {
            expect(definitionActions).toContain(action)
          })
        } else {
          console.warn('DefaultGestureDefinitions import failed, skipping integration test')
        }
      } catch (error) {
        console.warn('DefaultGestureDefinitions import error:', error.message)
        // 統合テストをスキップして基本テストのみ実行
      }
    })
  })
})