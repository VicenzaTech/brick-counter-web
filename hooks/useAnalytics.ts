"use client";

import { useState, useEffect } from "react";
import io from "socket.io-client";

interface DeviceAnalytics {
  deviceId: string;
  productionLine: string;
  position: string;
  currentCount: number;
  lastUpdate: string;
  speedPerMinute: number;
  speedPerHour: number;
  totalProducedToday: number;
  totalProducedLastHour: number;
  totalProducedLast10Min: number;
  isRunning: boolean;
  idleTimeSeconds: number;
  uptimeSeconds: number;
  trend: "increasing" | "stable" | "decreasing" | "stopped";
  efficiencyPercent?: number;
}

interface LineAnalytics {
  productionLine: string;
  totalDevices: number;
  runningDevices: number;
  stoppedDevices: number;
  totalProducedToday: number;
  averageSpeedPerHour: number;
  devices: DeviceAnalytics[];
}

interface UseAnalyticsReturn {
  lineMetrics: Map<string, LineAnalytics>;
  deviceMetrics: Map<string, DeviceAnalytics>;
  isConnected: boolean;
}

export function useAnalytics(
  baseUrl: string = "http://localhost:5555"
): UseAnalyticsReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [lineMetrics, setLineMetrics] = useState<Map<string, LineAnalytics>>(
    new Map()
  );
  const [deviceMetrics, setDeviceMetrics] = useState<
    Map<string, DeviceAnalytics>
  >(new Map());

  useEffect(() => {
    // Connect to analytics namespace
    const socketInstance = io(`${baseUrl}/analytics`, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    socketInstance.on("connect", () => {
      console.log("✅ Connected to analytics WebSocket");
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Disconnected from analytics WebSocket");
      setIsConnected(false);
    });

    // Listen for line updates
    socketInstance.on(
      "line-update",
      (data: { lineName: string; data: LineAnalytics }) => {
        setLineMetrics((prev) => {
          const newMap = new Map(prev);
          newMap.set(data.lineName, data.data);
          return newMap;
        });

        // Update device metrics
        data.data.devices.forEach((device) => {
          setDeviceMetrics((prev) => {
            const newMap = new Map(prev);
            newMap.set(device.deviceId, device);
            return newMap;
          });
        });
      }
    );

    // Listen for device updates
    socketInstance.on("device-update", (device: DeviceAnalytics) => {
      setDeviceMetrics((prev) => {
        const newMap = new Map(prev);
        newMap.set(device.deviceId, device);
        return newMap;
      });
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [baseUrl]);

  return { lineMetrics, deviceMetrics, isConnected };
}
