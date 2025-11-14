# Frontend Socket.IO Integration Guide

Hướng dẫn cập nhật frontend Next.js để kết nối với NestJS Socket.IO server thay vì Django WebSocket.

## Thay đổi chính

### 1. Cài đặt Socket.IO Client

```bash
cd tile-counter-frontend
npm install socket.io-client
```

### 2. File đã cập nhật

#### `lib/websocket/deviceDashboardWebSocket.ts`
- ✅ Chuyển từ WebSocket API sang Socket.IO client
- ✅ Thêm support cho các events: `device_update`, `batch_device_update`, `production_update`
- ✅ Auto join room 'devices' khi connect
- ✅ Auto reconnect với exponential backoff

#### `hooks/useDeviceDashboardWebSocket.ts`
- ✅ Cập nhật default baseUrl: `http://localhost:3000` (NestJS server)
- ✅ Xử lý message format mới từ NestJS
- ✅ Backward compatibility với Django format

## Cấu hình

### Frontend (Next.js)
```typescript
// app/device-dashboard/page.tsx
const { devices, isConnected, reconnect } = useDeviceDashboardWebSocket(
  initialDevices,
  {
    enabled: true,
    baseUrl: 'http://localhost:3000', // NestJS Socket.IO server
  }
);
```

### Backend (NestJS)
```bash
# Khởi động NestJS server
cd tile-production-management
npm install
npm run start:dev
```

Server sẽ chạy trên `http://localhost:3000`

## Message Format

### Từ NestJS Backend → Frontend

#### 1. Device Update (Single)
```typescript
{
  type: 'device_update',
  data: {
    deviceId: 'TRUOC-DH-01',
    count: 1250,
    errCount: 5,
    rssi: -65,
    timestamp: '2024-01-15T10:30:00Z'
  }
}
```

#### 2. Batch Device Update
```typescript
{
  type: 'batch_device_update',
  data: {
    'TRUOC-DH-01': {
      count: 1250,
      errCount: 5,
      rssi: -65,
      timestamp: '2024-01-15T10:30:00Z'
    },
    'TRUOC-DH-02': {
      count: 980,
      errCount: 2,
      rssi: -70,
      timestamp: '2024-01-15T10:30:05Z'
    }
  }
}
```

#### 3. Production Update
```typescript
{
  type: 'production_update',
  data: {
    totalProduction: 5230,
    activeLines: 4,
    timestamp: '2024-01-15T10:30:00Z'
  }
}
```

## WebSocket Events

### Client → Server

#### Join Room
```typescript
socket.emit('join_room', 'devices');
```

#### Send Message
```typescript
socket.emit('message', {
  action: 'subscribe',
  deviceId: 'TRUOC-DH-01'
});
```

### Server → Client

#### Connection Events
- `connect`: Kết nối thành công
- `disconnect`: Ngắt kết nối
- `reconnect`: Reconnect thành công
- `error`: Lỗi connection

#### Data Events
- `device_update`: Cập nhật device đơn lẻ
- `batch_device_update`: Cập nhật nhiều devices cùng lúc
- `production_update`: Cập nhật production summary

## Kiểm tra kết nối

### 1. Test NestJS Server

Mở browser console và chạy:

```javascript
// Test Socket.IO connection
const socket = io('http://localhost:3000');

socket.on('connect', () => {
  console.log('✅ Connected to NestJS');
  socket.emit('join_room', 'devices');
});

socket.on('device_update', (data) => {
  console.log('📦 Device update:', data);
});
```

### 2. Test MQTT → WebSocket Flow

```bash
# Terminal 1: Khởi động NestJS
cd tile-production-management
npm run start:dev

# Terminal 2: Khởi động Frontend
cd tile-counter-frontend
npm run dev

# Terminal 3: Gửi MQTT test message
mosquitto_pub -h localhost -t "devices/TRUOC-DH-01/telemetry" -m '{
  "deviceId": "TRUOC-DH-01",
  "ts": "2024-01-15T10:30:00Z",
  "metrics": {
    "count": 1250,
    "err_count": 5
  },
  "quality": {
    "rssi": -65
  }
}'
```

Kiểm tra browser console:
```
✅ Socket.IO connected to: http://localhost:3000
📦 Received device_update: { deviceId: 'TRUOC-DH-01', count: 1250, ... }
✅ Updating device: TRUOC-DH-01 old: 1200 new: 1250
```

## Luồng dữ liệu hoàn chỉnh

```
MQTT Device/Simulator
    ↓ (MQTT message)
MQTT Broker (Mosquitto)
    ↓ (subscribe)
NestJS MqttService
    ↓ (parse & validate)
MessageQueueService (Redis locks)
    ↓ (ordered processing)
DevicesMqttHandler
    ↓ (process telemetry)
BoundedCacheService (update cache)
    ↓ (rate limited)
WebSocketGateway (Socket.IO)
    ↓ (emit 'device_update')
Frontend Socket.IO Client
    ↓ (receive event)
useDeviceDashboardWebSocket hook
    ↓ (update React state)
UI Update (real-time)
```

## Troubleshooting

### Lỗi: "Cannot find module 'socket.io-client'"
```bash
cd tile-counter-frontend
npm install socket.io-client
```

### Lỗi: Connection refused
- Kiểm tra NestJS server đang chạy: `http://localhost:3000`
- Kiểm tra CORS settings trong WebSocketGateway
- Kiểm tra firewall/antivirus

### Lỗi: No data received
- Kiểm tra MQTT broker đang chạy: `mosquitto -v`
- Kiểm tra Redis đang chạy: `redis-cli ping`
- Kiểm tra device có được đăng ký trong database không
- Xem logs trong NestJS console

### Frontend không nhận updates
- Mở DevTools Console
- Kiểm tra Socket.IO connection status
- Verify đã join room 'devices': `socket.emit('join_room', 'devices')`
- Kiểm tra message format trong console logs

## Migration từ Django

### Cấu hình cũ (Django)
```typescript
baseUrl: 'ws://localhost:5555/ws/phan-tich/'  // ❌ Django Channels
```

### Cấu hình mới (NestJS)
```typescript
baseUrl: 'http://localhost:3000'  // ✅ NestJS Socket.IO
```

### Code compatibility

Frontend đã được cập nhật để hỗ trợ cả hai format:
- NestJS format (mới): `type: 'device_update'`
- Django format (cũ): `event: 'dom_update'` (backward compatibility)

## Performance Tips

1. **Rate Limiting**: NestJS đã cấu hình rate limiting 200ms cho device updates
2. **Batch Updates**: Sử dụng batch updates cho nhiều devices (hiệu quả hơn)
3. **Rooms**: Client chỉ nhận data từ rooms đã join
4. **Connection Pooling**: Socket.IO tự động manage connections

## Next Steps

- [ ] Thêm authentication cho WebSocket connections
- [ ] Implement room-based filtering (factory, line)
- [ ] Add metrics/monitoring cho WebSocket
- [ ] Setup SSL/TLS cho production
- [ ] Load testing với nhiều concurrent connections
