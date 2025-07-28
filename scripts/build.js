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
// 新アーキテクチャのみ（Clean Architecture統一）
const jsFiles = [
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
    await copyFile('backup/popup/options-clean.html', path.join(distDir, 'popup/options-clean.html'))
    await copyDir('assets', path.join(distDir, 'assets'))
    
    // 新アーキテクチャ用の静的ファイルのみ必要に応じてコピー
    console.log('📁 新アーキテクチャファイル準備完了')

    // JavaScriptファイルをビルド
    console.log('🔨 JavaScriptファイルをビルド中...')
    
    // 新アーキテクチャ統一ビルドオプション
    const buildOptions = {
      bundle: true, // モジュール依存関係解決
      minify: isProduction,
      sourcemap: !isProduction,
      target: 'es2020',
      format: 'iife',
      external: ['chrome'] // Chrome API除外
    }
    
    // 各ファイルをビルド
    for (const file of jsFiles) {
      await ensureDir(path.dirname(file.outfile))
      
      await esbuild.build({
        ...buildOptions,
        entryPoints: [file.entryPoint],
        outfile: file.outfile
      })
      
      console.log(`  ✓ ${file.entryPoint} → ${file.outfile} (新アーキテクチャ)`)
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