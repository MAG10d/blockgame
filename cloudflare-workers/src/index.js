import { GameRoom } from './GameRoom.js';

export { GameRoom };

// CORS 標頭設定
function getCorsHeaders(origin) {
  return {
    'Access-Control-Allow-Origin': '*', // 允許所有源，生產環境中可以限制特定域名
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Player-Id',
    'Access-Control-Max-Age': '86400', // 預檢請求快取時間
  };
}

// 處理預檢請求
function handleOptions(request) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request.headers.get('Origin'))
  });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      
      // 處理 OPTIONS 預檢請求
      if (request.method === 'OPTIONS') {
        return handleOptions(request);
      }
      
      // 處理 WebSocket 升級請求
      if (request.headers.get('Upgrade') === 'websocket') {
        return handleWebSocket(request, env);
      }
      
      // API 路由
      switch (url.pathname) {
        case '/api/create-room':
          return handleCreateRoom(request, env);
        
        case '/api/join-room':
          return handleJoinRoom(request, env);
        
        case '/api/room-status':
          return handleRoomStatus(request, env);
        
        case '/':
          return new Response(getHomePage(), {
            headers: { 
              'Content-Type': 'text/html',
              ...getCorsHeaders(request.headers.get('Origin'))
            }
          });
        
        default:
          return new Response('Not Found', { 
            status: 404,
            headers: getCorsHeaders(request.headers.get('Origin'))
          });
      }
    } catch (error) {
      console.error('Error:', error);
      return new Response('Internal Server Error', { 
        status: 500,
        headers: getCorsHeaders(request.headers.get('Origin'))
      });
    }
  }
};

async function handleWebSocket(request, env) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId') || 'default-room';
  const playerId = url.searchParams.get('playerId') || generatePlayerId();
  
  // 獲取或創建 Durable Object
  const roomName = `room-${roomId}`;
  const id = env.GAME_ROOM.idFromName(roomName);
  const room = env.GAME_ROOM.get(id);
  
  // 將 WebSocket 連接傳遞給 Durable Object
  return room.fetch(request.url, {
    method: 'GET',
    headers: {
      'Upgrade': 'websocket',
      'X-Player-Id': playerId
    }
  });
}

async function handleCreateRoom(request, env) {
  try {
    const roomId = generateRoomId();
    const roomName = `room-${roomId}`;
    
    const id = env.GAME_ROOM.idFromName(roomName);
    const room = env.GAME_ROOM.get(id);
    
    // 初始化房間
    await room.fetch(`${request.url}?roomId=${roomId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'initialize' })
    });
    
    return new Response(JSON.stringify({ 
      roomId, 
      wsUrl: `wss://${new URL(request.url).host}?roomId=${roomId}` 
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin'))
      }
    });
  } catch (error) {
    console.error('Create room error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to create room',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin'))
      }
    });
  }
}

async function handleJoinRoom(request, env) {
  try {
    const { roomId } = await request.json();
    
    if (!roomId) {
      return new Response(JSON.stringify({ error: 'Room ID required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...getCorsHeaders(request.headers.get('Origin'))
        }
      });
    }
    
    const roomName = `room-${roomId}`;
    const id = env.GAME_ROOM.idFromName(roomName);
    const room = env.GAME_ROOM.get(id);
    
    // 檢查房間狀態
    const response = await room.fetch(request.url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const roomData = await response.json();
    
    if (roomData.playerCount >= 4) {
      return new Response(JSON.stringify({ error: 'Room is full' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...getCorsHeaders(request.headers.get('Origin'))
        }
      });
    }
    
    return new Response(JSON.stringify({
      roomId,
      wsUrl: `wss://${new URL(request.url).host}?roomId=${roomId}`,
      playerCount: roomData.playerCount
    }), {
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin'))
      }
    });
  } catch (error) {
    console.error('Join room error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to join room',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin'))
      }
    });
  }
}

async function handleRoomStatus(request, env) {
  try {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');
    
    if (!roomId) {
      return new Response(JSON.stringify({ error: 'Room ID required' }), {
        status: 400,
        headers: { 
          'Content-Type': 'application/json',
          ...getCorsHeaders(request.headers.get('Origin'))
        }
      });
    }
    
    const roomName = `room-${roomId}`;
    const id = env.GAME_ROOM.idFromName(roomName);
    const room = env.GAME_ROOM.get(id);
    
    const response = await room.fetch(request.url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const roomData = await response.json();
    
    return new Response(JSON.stringify(roomData), {
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin'))
      }
    });
  } catch (error) {
    console.error('Room status error:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get room status',
      details: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        ...getCorsHeaders(request.headers.get('Origin'))
      }
    });
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generatePlayerId() {
  return 'player_' + Math.random().toString(36).substring(2, 10);
}

function getHomePage() {
  return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>Survivor Game Server</title>
        <style>
            body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
            .endpoint { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
        </style>
    </head>
    <body>
        <h1>🎮 Survivor Game Server</h1>
        <p>Cloudflare Workers + Durable Objects 多人遊戲伺服器</p>
        
        <h2>API Endpoints</h2>
        <div class="endpoint">
            <strong>POST /api/create-room</strong><br>
            創建新遊戲房間
        </div>
        
        <div class="endpoint">
            <strong>POST /api/join-room</strong><br>
            加入現有房間<br>
            Body: {"roomId": "XXXXXX"}
        </div>
        
        <div class="endpoint">
            <strong>GET /api/room-status?roomId=XXXXXX</strong><br>
            查詢房間狀態
        </div>
        
        <div class="endpoint">
            <strong>WebSocket: /?roomId=XXXXXX&playerId=XXXXXX</strong><br>
            遊戲連線
        </div>
        
        <h2>測試客戶端</h2>
        <button onclick="createRoom()">創建房間</button>
        <button onclick="connectTest()">測試連線</button>
        
        <div id="output"></div>
        
        <script>
            async function createRoom() {
                const response = await fetch('/api/create-room', { method: 'POST' });
                const data = await response.json();
                document.getElementById('output').innerHTML = 
                    '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            }
            
            function connectTest() {
                const ws = new WebSocket('wss://' + location.host + '?roomId=TEST&playerId=test123');
                ws.onopen = () => console.log('WebSocket connected');
                ws.onmessage = (event) => console.log('Message:', event.data);
                ws.onerror = (error) => console.error('WebSocket error:', error);
            }
        </script>
    </body>
    </html>
  `;
} 