/**
 * ILogger - Logger Interface
 * Clean Architecture - Application層のインターフェース定義
 * Infrastructure層への依存を避けるための抽象化
 */

export interface ILogger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
