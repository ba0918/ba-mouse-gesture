<script lang="ts">
// Props
interface OptionsExcludeListProps {
  excludeList: string[];
  newExcludeUrl: string;
  isLoading: boolean;
  onAddExcludeUrl: () => Promise<void>;
  onRemoveExcludeUrl: (url: string) => Promise<void>;
}

let {
  excludeList = $bindable(),
  newExcludeUrl = $bindable(),
  isLoading,
  onAddExcludeUrl,
  onRemoveExcludeUrl,
}: OptionsExcludeListProps = $props();

async function handleKeydown(event: KeyboardEvent) {
  if (event.key === "Enter") {
    await onAddExcludeUrl();
  }
}
</script>

<!-- 除外サイト -->
<div class="section">
  <h2>除外サイトリスト</h2>
  <div class="setting-item">
    <div>
      <div class="setting-label">特定のサイトで機能を無効にする</div>
      <div class="setting-description">
        例: google.com, *.example.com, https://specific-site.com/*
      </div>
      <div class="exclude-list">
        <input
          type="text"
          bind:value={newExcludeUrl}
          class="exclude-input"
          placeholder="除外するサイトのURLを入力"
          onkeydown={handleKeydown}
          disabled={isLoading}
        >
        <button
          class="add-btn"
          onclick={onAddExcludeUrl}
          disabled={isLoading}
        >
          追加
        </button>
        <div>
          {#each excludeList as url (url)}
            <div class="exclude-item">
              <span class="exclude-url">{url}</span>
              <button
                class="remove-btn"
                onclick={() => onRemoveExcludeUrl(url)}
                disabled={isLoading}
              >
                削除
              </button>
            </div>
          {/each}
          {#if excludeList.length === 0}
            <div class="empty-state">
              <p>除外サイトが登録されていません</p>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
.section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section h2 {
  font-size: 18px;
  margin: 0 0 20px 0;
  color: #1a73e8;
  border-bottom: 2px solid #e8f0fe;
  padding-bottom: 12px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding: 8px 0;
}

.setting-item:last-child {
  margin-bottom: 0;
}

.setting-label {
  font-weight: 500;
  color: #202124;
  flex: 1;
}

.setting-description {
  font-size: 12px;
  color: #5f6368;
  margin-top: 4px;
}

.exclude-list {
  margin-top: 12px;
}

.exclude-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #dadce0;
  border-radius: 4px;
  margin-bottom: 8px;
}

.exclude-input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.add-btn {
  background: #34a853;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.add-btn:hover:not(:disabled) {
  background: #2d8f47;
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.exclude-item {
  display: flex;
  align-items: center;
  padding: 8px;
  background: white;
  border: 1px solid #e8eaed;
  border-radius: 4px;
  margin-bottom: 4px;
}

.exclude-item:last-child {
  margin-bottom: 0;
}

.exclude-url {
  flex: 1;
  font-family: monospace;
  color: #5f6368;
}

.remove-btn {
  background: #ea4335;
  color: white;
  border: none;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.remove-btn:hover:not(:disabled) {
  background: #d33b2c;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #9aa0a6;
  font-size: 14px;
}

.empty-state p {
  margin: 0;
}
</style>
