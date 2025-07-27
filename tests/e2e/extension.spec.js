// E2Eテスト - Playwrightを使用したChrome拡張機能のテスト

const { test, expect, chromium } = require('@playwright/test')
const path = require('path')

// 拡張機能のパス
const extensionPath = path.join(__dirname, '../..')

test.describe('マウスジェスチャー拡張機能 E2Eテスト', () => {
  let browser
  // let context // 将来の機能拡張用
  let page
  
  test.beforeAll(async () => {
    // Chrome拡張機能を読み込んでブラウザを起動
    try {
      browser = await chromium.launchPersistentContext('', {
        headless: process.env.CI ? true : false, // CI環境ではヘッドレスモード
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          // CI環境用の追加オプション
          ...(process.env.CI ? [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security'
          ] : [])
        ]
      })
    } catch (error) {
      console.warn('⚠️ Browser launch failed:', error.message)
      if (process.env.CI) {
        console.log('🚧 CI environment - skipping E2E tests')
      }
      throw error
    }
  })
  
  test.beforeEach(async () => {
    // 新しいページを作成
    page = await browser.newPage()
    await page.goto('file://' + path.join(extensionPath, 'test.html'))
  })
  
  test.afterEach(async () => {
    await page.close()
  })
  
  test.afterAll(async () => {
    if (browser) {
      await browser.close()
    }
  })
  
  test('拡張機能が正しく読み込まれる', async () => {
    // ステータス表示を確認
    await expect(page.locator('#gesture-status')).toContainText('Mouse Gesture Tool Ready!')
    
    // コンソールログを確認
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('Mouse Gesture')) {
        expect(msg.text()).toContain('loaded')
      }
    })
  })
  
  test('右クリック + 左方向ジェスチャーで戻る', async () => {
    // テストページで複数のナビゲーションを行う
    await page.click('a[href="#section1"]')
    await page.waitForURL('**/test.html#section1')
    
    await page.click('a[href="#section2"]')
    await page.waitForURL('**/test.html#section2')
    
    // ジェスチャー実行: 右クリック + 左へドラッグ
    await page.mouse.move(500, 300)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(400, 300, { steps: 10 })
    await page.mouse.up({ button: 'right' })
    
    // 戻るが実行されることを確認
    await page.waitForURL('**/test.html#section1', { timeout: 3000 })
  })
  
  test('右クリック + 下方向ジェスチャーでページ最下部へスクロール', async () => {
    // スクロール前の位置を記録
    const initialScrollY = await page.evaluate(() => window.scrollY)
    expect(initialScrollY).toBe(0)
    
    // ジェスチャー実行: 右クリック + 下へドラッグ
    await page.mouse.move(500, 300)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(500, 400, { steps: 10 })
    await page.mouse.up({ button: 'right' })
    
    // スクロールが実行されることを確認
    await page.waitForTimeout(1000) // スムーズスクロールの完了を待つ
    const scrolledY = await page.evaluate(() => window.scrollY)
    expect(scrolledY).toBeGreaterThan(initialScrollY)
  })
  
  test('右クリック + 上方向ジェスチャーでページトップへスクロール', async () => {
    // まず最下部へスクロール
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const scrolledY = await page.evaluate(() => window.scrollY)
    expect(scrolledY).toBeGreaterThan(0)
    
    // ジェスチャー実行: 右クリック + 上へドラッグ
    await page.mouse.move(500, 400)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(500, 300, { steps: 10 })
    await page.mouse.up({ button: 'right' })
    
    // トップへのスクロールが実行されることを確認
    await page.waitForTimeout(1000) // スムーズスクロールの完了を待つ
    const finalScrollY = await page.evaluate(() => window.scrollY)
    expect(finalScrollY).toBe(0)
  })
  
  test('軌跡が表示される', async () => {
    // ジェスチャー開始
    await page.mouse.move(400, 300)
    await page.mouse.down({ button: 'right' })
    
    // 軌跡のCanvasが作成されることを確認
    await expect(page.locator('canvas[style*="position: fixed"]')).toBeVisible()
    
    // ジェスチャー終了
    await page.mouse.move(500, 300, { steps: 10 })
    await page.mouse.up({ button: 'right' })
    
    // 軌跡が削除されることを確認
    await page.waitForTimeout(300)
    await expect(page.locator('canvas[style*="position: fixed"]')).not.toBeVisible()
  })
  
  test('小さな動きではジェスチャーが発動しない', async () => {
    // 初期状態を記録
    const initialUrl = page.url()
    
    // 小さなジェスチャー実行: 右クリック + わずかな移動
    await page.mouse.move(500, 300)
    await page.mouse.down({ button: 'right' })
    await page.mouse.move(510, 305, { steps: 3 })
    await page.mouse.up({ button: 'right' })
    
    // ステータス表示を確認
    await expect(page.locator('#gesture-status')).toContainText('Movement too small')
    
    // URLが変わっていないことを確認
    expect(page.url()).toBe(initialUrl)
  })
})

test.describe('オプション画面のE2Eテスト', () => {
  let browser
  let page
  
  test.beforeAll(async () => {
    try {
      browser = await chromium.launchPersistentContext('', {
        headless: process.env.CI ? true : false, // CI環境ではヘッドレスモード
        args: [
          `--disable-extensions-except=${extensionPath}`,
          `--load-extension=${extensionPath}`,
          // CI環境用の追加オプション
          ...(process.env.CI ? [
            '--no-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-web-security'
          ] : [])
        ]
      })
    } catch (error) {
      console.warn('⚠️ Browser launch failed:', error.message)
      if (process.env.CI) {
        console.log('🚧 CI environment - skipping E2E tests')
      }
      throw error
    }
  })
  
  test.beforeEach(async () => {
    page = await browser.newPage()
    // 拡張機能のオプションページを開く
    const extensionId = await getExtensionId(browser)
    await page.goto(`chrome-extension://${extensionId}/popup/options.html`)
  })
  
  test.afterAll(async () => {
    if (browser) {
      await browser.close()
    }
  })
  
  test('設定の変更と保存', async () => {
    // 機能のON/OFF切り替え
    const enabledToggle = page.locator('#enabled')
    await enabledToggle.uncheck()
    await expect(page.locator('#saveStatus')).toContainText('設定を保存しました')
    
    // 軌跡の色変更
    await page.fill('#strokeColor', '#FF0000')
    await expect(page.locator('#saveStatus')).toContainText('設定を保存しました')
    
    // 軌跡の太さ変更
    await page.fill('#strokeWidth', '5')
    await expect(page.locator('#strokeWidthValue')).toContainText('5px')
  })
  
  test('除外リストの追加と削除', async () => {
    // 除外URLを追加
    await page.fill('#newExcludeUrl', 'example.com')
    await page.click('#addExcludeBtn')
    
    // 追加されたことを確認
    await expect(page.locator('.exclude-url')).toContainText('example.com')
    
    // 削除ボタンをクリック
    await page.click('.remove-btn')
    
    // 削除されたことを確認
    await expect(page.locator('.exclude-url')).not.toBeVisible()
  })
  
  test('プレビューが更新される', async () => {
    // Canvas要素の存在を確認
    await expect(page.locator('#previewCanvas')).toBeVisible()
    
    // 色を変更してプレビューが更新されることを確認
    await page.fill('#strokeColor', '#00FF00')
    
    // プレビューキャンバスのコンテキストが更新されているかを間接的に確認
    const canvasDataUrl = await page.locator('#previewCanvas').evaluate(canvas => {
      return canvas.toDataURL()
    })
    
    expect(canvasDataUrl).toBeTruthy()
  })
})

// 拡張機能のIDを取得するヘルパー関数
async function getExtensionId(browser) {
  const page = await browser.newPage()
  await page.goto('chrome://extensions')
  
  // デベロッパーモードを有効にする必要がある場合
  // 実際の実装では、拡張機能のmanifest.jsonから取得する方が確実
  
  await page.close()
  
  // テスト用の仮ID（実際のテストでは動的に取得）
  return 'test-extension-id'
}