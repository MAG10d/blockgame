export class GameRoom {
  constructor(controller, env) {
    this.controller = controller;
    this.env = env;
    
    // WebSocket 連接管理
    this.sessions = new Map(); // playerId -> WebSocket
    this.players = new Map();  // playerId -> PlayerState
    
    // 遊戲狀態
    this.gameState = {
      started: false,
      enemies: new Map(),
      projectiles: new Map(),
      xpOrbs: new Map(),
      lastEnemySpawn: 0,
      lastUpdate: Date.now()
    };
    
    // 遊戲配置
    this.config = {
      maxPlayers: 4,
      tickRate: 60, // 60 FPS
      worldSize: { width: 2400, height: 1800 }, // 比客戶端大的世界
      enemySpawnRate: 2000 // 2秒生成一個敵人
    };
    
    // 遊戲循環
    this.gameLoopInterval = null;
    this.lastTick = 0;
    
    // 序列號（用於同步）
    this.sequenceNumber = 0;
  }

  async fetch(request) {
    const url = new URL(request.url);
    
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }
    
    if (request.method === 'POST') {
      const body = await request.json();
      if (body.action === 'initialize') {
        return this.initializeRoom();
      }
    }
    
    if (request.method === 'GET') {
      return this.getRoomStatus();
    }
    
    return new Response('Method not allowed', { status: 405 });
  }

  async handleWebSocket(request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    
    const playerId = request.headers.get('X-Player-Id');
    
    server.accept();
    
    // 處理玩家連接
    await this.addPlayer(playerId, server);
    
    server.addEventListener('message', async (event) => {
      try {
        const message = JSON.parse(event.data);
        await this.handlePlayerMessage(playerId, message);
      } catch (error) {
        console.error('Message parsing error:', error);
      }
    });
    
    server.addEventListener('close', () => {
      this.removePlayer(playerId);
    });
    
    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async addPlayer(playerId, webSocket) {
    // 檢查房間是否已滿
    if (this.sessions.size >= this.config.maxPlayers) {
      webSocket.send(JSON.stringify({
        type: 'error',
        message: 'Room is full'
      }));
      webSocket.close();
      return;
    }
    
    // 添加玩家
    this.sessions.set(playerId, webSocket);
    
    // 初始化玩家狀態
    const playerState = {
      id: playerId,
      x: this.config.worldSize.width / 2 + (Math.random() - 0.5) * 100,
      y: this.config.worldSize.height / 2 + (Math.random() - 0.5) * 100,
      width: 30,
      height: 30,
      health: 100,
      maxHealth: 100,
      level: 1,
      xp: 0,
      xpToNextLevel: 10,
      isDead: false,
      weapons: [
        {
          name: 'Magic Missile',
          cooldown: 120,
          currentCooldown: 0,
          projectileSize: 10,
          projectileSpeed: 5,
          damage: 20
        },
        {
          name: 'Aiming Bolt',
          cooldown: 180,
          currentCooldown: 0,
          projectileSize: 8,
          projectileSpeed: 4,
          damage: 15
        }
      ],
      lastInputSequence: 0,
      wantsToFire: false,
      lastFireTime: 0
    };
    
    this.players.set(playerId, playerState);
    
    // 發送歡迎消息
    webSocket.send(JSON.stringify({
      type: 'welcome',
      playerId: playerId,
      gameState: this.getSerializableGameState()
    }));
    
    // 通知其他玩家
    this.broadcast({
      type: 'player_joined',
      playerId: playerId,
      playerState: playerState
    }, playerId);
    
    // 如果是第一個玩家，開始遊戲循環
    if (this.sessions.size === 1) {
      this.startGameLoop();
    }
    
    console.log(`Player ${playerId} joined. Total players: ${this.sessions.size}`);
  }

  removePlayer(playerId) {
    this.sessions.delete(playerId);
    this.players.delete(playerId);
    
    // 通知其他玩家
    this.broadcast({
      type: 'player_left',
      playerId: playerId
    });
    
    // 如果沒有玩家了，停止遊戲循環
    if (this.sessions.size === 0) {
      this.stopGameLoop();
    }
    
    console.log(`Player ${playerId} left. Total players: ${this.sessions.size}`);
  }

  async handlePlayerMessage(playerId, message) {
    const player = this.players.get(playerId);

    // For most messages, we need a valid player.
    if (!player) {
      // However, allow 'restart_game' to be processed even if the player state is not fully available yet.
      if (message.type !== 'restart_game') {
        console.error(`(Server) Message for unknown player ${playerId}, type: ${message.type}. Ignoring.`);
        return;
      }
    }
    
    switch (message.type) {
      case 'input':
        this.handlePlayerInput(playerId, message);
        break;
      
      case 'restart_game':
        // This is the correct place to handle game restart requests.
        // It should be allowed even if the player is marked as 'dead'.
        this.handleGameRestart(playerId, message);
        break;

      case 'ping':
        this.sessions.get(playerId)?.send(JSON.stringify({
          type: 'pong',
          timestamp: message.timestamp
        }));
        break;
    }
  }

  handlePlayerInput(playerId, inputMessage) {
    const player = this.players.get(playerId);
    
    // A dead player cannot provide game input like movement or firing.
    if (!player || player.isDead) return;
    
    // The 'restart_game' logic has been correctly moved to handlePlayerMessage.
    
    const { input, sequence } = inputMessage;
    
    // 防止舊輸入覆蓋新輸入
    if (sequence <= player.lastInputSequence) return;
    player.lastInputSequence = sequence;
    
    // 處理不同類型的輸入
    switch (input.type) {
      case 'movement':
        this.handleMovementInput(player, input);
        break;
        
      case 'fire_weapons':
        this.handleFireInput(player, input);
        break;
        
      default:
        // 向後兼容舊的輸入格式
        if (input.move) {
          this.handleMovementInput(player, { x: input.move.x, y: input.move.y });
        }
        break;
    }
  }
  
  handleMovementInput(player, input) {
    const { x, y } = input;
    const speed = 4;
    
    // 正規化移動向量
    const length = Math.sqrt(x * x + y * y);
    if (length > 0) {
      const normalizedX = x / length;
      const normalizedY = y / length;
      
      // 更新玩家位置
      player.x += normalizedX * speed;
      player.y += normalizedY * speed;
      
      // 邊界檢查
      player.x = Math.max(0, Math.min(this.config.worldSize.width - player.width, player.x));
      player.y = Math.max(0, Math.min(this.config.worldSize.height - player.height, player.y));
    }
  }
  
  handleFireInput(player, input) {
    player.wantsToFire = true;
  }
  
  handleGameRestart(requestingPlayerId, input) {
    console.log(`Received restart request from ${requestingPlayerId}. Resetting entire room.`);

    // 停止當前的遊戲循環以安全地修改狀態
    this.stopGameLoop();

    // 1. 重置所有玩家的狀態
    for (const player of this.players.values()) {
        this.resetPlayerStats(player);
    }

    // 2. 清空所有遊戲實體
    this.gameState.enemies.clear();
    this.gameState.projectiles.clear();
    this.gameState.xpOrbs.clear();

    // 3. 重置遊戲狀態變量
    this.gameState.lastEnemySpawn = 0;
    this.sequenceNumber = 0;
    this.gameState.started = true;

    // 4. 向所有玩家廣播遊戲已重啟的消息
    this.broadcast({
        type: 'game_restarted',
        message: `Game restarted by ${requestingPlayerId}.`
    });
    
    // 5. 重新啟動遊戲循環
    this.startGameLoop();
  }
  
  resetPlayerStats(player) {
    player.health = 100;
    player.maxHealth = 100;
    player.isDead = false;
    player.level = 1;
    player.xp = 0;
    player.xpToNextLevel = 10;
    
    // 關鍵修復：重置玩家位置到一個隨機的安全點
    player.x = this.config.worldSize.width / 2 + (Math.random() - 0.5) * 200;
    player.y = this.config.worldSize.height / 2 + (Math.random() - 0.5) * 200;

    // 重置武器冷卻等其他狀態
    player.wantsToFire = false;
    player.lastFireTime = 0;
    player.weapons.forEach(w => w.currentCooldown = 0);
  }

  startGameLoop() {
    if (this.gameLoopInterval) return;
    
    const tickDuration = 1000 / this.config.tickRate;
    this.lastTick = Date.now();
    
    this.gameLoopInterval = setInterval(() => {
      this.gameTick();
    }, tickDuration);
    
    console.log('Game loop started');
  }

  stopGameLoop() {
    if (this.gameLoopInterval) {
      clearInterval(this.gameLoopInterval);
      this.gameLoopInterval = null;
      console.log('Game loop stopped');
    }
  }

  gameTick() {
    const now = Date.now();
    const deltaTime = now - this.lastTick;
    this.lastTick = now;
    
    this.sequenceNumber++;
    
    // 更新武器冷卻
    this.updateWeaponCooldowns();
    
    // 發射武器
    this.fireWeapons();
    
    // 更新射彈
    this.updateProjectiles();
    
    // 生成敵人
    this.spawnEnemies(now);
    
    // 更新敵人
    this.updateEnemies();
    
    // 檢查碰撞
    this.checkCollisions();
    
    // 清理過期物件
    this.cleanup();
    
    // 廣播遊戲狀態（每 3 幀一次以節省頻寬）
    if (this.sequenceNumber % 3 === 0) {
      this.broadcastGameState();
    }
  }

  updateWeaponCooldowns() {
    for (const player of this.players.values()) {
      if (player.isDead) continue;
      
      player.weapons.forEach(weapon => {
        if (weapon.currentCooldown > 0) {
          weapon.currentCooldown--;
        }
      });
    }
  }

  fireWeapons() {
    for (const player of this.players.values()) {
      if (player.isDead) continue;
      
      // 檢查玩家是否想要射擊，或者自動射擊（向後兼容）
      const shouldFire = player.wantsToFire || true; // 自動射擊模式
      
      if (shouldFire) {
        player.weapons.forEach(weapon => {
          if (weapon.currentCooldown <= 0) {
            this.fireWeapon(player, weapon);
            weapon.currentCooldown = weapon.cooldown;
          }
        });
      }
      
      // 重置射擊狀態
      player.wantsToFire = false;
    }
  }

  fireWeapon(player, weapon) {
    // 找最近的敵人
    let nearestEnemy = null;
    let shortestDistance = Infinity;
    
    for (const enemy of this.gameState.enemies.values()) {
      const distance = this.getDistance(player, enemy);
      if (distance < shortestDistance) {
        shortestDistance = distance;
        nearestEnemy = enemy;
      }
    }
    
    let angle;
    if (nearestEnemy) {
      // 瞄準最近的敵人
      const playerCenterX = player.x + player.width / 2;
      const playerCenterY = player.y + player.height / 2;
      const enemyCenterX = nearestEnemy.x + nearestEnemy.width / 2;
      const enemyCenterY = nearestEnemy.y + nearestEnemy.height / 2;
      
      angle = Math.atan2(enemyCenterY - playerCenterY, enemyCenterX - playerCenterX);
    } else {
      // 隨機方向
      angle = Math.random() * 2 * Math.PI;
    }
    
    const projectileId = `proj_${this.sequenceNumber}_${Math.random().toString(36).substr(2, 9)}`;
    const projectile = {
      id: projectileId,
      x: player.x + player.width / 2 - weapon.projectileSize / 2,
      y: player.y + player.height / 2 - weapon.projectileSize / 2,
      vx: Math.cos(angle) * weapon.projectileSpeed,
      vy: Math.sin(angle) * weapon.projectileSpeed,
      width: weapon.projectileSize,
      height: weapon.projectileSize,
      damage: weapon.damage,
      ownerId: player.id,
      createdAt: Date.now()
    };
    
    this.gameState.projectiles.set(projectileId, projectile);
  }

  updateProjectiles() {
    for (const [id, projectile] of this.gameState.projectiles.entries()) {
      projectile.x += projectile.vx;
      projectile.y += projectile.vy;
      
      // 移除超出邊界的射彈
      if (projectile.x < -50 || projectile.x > this.config.worldSize.width + 50 ||
          projectile.y < -50 || projectile.y > this.config.worldSize.height + 50) {
        this.gameState.projectiles.delete(id);
      }
    }
  }

  spawnEnemies(now) {
    if (now - this.gameState.lastEnemySpawn < this.config.enemySpawnRate) return;
    if (this.players.size === 0) return;
    
    // 隨機選擇一個玩家作為生成中心
    const players = Array.from(this.players.values()).filter(p => !p.isDead);
    if (players.length === 0) return;
    
    const targetPlayer = players[Math.floor(Math.random() * players.length)];
    const spawnDistance = 400; // 在玩家視野外生成
    
    const angle = Math.random() * 2 * Math.PI;
    const enemyId = `enemy_${now}_${Math.random().toString(36).substr(2, 9)}`;
    
    const enemy = {
      id: enemyId,
      x: targetPlayer.x + Math.cos(angle) * spawnDistance,
      y: targetPlayer.y + Math.sin(angle) * spawnDistance,
      width: 25,
      height: 25,
      health: 60,
      maxHealth: 60,
      speed: 1.5,
      damage: 20,
      createdAt: now
    };
    
    // 保持在世界邊界內
    enemy.x = Math.max(0, Math.min(this.config.worldSize.width - enemy.width, enemy.x));
    enemy.y = Math.max(0, Math.min(this.config.worldSize.height - enemy.height, enemy.y));
    
    this.gameState.enemies.set(enemyId, enemy);
    this.gameState.lastEnemySpawn = now;
  }

  updateEnemies() {
    for (const enemy of this.gameState.enemies.values()) {
      // 找最近的玩家
      let nearestPlayer = null;
      let shortestDistance = Infinity;
      
      for (const player of this.players.values()) {
        if (player.isDead) continue;
        const distance = this.getDistance(enemy, player);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          nearestPlayer = player;
        }
      }
      
      if (nearestPlayer) {
        // 朝玩家移動
        const angle = Math.atan2(nearestPlayer.y - enemy.y, nearestPlayer.x - enemy.x);
        enemy.x += Math.cos(angle) * enemy.speed;
        enemy.y += Math.sin(angle) * enemy.speed;
        
        // 邊界檢查
        enemy.x = Math.max(0, Math.min(this.config.worldSize.width - enemy.width, enemy.x));
        enemy.y = Math.max(0, Math.min(this.config.worldSize.height - enemy.height, enemy.y));
      }
    }
  }

  checkCollisions() {
    // 射彈 vs 敵人
    for (const [projId, projectile] of this.gameState.projectiles.entries()) {
      for (const [enemyId, enemy] of this.gameState.enemies.entries()) {
        if (this.checkCircularCollision(projectile, enemy)) {
          // 移除射彈
          this.gameState.projectiles.delete(projId);
          
          // 傷害敵人
          enemy.health -= projectile.damage;
          
          if (enemy.health <= 0) {
            // 敵人死亡
            this.gameState.enemies.delete(enemyId);
            
            // 生成 XP orb
            const orbId = `xp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.gameState.xpOrbs.set(orbId, {
              id: orbId,
              x: enemy.x + enemy.width / 2,
              y: enemy.y + enemy.height / 2,
              width: 10,
              height: 10,
              value: 5,
              createdAt: Date.now()
            });
          }
          break;
        }
      }
    }
    
    // 玩家 vs 敵人
    for (const player of this.players.values()) {
      if (player.isDead) continue;
      
      for (const enemy of this.gameState.enemies.values()) {
        if (this.checkCircularCollision(player, enemy, 5)) {
          // 玩家受傷
          player.health -= enemy.damage;
          if (player.health <= 0) {
            player.health = 0;
            player.isDead = true;
          }
        }
      }
    }
    
    // 玩家 vs XP orbs
    for (const player of this.players.values()) {
      if (player.isDead) continue;
      
      for (const [orbId, orb] of this.gameState.xpOrbs.entries()) {
        if (this.checkCircularCollision(player, orb)) {
          // 獲得經驗
          player.xp += orb.value;
          this.gameState.xpOrbs.delete(orbId);
          
          // 檢查升級
          if (player.xp >= player.xpToNextLevel) {
            player.level++;
            player.xp -= player.xpToNextLevel;
            player.xpToNextLevel = Math.floor(player.xpToNextLevel * 1.5);
            
            // 升級回血
            player.health = Math.min(player.maxHealth, player.health + 20);
          }
        }
      }
    }
  }

  checkCircularCollision(obj1, obj2, buffer = 0) {
    const centerX1 = obj1.x + obj1.width / 2;
    const centerY1 = obj1.y + obj1.height / 2;
    const centerX2 = obj2.x + obj2.width / 2;
    const centerY2 = obj2.y + obj2.height / 2;
    
    const radius1 = Math.min(obj1.width, obj1.height) / 2;
    const radius2 = Math.min(obj2.width, obj2.height) / 2;
    
    const distance = Math.sqrt(
      Math.pow(centerX2 - centerX1, 2) + 
      Math.pow(centerY2 - centerY1, 2)
    );
    
    return distance < (radius1 + radius2 + buffer);
  }

  getDistance(obj1, obj2) {
    const centerX1 = obj1.x + obj1.width / 2;
    const centerY1 = obj1.y + obj1.height / 2;
    const centerX2 = obj2.x + obj2.width / 2;
    const centerY2 = obj2.y + obj2.height / 2;
    
    return Math.sqrt(
      Math.pow(centerX2 - centerX1, 2) + 
      Math.pow(centerY2 - centerY1, 2)
    );
  }

  cleanup() {
    const now = Date.now();
    
    // 清理過期的 XP orbs (30秒後消失)
    for (const [id, orb] of this.gameState.xpOrbs.entries()) {
      if (now - orb.createdAt > 30000) {
        this.gameState.xpOrbs.delete(id);
      }
    }
    
    // 清理過期的射彈 (10秒後消失)
    for (const [id, projectile] of this.gameState.projectiles.entries()) {
      if (now - projectile.createdAt > 10000) {
        this.gameState.projectiles.delete(id);
      }
    }
  }

  broadcastGameState() {
    const state = this.getSerializableGameState();
    this.broadcast({
      type: 'game_state',
      sequence: this.sequenceNumber,
      state: state
    });
  }

  getSerializableGameState() {
    return {
      players: Object.fromEntries(this.players),
      enemies: Object.fromEntries(this.gameState.enemies),
      projectiles: Object.fromEntries(this.gameState.projectiles),
      xpOrbs: Object.fromEntries(this.gameState.xpOrbs),
      sequence: this.sequenceNumber
    };
  }

  broadcast(message, excludePlayerId = null) {
    const messageStr = JSON.stringify(message);
    
    for (const [playerId, webSocket] of this.sessions.entries()) {
      if (playerId !== excludePlayerId) {
        try {
          webSocket.send(messageStr);
        } catch (error) {
          console.error(`Failed to send message to ${playerId}:`, error);
          // 連接可能已斷開，從列表中移除
          this.removePlayer(playerId);
        }
      }
    }
  }

  async initializeRoom() {
    console.log('Room initialized');
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async getRoomStatus() {
    return new Response(JSON.stringify({
      playerCount: this.sessions.size,
      maxPlayers: this.config.maxPlayers,
      gameStarted: this.gameState.started,
      players: Array.from(this.players.keys())
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 