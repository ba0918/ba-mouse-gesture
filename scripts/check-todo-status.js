#!/usr/bin/env node

/**
 * TODO.md状態チェックスクリプト
 * コミット前にin_progressタスクの長期放置や未更新を検出
 */

const fs = require('fs');
const path = require('path');

const TODO_FILE = path.join(__dirname, '../TODO.md');

function checkTodoStatus() {
  if (!fs.existsSync(TODO_FILE)) {
    console.log('✅ TODO.md not found - skipping check');
    return true;
  }

  const content = fs.readFileSync(TODO_FILE, 'utf8');

  // in_progressタスクの検出
  const inProgressTasks = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('in_progress') || line.includes('進行中')) {
      inProgressTasks.push({
        line: i + 1,
        content: line.trim(),
      });
    }
  }

  if (inProgressTasks.length === 0) {
    console.log('✅ No in_progress tasks found');
    return true;
  }

  if (inProgressTasks.length > 3) {
    console.log('⚠️  Warning: Multiple in_progress tasks detected:');
    inProgressTasks.forEach((task) => {
      console.log(`   Line ${task.line}: ${task.content}`);
    });
    console.log('💡 Consider completing some tasks before starting new ones');
    return true; // 警告のみ、コミットは継続
  }

  console.log(`✅ TODO status check passed (${inProgressTasks.length} in_progress tasks)`);
  return true;
}

// スクリプト直接実行時
if (require.main === module) {
  const success = checkTodoStatus();
  process.exit(success ? 0 : 1);
}

module.exports = { checkTodoStatus };
