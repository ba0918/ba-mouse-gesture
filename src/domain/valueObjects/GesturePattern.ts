import { Point } from './Point';
import { Threshold } from './Threshold';

/**
 * ジェスチャーの方向を表す型（矢印記号統一）
 */
export type Direction = '↑' | '↓' | '←' | '→';

/**
 * 有効な方向の定数配列
 */
const VALID_DIRECTIONS: Direction[] = ['↑', '↓', '←', '→'];

/**
 * GesturePattern 値オブジェクト
 * ジェスチャーのパターン（方向の配列）を表現する不変オブジェクト
 * 矢印記号統一により設計を大幅簡素化
 */
export class GesturePattern {
  private readonly _directions: Direction[];
  private readonly _length: number;

  /**
   * @param directions - 方向の配列
   */
  constructor(directions: Direction[]) {
    if (!Array.isArray(directions)) {
      throw new Error('Directions must be an array');
    }

    this._directions = directions.map((dir) => this.validateDirection(dir));
    this._length = this._directions.length;
    Object.freeze(this._directions);
    Object.freeze(this);
  }

  /**
   * 方向の妥当性をチェック
   * @param direction - チェックする方向
   * @returns 検証済みの方向
   */
  private validateDirection(direction: string): Direction {
    if (!VALID_DIRECTIONS.includes(direction as Direction)) {
      throw new Error(`Invalid direction: ${direction}. Must be one of: ${VALID_DIRECTIONS.join(', ')}`);
    }
    return direction as Direction;
  }

  /**
   * 方向配列を取得
   * @returns 方向配列のコピー
   */
  getDirections(): Direction[] {
    return [...this._directions];
  }

  /**
   * パターンの長さを取得
   * @returns パターンの長さ
   */
  getLength(): number {
    return this._length;
  }

  /**
   * 特定インデックスの方向を取得
   * @param index - インデックス
   * @returns 方向（存在しない場合はundefined）
   */
  getDirection(index: number): Direction | undefined {
    return this._directions[index];
  }

  /**
   * 最初の方向を取得
   * @returns 最初の方向（存在しない場合はundefined）
   */
  getFirst(): Direction | undefined {
    return this._directions[0];
  }

  /**
   * 最後の方向を取得
   * @returns 最後の方向（存在しない場合はundefined）
   */
  getLast(): Direction | undefined {
    return this._directions[this._length - 1];
  }

  /**
   * パターンが空かチェック
   * @returns 空の場合true
   */
  isEmpty(): boolean {
    return this._length === 0;
  }

  /**
   * 基本パターン（単一方向）かチェック
   * @returns 単一方向の場合true
   */
  isSimple(): boolean {
    return this._length === 1;
  }

  /**
   * 複合パターンかチェック
   * @returns 複合パターンの場合true
   */
  isComplex(): boolean {
    return this._length > 1;
  }

  /**
   * 他のパターンとの一致をチェック（完全一致）
   * @param other - 比較対象のパターン
   * @returns 完全一致の場合true
   */
  exactMatch(other: GesturePattern): boolean {
    if (!(other instanceof GesturePattern)) {
      return false;
    }

    if (this._length !== other._length) {
      return false;
    }

    return this._directions.every((dir, index) => dir === other._directions[index]);
  }

  /**
   * 他のパターンとの類似度を計算（閾値ベース）
   * @param other - 比較対象のパターン
   * @param threshold - 閾値
   * @returns マッチする場合true
   */
  matches(other: GesturePattern, threshold: Threshold): boolean {
    if (!(other instanceof GesturePattern)) {
      return false;
    }

    const similarity = this.calculateSimilarity(other);
    return similarity >= threshold.getMatchThreshold();
  }

  /**
   * 他のパターンとの類似度を計算（0-1）
   * @param other - 比較対象のパターン
   * @returns 類似度（0-1）
   */
  calculateSimilarity(other: GesturePattern): number {
    if (!(other instanceof GesturePattern)) {
      return 0;
    }

    // 空パターンの場合
    if (this.isEmpty() && other.isEmpty()) {
      return 1.0;
    }
    if (this.isEmpty() || other.isEmpty()) {
      return 0.0;
    }

    // レーベンシュタイン距離を使用
    const distance = this.levenshteinDistance(other);
    const maxLength = Math.max(this._length, other._length);

    return 1.0 - distance / maxLength;
  }

  /**
   * レーベンシュタイン距離を計算
   * @param other - 比較対象のパターン
   * @returns レーベンシュタイン距離
   */
  levenshteinDistance(other: GesturePattern): number {
    const a = this._directions;
    const b = other._directions;
    const matrix: number[][] = [];

    // 初期化
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    // DP計算
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b[i - 1] === a[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1, // 置換
            matrix[i][j - 1] + 1, // 挿入
            matrix[i - 1][j] + 1, // 削除
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * 最長共通部分列（LCS）を計算
   * @param other - 比較対象のパターン
   * @returns LCSパターン
   */
  longestCommonSubsequence(other: GesturePattern): GesturePattern {
    const a = this._directions;
    const b = other._directions;
    const matrix: number[][] = [];

    // LCS DP テーブル初期化
    for (let i = 0; i <= a.length; i++) {
      matrix[i] = new Array(b.length + 1).fill(0);
    }

    // LCS 計算
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        }
      }
    }

    // LCS 再構築
    const lcs: Direction[] = [];
    let i = a.length,
      j = b.length;

    while (i > 0 && j > 0) {
      if (a[i - 1] === b[j - 1]) {
        lcs.unshift(a[i - 1]);
        i--;
        j--;
      } else if (matrix[i - 1][j] > matrix[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return new GesturePattern(lcs);
  }

  /**
   * パターンを逆順にした新しいパターンを生成
   * @returns 逆順のパターン
   */
  reverse(): GesturePattern {
    return new GesturePattern([...this._directions].reverse());
  }

  /**
   * 部分パターンを取得
   * @param start - 開始インデックス
   * @param end - 終了インデックス（含まない）
   * @returns 部分パターン
   */
  slice(start: number, end?: number): GesturePattern {
    return new GesturePattern(this._directions.slice(start, end));
  }

  /**
   * パターンの複雑度を計算
   * @returns 複雑度
   */
  getComplexity(): number {
    if (this.isEmpty()) return 0;

    // 方向変化の回数を基本複雑度とする
    let changes = 0;
    for (let i = 1; i < this._length; i++) {
      if (this._directions[i] !== this._directions[i - 1]) {
        changes++;
      }
    }

    // 長さと変化の組み合わせで複雑度を算出
    return this._length + changes * 2;
  }

  /**
   * パターンが有効かチェック
   * @returns 有効な場合true
   */
  isValid(): boolean {
    return this._length > 0 && this._directions.every((dir) => VALID_DIRECTIONS.includes(dir));
  }

  /**
   * パターンを複製
   * @returns 複製されたパターン
   */
  clone(): GesturePattern {
    return new GesturePattern([...this._directions]);
  }

  /**
   * 文字列表現（矢印記号の連続）
   * @returns 文字列表現 例: "↑↓←→"
   */
  toString(): string {
    return this._directions.join('');
  }

  /**
   * 配列表現
   * @returns 配列表現
   */
  toArray(): Direction[] {
    return [...this._directions];
  }

  /**
   * JSON表現
   * @returns JSON表現
   */
  toJSON(): Direction[] {
    return this.toArray();
  }

  /**
   * 配列からGesturePatternを復元
   * @param directions - 方向データ
   * @returns 復元されたパターン
   */
  static fromArray(directions: Direction[]): GesturePattern {
    if (!Array.isArray(directions)) {
      throw new Error('Directions must be an array');
    }
    return new GesturePattern(directions);
  }

  /**
   * 文字列からGesturePatternを復元
   * @param str - 矢印文字列 例: "↑↓←→"
   * @returns 復元されたパターン
   */
  static fromString(str: string): GesturePattern {
    if (!str || typeof str !== 'string') {
      return new GesturePattern([]);
    }
    return new GesturePattern(str.split('') as Direction[]);
  }

  /**
   * 空のパターンを生成
   * @returns 空のパターン
   */
  static empty(): GesturePattern {
    return new GesturePattern([]);
  }

  /**
   * 単一方向パターンを生成
   * @param direction - 方向
   * @returns 単一方向パターン
   */
  static single(direction: Direction): GesturePattern {
    return new GesturePattern([direction]);
  }

  /**
   * 点の配列からパターンを生成
   * @param points - 点の配列（PointオブジェクトまたはPoint互換オブジェクト）
   * @param threshold - 閾値
   * @returns 生成されたパターン
   */
  static fromPoints(points: Point[] | Array<{ x: number; y: number }>, threshold: Threshold): GesturePattern {
    if (!Array.isArray(points) || points.length < 2) {
      return GesturePattern.empty();
    }

    const directions: Direction[] = [];
    const minDistance = threshold.getDetectionThreshold();

    for (let i = 0; i < points.length - 1; i++) {
      const current = points[i];
      const next = points[i + 1];

      // 距離計算（Point互換オブジェクトに対応）
      const dx = next.x - current.x;
      const dy = next.y - current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= minDistance) {
        // 角度計算（Point互換オブジェクトに対応）
        const angle = Math.atan2(dy, dx);
        const direction = GesturePattern.angleToDirection(angle);

        // 連続する同じ方向は無視
        if (directions.length === 0 || directions[directions.length - 1] !== direction) {
          directions.push(direction);
        }
      }
    }

    return new GesturePattern(directions);
  }

  /**
   * 角度を方向に変換
   * @param angle - ラジアン
   * @returns 方向
   */
  static angleToDirection(angle: number): Direction {
    const degree = ((angle * 180) / Math.PI + 360) % 360;

    if (degree >= 315 || degree < 45) return '→';
    if (degree >= 45 && degree < 135) return '↓';
    if (degree >= 135 && degree < 225) return '←';
    if (degree >= 225 && degree < 315) return '↑';

    return '→'; // fallback
  }
}
