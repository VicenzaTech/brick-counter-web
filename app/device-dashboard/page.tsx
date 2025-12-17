'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { Cpu } from 'lucide-react';

import ProductionLineSection from '@/components/ProductionLineSection/ProductionLineSection';
import DeviceConfigModal from '@/components/DeviceConfigModal/DeviceConfigModal';
import TabItem from '@/components/TabItem/TabItem';
import { Dialog } from '@/components/Dialog/Dialog';
import LineSettingsSection from '@/components/LineSettingsSection/LineSettingsSection';
import DeviceDashboardSidebar from '@/components/DeviceDashboardSidebar/DeviceDashboardSidebar';
import { useAnalytics } from '@/hooks/useAnalytics';
import DeviceClusterSection from '@/components/DeviceClusterSection/DeviceClusterSection';
import MeasurementTypeSection from '@/components/MeasurementTypeSection/MeasurementTypeSection';
import Loading from '@/components/Loading/Loading';

import {
    RawTelemetryPayload,
    useProductionLineSockets,
} from '@/hooks/useProductionLineWebsocket';

import styles from './page.module.css';
import { apiFetch } from '@/lib/http/http';

// ============================================================================
// Types
// ============================================================================
export type MqttQos = 0 | 1 | 2;

export interface DeviceCommandTopic {
    type: 'reset' | 'reset_counter' | 'calibrate' | 'custom';
    topic: string;
    payloadTemplate?: any;
}

export interface DeviceTelemetryTopic {
    topic: string;
    qos?: MqttQos;
}

export interface DeviceExtraInfo {
    interval_message_time?: number;
    telemetry?: DeviceTelemetryTopic;
    commands?: DeviceCommandTopic[];
    other?: object;
}

export interface DeviceData {
    id: string;
    name: string;
    count: number;
    lastUpdated: string;
    speedPerMinute?: number;
    speedPerHour?: number;
    isRunning?: boolean;
    trend?: 'increasing' | 'stable' | 'decreasing' | 'stopped';
    idleTimeSeconds?: number;
    position?: string;
}

export interface BrickType {
    id: number;
    name: string;
    description?: string;
}

export interface DeviceInfo {
    id: number;
    deviceId: string;
    name: string;
    status?: string;
    serialNumber: string;
    installation_date?: string;
    last_maintenance: string;
    extraInfo: DeviceExtraInfo;
}

export interface MeasurementTypeInfo {
    id: number;
    code: string;
    name: string;
    description?: string;
    data_schema?: Record<string, any>;
    data_schema_version?: number;
}

export interface ClusterCommand {
    code: string;
    name?: string;
    topic: string;
    payloadTemplate?: any;
}

export interface ClusterConfig {
    qosDefault?: MqttQos;
    interval_message_time?: number;
    telemetry?: {
        topic: string;
        qos?: MqttQos;
    };
    commands?: ClusterCommand[];
    other?: Record<string, any>;
}

export interface DeviceClusterInfo {
    id: number;
    name: string;
    code: string;
    description?: string;
    measurementTypeId: number;
    measurementType?: MeasurementTypeInfo;
    productionLineId?: number | null;
    config?: ClusterConfig;
    devices?: DeviceInfo[];
}

export interface PositionInfo {
    id: number;
    name: string;
    description?: string;
    index?: number;
    devices?: DeviceInfo[];
}

export interface ProductionLineInfo {
    id: number;
    name: string;
    description?: string;
    activeBrickType?: BrickType;
    status?: string;
    positions?: PositionInfo[];
}

// ============================================================================
// Constants & helpers
// ============================================================================
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? 'http://localhost:5555';

const getVariant = (
    value: number,
): 'primary' | 'success' | 'warning' | 'danger' | 'muted' => {
    if (value < 0) return 'success';
    if (value === 0) return 'muted';
    if (value > 0 && value <= 100) return 'warning';
    return 'danger';
};

const calculateMetrics = (devices: DeviceData[]) => {
    const sauMeDevices = devices.filter((d) => d.id.includes('SAU-ME'));
    const sauMe1 = sauMeDevices[0]?.count || 0;
    const sauMe2 = sauMeDevices[1]?.count || 0;

    const truocLnDevices = devices.filter((d) => d.id.includes('TRUOC-LN'));
    const truocLn1 = truocLnDevices[0]?.count || 0;
    const truocLn2 = truocLnDevices[1]?.count || 0;

    const sauLn = devices.find((d) => d.id.includes('SAU-LN'))?.count || 0;
    const truocMm = devices.find((d) => d.id.includes('TRUOC-MM'))?.count || 0;
    const truocDh = devices.find((d) => d.id.includes('TRUOC-DH'))?.count || 0;

    const haophiMoc = truocLn1 + truocLn2 - (sauMe1 + sauMe2);
    const haophiNung = sauLn - (truocLn1 + truocLn2);
    const haophiTruocMai = truocMm - sauLn;
    const haophiHoanThien = truocDh - truocMm;

    return {
        haophiMoc,
        haophiNung,
        haophiTruocMai,
        haophiHoanThien,
        haophiMocVariant: getVariant(haophiMoc),
        haophiNungVariant: getVariant(haophiNung),
        haophiTruocMaiVariant: getVariant(haophiTruocMai),
        haophiHoanThienVariant: getVariant(haophiHoanThien),
    };
};

const mergeDeviceWithAnalytics = (
    devices: DeviceData[],
    deviceMetrics: Map<string, any>,
): DeviceData[] =>
    devices.map((device) => {
        const analytics = deviceMetrics.get(device.id);
        if (!analytics) return device;

        return {
            ...device,
            speedPerMinute: analytics.speedPerMinute,
            speedPerHour: analytics.speedPerHour,
            isRunning: analytics.isRunning,
            trend: analytics.trend,
            idleTimeSeconds: analytics.idleTimeSeconds,
            position: analytics.position,
        };
    });

const getLineInfoFallback = (
    productionLines: ProductionLineInfo[],
    lineId: number,
): ProductionLineInfo =>
    productionLines.find((line) => line.id === lineId) || {
        id: lineId,
        name: `Dây chuyền ${lineId}`,
        status: 'active',
    };

// ============================================================================
// Page wrapper: switch Workshop / Production Line
// ============================================================================
export default function Page() {
    const [pageState, setPageState] = useState<'workshop' | 'production-line'>(
        'production-line',
    );
    const [isPending, startTransition] = useTransition();

    const handleGoProductionLineState = () => {
        startTransition(() => {
            setPageState('production-line');
        });
    };

    const handleGoWorkshopLineState = () => {
        startTransition(() => {
            setPageState('workshop');
        });
    };

    const currentComponent =
        pageState === 'production-line' ? (
            <DeviceDashboardPage onChangePage={handleGoWorkshopLineState} />
        ) : (
            <WorkshopPage onChangePage={handleGoProductionLineState} />
        );

    return (
        <div className={styles.pageWrapper}>
            <div
                key={pageState}
                className={`${styles.pageFade} ${isPending ? styles.pageFadePending : ''
                    }`}
            >
                {currentComponent}
            </div>

            {isPending && (
                <div className={styles.loadingOverlay}>
                    <Loading />
                </div>
            )}
        </div>
    );
}

export function WorkshopPage({ onChangePage }: { onChangePage: () => void }) {
    return (
        <div className={styles.workshopWrapper}>
            <div className={styles.workshopHeader}>
                <h1 className={styles.title}>Danh sách nhà máy / xưởng</h1>
                <p className={styles.subtitle}>
                    Chọn nhà máy để xem chi tiết dây chuyền và thiết bị.
                </p>
            </div>

            <div className={styles.workshopContent}>
                <button className={styles.primaryButton} onClick={onChangePage}>
                    Đi tới Dashboard dây chuyền
                </button>
            </div>
        </div>
    );
}

// ============================================================================
// DeviceDashboardPage
// ============================================================================
export function DeviceDashboardPage({
    onChangePage,
}: {
    onChangePage: () => void;
}) {
    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------
    const [selectedLineId, setSelectedLineId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<
        'data' | 'settings' | 'device_cluster'
    >('data');
    const [selectedDevice, setSelectedDevice] = useState<DeviceData | null>(null);

    const [currentTime, setCurrentTime] = useState<string>('');
    const [productionLines, setProductionLines] = useState<ProductionLineInfo[]>([]);
    const [isResetting, setIsResetting] = useState<Record<number, boolean>>({});
    const [resetMessage, setResetMessage] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);

    const [configModal, setConfigModal] = useState<{
        lineId: number;
        lineName: string;
    } | null>(null);

    // TODO: thay bằng role thực tế khi có auth
    const isAdmin = true;

    const [deviceClusters, setDeviceClusters] = useState<DeviceClusterInfo[]>([]);
    const [measurementTypes, setMeasurementTypes] = useState<MeasurementTypeInfo[]>(
        [],
    );
    const [clusterLoading, setClusterLoading] = useState<boolean>(false);

    // === NEW: Telemetry theo từng deviceId (log & latest) ====================
    const [telemetryByDevice, setTelemetryByDevice] = useState<
        Record<string, RawTelemetryPayload>
    >({});

    // -------------------------------------------------------------------------
    // WebSocket + Analytics
    // -------------------------------------------------------------------------

    // handler telemetry cho từng deviceId (từ hook useDeviceDashboardWebSocket)
    // const {
    //     devices: wsDevicesLine1,
    //     isConnected,
    // } = useDeviceDashboardWebSocket(INITIAL_DEVICES_LINE1, {
    //     enabled: true,
    //     baseUrl: WS_BASE_URL,
    //     onMessage: handleDeviceTelemetry,
    // });
    const { wsDevicesLine1, isConnected } = { isConnected: false, wsDevicesLine1: [] }
    const {
        lineMetrics,
        deviceMetrics,
        isConnected: analyticsConnected,
    } = useAnalytics(WS_BASE_URL);

    const enhancedDevicesLine1 = useMemo(
        () => mergeDeviceWithAnalytics(wsDevicesLine1, deviceMetrics),
        [wsDevicesLine1, deviceMetrics],
    );
    const handleDeviceTelemetry = useCallback((payload: any) => {
        const devId = payload.deviceId || payload.device_id;
        if (!devId) return;
        setTelemetryByDevice(prev => ({
            ...prev,
            [devId]: payload
        }));
    }, []);
    const { emitToCluster /*, getSocketByCluster*/ } = useProductionLineSockets({
        deviceId: 0,
        lineId: selectedLineId ?? 0,
        clusters: deviceClusters,
        baseUrl: WS_BASE_URL,
        onTelemetry: handleDeviceTelemetry,
    });

    // Đồng hồ thời gian thực
    useEffect(() => {
        const updateTime = () => {
            setCurrentTime(new Date().toLocaleString('vi-VN'));
        };

        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Lấy thông tin dây chuyền từ backend (load 1 lần)
    useEffect(() => {
        const fetchProductionLines = async () => {
            try {
                const response = await apiFetch('/production-lines');
                const json = await response.json();

                const lines: ProductionLineInfo[] = Array.isArray(json)
                    ? json
                    : json.data || json.items || [];

                const filteredLines = lines.filter((line) => [1, 2].includes(line.id));
                setProductionLines(filteredLines);

                if (!selectedLineId && filteredLines.length > 0) {
                    setSelectedLineId(filteredLines[0].id);
                }
            } catch (error) {
                console.error('Error fetching production lines:', error);
                setProductionLines([]);
            }
        };

        fetchProductionLines();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Hàm load device-clusters theo line
    const fetchDeviceClusters = useCallback(async (lineId: number) => {
        try {
            setClusterLoading(true);
            const res = await apiFetch(`/device-clusters/line/${lineId}`);
            const json = await res.json();

            const clusters: any[] = Array.isArray(json)
                ? json
                : json.data || json.items || [];

            const mappedClusters: DeviceClusterInfo[] = clusters as DeviceClusterInfo[];
            setDeviceClusters(mappedClusters);

            const measurementTypesMap = new Map<number, MeasurementTypeInfo>();

            clusters.forEach((c: any) => {
                if (c.measurementType) {
                    measurementTypesMap.set(c.measurementType.id, c.measurementType);
                }
            });

            setMeasurementTypes(Array.from(measurementTypesMap.values()));
        } catch (err) {
            console.error('Error fetching devices cluster:', err);
            setDeviceClusters([]);
            setMeasurementTypes([]);
        } finally {
            setClusterLoading(false);
        }
    }, []);

    // Auto load cluster khi selectedLineId thay đổi
    useEffect(() => {
        if (!selectedLineId) return;
        fetchDeviceClusters(selectedLineId);
    }, [selectedLineId, fetchDeviceClusters]);

    // Hàm refresh dùng cho DeviceClusterSection
    const fetchClusters = useCallback(async () => {
        if (!isAdmin || !selectedLineId) return;
        await fetchDeviceClusters(selectedLineId);
    }, [isAdmin, selectedLineId, fetchDeviceClusters]);

    // -------------------------------------------------------------------------
    // Derived data
    // -------------------------------------------------------------------------
    const getDevicesForLine = useCallback(
        (lineId: number): DeviceData[] => {
            if (lineId === 1) return enhancedDevicesLine1;
            return [];
        },
        [enhancedDevicesLine1],
    );

    const selectedLineInfo: ProductionLineInfo = useMemo(() => {
        if (selectedLineId === null) {
            return (
                productionLines[0] || {
                    id: 0,
                    name: 'Đang tải dây chuyền...',
                    status: 'active',
                }
            );
        }
        return getLineInfoFallback(productionLines, selectedLineId);
    }, [productionLines, selectedLineId]);

    const selectedDevices: DeviceData[] = useMemo(() => {
        if (selectedLineId === null) return [];
        return getDevicesForLine(selectedLineId);
    }, [getDevicesForLine, selectedLineId]);

    const settingsDevicesFromPositions: DeviceInfo[] = useMemo(() => {
        if (selectedLineId === null) return [];
        const currentLine = productionLines.find(
            (item) => item.id === selectedLineId,
        );
        return currentLine?.positions?.flatMap((p) => p.devices ?? []) ?? [];
    }, [productionLines, selectedLineId]);

    const settingsDevices = settingsDevicesFromPositions;

    const availableLines = productionLines.length > 0 ? productionLines : [];

    const sidebarLines = useMemo(
        () =>
            availableLines.map((line) => ({
                id: line.id,
                name: line.name,
                status: line.status,
                activeBrickTypeName: line.activeBrickType?.name,
            })),
        [availableLines],
    );

    const linePositions: PositionInfo[] = useMemo(() => {
        if (selectedLineId === null) return [];
        const currentLine = productionLines.find(
            (item) => item.id === selectedLineId,
        );
        return (
            currentLine?.positions?.map(
                (pos): PositionInfo => ({
                    id: pos.id,
                    name: pos.name,
                    description: pos.description,
                    index: pos.index,
                    devices: pos.devices,
                }),
            ) ?? []
        );
    }, [productionLines, selectedLineId]);

    const lineReady = selectedLineId !== null;

    const lineList = useMemo(() => Array.from(lineMetrics.values()), [lineMetrics]);

    const { totalDevices, runningDevices, totalProducedToday } = useMemo(() => {
        const totalDevicesFromMetrics = lineList.reduce(
            (sum, line) => sum + line.totalDevices,
            0,
        );
        const runningDevicesFromMetrics = lineList.reduce(
            (sum, line) => sum + line.runningDevices,
            0,
        );
        const totalProduced = lineList.reduce(
            (sum, line) => sum + line.totalProducedToday,
            0,
        );

        return {
            totalDevices: totalDevicesFromMetrics || enhancedDevicesLine1.length,
            runningDevices:
                runningDevicesFromMetrics ||
                enhancedDevicesLine1.filter((d) => d.isRunning ?? true).length,
            totalProducedToday: totalProduced,
        };
    }, [lineList, enhancedDevicesLine1]);

    const selectedLineMetrics = useMemo(
        () => calculateMetrics(selectedDevices),
        [selectedDevices],
    );

    // -------------------------------------------------------------------------
    // Handlers
    // -------------------------------------------------------------------------
    const handleLineConfig = (lineId: number, lineName: string) => {
        setConfigModal({ lineId, lineName });
    };

    const handleSaveConfig = async (interval: number) => {
        if (!configModal) return;
        try {
            const response = await apiFetch(`/mqtt/device-command/config-line/${configModal.lineId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ interval }),
            });

            const result = await response.json();
            if (result.success) {
                setResetMessage({
                    type: 'success',
                    text: `OK. ${result.message}`,
                });
                setTimeout(() => setResetMessage(null), 5000);
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error('Config error:', error);
            throw new Error(error.message || 'Lỗi kết nối đến server');
        }
    };

    const handleResetCluster = async (clusterId: number) => {
        const confirmed = confirm(
            `Bạn chắc chắn muốn reset toàn bộ thiết bị của Cluster ${clusterId}?\n\nTất cả số đếm sẽ về 0.`,
        );
        if (!confirmed) return;

        setIsResetting((prev) => ({ ...prev, [clusterId]: true }));
        setResetMessage(null);

        try {
            const response = await apiFetch(`/mqtt/device-command/reset-counter/${clusterId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });

            const result = await response.json();
            if (result.success) {
                setResetMessage({
                    type: 'success',
                    text: `OK. ${result.message} - Lệnh ID: ${String(
                        result.commandId ?? '',
                    ).substring(0, 8)}...`,
                });
                setTimeout(() => setResetMessage(null), 5000);
            } else {
                setResetMessage({
                    type: 'error',
                    text: `Lỗi: ${result.message}`,
                });
            }
        } catch (error) {
            console.error('Reset error:', error);
            setResetMessage({
                type: 'error',
                text: 'Lỗi kết nối đến server',
            });
        } finally {
            setIsResetting((prev) => ({ ...prev, [clusterId]: false }));
        }
    };

    const handleDeviceClick = (device: DeviceData) => {
        setSelectedDevice(device);
    };

    const closeDeviceDialog = () => {
        setSelectedDevice(null);
    };

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------
    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <Cpu size={32} className={styles.headerIcon} />
                    <div>
                        <h1 className={styles.title}>Dashboard thiết bị</h1>
                        <p className={styles.subtitle}>
                            Giám sát thời gian thực các thiết bị trên dây chuyền sản xuất.
                        </p>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <div className={styles.connectionStatus}>
                        <span
                            className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected
                                }`}
                        />
                        <span className={styles.statusText}>
                            {isConnected ? 'WebSocket thiết bị' : 'Thiết bị offline'}
                        </span>
                    </div>
                    <div className={styles.connectionStatus}>
                        <span
                            className={`${styles.statusDot} ${analyticsConnected
                                ? styles.connected
                                : styles.disconnected
                                }`}
                        />
                        <span className={styles.statusText}>
                            {analyticsConnected
                                ? 'Analytics realtime'
                                : 'Analytics offline'}
                        </span>
                    </div>
                    <div className={styles.headerTime}>{currentTime || '-'}</div>
                </div>
            </div>

            {/* Thẻ tổng quan */}
            <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Tổng thiết bị</p>
                    <p className={styles.overviewValue}>{totalDevices}</p>
                    <p className={styles.overviewSub}>Đang chạy: {runningDevices}</p>
                </div>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Sản lượng hôm nay</p>
                    <p className={styles.overviewValue}>
                        {totalProducedToday.toLocaleString('vi-VN')}
                    </p>
                    <p className={styles.overviewSub}>Tổng theo mỗi dây chuyền</p>
                </div>
                <div className={styles.overviewCard}>
                    <p className={styles.overviewLabel}>Số dây chuyền</p>
                    <p className={styles.overviewValue}>
                        {productionLines.length || 2}
                    </p>
                    <p className={styles.overviewSub}>
                        Đang hiển thị trên dashboard
                    </p>
                </div>
            </div>

            {/* Thông báo reset */}
            {resetMessage && (
                <div
                    className={`${styles.resetMessage} ${styles[resetMessage.type]
                        }`}
                >
                    {resetMessage.text}
                </div>
            )}

            <div className={styles.mainLayout}>
                {/* Sidebar chọn dây chuyền */}
                <DeviceDashboardSidebar
                    factoryName="Nhà máy 01"
                    factoryDescription="Danh sách dây chuyền nhà máy 01"
                    lines={sidebarLines}
                    selectedLineId={selectedLineId ?? 0}
                    onBackToFactoryList={onChangePage}
                    onSelectLine={setSelectedLineId}
                />

                {/* Nội dung chính với Tabs */}
                <section className={styles.mainContent}>
                    {!lineReady ? (
                        <div className={styles.innerLoading}>
                            <Loading />
                        </div>
                    ) : (
                        <>
                            <div className={styles.tabs}>
                                <TabItem
                                    label="Dữ liệu thực tế"
                                    isActive={activeTab === 'data'}
                                    onClick={() => setActiveTab('data')}
                                />

                                {isAdmin && (
                                    <>
                                        <TabItem
                                            label="Cài đặt dây chuyền"
                                            isActive={activeTab === 'settings'}
                                            onClick={() => setActiveTab('settings')}
                                        />
                                        <TabItem
                                            label="Thiết lập cụm thiết bị"
                                            isActive={activeTab === 'device_cluster'}
                                            onClick={() =>
                                                setActiveTab('device_cluster')
                                            }
                                        />
                                    </>
                                )}
                            </div>

                            <div className={styles.tabContent}>
                                {activeTab === 'data' && selectedLineId !== null && (
                                    <ProductionLineSection
                                        lineInfo={selectedLineInfo}
                                        metrics={selectedLineMetrics}
                                        devices={selectedDevices}
                                        linePositions={linePositions}
                                        telemetryByDevice={telemetryByDevice}
                                        onReset={() => {
                                            const cluster = deviceClusters.find(c => c.productionLineId === selectedLineId);
                                            if (cluster) {
                                                handleResetCluster(cluster.id);
                                            }
                                        }}
                                        isResetting={isResetting[selectedLineId] || false}
                                        showResetButton
                                        onConfig={() =>
                                            handleLineConfig(
                                                selectedLineId,
                                                selectedLineInfo.name,
                                            )
                                        }
                                        onDeviceClick={(dev) => {
                                            console.log('Click device', dev);
                                        }}
                                    />
                                )}


                                {isAdmin &&
                                    activeTab === 'settings' &&
                                    selectedLineId !== null && (
                                        <LineSettingsSection
                                            lineInfo={selectedLineInfo}
                                            devices={settingsDevices}
                                            linePositions={linePositions}
                                            isResetting={
                                                isResetting[selectedLineId] || false
                                            }
                                            onConfig={() =>
                                                handleLineConfig(
                                                    selectedLineId,
                                                    selectedLineInfo.name,
                                                )
                                            }
                                            onReset={() => {
                                                const cluster = deviceClusters.find(c => c.productionLineId === selectedLineId);
                                                if (cluster) {
                                                    handleResetCluster(cluster.id);  // ✅ Dùng cluster.id
                                                }
                                            }}
                                            onDeviceClick={handleDeviceClick}
                                        />
                                    )}

                                {isAdmin &&
                                    activeTab === 'device_cluster' &&
                                    selectedLineId !== null && (
                                        <div className={styles.stackColumn}>
                                            <DeviceClusterSection
                                                productionLineId={selectedLineId}
                                                clusters={deviceClusters}
                                                measurementTypes={measurementTypes}
                                                loading={clusterLoading}
                                                onRefresh={fetchClusters}
                                                onSaved={(saved) => {
                                                    setDeviceClusters((prev) => {
                                                        const idx = prev.findIndex(
                                                            (c) => c.id === saved.id,
                                                        );
                                                        if (idx === -1)
                                                            return [...prev, saved];
                                                        const next = [...prev];
                                                        next[idx] = saved;
                                                        return next;
                                                    });
                                                }}
                                                onDeleted={(id) =>
                                                    setDeviceClusters((prev) =>
                                                        prev.filter((c) => c.id !== id),
                                                    )
                                                }
                                            // trong tương lai có thể truyền thêm:
                                            // clusterTelemetry={clusterTelemetry}
                                            // emitToCluster={emitToCluster}
                                            />

                                            <MeasurementTypeSection
                                                measurementTypes={measurementTypes}
                                                onRefresh={fetchClusters}
                                                onSaved={(mt) =>
                                                    setMeasurementTypes((prev) => {
                                                        const idx =
                                                            prev.findIndex(
                                                                (m) => m.id === mt.id,
                                                            );
                                                        if (idx === -1)
                                                            return [...prev, mt];
                                                        const next = [...prev];
                                                        next[idx] = mt;
                                                        return next;
                                                    })
                                                }
                                                onDeleted={(id) =>
                                                    setMeasurementTypes((prev) =>
                                                        prev.filter((m) => m.id !== id),
                                                    )
                                                }
                                            />
                                        </div>
                                    )}
                            </div>
                        </>
                    )}
                </section>
            </div>

            {/* Modal cấu hình thiết bị */}
            {configModal && (
                <DeviceConfigModal
                    lineId={configModal.lineId}
                    lineName={configModal.lineName}
                    deviceCount={8}
                    onClose={() => setConfigModal(null)}
                    onSave={handleSaveConfig}
                />
            )}

            {/* Dialog hiển thị thông tin Device */}
            {selectedDevice && (
                <Dialog open={!!selectedDevice} onClose={closeDeviceDialog}>
                    <div className={styles.deviceDialog}>
                        <h2 className={styles.deviceDialogTitle}>
                            {selectedDevice.name}
                        </h2>
                        <p>ID: {selectedDevice.id}</p>
                        <p>Count: {selectedDevice.count}</p>
                        <p>Last updated: {selectedDevice.lastUpdated}</p>
                    </div>
                </Dialog>
            )}
        </div>
    );
}
