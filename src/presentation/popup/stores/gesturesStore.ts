/**
 * ジェスチャー状態管理ストア
 * デフォルトジェスチャー、カスタムジェスチャー、検索・フィルタリング状態を管理
 */

import type { ActionName } from '../../../domain/types/ActionName';

// UI用の型定義
interface UIGesture {
  id: string;
  name: string;
  pattern: string;
  action: ActionName;
  description: string;
  enabled: boolean;
  type?: 'default' | 'custom';
}

interface UICustomGesture extends UIGesture {
  type: 'custom';
}

export function createGesturesStore() {
  // ジェスチャー状態
  let gestures = $state<UIGesture[]>([]);
  let customGestures = $state<UICustomGesture[]>([]);
  let gestureSearch = $state('');
  let gestureFilter = $state('all');

  // カスタムジェスチャー追加フォーム
  let gestureName = $state('');
  let gesturePatternDisplay = $state('');
  let gestureAction = $state('back');
  let currentPattern = $state<string[]>([]);
  let customGestureError = $state('');

  return {
    // Gestures getters
    get gestures() {
      return gestures;
    },
    get customGestures() {
      return customGestures;
    },
    get gestureSearch() {
      return gestureSearch;
    },
    get gestureFilter() {
      return gestureFilter;
    },

    // Custom gesture form getters
    get gestureName() {
      return gestureName;
    },
    get gesturePatternDisplay() {
      return gesturePatternDisplay;
    },
    get gestureAction() {
      return gestureAction;
    },
    get currentPattern() {
      return currentPattern;
    },
    get customGestureError() {
      return customGestureError;
    },

    // Gestures setters
    setGestures(newGestures: UIGesture[]) {
      gestures = [...newGestures];
    },

    setCustomGestures(newCustomGestures: UICustomGesture[]) {
      customGestures = [...newCustomGestures];
    },

    setGestureSearch(search: string) {
      gestureSearch = search;
    },

    setGestureFilter(filter: string) {
      gestureFilter = filter;
    },

    // Custom gesture form setters
    setGestureName(name: string) {
      gestureName = name;
    },

    setGesturePatternDisplay(pattern: string) {
      gesturePatternDisplay = pattern;
    },

    setGestureAction(action: string) {
      gestureAction = action;
    },

    setCurrentPattern(pattern: string[]) {
      currentPattern = [...pattern];
    },

    setCustomGestureError(error: string) {
      customGestureError = error;
    },

    // Custom gesture form operations
    clearCustomGestureForm() {
      gestureName = '';
      gesturePatternDisplay = '';
      gestureAction = 'back';
      currentPattern = [];
      customGestureError = '';
    },

    // Gesture operations
    updateGestureEnabled(gestureId: string, enabled: boolean) {
      // Update in default gestures
      gestures = gestures.map((gesture) => (gesture.id === gestureId ? { ...gesture, enabled } : gesture));

      // Update in custom gestures
      customGestures = customGestures.map((gesture) => (gesture.id === gestureId ? { ...gesture, enabled } : gesture));
    },

    removeCustomGesture(gestureId: string) {
      customGestures = customGestures.filter((gesture) => gesture.id !== gestureId);
    },

    addCustomGesture(gesture: UICustomGesture) {
      customGestures = [...customGestures, gesture];
    },
  };
}

export type GesturesStore = ReturnType<typeof createGesturesStore>;
export type { UIGesture, UICustomGesture };
