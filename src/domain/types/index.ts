/**
 * ドメイン層の型定義エクスポート
 */

export type {
  ActionName,
  NavigationAction,
  ScrollAction,
  TabAction,
  PageAction
} from './ActionName';

export {
  ACTION_NAMES,
  ACTION_CATEGORIES,
  isValidActionName
} from './ActionName';