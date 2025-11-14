# Device Dashboard - WebSocket Integration Guide

## Tổng quan

Trang Device Dashboard được thiết kế để hiển thị dữ liệu real-time từ các thiết bị thông qua WebSocket. Hiện tại đang chạy ở chế độ **demo** với dữ liệu giả.

## Cấu trúc

### Files chính

1. **`app/device-dashboard/page.tsx`** - Component chính của trang
2. **`hooks/useDeviceDashboardWebSocket.ts`** - Custom hook quản lý WebSocket
3. **`lib/websocket/deviceDashboardWebSocket.ts`** - WebSocket service class

## Kích hoạt WebSocket

### Bước 1: Cấu hình Backend

Đảm bảo backend Django đã có WebSocket endpoint:
- URL: `ws://localhost:8000/ws/phan-tich/{factory}/{line}/`
- Ví dụ: `ws://localhost:8000/ws/phan-tich/factory1/line1/`

### Bước 2: Cấu hình Frontend

Trong file `app/device-dashboard/page.tsx`, thay đổi cấu hình:

```typescript
const { devices, setDevices, isConnected } = useDeviceDashboardWebSocket(INITIAL_DEVICES, {
  enabled: true, // ⬅️ Đổi từ false sang true
  baseUrl: 'ws://localhost:8000', // ⬅️ Điều chỉnh URL nếu cần
  factory: 'factory1', // ⬅️ ID phân xưởng
  line: 'line1', // ⬅️ ID dây chuyền
});
```

### Bước 3: Format dữ liệu từ Backend

Backend cần gửi dữ liệu theo format:

```json
{
  "type": "device_update",
  "data": {
    "dc1_r1c1": {
      "count": 1250,
      "timestamp": "2025-11-10T10:30:25Z"
    },
    "dc1_r1c2": {
      "count": 1245,
      "timestamp": "2025-11-10T10:30:26Z"
    }
    // ... các thiết bị khác
  },
  "timestamp": "2025-11-10T10:30:25Z"
}
```

## Mapping Device IDs

Các ID thiết bị tương ứng với:

| Device ID | Tên thiết bị | Vị trí |
|-----------|-------------|---------|
| dc1_r1c1 | Sau máy ép 1 | Dây chuyền 1 |
| dc1_r1c2 | Sau máy ép 2 | Dây chuyền 1 |
| dc1_r1c3 | Trước lò nung 1 | Dây chuyền 1 |
| dc1_r1c4 | Trước lò nung 2 | Dây chuyền 1 |
| dc1_r1c5 | Sau lò nung 1 | Dây chuyền 1 |
| dc1_r1c6 | Trước mài mặt 1 | Dây chuyền 1 |
| dc1_r1c7 | Sau mài cạnh 1 | Dây chuyền 1 |
| dc1_r1c8 | Trước đóng hộp 1 | Dây chuyền 1 |

## Tính năng

### 1. Auto Reconnect
- Tự động kết nối lại khi mất kết nối
- Tối đa 5 lần thử
- Delay 3 giây giữa các lần thử

### 2. Fallback to Fake Data
- Nếu `enabled: false` hoặc không kết nối được WebSocket
- Tự động chuyển sang chế độ demo với dữ liệu giả
- Cập nhật mỗi 5 giây

### 3. Connection Status Indicator
- Hiển thị trạng thái kết nối ở header
- 🟢 **Đang kết nối**: WebSocket đang hoạt động
- 🟡 **Chế độ demo**: Đang dùng dữ liệu giả

## Debug

### Kiểm tra console logs

```javascript
// Khi kết nối thành công
"WebSocket connected"

// Khi nhận message
"WebSocket message received:", { type: "device_update", data: {...} }

// Khi lỗi
"WebSocket error:", error
```

### Test WebSocket trong Browser Console

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/phan-tich/factory1/line1/');

ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => console.log('Message:', JSON.parse(event.data));
ws.onerror = (error) => console.log('Error:', error);
```

## Environment Variables

Có thể tạo file `.env.local` để cấu hình:

```env
NEXT_PUBLIC_WS_URL=ws://localhost:8000
NEXT_PUBLIC_FACTORY_ID=factory1
NEXT_PUBLIC_LINE_ID=line1
```

Sau đó sử dụng trong code:

```typescript
const { devices, isConnected } = useDeviceDashboardWebSocket(INITIAL_DEVICES, {
  enabled: true,
  baseUrl: process.env.NEXT_PUBLIC_WS_URL,
  factory: process.env.NEXT_PUBLIC_FACTORY_ID,
  line: process.env.NEXT_PUBLIC_LINE_ID,
});
```

## Troubleshooting

### Lỗi: Connection refused
- Kiểm tra backend có chạy không
- Kiểm tra URL WebSocket đúng chưa
- Kiểm tra firewall/CORS settings

### Lỗi: Data không cập nhật
- Kiểm tra format dữ liệu từ backend
- Kiểm tra device IDs có khớp không
- Xem console logs để debug

### Lỗi: Connection timeout
- Tăng reconnect attempts trong `deviceDashboardWebSocket.ts`
- Tăng reconnect delay
- Kiểm tra network stability

## Production Deployment

Khi deploy production:

1. Đổi `ws://` thành `wss://` (WebSocket Secure)
2. Cấu hình đúng domain/port
3. Thiết lập proper CORS headers
4. Enable compression nếu cần
5. Monitor WebSocket connections
