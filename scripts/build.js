#!/usr/bin/env node

const esbuild = require('esbuild')
const fs = require('fs').promises
const path = require('path')

// ビルド設定
const isProduction = process.argv.includes('--prod')
const isWatch = process.argv.includes('--watch')

// 出力ディレクトリ
const distDir = path.join(__dirname, '..', 'dist')

// ビルド対象のJavaScriptファイル
// Phase 11: Clean Architecture対応 - 段階的移行（新旧ハイブリッド）
const jsFiles = [
  // 新アーキテクチャ（src/配下）
  {
    entryPoint: 'src/presentation/background/index.js',
    outfile: 'dist/background/background.js'
  },
  {
    entryPoint: 'src/presentation/contentScripts/index.js',
    outfile: 'dist/content_scripts/gesture.js'
  },
  {
    entryPoint: 'src/presentation/popup/index.js',
    outfile: 'dist/popup/options-new.js'
  },
  // 既存アーキテクチャ（レガシー互換性維持）
  {
    entryPoint: 'background/background-simple.js',
    outfile: 'dist/background/background-simple.js'
  },
  {
    entryPoint: 'content_scripts/debug-logger.js',
    outfile: 'dist/content_scripts/debug-logger.js'
  },
  {
    entryPoint: 'content_scripts/custom-gesture-manager.js',
    outfile: 'dist/content_scripts/custom-gesture-manager.js'
  },
  {
    entryPoint: 'content_scripts/gesture-learning-manager.js',
    outfile: 'dist/content_scripts/gesture-learning-manager.js'
  },
  {
    entryPoint: 'content_scripts/gesture-simple.js',
    outfile: 'dist/content_scripts/gesture-simple.js'
  },
  {
    entryPoint: 'popup/options.js',
    outfile: 'dist/popup/options.js'
  }
]

// ディレクトリを再帰的に作成
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true })
  } catch (err) {
    if (err.code !== 'EEXIST') throw err
  }
}

// ファイルをコピー
async function copyFile(src, dest) {
  await ensureDir(path.dirname(dest))
  await fs.copyFile(src, dest)
}

// ディレクトリを再帰的にコピー
async function copyDir(src, dest) {
  await ensureDir(dest)
  const entries = await fs.readdir(src, { withFileTypes: true })
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      await copyFile(srcPath, destPath)
    }
  }
}

// 本番ビルド時にDebugLoggerの設定を変更
async function processDebugLogger() {
  if (!isProduction) return

  const debugLoggerPath = 'content_scripts/debug-logger.js'
  const content = await fs.readFile(debugLoggerPath, 'utf8')
  
  // 本番用設定に変更
  const productionContent = content
    .replace('enabled: true, // 開発時はデフォルトでON（本番ビルド時に自動変更）', 'enabled: false, // 本番ビルドでは無効')
    .replace('showStatus: true, // 開発時はデフォルトで表示', 'showStatus: false, // 本番ビルドでは非表示')

  // 一時ファイルとして保存
  const tempPath = path.join(distDir, 'content_scripts/debug-logger.js')
  await ensureDir(path.dirname(tempPath))
  await fs.writeFile(tempPath, productionContent)
  
  console.log('🔧 本番ビルド: デバッグ機能を無効化')
}

// ビルド実行
async function build() {
  console.log('🏗️  ビルド開始...')
  
  try {
    // dist ディレクトリをクリーンアップ
    await fs.rm(distDir, { recursive: true, force: true })
    await ensureDir(distDir)
    
    // 静的ファイルをコピー
    console.log('📁 静的ファイルをコピー中...')
    await copyFile('manifest.json', path.join(distDir, 'manifest.json'))
    await copyFile('popup/options.html', path.join(distDir, 'popup/options.html'))
    await copyFile('popup/options-clean.html', path.join(distDir, 'popup/options-clean.html'))
    await copyDir('assets', path.join(distDir, 'assets'))
    
    // 本番ビルド時にDebugLoggerを処理
    if (isProduction) {
      await processDebugLogger()
    }

    // JavaScriptファイルをビルド
    console.log('🔨 JavaScriptファイルをビルド中...')
    
    const buildOptions = {
      bundle: false, // 既存ファイル用：個別ファイルのまま
      minify: isProduction,
      sourcemap: !isProduction,
      target: 'es2020',
      format: 'iife'
    }
    
    // 新アーキテクチャ用ビルドオプション
    const newArchBuildOptions = {
      bundle: true, // 新アーキテクチャ：モジュール依存関係解決
      minify: isProduction,
      sourcemap: !isProduction,
      target: 'es2020',
      format: 'iife',
      external: ['chrome'] // Chrome API除外
    }
    
    // 各ファイルをビルド
    for (const file of jsFiles) {
      await ensureDir(path.dirname(file.outfile))
      
      // 新アーキテクチャ vs 既存アーキテクチャの判定
      const isNewArch = file.entryPoint.startsWith('src/')
      const options = isNewArch ? newArchBuildOptions : buildOptions
      
      // debug-logger.jsの場合は特別処理
      if (file.entryPoint === 'content_scripts/debug-logger.js' && isProduction) {
        // 既に処理済みのファイルを使用
        await esbuild.build({
          ...buildOptions,
          entryPoints: [file.outfile], // 既に処理済みのファイルを使用
          outfile: file.outfile,
          allowOverwrite: true
        })
      } else {
        await esbuild.build({
          ...options,
          entryPoints: [file.entryPoint],
          outfile: file.outfile
        })
      }
      
      console.log(`  ✓ ${file.entryPoint} → ${file.outfile}${isNewArch ? ' (新アーキテクチャ)' : ''}`)
    }
    
    console.log('✅ ビルド完了!')
    
    // distディレクトリのサイズを計算
    const getDirSize = async (dir) => {
      let size = 0
      const files = await fs.readdir(dir, { withFileTypes: true })
      
      for (const file of files) {
        const filePath = path.join(dir, file.name)
        if (file.isDirectory()) {
          size += await getDirSize(filePath)
        } else {
          const stat = await fs.stat(filePath)
          size += stat.size
        }
      }
      return size
    }
    
    const totalSize = await getDirSize(distDir)
    console.log(`📦 ビルドサイズ: ${(totalSize / 1024 / 1024).toFixed(2)} MB`)
    
    if (isWatch) {
      console.log('👀 ファイル監視中...')
      // watchモードの実装は省略（必要に応じて追加）
    }
    
  } catch (error) {
    console.error('❌ ビルドエラー:', error)
    process.exit(1)
  }
}

// ビルド実行
build()