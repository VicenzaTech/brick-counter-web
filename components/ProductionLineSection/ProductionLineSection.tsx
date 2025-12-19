import { useMemo, useState } from "react";
import { Cpu, RotateCcw, Settings } from "lucide-react";
import styles from "./ProductionLineSection.module.css";
import { Button } from "../Button/Button";
import type { RawTelemetryPayload } from "@/hooks/useProductionLineWebsocket";
import { LinePositionsStrip } from "./LinePositionsStrip";
import { PositionDevicesPanel } from "./PositionDevicesPanel";

export interface DeviceRuntimeInfo {
  deviceId: string;
  name: string;
  metrics: object;
  errorCount: number;
  lastUpdated: string | null;
  rssi?: number;
  isRunning: boolean;
}

export interface PositionRuntimeInfo {
  positionId: number;
  totalCount: number;
  totalErrorCount: number;
  status: PositionStatus;
  id: number;
  name: string;
  description?: string;
  index?: number;
}

interface DeviceData {
  id: string;
  name: string;
  count: number;
  lastUpdated: string;
  speedPerMinute?: number;
  speedPerHour?: number;
  isRunning?: boolean;
  trend?: "increasing" | "stable" | "decreasing" | "stopped";
  idleTimeSeconds?: number;
  position?: string;
}

interface ProductionLineInfo {
  id: number;
  name: string;
  brickType?: {
    id: number;
    name: string;
    description?: string;
  };
  status?: string;
}

interface MetricsData {
  haophiMoc: number;
  haophiNung: number;
  haophiTruocMai: number;
  haophiHoanThien: number;
  haophiMocVariant: "primary" | "success" | "warning" | "danger" | "muted";
  haophiNungVariant: "primary" | "success" | "warning" | "danger" | "muted";
  haophiTruocMaiVariant: "primary" | "success" | "warning" | "danger" | "muted";
  haophiHoanThienVariant:
    | "primary"
    | "success"
    | "warning"
    | "danger"
    | "muted";
}

/** Device gắn với 1 Position */
export interface PositionDeviceInfo {
  id: number;
  deviceId: string;
  name: string;
}

export interface PositionInfo {
  id: number;
  name: string;
  description?: string;
  index?: number;
  devices?: PositionDeviceInfo[];
}

export type PositionStatus = "running" | "idle" | "error" | "unknown";

interface ProductionLineSectionProps {
  lineInfo: ProductionLineInfo;
  metrics: MetricsData;
  devices?: DeviceData[];
  linePositions: PositionInfo[];
  telemetryByDevice: Record<string, RawTelemetryPayload>;
  onReset?: () => void;
  isResetting?: boolean;
  showResetButton?: boolean;
  onConfig?: () => void;
  onDeviceClick?: (device: { deviceId: string; name: string }) => void;
  selectedPositionId?: number;
  onPositionChange?: (positionId: number) => void;
}

export default function ProductionLineSection({
  lineInfo,
  linePositions,
  onReset,
  isResetting = false,
  showResetButton = true,
  telemetryByDevice,
  onConfig,
  onDeviceClick,
  selectedPositionId,
  onPositionChange,
}: ProductionLineSectionProps) {
  const [internalPositionId, setInternalPositionId] = useState<number | null>(
    null
  );
  const [internalDeviceId, setInternalDeviceId] = useState<string | null>(null);

  const defaultPositionId = linePositions[0]?.id ?? null;
  const effectiveInternalPositionId =
    internalPositionId != null &&
    linePositions.some((p) => p.id === internalPositionId)
      ? internalPositionId
      : defaultPositionId;

  const activePositionId = selectedPositionId ?? effectiveInternalPositionId;

  const activePosition = useMemo(
    () => linePositions.find((p) => p.id === activePositionId) ?? null,
    [linePositions, activePositionId]
  );

  const handleSelectPosition = (posId: number) => {
    if (onPositionChange) {
      onPositionChange(posId);
    } else {
      setInternalPositionId(posId);
      setInternalDeviceId(null);
    }
  };

  const handleSelectDevice = (dev: PositionDeviceInfo) => {
    setInternalDeviceId(dev.deviceId);
    onDeviceClick?.({ deviceId: dev.deviceId, name: dev.name });
  };

  // // ====== MAPPING TELEMETRY → POSITION RUNTIME ======
  const telemetryByPosition: Record<number, PositionRuntimeInfo> =
    useMemo(() => {
      const result: Record<number, PositionRuntimeInfo> = {};
      linePositions.forEach((pos) => {
        const mappedDevices: any = pos.devices;
        let sumCount = 0;
        let sumError = 0;
        mappedDevices.forEach((device) => {
          const existKey = Object.keys(telemetryByDevice).includes(
            device.deviceId
          );
          if (existKey) {
            const currentDevice = telemetryByDevice[device.deviceId];
            // console.log(currentDevice)
            sumCount += currentDevice?.metrics
              ? currentDevice?.metrics?.total
              : 0;
            sumError += currentDevice?.metrics
              ? currentDevice?.metrics?.error_count
              : 0;
          }
        });
        result[pos.id] = {
          totalCount: sumCount,
          totalErrorCount: sumError,
          positionId: pos.id,
          status: "unknown",
          id: pos.id,
          name: pos.name,
          index: pos.index,
          description: pos.description,
        };
      });
      return result;
    }, [linePositions, telemetryByDevice]);

  return (
    <div className={styles.section}>
      {/* Header dây chuyền */}
      <div className={styles.sectionHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.sectionTitle}>
            <Cpu size={24} />
            {lineInfo.name}
          </h2>

          {lineInfo.brickType && (
            <div className={styles.brickTypeInfo}>
              <span className={styles.brickTypeLabel}>Đang sản xuất:</span>
              <span className={styles.brickTypeName}>
                {lineInfo.brickType.name}
              </span>
              {lineInfo.brickType.description && (
                <span className={styles.brickTypeDesc}>
                  ({lineInfo.brickType.description})
                </span>
              )}
            </div>
          )}
        </div>

        {showResetButton && (
          <div className={styles.headerButtons}>
            {onConfig && (
              <Button
                onClick={onConfig}
                className={styles.configButton}
                title="Cấu hình dây chuyền"
              >
                <Settings size={18} />
                Cấu hình
              </Button>
            )}

            {onReset && (
              <Button
                typeBtn="secondaryButton"
                onClick={onReset}
                disabled={isResetting}
                className={styles.resetButton}
              >
                <RotateCcw
                  size={18}
                  className={isResetting ? styles.spinning : ""}
                />
                {isResetting ? "Đang reset..." : "Reset toàn bộ thiết bị"}
              </Button>
            )}
          </div>
        )}
      </div>

      <LinePositionsStrip
        linePositions={linePositions}
        activePositionId={activePositionId ?? null}
        onSelectPosition={handleSelectPosition}
        telemetryByPosition={telemetryByPosition}
      />

      <PositionDevicesPanel
        activePosition={activePosition}
        selectedDeviceId={internalDeviceId}
        telemetryByDevice={telemetryByDevice ?? {}}
        onSelectDevice={handleSelectDevice}
      />
    </div>
  );
}
