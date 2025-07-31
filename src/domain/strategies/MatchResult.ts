/**
 * MatchResult
 * マッチング結果を表すValue Object
 */

export type MatchingAlgorithm = "exact" | "levenshtein" | "lcs" | "fuzzy" | "adaptive";

/**
 * マッチング結果
 */
export class MatchResult {
  public strategy?: string;
  public threshold?: number;
  public readonly timestamp: string;

  constructor(
    public similarity: number,
    public isMatch: boolean,
    public algorithm: string,
    public metadata: Record<string, unknown> = {},
  ) {
    this.timestamp = new Date().toISOString();
  }

  /**
   * 信頼度を取得
   */
  getConfidence(): number {
    return this.isMatch ? this.similarity : 0;
  }

  /**
   * マッチが成功したかチェック
   */
  isSuccess(): boolean {
    return this.isMatch;
  }
}

/**
 * 最良マッチ結果
 */
export class BestMatchResult {
  constructor(
    public matchResult: MatchResult | null,
    public pattern: unknown | null,
    public index: number,
  ) {}

  /**
   * マッチが見つかったかチェック
   */
  hasMatch(): boolean {
    return this.matchResult !== null && this.matchResult.isMatch;
  }

  /**
   * 類似度を取得
   */
  getSimilarity(): number {
    return this.matchResult ? this.matchResult.similarity : 0;
  }
}
