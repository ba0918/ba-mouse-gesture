#!/usr/bin/env node

const esbuild = require('esbuild')
const sveltePlugin = require('esbuild-svelte')
const fs = require('fs').promises
const path = require('path')

// ビルド設定
const isProduction = process.argv.includes('--prod')
const isWatch = process.argv.includes('--watch')

// 出力ディレクトリ
const distDir = path.join(__dirname, '..', 'dist')

// ビルド対象のTypeScript/Svelteファイル
// Phase 1 TypeScript移行完了 + Phase 2 Svelte対応
const buildFiles = [
  {
    entryPoint: 'src/presentation/background/index.ts',
    outfile: 'dist/background/background.js'
  },
  {
    entryPoint: 'src/presentation/contentScripts/index.ts',
    outfile: 'dist/content_scripts/gesture.js'
  },
  {
    entryPoint: 'src/presentation/popup/index.ts',
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

// Options HTML を動的生成
async function generateOptionsHtml(outputPath) {
  const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>マウスジェスチャーツール - 設定</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8f9fa;
        }
        
        #app {
            min-height: 400px;
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: #666;
            font-size: 16px;
        }
        
        .loading::after {
            content: '...';
            animation: loading 1.4s infinite ease-in-out;
        }
        
        @keyframes loading {
            0%, 80%, 100% { opacity: 0; }
            40% { opacity: 1; }
        }
    </style>
</head>
<body>
    <div id="app">
        <div class="loading">設定画面を読み込み中</div>
    </div>
    <script src="options.js"></script>
</body>
</html>`

  await ensureDir(path.dirname(outputPath))
  await fs.writeFile(outputPath, htmlContent, 'utf8')
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
    await copyDir('assets', path.join(distDir, 'assets'))
    
    // Svelteアプリ用のHTMLファイルを動的生成
    await generateOptionsHtml(path.join(distDir, 'popup/options.html'))
    
    // 新アーキテクチャ用の静的ファイルのみ必要に応じてコピー
    console.log('📁 新アーキテクチャファイル準備完了')

    // TypeScript/JavaScriptファイルをビルド
    console.log('🔨 TypeScript/JavaScriptファイルをビルド中...')
    
    // TypeScript + Svelte対応ビルドオプション
    const buildOptions = {
      bundle: true, // モジュール依存関係解決
      minify: isProduction,
      sourcemap: !isProduction,
      target: 'es2020',
      format: 'iife',
      external: ['chrome'], // Chrome API除外
      // プラグイン設定
      plugins: [
        sveltePlugin({
          compilerOptions: {
            dev: !isProduction
          }
        })
      ],
      // TypeScript + Svelte設定
      loader: {
        '.ts': 'ts',
        '.js': 'js'
      },
      // tsconfig.json自動読み込み
      tsconfig: './tsconfig.json'
    }
    
    // 各ファイルをビルド
    for (const file of buildFiles) {
      await ensureDir(path.dirname(file.outfile))
      
      await esbuild.build({
        ...buildOptions,
        entryPoints: [file.entryPoint],
        outfile: file.outfile
      })
      
      console.log(`  ✓ ${file.entryPoint} → ${file.outfile} (TypeScript対応)`)
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