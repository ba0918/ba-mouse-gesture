import { DefaultGestureDefinitions } from '../definitions/DefaultGestureDefinitions';
import { DEFAULT_STROKE_COLOR, DEFAULT_STROKE_WIDTH, DEFAULT_GESTURE_THRESHOLD } from '../definitions/GestureConstants';
import { Threshold } from '../valueObjects/Threshold';
import { DebugSettings } from './DebugSettings';

/**
 * デフォルトジェスチャー状態の型定義
 * DefaultGestureDefinitionsから動的に生成される
 */
export type DefaultGestureStates = Record<string, boolean>;

/**
 * デフォルトジェスチャー状態の実際の値を取得
 * DefaultGestureDefinitionsをSingle Source of Truthとして使用
 */
function createDefaultGestureStates(): DefaultGestureStates {
  const states: DefaultGestureStates = {};
  DefaultGestureDefinitions.getValidGestureIds().forEach((id) => {
    states[id] = true; // デフォルトは全て有効
  });
  return states;
}

/**
 * 設定データの型定義
 */
export interface SettingsConfig {
  enabled?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  gestureThreshold?: number;
  excludeList?: string[];
  defaultGestureStates?: Record<string, boolean>;
  debugSettings?: Record<string, any>; // DebugSettingsと互換性のため
}

/**
 * URLパーサーアダプターのインターフェース
 */
export interface URLParserAdapter {
  getHostname(url: string): string;
}

/**
 * Settings エンティティ
 * アプリケーション設定を表現するドメインエンティティ
 */
export class Settings {
  public enabled: boolean;
  public strokeColor: string;
  public strokeWidth: number;
  public gestureThreshold: number;
  public excludeList: string[];
  public defaultGestureStates: DefaultGestureStates;
  public debugSettings: DebugSettings;
  public readonly version: string;
  public lastModified: string;

  /**
   * @param config - 設定データ
   */
  constructor(config: SettingsConfig = {}) {
    // 基本設定
    this.enabled = config.enabled !== undefined ? config.enabled : true;
    this.strokeColor = config.strokeColor || DEFAULT_STROKE_COLOR;
    this.strokeWidth = config.strokeWidth || DEFAULT_STROKE_WIDTH;
    this.gestureThreshold = config.gestureThreshold || DEFAULT_GESTURE_THRESHOLD;
    this.excludeList = config.excludeList || [];

    // デフォルトジェスチャー状態
    const defaultStates = createDefaultGestureStates();
    this.defaultGestureStates = {
      ...defaultStates,
      ...config.defaultGestureStates,
    };

    // デバッグ設定（DebugSettingsに統一）
    this.debugSettings = config.debugSettings
      ? DebugSettings.fromPlainObject(config.debugSettings)
      : DebugSettings.getDefault();

    // メタデータ
    this.version = '1.0.0';
    this.lastModified = new Date().toISOString();
  }

  /**
   * 機能が有効かチェック
   * @returns 有効な場合true
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 機能の有効/無効を切り替え
   * @param enabled - 有効/無効
   */
  setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled);
    this.updateModified();
  }

  /**
   * 特定ジェスチャーが有効かチェック
   * @param gestureId - ジェスチャーID
   * @returns 有効な場合true
   */
  isGestureEnabled(gestureId: string): boolean {
    // バリデーション: 有効なジェスチャーIDかチェック
    if (!DefaultGestureDefinitions.getValidGestureIds().includes(gestureId)) {
      return false;
    }
    return this.defaultGestureStates[gestureId] !== false;
  }

  /**
   * ジェスチャーの有効/無効を設定
   * @param gestureId - ジェスチャーID
   * @param enabled - 有効/無効
   */
  setGestureEnabled(gestureId: string, enabled: boolean): void {
    // バリデーション: 有効なジェスチャーIDかチェック
    if (!DefaultGestureDefinitions.getValidGestureIds().includes(gestureId)) {
      throw new Error(`Invalid gesture ID: ${gestureId}`);
    }
    this.defaultGestureStates[gestureId] = Boolean(enabled);
    this.updateModified();
  }

  /**
   * 軌跡表示設定を取得
   * @returns 軌跡表示設定
   */
  getStrokeSettings(): { color: string; width: number } {
    return {
      color: this.strokeColor,
      width: this.strokeWidth,
    };
  }

  /**
   * 軌跡表示設定を更新
   * @param color - 色
   * @param width - 太さ
   */
  setStrokeSettings(color: string, width: number): void {
    if (this.isValidColor(color)) {
      this.strokeColor = color;
    }
    if (this.isValidWidth(width)) {
      this.strokeWidth = width;
    }
    this.updateModified();
  }

  /**
   * ジェスチャー検出閾値を取得
   * @returns 閾値オブジェクト
   */
  getThreshold(): Threshold {
    return new Threshold(this.gestureThreshold);
  }

  /**
   * ジェスチャー検出閾値を設定
   * @param threshold - 閾値（ピクセル）
   */
  setThreshold(threshold: number): void {
    if (threshold >= 5 && threshold <= 100) {
      this.gestureThreshold = threshold;
      this.updateModified();
    }
  }

  /**
   * 除外サイトリストを取得
   * @returns 除外サイトリストのコピー
   */
  getExcludeList(): string[] {
    return [...this.excludeList];
  }

  /**
   * 除外サイトを追加
   * @param pattern - URLパターン
   */
  addExcludeSite(pattern: string): void {
    if (pattern && !this.excludeList.includes(pattern)) {
      this.excludeList.push(pattern);
      this.updateModified();
    }
  }

  /**
   * 除外サイトを削除
   * @param pattern - URLパターン
   */
  removeExcludeSite(pattern: string): void {
    const index = this.excludeList.indexOf(pattern);
    if (index > -1) {
      this.excludeList.splice(index, 1);
      this.updateModified();
    }
  }

  /**
   * サイトが除外対象かチェック
   * @param url - チェック対象URL
   * @param urlParser - URL解析アダプター（依存性注入）
   * @returns 除外対象の場合true
   */
  isExcludedSite(url: string, urlParser?: URLParserAdapter): boolean {
    if (!url) return false;

    // Infrastructure層のURLParserAdapterを使用（Clean Architecture準拠）
    const currentHost = urlParser ? urlParser.getHostname(url) : '';

    return this.excludeList.some((pattern) => {
      // 完全URL マッチ
      if (pattern.includes('://')) {
        return url.includes(pattern) || !!url.match(pattern.replace(/\*/g, '.*'));
      }
      // ホスト名マッチ
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(currentHost);
      }
      // 部分マッチ
      return currentHost.includes(pattern);
    });
  }

  /**
   * デバッグ設定を取得
   * @returns デバッグ設定のコピー
   */
  getDebugSettings(): DebugSettings {
    return this.debugSettings.clone();
  }

  /**
   * デバッグ設定を更新
   * @param debugConfig - デバッグ設定
   */
  setDebugSettings(debugConfig: Record<string, any>): void {
    this.debugSettings = this.debugSettings.updateSettings(debugConfig);
    this.updateModified();
  }

  /**
   * 色の妥当性をチェック
   * @param color - 色コード
   * @returns 有効な場合true
   */
  isValidColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  /**
   * 幅の妥当性をチェック
   * @param width - 幅
   * @returns 有効な場合true
   */
  isValidWidth(width: number): boolean {
    return Number.isInteger(width) && width >= 1 && width <= 10;
  }

  /**
   * 設定の不変条件をチェック
   * @returns 有効な場合true
   */
  isValid(): boolean {
    return (
      this.isValidColor(this.strokeColor) &&
      this.isValidWidth(this.strokeWidth) &&
      this.gestureThreshold >= 5 &&
      this.gestureThreshold <= 100 &&
      Array.isArray(this.excludeList) &&
      this.isValidDebugSettings()
    );
  }

  /**
   * デバッグ設定の妥当性をチェック
   * @returns 有効な場合true
   */
  private isValidDebugSettings(): boolean {
    try {
      return this.debugSettings && this.debugSettings.validate();
    } catch {
      return false;
    }
  }

  /**
   * 更新日時を設定
   */
  private updateModified(): void {
    this.lastModified = new Date().toISOString();
  }

  /**
   * デフォルト設定にリセット
   */
  resetToDefaults(): void {
    const defaultConfig = new Settings();
    Object.assign(this, defaultConfig);
    this.updateModified();
  }

  /**
   * 利用可能なジェスチャーIDの一覧を取得
   * @returns ジェスチャーIDの配列
   */
  getAvailableGestureIds(): readonly string[] {
    return DefaultGestureDefinitions.getValidGestureIds();
  }

  /**
   * エンティティの複製
   * @returns 複製された設定
   */
  clone(): Settings {
    return new Settings(this.toJSON());
  }

  /**
   * シリアライズ（永続化用）
   * @returns シリアライズされたデータ
   */
  toJSON(): SettingsConfig & { version: string; lastModified: string } {
    return {
      enabled: this.enabled,
      strokeColor: this.strokeColor,
      strokeWidth: this.strokeWidth,
      gestureThreshold: this.gestureThreshold,
      excludeList: [...this.excludeList],
      defaultGestureStates: { ...this.defaultGestureStates },
      debugSettings: this.debugSettings.toPlainObject(),
      version: this.version,
      lastModified: this.lastModified,
    };
  }

  /**
   * デシリアライズ（復元用）
   * @param data - シリアライズされたデータ
   * @returns 復元された設定
   */
  static fromJSON(data: SettingsConfig): Settings {
    return new Settings(data);
  }

  /**
   * デフォルト設定を取得
   * @returns デフォルト設定
   */
  static getDefaults(): Settings {
    return new Settings();
  }
}
