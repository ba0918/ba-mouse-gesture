/**
 * NoOpLogger - 何もしないLogger実装
 * Null Objectパターンを適用し、loggerがnullの場合のチェックを不要にする
 */

export class NoOpLogger {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  debug(_message: string, ..._args: unknown[]): void {
    // 何もしない
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  info(_message: string, ..._args: unknown[]): void {
    // 何もしない
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  warn(_message: string, ..._args: unknown[]): void {
    // 何もしない
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error(_message: string, ..._args: unknown[]): void {
    // 何もしない
  }
}
