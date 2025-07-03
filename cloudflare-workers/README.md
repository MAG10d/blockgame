# 🎮 Survivor Game - Cloudflare Workers 多人伺服器

基於 Cloudflare Workers + Durable Objects 的高性能多人遊戲伺服器。

## 🚀 快速開始

### 1. 安裝依賴
```bash
cd cloudflare-workers
npm install
```

### 2. 設置 Cloudflare Workers
1. 註冊 [Cloudflare Workers](https://workers.cloudflare.com/)
2. 登入 Cloudflare 帳戶：
```bash
npx wrangler login
```

### 3. 部署到 Cloudflare
```bash
# 開發環境測試
npm run dev

# 部署到生產環境
npm run deploy
```

### 4. 更新客戶端配置
部署完成後，更新 `js/systems/MultiplayerSystem.js` 中的伺服器 URL：
```javascript
this.serverUrl = 'https://your-worker.your-subdomain.workers.dev';
```

## 📋 功能特色

### 🌐 網路架構
- **權威伺服器**：所有遊戲邏輯在伺服器端執行
- **60 FPS 遊戲循環**：平滑的遊戲體驗
- **狀態同步**：實時同步玩家、敵人、射彈狀態
- **輸入預測**：減少網路延遲影響

### 🎯 遊戲功能
- **多人房間系統**：最多 4 人同時遊戲
- **武器系統**：Magic Missile + Aiming Bolt
- **敵人 AI**：自動追蹤最近玩家
- **經驗值系統**：擊殺敵人獲得 XP
- **碰撞檢測**：精確的圓形碰撞

### 🔒 安全特性
- **防作弊**：所有計算在伺服器端
- **輸入驗證**：防止無效輸入
- **序列號同步**：防止重播攻擊

## 🛠️ API 文檔

### REST API

#### 創建房間
```
POST /api/create-room
Response: { "roomId": "ABC123", "wsUrl": "wss://..." }
```

#### 加入房間
```
POST /api/join-room
Body: { "roomId": "ABC123" }
Response: { "roomId": "ABC123", "wsUrl": "wss://...", "playerCount": 2 }
```

#### 查詢房間狀態
```
GET /api/room-status?roomId=ABC123
Response: { "playerCount": 2, "maxPlayers": 4, "gameStarted": true }
```

### WebSocket API

#### 連接
```
wss://your-worker.workers.dev?roomId=ABC123&playerId=player_xxx
```

#### 訊息格式

**玩家輸入**
```json
{
  "type": "input",
  "input": {
    "move": { "x": 1, "y": 0 }
  },
  "sequence": 123
}
```

**遊戲狀態**
```json
{
  "type": "game_state",
  "sequence": 456,
  "state": {
    "players": { ... },
    "enemies": { ... },
    "projectiles": { ... },
    "xpOrbs": { ... }
  }
}
```

**Ping 測試**
```json
{
  "type": "ping",
  "timestamp": 1234567890
}
```

## 🏗️ 架構說明

### Durable Objects
每個遊戲房間是一個獨立的 Durable Object：
- **狀態持久化**：房間狀態自動保存
- **全球分佈**：就近路由減少延遲
- **自動擴展**：按需創建/銷毀房間

### 遊戲循環
```
每幀 (60 FPS):
1. 處理玩家輸入
2. 更新武器冷卻
3. 發射武器
4. 更新射彈位置
5. 生成敵人
6. 更新敵人 AI
7. 檢查碰撞
8. 清理過期物件
9. 廣播遊戲狀態
```

### 狀態同步
- **客戶端預測**：本地玩家立即移動
- **伺服器修正**：權威狀態覆蓋預測
- **插值平滑**：遠程玩家位置插值

## 💰 成本估算

### Cloudflare Workers 免費額度
- **請求次數**：每天 100,000 次
- **CPU 時間**：每天 10ms x 100,000 = 1000 秒
- **Durable Objects**：每月 1,000,000 次請求

### 預估使用量 (4 人房間，1 小時遊戲)
- **WebSocket 連接**：4 個
- **遊戲狀態更新**：60 FPS ÷ 3 = 20/秒
- **總請求**：20 x 3600 x 4 = 288,000 次

**結論**：免費額度可支持每天約 8 小時的 4 人遊戲。

## 🔧 開發工具

### 本地測試
```bash
# 啟動開發伺服器
npm run dev

# 查看 Workers 日誌
npx wrangler tail
```

### 調試技巧
1. **瀏覽器開發者工具**：查看 WebSocket 訊息
2. **Cloudflare Dashboard**：監控請求和錯誤
3. **wrangler tail**：實時查看伺服器日誌

## 🚨 故障排除

### 常見問題

**連接失敗**
- 檢查伺服器 URL 是否正確
- 確認 Workers 已部署成功
- 查看瀏覽器控制台錯誤

**遊戲不同步**
- 檢查網路連接穩定性
- 確認 WebSocket 連接正常
- 重新整理頁面重新連接

**房間創建失敗**
- 檢查 Cloudflare Workers 配額
- 確認 Durable Objects 已啟用
- 查看 wrangler 部署日誌

## 🔮 未來改進

### 計劃功能
- [ ] 觀戰模式
- [ ] 排行榜系統
- [ ] 更多武器類型
- [ ] 地圖系統
- [ ] 語音聊天

### 性能優化
- [ ] 狀態差分同步
- [ ] 客戶端狀態快取
- [ ] 動態視野剔除
- [ ] 負載平衡

## 📞 支援

如有問題，請參考：
- [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- [Durable Objects 指南](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
- [WebSocket API](https://developers.cloudflare.com/workers/runtime-apis/websockets/)

---

**享受你的多人生存遊戲！** 🎮✨ 