/**
 * 設定状態管理ストア
 * 基本設定、軌跡設定、除外サイト、デバッグ設定を管理
 */

import { GestureSettingsFactory } from '../../../domain/definitions/GestureConstants';

export function createSettingsStore() {
  // デフォルト設定を取得
  const defaultSettings = GestureSettingsFactory.createDefaultSettings();

  // 設定状態をオブジェクトとして管理（直接再代入を避ける）
  const store = $state({
    // 基本設定
    enabled: true,

    // 軌跡設定
    strokeColor: defaultSettings.strokeColor,
    strokeWidth: defaultSettings.strokeWidth,
    gestureThreshold: defaultSettings.gestureThreshold,

    // 除外サイト
    excludeList: [] as string[],
    newExcludeUrl: '',

    // デバッグ設定
    debugEnabled: false,
    debugLogLevel: '2', // 文字列型
    debugShowStatus: false,
    debugStatusPosition: 'top-right',
  });

  // デバウンス用のタイマー
  let trackSettingsDebounceTimer: NodeJS.Timeout | null = null;

  return {
    // Basic settings properties (getter/setter)
    get enabled() {
      return store.enabled;
    },
    set enabled(value: boolean) {
      store.enabled = value;
    },
    get strokeColor() {
      return store.strokeColor;
    },
    set strokeColor(value: string) {
      store.strokeColor = value;
    },
    get strokeWidth() {
      return store.strokeWidth;
    },
    set strokeWidth(value: number) {
      store.strokeWidth = value;
    },
    get gestureThreshold() {
      return store.gestureThreshold;
    },
    set gestureThreshold(value: number) {
      store.gestureThreshold = value;
    },

    // Exclude list properties (getter/setter)
    get excludeList() {
      return store.excludeList;
    },
    set excludeList(value: string[]) {
      store.excludeList.splice(0, store.excludeList.length, ...value);
    },
    get newExcludeUrl() {
      return store.newExcludeUrl;
    },
    set newExcludeUrl(value: string) {
      store.newExcludeUrl = value;
    },

    // Debug settings properties (getter/setter)
    get debugEnabled() {
      return store.debugEnabled;
    },
    set debugEnabled(value: boolean) {
      store.debugEnabled = value;
    },
    get debugLogLevel() {
      return store.debugLogLevel;
    },
    set debugLogLevel(value: string) {
      store.debugLogLevel = value;
    },
    get debugShowStatus() {
      return store.debugShowStatus;
    },
    set debugShowStatus(value: boolean) {
      store.debugShowStatus = value;
    },
    get debugStatusPosition() {
      return store.debugStatusPosition;
    },
    set debugStatusPosition(value: string) {
      store.debugStatusPosition = value;
    },

    // Debounce timer getter
    get trackSettingsDebounceTimer() {
      return trackSettingsDebounceTimer;
    },

    // Basic settings setters
    setEnabled(value: boolean) {
      store.enabled = value;
    },

    setStrokeColor(value: string) {
      store.strokeColor = value;
    },

    setStrokeWidth(value: number) {
      store.strokeWidth = value;
    },

    setGestureThreshold(value: number) {
      store.gestureThreshold = value;
    },

    // Exclude list setters
    setExcludeList(list: string[]) {
      store.excludeList.splice(0, store.excludeList.length, ...list);
    },

    setNewExcludeUrl(url: string) {
      store.newExcludeUrl = url;
    },

    addExcludeUrl(url: string) {
      if (url.trim() && !store.excludeList.includes(url.trim())) {
        store.excludeList.push(url.trim());
      }
    },

    removeExcludeUrl(url: string) {
      const index = store.excludeList.indexOf(url);
      if (index !== -1) {
        store.excludeList.splice(index, 1);
      }
    },

    // Debug settings setters
    setDebugEnabled(value: boolean) {
      store.debugEnabled = value;
    },

    setDebugLogLevel(value: string) {
      store.debugLogLevel = value;
    },

    setDebugShowStatus(value: boolean) {
      store.debugShowStatus = value;
    },

    setDebugStatusPosition(value: string) {
      store.debugStatusPosition = value;
    },

    // Debounce timer management
    setTrackSettingsDebounceTimer(timer: NodeJS.Timeout | null) {
      trackSettingsDebounceTimer = timer;
    },

    clearTrackSettingsDebounceTimer() {
      if (trackSettingsDebounceTimer) {
        clearTimeout(trackSettingsDebounceTimer);
        trackSettingsDebounceTimer = null;
      }
    },

    // Bulk settings update (for initialization)
    updateSettings(settings: Record<string, unknown>) {
      store.enabled = settings.enabled !== false;
      store.strokeColor = (settings.strokeColor as string) || defaultSettings.strokeColor;
      store.strokeWidth = (settings.strokeWidth as number) || defaultSettings.strokeWidth;
      store.gestureThreshold = (settings.gestureThreshold as number) || defaultSettings.gestureThreshold;
      store.excludeList = (settings.excludeList as string[]) || [];
    },

    updateDebugSettings(debugEntity: {
      enabled: boolean;
      logLevel: number;
      showStatus: boolean;
      statusPosition: string;
    }) {
      store.debugEnabled = debugEntity.enabled;
      store.debugLogLevel = debugEntity.logLevel.toString();
      store.debugShowStatus = debugEntity.showStatus;
      store.debugStatusPosition = debugEntity.statusPosition;
    },
  };
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
