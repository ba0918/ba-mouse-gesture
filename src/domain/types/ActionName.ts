/**
 * アクション名の型定義
 * DefaultGestureDefinitionsのGESTURE_DEFINITIONSから抽出されたactionフィールドの値をUnion型として定義
 */

/**
 * 基本ナビゲーションアクション
 */
export type NavigationAction = 'back' | 'forward';

/**
 * スクロールアクション
 */
export type ScrollAction = 'scroll_top' | 'scroll_bottom';

/**
 * タブ操作アクション
 */
export type TabAction = 'close_tab' | 'new_tab' | 'duplicate_tab' | 'prev_tab' | 'next_tab';

/**
 * ページ操作アクション
 */
export type PageAction = 'refresh' | 'super_refresh';

/**
 * すべてのアクション名のUnion型
 * DefaultGestureDefinitionsのGESTURE_DEFINITIONSから抽出された値を型安全に表現
 */
export type ActionName = NavigationAction | ScrollAction | TabAction | PageAction;

/**
 * アクション名の一覧（実行時使用）
 */
export const ACTION_NAMES: readonly ActionName[] = [
  // ナビゲーション
  'back',
  'forward',

  // スクロール
  'scroll_top',
  'scroll_bottom',

  // タブ操作
  'close_tab',
  'new_tab',
  'duplicate_tab',
  'prev_tab',
  'next_tab',

  // ページ操作
  'refresh',
  'super_refresh',
] as const;

/**
 * アクション名の型安全チェック用ガード関数
 */
export function isValidActionName(value: string): value is ActionName {
  return ACTION_NAMES.includes(value as ActionName);
}

/**
 * カテゴリ別アクション名マッピング
 */
export const ACTION_CATEGORIES = {
  navigation: ['back', 'forward'] as const,
  scroll: ['scroll_top', 'scroll_bottom'] as const,
  tab: ['close_tab', 'new_tab', 'duplicate_tab', 'prev_tab', 'next_tab'] as const,
  page: ['refresh', 'super_refresh'] as const,
} as const;
