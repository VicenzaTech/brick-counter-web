import { useEffect, useState, useCallback, useRef } from "react";
import { createDeviceDashboardWebSocket } from "@/lib/websocket/deviceDashboardWebSocket";

interface UseDeviceDashboardWebSocketOptions {
  enabled?: boolean;
  baseUrl?: string;
  factory?: string;
  line?: string;
  onMessage?: (data: unknown) => void;
  onError?: (error: Event) => void;
}

interface DeviceData {
  id: string;
  name: string;
  count: number;
  lastUpdated: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function useDeviceDashboardWebSocket(
  initialDevices: DeviceData[],
  options: UseDeviceDashboardWebSocketOptions = {}
) {
  const {
    enabled = false,
    baseUrl = process.env.NEXT_PUBLIC_API_URL, // NestJS Socket.IO server
    factory = "factory1",
    line = "line1",
    onMessage,
    onError,
  } = options;

  // Initialize once from the initial prop value
  const [devices, setDevices] = useState<DeviceData[]>(() => initialDevices);
  const [isConnected, setIsConnected] = useState(false);
  const devicesRef = useRef<DeviceData[]>(initialDevices);
  const wsRef = useRef<ReturnType<
    typeof createDeviceDashboardWebSocket
  > | null>(null);

  // Debug: Log khi devices state thay đổi
  useEffect(() => {
    devicesRef.current = devices;
    console.log(
      "📊 Devices state changed:",
      devices.map((d) => ({ id: d.id, count: d.count }))
    );
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

  const handleMessage = useCallback((message: unknown) => {
    console.log("🔵 WebSocket RAW message:", message);

    if (!isRecord(message)) {
      console.log("⚠️ Unknown message format");
      return;
    }

    const type = asString(message.type);
    const event = asString(message.event);
    const data = message.data;

    console.log("🔵 Message type/event:", type, event);
    console.log("🔵 Message data:", data);

    // Xử lý initial telemetry data từ database khi connect
    if (type === "initial_telemetry" && Array.isArray(data)) {
      console.log("📥 Initial telemetry data received from database:", data);

      setDevices((prevDevices) =>
        prevDevices.map((device) => {
          const telemetry = data.find((t) => {
            if (!isRecord(t)) return false;
            return asString(t.deviceId) === device.id;
          });

          if (telemetry) {
            const telemetryRecord = telemetry as Record<string, unknown>;
            const count = asNumber(telemetryRecord.count) ?? 0;
            const timestamp = asString(telemetryRecord.timestamp);
            console.log(
              "✅ Loading initial data for:",
              device.id,
              "count:",
              count
            );
            return {
              ...device,
              count,
              lastUpdated: timestamp
                ? new Date(timestamp).toLocaleTimeString("vi-VN")
                : device.lastUpdated,
            };
          }
          return device;
        })
      );
    }
    // Xử lý message từ NestJS Socket.IO backend
    else if (type === "device_update" && isRecord(data)) {
      // Single device update từ NestJS
      const deviceId = asString(data.deviceId) ?? asString(data.device_id);
      const count = asNumber(data.count);

      console.log("✅ Device Update received:", {
        deviceId,
        count,
        fullData: data,
      });
      console.log(
        "📋 Current devices in state:",
        devicesRef.current.map((d) => ({ id: d.id, name: d.name }))
      );

      if (deviceId && count !== undefined) {
        setDevices((prevDevices) => {
          console.log("🔍 Searching for device with id:", deviceId);
          const found = prevDevices.find((d) => d.id === deviceId);
          console.log("🔍 Found device?", found ? "Yes" : "No");

          const updated = prevDevices.map((device) => {
            if (device.id === deviceId) {
              console.log(
                "✅ MATCH! Updating device:",
                deviceId,
                "old:",
                device.count,
                "new:",
                count
              );
              return {
                ...device,
                count,
                lastUpdated: new Date().toLocaleTimeString("vi-VN"),
              };
            }
            return device;
          });
          console.log(
            "📊 Updated devices state:",
            updated.map((d) => ({ id: d.id, count: d.count }))
          );
          return updated;
        });
      }
    } else if (type === "batch_device_update" && isRecord(data)) {
      // Batch update từ NestJS
      const updates = data;

      console.log("✅ Batch Device Update:", updates);

      setDevices((prevDevices) =>
        prevDevices.map((device) => {
          const update = updates[device.id];
          if (isRecord(update)) {
            const count = asNumber(update.count) ?? asNumber(update.value);
            console.log(
              "✅ Updating device from batch:",
              device.id,
              "count:",
              count
            );
            return {
              ...device,
              count: count ?? 0,
              lastUpdated: new Date().toLocaleTimeString("vi-VN"),
            };
          }
          return device;
        })
      );
    } else if (event === "dom_update") {
      // Backward compatibility với Django backend
      const targetId = isRecord(data) ? asString(data.target_id) : undefined;
      const value = isRecord(data) ? data.value : undefined;

      console.log("✅ DOM Update (Django):", targetId, "=", value);

      if (targetId && value !== undefined) {
        const deviceId = targetId
          .replace(/_sl$/, "")
          .replace(/_updated$/, "")
          .replace(/_name$/, "");

        console.log(
          "📍 Device ID extracted:",
          deviceId,
          "from target:",
          targetId
        );

        setDevices((prevDevices) => {
          const updated = prevDevices.map((device) => {
            if (device.id === deviceId) {
              console.log(
                "✅ Updating device:",
                deviceId,
                "old:",
                device.count,
                "new:",
                value
              );
              return {
                ...device,
                count: asNumber(value) ?? 0,
                lastUpdated: new Date().toLocaleTimeString("vi-VN"),
              };
            }
            return device;
          });
          console.log("📊 Updated devices state");
          return updated;
        });
      }
    } else if (event === "batch_update") {
      // Backward compatibility với Django backend
      const updates =
        isRecord(data) && isRecord(data.updates) ? data.updates : {};

      console.log("✅ Batch Update (Django):", updates);

      setDevices((prevDevices) =>
        prevDevices.map((device) => {
          const countKey = `${device.id}_sl`;
          const countData = (updates as Record<string, unknown>)[countKey];

          if (countData !== undefined) {
            const countValue =
              isRecord(countData) && countData.value !== undefined
                ? countData.value
                : countData;

            console.log(
              "✅ Updating device from batch:",
              device.id,
              "count:",
              countValue
            );
            return {
              ...device,
              count: asNumber(countValue) ?? 0,
              lastUpdated: new Date().toLocaleTimeString("vi-VN"),
            };
          }
          return device;
        })
      );
    } else {
      console.log("⚠️ Unknown message format");
    }

    // Custom message handler
    if (callbacksRef.current.onMessage) {
      callbacksRef.current.onMessage(data);
    }
  }, []); // Empty deps - stable forever

  const handleConnect = useCallback(() => {
    console.log("✅ WebSocket connected successfully");
    setIsConnected(true);
  }, []); // Empty deps - stable forever

  const handleDisconnect = useCallback(() => {
    console.log("⚠️ WebSocket disconnected");
    setIsConnected(false);
  }, []); // Empty deps - stable forever

  const handleError = useCallback((error: Event) => {
    console.error("❌ WebSocket error:", error);
    setIsConnected(false);
    if (callbacksRef.current.onError) {
      callbacksRef.current.onError(error);
    }
  }, []); // Empty deps - stable forever

  useEffect(() => {
    if (!enabled) {
      // Nếu WebSocket bị tắt, sử dụng fake data simulation
      console.log("WebSocket disabled, using fake data simulation");
      const interval = setInterval(() => {
        setDevices((prevDevices) =>
          prevDevices.map((device) => ({
            ...device,
            count: device.count + Math.floor(Math.random() * 3),
            lastUpdated: new Date().toLocaleTimeString("vi-VN"),
          }))
        );
      }, 5000);

      return () => clearInterval(interval);
    }

    console.log("🔌 Creating WebSocket connection...");
    console.log("🔌 Connection params:", { baseUrl, factory, line, enabled });

    // Kết nối WebSocket
    wsRef.current = createDeviceDashboardWebSocket(baseUrl, factory, line);
    wsRef.current.connect(
      handleMessage,
      handleConnect,
      handleDisconnect,
      handleError
    );

    // Cleanup khi unmount
    return () => {
      console.log("🔌 Cleaning up WebSocket connection...");
      if (wsRef.current) {
        wsRef.current.disconnect();
        wsRef.current = null;
      }
    };
  }, [
    enabled,
    baseUrl,
    factory,
    line,
    handleMessage,
    handleConnect,
    handleDisconnect,
    handleError,
  ]);

  const sendMessage = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.isConnected()) {
      wsRef.current.send(data);
    } else {
      console.warn("Cannot send message: WebSocket is not connected");
    }
  }, []);

  return {
    devices,
    setDevices,
    isConnected,
    sendMessage,
  };
}
