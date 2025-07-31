/**
 * 設定状態管理ストア
 * 基本設定、軌跡設定、除外サイト、デバッグ設定を管理
 */

import { GestureSettingsFactory } from '../../../domain/definitions/GestureConstants';

export function createSettingsStore() {
  // デフォルト設定を取得
  const defaultSettings = GestureSettingsFactory.createDefaultSettings();

  // 基本設定
  let enabled = $state(true);

  // 軌跡設定
  let strokeColor = $state(defaultSettings.strokeColor);
  let strokeWidth = $state(defaultSettings.strokeWidth);
  let gestureThreshold = $state(defaultSettings.gestureThreshold);

  // 除外サイト
  let excludeList = $state<string[]>([]);
  let newExcludeUrl = $state('');

  // デバッグ設定
  let debugEnabled = $state(false);
  let debugLogLevel = $state('2'); // 文字列型
  let debugShowStatus = $state(false);
  let debugStatusPosition = $state('top-right');

  // デバウンス用のタイマー
  let trackSettingsDebounceTimer: NodeJS.Timeout | null = null;

  return {
    // Basic settings getters
    get enabled() {
      return enabled;
    },
    get strokeColor() {
      return strokeColor;
    },
    get strokeWidth() {
      return strokeWidth;
    },
    get gestureThreshold() {
      return gestureThreshold;
    },

    // Exclude list getters
    get excludeList() {
      return excludeList;
    },
    get newExcludeUrl() {
      return newExcludeUrl;
    },

    // Debug settings getters
    get debugEnabled() {
      return debugEnabled;
    },
    get debugLogLevel() {
      return debugLogLevel;
    },
    get debugShowStatus() {
      return debugShowStatus;
    },
    get debugStatusPosition() {
      return debugStatusPosition;
    },

    // Debounce timer getter
    get trackSettingsDebounceTimer() {
      return trackSettingsDebounceTimer;
    },

    // Basic settings setters
    setEnabled(value: boolean) {
      enabled = value;
    },

    setStrokeColor(value: string) {
      strokeColor = value;
    },

    setStrokeWidth(value: number) {
      strokeWidth = value;
    },

    setGestureThreshold(value: number) {
      gestureThreshold = value;
    },

    // Exclude list setters
    setExcludeList(list: string[]) {
      excludeList = list;
    },

    setNewExcludeUrl(url: string) {
      newExcludeUrl = url;
    },

    addExcludeUrl(url: string) {
      if (url.trim() && !excludeList.includes(url.trim())) {
        excludeList = [...excludeList, url.trim()];
      }
    },

    removeExcludeUrl(url: string) {
      excludeList = excludeList.filter((item) => item !== url);
    },

    // Debug settings setters
    setDebugEnabled(value: boolean) {
      debugEnabled = value;
    },

    setDebugLogLevel(value: string) {
      debugLogLevel = value;
    },

    setDebugShowStatus(value: boolean) {
      debugShowStatus = value;
    },

    setDebugStatusPosition(value: string) {
      debugStatusPosition = value;
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
      enabled = settings.enabled !== false;
      strokeColor = (settings.strokeColor as string) || defaultSettings.strokeColor;
      strokeWidth = (settings.strokeWidth as number) || defaultSettings.strokeWidth;
      gestureThreshold = (settings.gestureThreshold as number) || defaultSettings.gestureThreshold;
      excludeList = (settings.excludeList as string[]) || [];
    },

    updateDebugSettings(debugEntity: {
      enabled: boolean;
      logLevel: number;
      showStatus: boolean;
      statusPosition: string;
    }) {
      debugEnabled = debugEntity.enabled;
      debugLogLevel = debugEntity.logLevel.toString();
      debugShowStatus = debugEntity.showStatus;
      debugStatusPosition = debugEntity.statusPosition;
    },
  };
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;
