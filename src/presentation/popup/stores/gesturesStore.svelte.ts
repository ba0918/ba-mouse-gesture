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
  // ジェスチャー状態をオブジェクトとして管理（直接再代入を避ける）
  const store = $state({
    gestures: [] as UIGesture[],
    customGestures: [] as UICustomGesture[],
    gestureSearch: '',
    gestureFilter: 'all',

    // カスタムジェスチャー追加フォーム
    gestureName: '',
    gesturePatternDisplay: '',
    gestureAction: 'back',
    currentPattern: [] as string[],
    customGestureError: '',
  });

  return {
    // Gestures properties (getter/setter)
    get gestures() {
      return store.gestures;
    },
    set gestures(value: UIGesture[]) {
      store.gestures.splice(0, store.gestures.length, ...value);
    },
    get customGestures() {
      return store.customGestures;
    },
    set customGestures(value: UICustomGesture[]) {
      store.customGestures = [...value];
    },
    get gestureSearch() {
      return store.gestureSearch;
    },
    set gestureSearch(value: string) {
      store.gestureSearch = value;
    },
    get gestureFilter() {
      return store.gestureFilter;
    },
    set gestureFilter(value: string) {
      store.gestureFilter = value;
    },

    // Custom gesture form properties (getter/setter)
    get gestureName() {
      return store.gestureName;
    },
    set gestureName(value: string) {
      store.gestureName = value;
    },
    get gesturePatternDisplay() {
      return store.gesturePatternDisplay;
    },
    set gesturePatternDisplay(value: string) {
      store.gesturePatternDisplay = value;
    },
    get gestureAction() {
      return store.gestureAction;
    },
    set gestureAction(value: string) {
      store.gestureAction = value;
    },
    get currentPattern() {
      return store.currentPattern;
    },
    set currentPattern(value: string[]) {
      store.currentPattern.splice(0, store.currentPattern.length, ...value);
    },
    get customGestureError() {
      return store.customGestureError;
    },
    set customGestureError(value: string) {
      store.customGestureError = value;
    },

    // Gestures setters
    setGestures(newGestures: UIGesture[]) {
      store.gestures.splice(0, store.gestures.length, ...newGestures);
    },

    setCustomGestures(newCustomGestures: UICustomGesture[]) {
      // Svelte 5のリアクティブシステムに確実に通知するため、新しい配列参照で代入
      store.customGestures = [...newCustomGestures];
    },

    setGestureSearch(search: string) {
      store.gestureSearch = search;
    },

    setGestureFilter(filter: string) {
      store.gestureFilter = filter;
    },

    // Custom gesture form setters
    setGestureName(name: string) {
      store.gestureName = name;
    },

    setGesturePatternDisplay(pattern: string) {
      store.gesturePatternDisplay = pattern;
    },

    setGestureAction(action: string) {
      store.gestureAction = action;
    },

    setCurrentPattern(pattern: string[]) {
      store.currentPattern.splice(0, store.currentPattern.length, ...pattern);
    },

    setCustomGestureError(error: string) {
      store.customGestureError = error;
    },

    // Custom gesture form operations
    clearCustomGestureForm() {
      store.gestureName = '';
      store.gesturePatternDisplay = '';
      store.gestureAction = 'back';
      store.currentPattern.splice(0);
      store.customGestureError = '';
    },

    addDirection(direction: string) {
      store.currentPattern.push(direction);
      store.gesturePatternDisplay = store.currentPattern.join('');
    },

    clearPattern() {
      store.currentPattern.splice(0);
      store.gesturePatternDisplay = '';
    },

    clearCustomGestureError() {
      store.customGestureError = '';
    },

    // Gesture operations
    updateGestureEnabled(gestureId: string, enabled: boolean) {
      // Update in default gestures with explicit array reassignment for reactivity
      const defaultGestureIndex = store.gestures.findIndex((g) => g.id === gestureId);
      if (defaultGestureIndex !== -1) {
        store.gestures[defaultGestureIndex] = {
          ...store.gestures[defaultGestureIndex],
          enabled: enabled,
        };
      }

      // Update in custom gestures with explicit array reassignment for reactivity
      const customGestureIndex = store.customGestures.findIndex((g) => g.id === gestureId);
      if (customGestureIndex !== -1) {
        store.customGestures[customGestureIndex] = {
          ...store.customGestures[customGestureIndex],
          enabled: enabled,
        };
      }
    },

    removeCustomGesture(gestureId: string) {
      store.customGestures = store.customGestures.filter((gesture) => gesture.id !== gestureId);
      store.gestures = store.gestures.filter((gesture) => gesture.id !== gestureId);
    },

    addCustomGesture(gesture: UICustomGesture) {
      store.customGestures = [...store.customGestures, gesture];
      store.gestures = [...store.gestures, gesture];
    },
  };
}

export type GesturesStore = ReturnType<typeof createGesturesStore>;
export type { UIGesture, UICustomGesture };
