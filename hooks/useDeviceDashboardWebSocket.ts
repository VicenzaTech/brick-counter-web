import { useEffect, useState, useCallback, useRef } from 'react';
import { createDeviceDashboardWebSocket, WebSocketMessage, DeviceUpdateData } from '@/lib/websocket/deviceDashboardWebSocket';

interface UseDeviceDashboardWebSocketOptions {
    enabled?: boolean;
    baseUrl?: string;
    factory?: string;
    line?: string;
    onMessage?: (data: any) => void;
    onError?: (error: Event) => void;
}

interface DeviceData {
    id: string;
    name: string;
    count: number;
    lastUpdated: string;
}

export function useDeviceDashboardWebSocket(
    initialDevices: DeviceData[],
    options: UseDeviceDashboardWebSocketOptions = {}
) {
    const {
        enabled = false,
        baseUrl = process.env.NEXT_PUBLIC_API_URL, // NestJS Socket.IO server
        factory = 'factory1',
        line = 'line1',
        onMessage,
        onError,
    } = options;

    // Lưu initialDevices vào ref để không bị ảnh hưởng bởi re-render
    const initialDevicesRef = useRef(initialDevices);

    // Sử dụng lazy initialization - CHỈ DÙNG 1 LẦN DUY NHẤT
    const [devices, setDevices] = useState<DeviceData[]>(() => {
        console.log('🔧 Initializing devices state ONCE with:', initialDevicesRef.current);
        return initialDevicesRef.current;
    });
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<ReturnType<typeof createDeviceDashboardWebSocket> | null>(null);

    // Debug: Log khi devices state thay đổi
    useEffect(() => {
        console.log('📊 Devices state changed:', devices.map(d => ({ id: d.id, count: d.count })));
    }, [devices]);

    // Use refs to store latest callbacks without causing re-renders
    const callbacksRef = useRef({
        onMessage,
        onError,
    });

    // Update refs when callbacks change
    useEffect(() => {
        callbacksRef.current = { onMessage, onError };
    }, [onMessage, onError]);

    const handleMessage = useCallback((message: any) => {
        console.log('🔵 WebSocket RAW message:', message);
        console.log('🔵 Message type/event:', message.type, message.event);
        console.log('🔵 Message data:', message.data);

        // Xử lý initial telemetry data từ database khi connect
        if (message.type === 'initial_telemetry' && Array.isArray(message.data)) {
            console.log('📥 Initial telemetry data received from database:', message.data);

            setDevices(prevDevices =>
                prevDevices.map(device => {
                    const telemetry = message.data.find((t: any) => t.deviceId === device.id);
                    if (telemetry) {
                        console.log('✅ Loading initial data for:', device.id, 'count:', telemetry.count);
                        return {
                            ...device,
                            count: telemetry.count || 0,
                            lastUpdated: telemetry.timestamp
                                ? new Date(telemetry.timestamp).toLocaleTimeString('vi-VN')
                                : device.lastUpdated,
                        };
                    }
                    return device;
                })
            );
        }
        // Xử lý message từ NestJS Socket.IO backend
        else if (message.type === 'device_update' && message.data) {
            // Single device update từ NestJS
            const data = message.data;
            const deviceId = data.deviceId || data.device_id;
            const count = data.count;

            console.log('✅ Device Update received:', { deviceId, count, fullData: data });
            console.log('📋 Current devices in state:', devices.map(d => ({ id: d.id, name: d.name })));

            if (deviceId && count !== undefined) {
                setDevices(prevDevices => {
                    console.log('🔍 Searching for device with id:', deviceId);
                    const found = prevDevices.find(d => d.id === deviceId);
                    console.log('🔍 Found device?', found ? 'Yes' : 'No');

                    const updated = prevDevices.map(device => {
                        if (device.id === deviceId) {
                            console.log('✅ MATCH! Updating device:', deviceId, 'old:', device.count, 'new:', count);
                            return {
                                ...device,
                                count: parseInt(count) || 0,
                                lastUpdated: new Date().toLocaleTimeString('vi-VN'),
                            };
                        }
                        return device;
                    });
                    console.log('📊 Updated devices state:', updated.map(d => ({ id: d.id, count: d.count })));
                    return updated;
                });
            }
        } else if (message.type === 'batch_device_update' && message.data) {
            // Batch update từ NestJS
            const updates = message.data;

            console.log('✅ Batch Device Update:', updates);

            setDevices(prevDevices =>
                prevDevices.map(device => {
                    const update = updates[device.id];
                    if (update) {
                        const count = update.count || update.value;
                        console.log('✅ Updating device from batch:', device.id, 'count:', count);
                        return {
                            ...device,
                            count: parseInt(count) || 0,
                            lastUpdated: new Date().toLocaleTimeString('vi-VN'),
                        };
                    }
                    return device;
                })
            );
        } else if (message.event === 'dom_update') {
            // Backward compatibility với Django backend
            const targetId = message.data?.target_id;
            const value = message.data?.value;

            console.log('✅ DOM Update (Django):', targetId, '=', value);

            if (targetId && value !== undefined) {
                const deviceId = targetId
                    .replace(/_sl$/, '')
                    .replace(/_updated$/, '')
                    .replace(/_name$/, '');

                console.log('📍 Device ID extracted:', deviceId, 'from target:', targetId);

                setDevices(prevDevices => {
                    const updated = prevDevices.map(device => {
                        if (device.id === deviceId) {
                            console.log('✅ Updating device:', deviceId, 'old:', device.count, 'new:', value);
                            return {
                                ...device,
                                count: parseInt(value) || 0,
                                lastUpdated: new Date().toLocaleTimeString('vi-VN'),
                            };
                        }
                        return device;
                    });
                    console.log('📊 Updated devices state');
                    return updated;
                });
            }
        } else if (message.event === 'batch_update') {
            // Backward compatibility với Django backend
            const updates = message.data?.updates || {};

            console.log('✅ Batch Update (Django):', updates);

            setDevices(prevDevices =>
                prevDevices.map(device => {
                    const countKey = `${device.id}_sl`;
                    const countData = updates[countKey];

                    if (countData !== undefined) {
                        const countValue = typeof countData === 'object' && countData.value !== undefined
                            ? countData.value
                            : countData;

                        console.log('✅ Updating device from batch:', device.id, 'count:', countValue);
                        return {
                            ...device,
                            count: parseInt(countValue) || 0,
                            lastUpdated: new Date().toLocaleTimeString('vi-VN'),
                        };
                    }
                    return device;
                })
            );
        } else {
            console.log('⚠️ Unknown message format');
        }

        // Custom message handler
        if (callbacksRef.current.onMessage) {
            callbacksRef.current.onMessage(message.data);
        }
    }, []); // Empty deps - stable forever

    const handleConnect = useCallback(() => {
        console.log('✅ WebSocket connected successfully');
        setIsConnected(true);
    }, []); // Empty deps - stable forever

    const handleDisconnect = useCallback(() => {
        console.log('⚠️ WebSocket disconnected');
        setIsConnected(false);
    }, []); // Empty deps - stable forever

    const handleError = useCallback((error: Event) => {
        console.error('❌ WebSocket error:', error);
        setIsConnected(false);
        if (callbacksRef.current.onError) {
            callbacksRef.current.onError(error);
        }
    }, []); // Empty deps - stable forever

    useEffect(() => {
        if (!enabled) {
            // Nếu WebSocket bị tắt, sử dụng fake data simulation
            console.log('WebSocket disabled, using fake data simulation');
            const interval = setInterval(() => {
                setDevices(prevDevices =>
                    prevDevices.map(device => ({
                        ...device,
                        count: device.count + Math.floor(Math.random() * 3),
                        lastUpdated: new Date().toLocaleTimeString('vi-VN'),
                    }))
                );
            }, 5000);

            return () => clearInterval(interval);
        }

        console.log('🔌 Creating WebSocket connection...');
        console.log('🔌 Connection params:', { baseUrl, factory, line, enabled });

        // Kết nối WebSocket
        wsRef.current = createDeviceDashboardWebSocket(baseUrl, factory, line);
        wsRef.current.connect(handleMessage, handleConnect, handleDisconnect, handleError);

        // Cleanup khi unmount
        return () => {
            console.log('🔌 Cleaning up WebSocket connection...');
            if (wsRef.current) {
                wsRef.current.disconnect();
                wsRef.current = null;
            }
        };
    }, [enabled, baseUrl, factory, line, handleMessage, handleConnect, handleDisconnect, handleError]);

    const sendMessage = useCallback((data: any) => {
        if (wsRef.current && wsRef.current.isConnected()) {
            wsRef.current.send(data);
        } else {
            console.warn('Cannot send message: WebSocket is not connected');
        }
    }, []);

    return {
        devices,
        setDevices,
        isConnected,
        sendMessage,
    };
}
