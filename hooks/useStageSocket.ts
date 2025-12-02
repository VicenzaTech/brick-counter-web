'use client';

import { useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface UseStageSocketOptions {
    deviceIds: string[];
    productionLineId: number | null;
    onTelemetry?: (payload: any) => void;
    baseUrl?: string;
}

interface StageSocketControls {
    joinDeviceRoom: (deviceId: string) => void;
    leaveDeviceRoom: (deviceId: string) => void;
}

export function useStageSocket({
    deviceIds,
    productionLineId,
    onTelemetry,
    baseUrl = process.env.NEXT_PUBLIC_WS_BASE_URL ?? '',
}: UseStageSocketOptions): StageSocketControls {
    const socketRef = useRef<Socket | null>(null);
    const subscribedRoomsRef = useRef<Set<string>>(new Set());
    const desiredDeviceIdsRef = useRef<string[]>([]);

    const subscribeRooms = useCallback((ids: string[]) => {
        if (!ids.length) return;
        const socket = socketRef.current;
        if (!socket || !socket.connected) return;
        console.log('[stage-socket] subscribing rooms', ids);
        const rooms = ids.map((id) => {
            socket.emit('subscribe', {
                rooms: [`device:${id}`],
            });
            return `device:${id}`;
        });
        ids.forEach((id) => subscribedRoomsRef.current.add(id));
    }, []);

    const unsubscribeRooms = useCallback((ids: string[]) => {
        if (!ids.length) return;
        const socket = socketRef.current;
        if (!socket || !socket.connected) return;
        console.log('[stage-socket] unsubscribing rooms', ids);
        const rooms = ids.map((id) => {
            socket.emit('leave', {
                rooms: [`device:${id}`],
            });
        });
        ids.forEach((id) => subscribedRoomsRef.current.delete(id));
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!productionLineId || productionLineId <= 0) return;

        const namespaceBase = (baseUrl || '').replace(/\/$/, '');
        const namespaceUrl = `${namespaceBase}/ws/mdg`;
        const socket: Socket = io(namespaceUrl, {
            transports: ['websocket'],
            reconnectionAttempts: 5,
            reconnectionDelay: 2000,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            const ids = desiredDeviceIdsRef.current;
            subscribeRooms(ids);
        });

        socket.on('joined_room', (room: string) => {
            console.log('[stage-socket] joined room', room);
        });

        socket.on('left_room', (room: string) => {
            console.log('[stage-socket] left room', room);
        });

        socket.on('telemetry', (payload: any) => {
            onTelemetry?.(payload);
        });

        socket.on('disconnect', () => {
            subscribedRoomsRef.current.clear();
        });

        socket.on('connect_error', (err) => {
            console.error('[stage-socket] connect_error', err.message);
        });

        return () => {
            socket.disconnect();
            socketRef.current = null;
            subscribedRoomsRef.current.clear();
        };
    }, [productionLineId, baseUrl, onTelemetry, subscribeRooms]);

    useEffect(() => {
        desiredDeviceIdsRef.current = deviceIds ?? [];
        const currentSet = subscribedRoomsRef.current;
        const idsToJoin = (deviceIds ?? []).filter((id) => !currentSet.has(id));
        const idsToLeave = Array.from(currentSet).filter(
            (id) => !(deviceIds ?? []).includes(id),
        );

        subscribeRooms(idsToJoin);
        unsubscribeRooms(idsToLeave);
    }, [deviceIds, subscribeRooms, unsubscribeRooms]);

    const joinDeviceRoom = useCallback(
        (deviceId: string) => {
            if (!deviceId) return;
            if (!desiredDeviceIdsRef.current.includes(deviceId)) {
                desiredDeviceIdsRef.current = [...desiredDeviceIdsRef.current, deviceId];
            }
            subscribeRooms([deviceId]);
        },
        [subscribeRooms],
    );

    const leaveDeviceRoom = useCallback(
        (deviceId: string) => {
            if (!deviceId) return;
            desiredDeviceIdsRef.current = desiredDeviceIdsRef.current.filter((id) => id !== deviceId);
            unsubscribeRooms([deviceId]);
        },
        [unsubscribeRooms],
    );

    return { joinDeviceRoom, leaveDeviceRoom };
}
