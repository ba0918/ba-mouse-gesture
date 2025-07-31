import { DefaultGestureDefinitions } from "../definitions/DefaultGestureDefinitions";
import { GesturePattern } from "../valueObjects/GesturePattern";
import { Threshold } from "../valueObjects/Threshold";

// GestureActionは重複なので削除し、ActionNameに統一
import type { ActionName } from "../types/ActionName";
export type GestureAction = ActionName;

/**
 * Gesture エンティティ
 * ジェスチャーの基本概念を表現するドメインエンティティ
 */
export class Gesture {
  public id: string;
  public name: string;
  public pattern: GesturePattern;
  public action: GestureAction;
  public enabled: boolean;
  public createdAt: string;

  /**
   * @param id - ジェスチャーID
   * @param name - ジェスチャー名（表示用）
   * @param pattern - ジェスチャーパターン
   * @param action - 実行アクション
   * @param enabled - 有効/無効状態
   */
  constructor(id: string, name: string, pattern: GesturePattern, action: GestureAction, enabled: boolean = true) {
    this.id = id;
    this.name = name;
    this.pattern = pattern;
    this.action = action;
    this.enabled = enabled;
    this.createdAt = new Date().toISOString();
  }

  /**
   * ジェスチャーが有効かチェック
   * @returns 有効な場合true
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * ジェスチャーを有効/無効切り替え
   * @param enabled - 有効/無効
   */
  setEnabled(enabled: boolean): void {
    this.enabled = Boolean(enabled);
  }

  /**
   * パターンマッチングを実行
   * @param inputPattern - 入力パターン
   * @param threshold - マッチング閾値
   * @returns マッチする場合true
   */
  matches(inputPattern: GesturePattern, threshold: Threshold): boolean {
    return this.pattern.matches(inputPattern, threshold);
  }

  /**
   * 基本ジェスチャーかどうか判定
   * @returns 基本ジェスチャーの場合true
   */
  isBasicGesture(): boolean {
    const definition = DefaultGestureDefinitions.getDefinitionById(this.id);
    return definition?.category === "basic";
  }

  /**
   * 複合ジェスチャーかどうか判定
   * @returns 複合ジェスチャーの場合true
   */
  isComplexGesture(): boolean {
    return !this.isBasicGesture();
  }

  /**
   * ジェスチャーの方向数取得
   * @returns 方向数
   */
  getComplexity(): number {
    return this.pattern.getLength();
  }

  /**
   * 表示用にフォーマットされたパターンを取得
   * @returns フォーマット済みパターン
   */
  getFormattedPattern(): string {
    return this.pattern.toString();
  }

  /**
   * アクションの表示名を取得
   * @returns アクション表示名
   */
  getActionDisplayName(): string {
    const displayNames = DefaultGestureDefinitions.getActionDisplayNames();
    return displayNames[this.action] || this.action;
  }

  /**
   * エンティティの不変条件をチェック
   * @returns 有効な場合true
   */
  isValid(): boolean {
    const hasId = Boolean(this.id);
    const hasName = Boolean(this.name);
    const hasPattern = Boolean(this.pattern);
    const hasAction = Boolean(this.action);
    const patternIsValid = this.pattern ? this.pattern.isValid() : false;

    return Boolean(
      hasId
        && hasName
        && hasPattern
        && hasAction
        && patternIsValid,
    );
  }

  /**
   * エンティティの複製
   * @returns 複製されたジェスチャー
   */
  clone(): Gesture {
    return new Gesture(
      this.id,
      this.name,
      this.pattern.clone(),
      this.action,
      this.enabled,
    );
  }

  /**
   * シリアライズ（永続化用）
   * @returns シリアライズされたデータ
   */
  toJSON(): {
    id: string;
    name: string;
    pattern: string[];
    action: GestureAction;
    enabled: boolean;
    createdAt: string;
  } {
    return {
      id: this.id,
      name: this.name,
      pattern: this.pattern.toArray(),
      action: this.action,
      enabled: this.enabled,
      createdAt: this.createdAt,
    };
  }

  /**
   * デシリアライズ（復元用）
   * @param data - シリアライズされたデータ
   * @returns 復元されたジェスチャー
   */
  static fromJSON(data: any): Gesture {
    // データ形式のバリデーション
    if (!data || typeof data !== "object") {
      throw new Error("Invalid data format: data must be an object");
    }

    // 必須フィールドのチェック
    if (!data.id || !data.name || !data.action) {
      throw new Error("Invalid data format: missing required fields (id, name, action)");
    }

    // パターンのデシリアライゼーション
    const pattern = GesturePattern.fromArray(data.pattern);

    // デフォルト値の設定
    const enabled = data.enabled !== undefined ? Boolean(data.enabled) : true;

    const gesture = new Gesture(data.id, data.name, pattern, data.action as GestureAction, enabled);
    gesture.createdAt = data.createdAt || new Date().toISOString();
    return gesture;
  }
}
