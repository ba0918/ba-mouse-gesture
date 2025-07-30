/**
 * NoOpLogger テスト
 * Null Objectパターンの実装検証
 */

describe('NoOpLogger', () => {
  let NoOpLogger

  beforeEach(() => {
    // NoOpLoggerをrequire
    NoOpLogger = require('../../../src/infrastructure/adapters/NoOpLogger').NoOpLogger
  })

  describe('ログメソッド', () => {
    let logger
    let consoleSpies

    beforeEach(() => {
      logger = new NoOpLogger()
      // コンソールメソッドをスパイ
      consoleSpies = {
        error: jest.spyOn(console, 'error').mockImplementation(),
        warn: jest.spyOn(console, 'warn').mockImplementation(),
        log: jest.spyOn(console, 'log').mockImplementation()
      }
    })

    afterEach(() => {
      // スパイをリストア
      Object.values(consoleSpies).forEach(spy => spy.mockRestore())
    })

    test('debugメソッドは何も出力しない', () => {
      logger.debug('Debug message', { data: 'test' })
      
      expect(consoleSpies.log).not.toHaveBeenCalled()
      expect(consoleSpies.error).not.toHaveBeenCalled()
      expect(consoleSpies.warn).not.toHaveBeenCalled()
    })

    test('infoメソッドは何も出力しない', () => {
      logger.info('Info message', { data: 'test' })
      
      expect(consoleSpies.log).not.toHaveBeenCalled()
      expect(consoleSpies.error).not.toHaveBeenCalled()
      expect(consoleSpies.warn).not.toHaveBeenCalled()
    })

    test('warnメソッドは何も出力しない', () => {
      logger.warn('Warning message', { data: 'test' })
      
      expect(consoleSpies.warn).not.toHaveBeenCalled()
      expect(consoleSpies.log).not.toHaveBeenCalled()
      expect(consoleSpies.error).not.toHaveBeenCalled()
    })

    test('errorメソッドは何も出力しない', () => {
      logger.error('Error message', { data: 'test' })
      
      expect(consoleSpies.error).not.toHaveBeenCalled()
      expect(consoleSpies.log).not.toHaveBeenCalled()
      expect(consoleSpies.warn).not.toHaveBeenCalled()
    })
  })

  describe('Null Objectパターン', () => {
    test('メソッドは存在するが副作用がない', () => {
      const logger = new NoOpLogger()
      
      // メソッドが存在することを確認
      expect(typeof logger.debug).toBe('function')
      expect(typeof logger.info).toBe('function')
      expect(typeof logger.warn).toBe('function')
      expect(typeof logger.error).toBe('function')
      
      // エラーをスローしないことを確認
      expect(() => logger.debug('test')).not.toThrow()
      expect(() => logger.info('test')).not.toThrow()
      expect(() => logger.warn('test')).not.toThrow()
      expect(() => logger.error('test')).not.toThrow()
    })

    test('Null Objectパターンの適用確認', () => {
      // NoOpLoggerが正しくloggerインターフェースを実装していることを確認
      const logger = new NoOpLogger()
      
      // インターフェース適合性を検証
      expect(logger).toMatchObject({
        debug: expect.any(Function),
        info: expect.any(Function),
        warn: expect.any(Function),
        error: expect.any(Function)
      })
      
      // 実際のlogger使用例をシミュレート
      const clientClass = {
        logger: logger,
        doSomething() {
          this.logger.info('Processing...')
          this.logger.error('Something went wrong')
          return 'done'
        }
      }
      
      expect(clientClass.doSomething()).toBe('done')
    })
  })

  describe('グローバル登録', () => {
    test('ブラウザ環境でwindowに登録される', () => {
      // windowオブジェクトがある場合のみテスト
      if (typeof window !== 'undefined') {
        expect(window.NoOpLogger).toBe(NoOpLogger)
      }
    })
  })
})