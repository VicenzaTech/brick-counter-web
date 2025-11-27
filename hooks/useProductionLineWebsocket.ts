import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface DeviceClusterInfo {
    id: number;
    code: string;      // "BR", "HM", "BRICK_COUNTER"
    name: string;
}

export interface RawTelemetryPayload {
    device_id: string;
    cluster_code: string;
    timestamp: string; // ISO 8601
    [key: string]: any;
}


type ClusterCode = string;

interface UseProductionLineSocketsOptions {
    deviceId: number;
    lineId: number;
    clusters: DeviceClusterInfo[];
    onTelemetry?: (payload: RawTelemetryPayload) => void;
    baseUrl?: string;
}

interface UseProductionLineSocketsResult {
    emitToCluster: (
        clusterCode: string,
        event: string,
        data?: any,
    ) => void;
    getSocketByCluster: (clusterCode: string) => Socket | undefined;
}

export function useProductionLineSockets(
    options: UseProductionLineSocketsOptions,
): UseProductionLineSocketsResult {
    const {
        deviceId,
        lineId,
        clusters,
        onTelemetry,
        baseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL ?? '',
    } = options;

    // Map<clusterCode, Socket>
    const socketsRef = useRef<Map<ClusterCode, Socket>>(new Map());

    useEffect(() => {
        if (!clusters?.length) return;
        if (typeof window === 'undefined') return;
        clusters.forEach((cls) => {
            const clusterCode = cls.code;
            if (!clusterCode) return;
            if (socketsRef.current.has(clusterCode)) return;

            const namespaceUrl = `${baseUrl.replace(/\/$/, '')}/ws/${clusterCode}`;
            const socket = io(namespaceUrl, {
                transports: ['websocket'],
                autoConnect: true,
                reconnection: true,
                reconnectionAttempts: 3,
                reconnectionDelay: 1000,
            });

            socket.on('connect', () => {
                console.log(
                    `[WS][${clusterCode}] connected: ${socket.id} → join cls:${cls.code}`,
                );

                socket.emit('subscribe', {
                    rooms: [`cluster:${clusterCode}`],
                });
            });

            socket.on('telemetry', (payload: RawTelemetryPayload) => {
                onTelemetry?.(payload);
            });
            socket.on('disconnect', (reason) => {
                console.log(`[WS][${clusterCode}] disconnected:`, reason);
            });

            socket.on('connect_error', (err) => {
                console.error(`[WS][${clusterCode}] connect error:`, err.message);
            });



            socketsRef.current.set(clusterCode, socket);
        });

        socketsRef.current.forEach((socket, defineCls) => {
            const stillExists = clusters.some((c) => c.code === defineCls);

            if (!stillExists) {
                console.log(
                    `[WS][${defineCls}] cluster không còn trong productionLine → disconnect`,
                );
                socket.disconnect();
                socketsRef.current.delete(defineCls);
            }
        });

        return () => {
            console.log('[WS] Cleanup all sockets for productionLine', lineId);
            socketsRef.current.forEach((socket) => {
                socket.disconnect();
            });
            socketsRef.current.clear();
        };
    }, [lineId, baseUrl, JSON.stringify(clusters), onTelemetry, deviceId]);

    const emitToCluster = useCallback(
        (clusterCode: string, event: string, data?: any) => {
            const socket = socketsRef.current.get(clusterCode);
            if (!socket || !socket.connected) {
                console.warn(
                    `[WS][${clusterCode}] emit "${event}" bị bỏ qua vì socket chưa connect`,
                );
                return;
            }
            socket.emit(event, data);
        },
        [],
    );

    const getSocketByCluster = useCallback((clusterCode: string) => {
        return socketsRef.current.get(clusterCode);
    }, []);

    return {
        emitToCluster,
        getSocketByCluster,
    };
}
