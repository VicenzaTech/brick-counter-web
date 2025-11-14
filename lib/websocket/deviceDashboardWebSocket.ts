/**
 * WebSocket Service for Device Dashboard
 * Kết nối với NestJS backend (Socket.IO) để nhận dữ liệu real-time từ các thiết bị
 */

import { io, Socket } from 'socket.io-client';

export interface WebSocketMessage {
  // Format mới từ NestJS
  type?: 'device_update' | 'batch_device_update' | 'production_update' | 'connection_status' | 'error';
  data?: any;
  timestamp?: string;
  deviceId?: string;
  
  // Format từ Django backend (backward compatibility)
  event?: 'dom_update' | 'batch_update' | 'initial_state';
}

export interface DeviceUpdateData {
  device_id?: string;
  deviceId?: string;
  count: number;
  timestamp: string;
  errCount?: number;
  rssi?: number;
}

class DeviceDashboardWebSocket {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;
  private isIntentionallyClosed = false;

  constructor(private url: string) {}

  /**
   * Kết nối WebSocket với Socket.IO
   */
  connect(
    onMessage: (data: any) => void,
    onConnect: () => void,
    onDisconnect: () => void,
    onError: (error: any) => void
  ) {
    try {
      // Tạo Socket.IO connection
      this.socket = io(this.url, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
      });

      // Event: Kết nối thành công
      this.socket.on('connect', () => {
        console.log('✅ Socket.IO connected to:', this.url);
        console.log('🔌 Socket ID:', this.socket?.id);
        this.reconnectAttempts = 0;
        
        // Join vào room 'devices' để nhận device updates
        console.log('📤 Requesting to join room: devices');
        this.socket?.emit('join_room', 'devices');
        
        onConnect();
      });

      // Event: Joined room confirmation
      this.socket.on('joined_room', (data: any) => {
        console.log('✅ Successfully joined room:', data);
      });

      // Event: Nhận device update
      this.socket.on('device_update', (data: any) => {
        console.log('📦 Received device_update:', data);
        onMessage({
          type: 'device_update',
          data,
          timestamp: new Date().toISOString(),
        });
      });

      // Event: Nhận batch device updates
      this.socket.on('batch_device_update', (data: any) => {
        console.log('📦 Received batch_device_update:', data);
        onMessage({
          type: 'batch_device_update',
          data,
          timestamp: new Date().toISOString(),
        });
      });

      // Event: Nhận production update
      this.socket.on('production_update', (data: any) => {
        console.log('📦 Received production_update:', data);
        onMessage({
          type: 'production_update',
          data,
          timestamp: new Date().toISOString(),
        });
      });

      // Event: Lỗi
      this.socket.on('error', (error: any) => {
        console.error('❌ Socket.IO error:', error);
        onError(error);
      });

      // Event: Ngắt kết nối
      this.socket.on('disconnect', (reason: string) => {
        console.log('⚠️ Socket.IO disconnected:', reason);
        onDisconnect();
      });

      // Event: Reconnect attempt
      this.socket.on('reconnect_attempt', (attemptNumber: number) => {
        console.log(`🔄 Reconnecting... Attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
      });

      // Event: Reconnect thành công
      this.socket.on('reconnect', (attemptNumber: number) => {
        console.log(`✅ Reconnected after ${attemptNumber} attempts`);
        this.reconnectAttempts = 0;
        
        // Re-join room
        console.log('📤 Re-joining room: devices');
        this.socket?.emit('join_room', 'devices');
      });

    } catch (error) {
      console.error('Failed to create Socket.IO connection:', error);
      onError(error);
    }
  }

  /**
   * Gửi message đến server
   */
  send(data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('message', data);
    } else {
      console.warn('Socket.IO is not connected. Cannot send message.');
    }
  }

  /**
   * Đóng kết nối
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Kiểm tra trạng thái kết nối
   */
  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
}

/**
 * Tạo Socket.IO connection cho device dashboard
 * @param baseUrl - Socket.IO server URL (vd: http://localhost:3000)
 * @param factory - Factory ID (optional, vd: 'factory1')
 * @param line - Line ID (optional, vd: 'line1')
 */
export function createDeviceDashboardWebSocket(
  baseUrl: string = 'http://localhost:3000', // NestJS Socket.IO server
  factory: string = '',
  line: string = ''
) {
  // Socket.IO sử dụng HTTP URL, không phải WS URL
  return new DeviceDashboardWebSocket(baseUrl);
}

export default DeviceDashboardWebSocket;
