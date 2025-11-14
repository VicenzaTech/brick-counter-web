'use client';

import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export default function TestWebSocketPage() {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    console.log('🔌 Creating Socket.IO connection...');
    
    const newSocket = io('http://localhost:5555', {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });

    newSocket.on('connect', () => {
      console.log('✅ Connected to WebSocket server');
      console.log('🔌 Socket ID:', newSocket.id);
      setConnected(true);
      
      // Join devices room
      newSocket.emit('join_room', 'devices');
    });

    newSocket.on('joined_room', (data: any) => {
      console.log('✅ Joined room:', data);
      setMessages(prev => [...prev, { type: 'joined_room', data, timestamp: new Date().toISOString() }]);
    });

    newSocket.on('initial_telemetry', (data: any) => {
      console.log('📥 Received initial_telemetry:', data);
      setMessages(prev => [...prev, { type: 'initial_telemetry', data, timestamp: new Date().toISOString() }]);
    });

    newSocket.on('device_update', (data: any) => {
      console.log('📦 Received device_update:', data);
      setMessages(prev => [...prev, { type: 'device_update', data, timestamp: new Date().toISOString() }]);
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from WebSocket server');
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>WebSocket Test Page</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <strong>Connection Status:</strong>{' '}
        <span style={{ color: connected ? 'green' : 'red' }}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      {socket && (
        <div style={{ marginBottom: '20px' }}>
          <strong>Socket ID:</strong> {socket.id || 'N/A'}
        </div>
      )}

      <div>
        <h2>Messages ({messages.length})</h2>
        <div style={{ maxHeight: '600px', overflow: 'auto', border: '1px solid #ccc', padding: '10px' }}>
          {messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
              <div style={{ fontWeight: 'bold', color: '#0066cc', marginBottom: '5px' }}>
                [{new Date(msg.timestamp).toLocaleTimeString()}] {msg.type}
              </div>
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                {JSON.stringify(msg.data, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
