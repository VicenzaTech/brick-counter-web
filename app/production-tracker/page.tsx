'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, XCircle } from 'lucide-react';
import StageCard from './components/StageCard';
import { SelectionDialog } from './components/SelectionDialog';
import { StageHistoryPanel } from './components/StageHistoryPanel';
import styles from './ProductionTracker.module.css';
import {
    FactoryData,
    Product,
    StageDeviceAssignment,
    StageHistoryItem,
    StageState,
    StageStatus,
    StopReason,
    Toast,
} from './types';
import { apiFetch } from '@/lib/http/http';
import { useStageSocket } from '@/hooks/useStageSocket';

export default function ProductionTracker() {
    const [products, setProducts] = useState<Product[]>([]);
    const [factories, setFactories] = useState<FactoryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
    const [selectedLine, setSelectedLine] = useState<number | null>(null);
    const [stagesState, setStagesState] = useState<Record<number, Record<string, StageState>>>({});
    const [processingStage, setProcessingStage] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [stageHistory, setStageHistory] = useState<StageHistoryItem[]>([]);
    const [showConfirmDialog, setShowConfirmDialog] = useState<{
        show: boolean;
        message: string;
        selectedReason: StopReason | null;
        onConfirm: (() => void) | null;
        onCancel: (() => void) | null;
    }>({ show: false, message: '', selectedReason: null, onConfirm: null, onCancel: null });
    const [showLogConfirm, setShowLogConfirm] = useState<{ show: boolean; lineId: number | null; stage: string }>({
        show: false,
        lineId: null,
        stage: '',
    });
    const [showResumeConfirm, setShowResumeConfirm] = useState<{ show: boolean; lineId: number | null; stage: string }>({
        show: false,
        lineId: null,
        stage: '',
    });
    const [productDialog, setProductDialog] = useState<{
        show: boolean;
        lineId: number | null;
        stage: string;
        selectedProductId: number | null;
    }>({ show: false, lineId: null, stage: '', selectedProductId: null });
    const [productSearch, setProductSearch] = useState('');
    const [factoryDialog, setFactoryDialog] = useState<{ show: boolean; selectedId: number | null }>({
        show: false,
        selectedId: null,
    });
    const [factorySearch, setFactorySearch] = useState('');
    const [lineDialog, setLineDialog] = useState<{ show: boolean; selectedId: number | null }>({
        show: false,
        selectedId: null,
    });
    const [lineSearch, setLineSearch] = useState('');
    const [stagesData, setStagesData] = useState<Record<number, Array<{ id: number; name: string }>>>({});
    const [stageDeviceAssignments, setStageDeviceAssignments] = useState<StageDeviceAssignment>({});

    const deviceStageMapRef = useRef<Record<string, { lineId: number; stageName: string }>>({});
    const stageDeviceTotalsRef = useRef<Record<number, Record<string, Record<string, number>>>>({});
    const runningStageDeviceIds = useMemo(() => {
        if (!selectedLine) return [];
        const stageList = stagesData[selectedLine] ?? [];
        const lineStages = stagesState[selectedLine] ?? {};
        return stageList
            .flatMap((stageInfo) => {
                const stageState = lineStages[stageInfo.name];
                if (!stageState || stageState.status !== 'running') return [];
                return (stageDeviceAssignments[stageInfo.id] ?? []).map((device) => device.deviceId);
            })
            .filter((id): id is string => Boolean(id));
    }, [selectedLine, stagesData, stagesState, stageDeviceAssignments]);

    const updateStageDeviceTotals = useCallback((lineId: number, stageName: string, deviceId: string, quantity: number) => {
        if (!stageDeviceTotalsRef.current[lineId]) {
            stageDeviceTotalsRef.current[lineId] = {};
        }
        if (!stageDeviceTotalsRef.current[lineId][stageName]) {
            stageDeviceTotalsRef.current[lineId][stageName] = {};
        }
        stageDeviceTotalsRef.current[lineId][stageName][deviceId] = quantity;
        return Object.values(stageDeviceTotalsRef.current[lineId][stageName]).reduce(
            (sum, value) => sum + (Number(value) || 0),
            0,
        );
    }, []);

    const clearStageDeviceTotals = useCallback((lineId: number, stageName?: string) => {
        if (!stageDeviceTotalsRef.current[lineId]) return;
        if (stageName) {
            delete stageDeviceTotalsRef.current[lineId][stageName];
            if (Object.keys(stageDeviceTotalsRef.current[lineId]).length === 0) {
                delete stageDeviceTotalsRef.current[lineId];
            }
        } else {
            delete stageDeviceTotalsRef.current[lineId];
        }
    }, []);

    useEffect(() => {
        stageDeviceTotalsRef.current = {};
    }, [selectedLine]);

    useEffect(() => {
        if (!selectedLine) {
            deviceStageMapRef.current = {};
            return;
        }
        const stagesForLine = stagesData[selectedLine] ?? [];
        const mapping: Record<string, { lineId: number; stageName: string }> = {};
        stagesForLine.forEach((stageInfo) => {
            const devices = stageDeviceAssignments[stageInfo.id] ?? [];
            devices.forEach((device) => {
                if (device.deviceId) {
                    mapping[device.deviceId] = { lineId: selectedLine, stageName: stageInfo.name };
                }
            });
        });
        deviceStageMapRef.current = mapping;
    }, [selectedLine, stageDeviceAssignments, stagesData]);

    const computeAreaForProduct = useCallback(
        (quantity: number, productId: number | null) => {
            if (!quantity) return 0;
            const product = productId != null ? products.find((p) => p.id === productId) : null;
            if (product?.specs?.width && product?.specs?.height) {
                const areaPerTile = (product.specs.width * product.specs.height) / 1_000_000;
                return parseFloat((quantity * areaPerTile).toFixed(2));
            }
            return parseFloat((quantity / 11).toFixed(2));
        },
        [products],
    );

    const getDeviceIdsForStage = useCallback(
        (lineId: number, stageName: string): string[] => {
            const stageList = stagesData[lineId] ?? [];
            const stageEntry = stageList.find((stage) => stage.name === stageName);
            if (!stageEntry) return [];
            return (stageDeviceAssignments[stageEntry.id] ?? [])
                .map((device) => device.deviceId)
                .filter((id): id is string => Boolean(id));
        },
        [stageDeviceAssignments, stagesData],
    );

    const handleStageTelemetry = useCallback(
        (payload: any) => {
            console.log('📡 Telemetry received:', payload);
            const deviceIdentifier: string | undefined =
                payload?.deviceId || payload?.device_id || payload?.metadata?.deviceId;
            if (!deviceIdentifier) {
                console.warn('⚠️ No deviceId in telemetry payload');
                return;
            }
            const target = deviceStageMapRef.current[deviceIdentifier];
            if (!target) {
                console.warn(`⚠️ Device ${deviceIdentifier} not mapped to any stage`);
                return;
            }
            const quantityCandidates = [
                payload?.metrics?.total,
                payload?.total,
                payload?.data?.metrics?.total,
            ];
            let quantityValue: number | null = null;
            for (const candidate of quantityCandidates) {
                const parsed = Number(candidate);
                if (Number.isFinite(parsed)) {
                    quantityValue = parsed;
                    break;
                }
            }
            console.log(`📊 Device ${deviceIdentifier} quantity:`, quantityValue);
            if (quantityValue == null) return;

            setStagesState((prev) => {
                const lineStages = prev[target.lineId];
                if (!lineStages) return prev;
                const currentStageState = lineStages[target.stageName];
                if (!currentStageState) return prev;
                
                // Update deviceQuantities map
                const updatedDeviceQuantities = {
                    ...(currentStageState.deviceQuantities || {}),
                    [deviceIdentifier]: quantityValue,
                };
                
                // Calculate total from highest position devices
                const stagesForLine = stagesData[target.lineId] ?? [];
                const stageInfo = stagesForLine.find(s => s.name === target.stageName);
                const stageId = stageInfo?.id;
                
                let totalQuantity = quantityValue; // Default to single device
                
                if (stageId) {
                    const devicesForStage = stageDeviceAssignments[stageId] ?? [];
                    const maxPosition = devicesForStage.length > 0
                        ? Math.max(...devicesForStage.map(d => d.position ?? 0))
                        : 0;
                    
                    const highestPositionDevices = devicesForStage.filter(d => d.position === maxPosition);
                    
                    // Sum quantities from highest position devices
                    totalQuantity = highestPositionDevices.reduce((sum, device) => {
                        const qty = updatedDeviceQuantities[device.deviceId] ?? 0;
                        return sum + qty;
                    }, 0);
                }
                
                const area = computeAreaForProduct(totalQuantity, currentStageState.productId);
                
                console.log(`✅ Updated stage ${target.stageName}: total=${totalQuantity}, area=${area}`);
                
                return {
                    ...prev,
                    [target.lineId]: {
                        ...lineStages,
                        [target.stageName]: {
                            ...currentStageState,
                            deviceQuantities: updatedDeviceQuantities,
                            quantity: totalQuantity,
                            area,
                        },
                    },
                };
            });
        },
        [computeAreaForProduct, stagesData, stageDeviceAssignments],
    );
    const { joinDeviceRoom, leaveDeviceRoom } = useStageSocket({
        deviceIds: runningStageDeviceIds,
        productionLineId: selectedLine ?? null,
        onTelemetry: handleStageTelemetry,
    });

    const stopActionRef = useRef<{
        lineId: number | null;
        stage: string;
        isEmergency: boolean;
        reason: StopReason | null;
    }>({
        lineId: null,
        stage: '',
        isEmergency: false,
        reason: null,
    });
    const seededLinesRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        void fetchFactories();
        void fetchProducts();
        loadStateFromStorage();
    }, []);

    useEffect(() => {
        if (selectedLine) {
            void fetchStagesForLine(selectedLine);
            void fetchStageHistoryForLine(selectedLine);
        } else {
            setStageHistory([]);
        }
    }, [selectedLine]);

    const fetchFactories = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/workshops');

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error((errorData as any).message || 'Failed to fetch factories');
            }

            const data = await response.json();
            const factoriesWithStages: FactoryData[] = (data as any[]).map((factory) => ({
                id: factory.id,
                name: factory.name,
                lines: (factory.lines || []).map((line: any) => ({
                    id: line.id,
                    name: line.name,
                    stages: line.stages || [],
                })),
            }));

            setFactories(factoriesWithStages);
            if (factoriesWithStages.length > 0) {
                const firstFactory = factoriesWithStages[0];
                setSelectedFactory(firstFactory.id);
                if (firstFactory.lines.length > 0) {
                    setSelectedLine(firstFactory.lines[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching factories:', error);
            showToast('Không thể tải danh sách nhà máy!', 'error');
        } finally {
            setLoading(false);
        }
    };

    const normalizeStageDeviceMap = useCallback((rawMap: any): StageDeviceAssignment => {
        const normalized: StageDeviceAssignment = {};
        if (!rawMap || typeof rawMap !== 'object') {
            return normalized;
        }

        // Backend returns: { lineId: { stageId: [devices] } }
        // We need to flatten to: { stageId: [devices] }
        Object.values(rawMap).forEach((lineData: any) => {
            if (lineData && typeof lineData === 'object' && !Array.isArray(lineData)) {
                Object.entries(lineData).forEach(([stageKey, devices]) => {
                    const stageId = Number(stageKey);
                    if (Number.isFinite(stageId) && Array.isArray(devices)) {
                        normalized[stageId] = devices;
                    }
                });
            }
        });

        return normalized;
    }, []);

    const fetchStagesForLine = async (lineId: number) => {
        try {
            const response = await apiFetch(`/production-stages/by-production-line-id/${lineId}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error((errorData as any).message || 'Failed to fetch stages');
            }

            const { stageDeviceMap, stages } = await response.json();
            console.log('📊 Fetched stages:', stages);
            console.log('📊 Stage device map:', stageDeviceMap);
            
            setStagesData((prev) => ({
                ...prev,
                [lineId]: stages.map((stage: any) => ({
                    id: stage.id,
                    name: stage.name || stage.stageName,
                })),
            }));

            const stageIdsForLine = stages.map((stage: any) => Number(stage.id)).filter((id: number) =>
                Number.isFinite(id),
            );

            if (stageDeviceMap) {
                const normalized = normalizeStageDeviceMap(stageDeviceMap);
                console.log('📊 Normalized device assignments:', normalized);
                setStageDeviceAssignments((prev) => {
                    const next = { ...prev };
                    stageIdsForLine.forEach((stageId: number) => {
                        next[stageId] = normalized[stageId] ?? [];
                        console.log(`📊 Stage ${stageId}: ${normalized[stageId]?.length || 0} devices`);
                    });
                    return next;
                });
            } else {
                setStageDeviceAssignments((prev) => {
                    const next = { ...prev };
                    stageIdsForLine.forEach((stageId: number) => {
                        delete next[stageId];
                    });
                    return next;
                });
            }

            stages.forEach((stage: any) => {
                updateStageState(lineId, stage.name || stage.stageName, {
                    status: stage.status || 'stopped',
                    productId: stage.productId || null,
                    startTime: stage.startTime || null,
                    stopReason: stage.stopReason || null,
                    quantity: stage.quantity || null,
                    area: stage.area || null,
                });
            });

            setFactories((prev) =>
                prev.map((factory) => ({
                    ...factory,
                    lines: factory.lines.map((line) =>
                        line.id === lineId
                            ? {
                                ...line,
                                stages: (stages as any[]).map((s) => s.name || s.stageName || 'Unnamed Stage'),
                            }
                            : line,
                    ),
                })),
            );
        } catch (error) {
            console.error('Error in fetchStagesForLine:', error);
            showToast('Không thể tải danh sách công đoạn!', 'error');
        }
    };

    const fetchStageHistoryForLine = async (lineId: number) => {
        try {
            const response = await apiFetch(`/production-stage-history/by-production-line/${lineId}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error((errorData as any).message || 'Failed to fetch stages');
            }

            const history = (await response.json()) as StageHistoryItem[];
            setStageHistory(history);
        } catch (error) {
            console.error('Error in fetchStageHistoryForLine:', error);
            showToast('Không thể tải lịch sử hoạt động!', 'error');
        }
    };
    const refreshVisibleHistory = (lineId: number) => {
        if (selectedLine === lineId) {
            void fetchStageHistoryForLine(lineId);
        }
    };

    useEffect(() => {
        saveStateToStorage(stagesState);
    }, [stagesState]);

    // useEffect(() => {
    //     if (products.length === 0) return;
    //     const lineIdsToSeed = Object.keys(stagesState)
    //         .map(Number)
    //         .filter(
    //             (lineId) =>
    //                 !seededLinesRef.current.has(lineId) &&
    //                 Object.keys(stagesState[lineId] || {}).length > 0,
    //         );
    //     if (lineIdsToSeed.length === 0) {
    //         return;
    //     }
    //     setStagesState((prev) => {
    //         const nextState: typeof prev = { ...prev };
    //         let changed = false;
    //         lineIdsToSeed.forEach((lineId) => {
    //             const stageMap = prev[lineId];
    //             if (!stageMap) return;
    //             const updatedStages: Record<string, StageState> = {};
    //             let index = 0;
    //             Object.entries(stageMap).forEach(([stageName, stageState]) => {
    //                 const product = products[(lineId + index) % products.length];
    //                 index += 1;
    //                 const randomStatus =
    //                     stageState.status ||
    //                     (index === 1 ? 'running' : Math.random() > 0.45 ? 'running' : 'stopped');
    //                 const randomOffset = Math.floor(Math.random() * 45 * 60 * 1000);
    //                 const startTime =
    //                     randomStatus === 'running'
    //                         ? stageState.startTime ?? new Date(Date.now() - randomOffset).toISOString()
    //                         : null;
    //                 const randomQuantityBase = Math.floor(Math.random() * 3500) + 1500;
    //                 const quantity =
    //                     randomStatus === 'running'
    //                         ? Math.floor(randomQuantityBase * 0.6)
    //                         : randomQuantityBase;
    //                 const area = parseFloat((quantity / 11).toFixed(2));
    //                 updatedStages[stageName] = {
    //                     ...stageState,
    //                     status: randomStatus,
    //                     productId: stageState.productId ?? product?.id ?? null,
    //                     startTime,
    //                     quantity,
    //                     area,
    //                     isEmergency: false,
    //                 };
    //             });
    //             seededLinesRef.current.add(lineId);
    //             nextState[lineId] = updatedStages;
    //             changed = true;
    //         });
    //         return changed ? nextState : prev;
    //     });
    // }, [products, stagesState]);

    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         setStagesState((prev) => {
    //             const nextState: typeof prev = { ...prev };
    //             let hasChanges = false;

    //             Object.entries(prev).forEach(([lineIdKey, stageMap]) => {
    //                 if (!stageMap) return;
    //                 const updatedStages: Record<string, StageState> = { ...stageMap };
    //                 let lineChanged = false;

    //                 Object.entries(stageMap).forEach(([stageName, stageState]) => {
    //                     if (stageState.status !== 'running') {
    //                         return;
    //                     }

    //                     const increment = Math.floor(Math.random() * 120) + 40;
    //                     const newQuantity = (stageState.quantity ?? 0) + increment;
    //                     const newArea = parseFloat((newQuantity / 11).toFixed(2));

    //                     updatedStages[stageName] = {
    //                         ...stageState,
    //                         quantity: newQuantity,
    //                         area: newArea,
    //                         startTime: stageState.startTime ?? new Date().toISOString(),
    //                     };
    //                     lineChanged = true;
    //                 });

    //                 if (lineChanged) {
    //                     nextState[Number(lineIdKey)] = updatedStages;
    //                     hasChanges = true;
    //                 }
    //             });

    //             return hasChanges ? nextState : prev;
    //         });
    //     }, 5000);

    //     return () => clearInterval(interval);
    // }, []);

    const fetchProducts = async () => {
        try {
            const response = await apiFetch('/brick-types');
            const data = await response.json();
            setProducts(data as Product[]);
        } catch (error) {
            console.error('Error fetching brick types:', error);
            showToast('Không thể tải danh sách dòng gạch!', 'error');
        }
    };

    const loadStateFromStorage = () => {
        try {
            const saved = localStorage.getItem('production_stages_state');
            if (saved) setStagesState(JSON.parse(saved));
        } catch (error) {
            console.error(error);
        }
    };

    const saveStateToStorage = (state: typeof stagesState) => {
        try {
            localStorage.setItem('production_stages_state', JSON.stringify(state));
        } catch (error) {
            console.error(error);
        }
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    };

    const getStageState = (lineId: number, stage: string): StageState => {
        return (
            stagesState[lineId]?.[stage] || {
                status: 'stopped',
                productId: null,
                startTime: null,
                stopReason: null,
                quantity: null,
                area: null,
            }
        );
    };

    const updateStageState = (lineId: number, stage: string, updates: Partial<StageState>) => {
        setStagesState((prev) => {
            const currentState = getStageState(lineId, stage);
            return {
                ...prev,
                [lineId]: {
                    ...prev[lineId],
                    [stage]: {
                        ...currentState,
                        ...updates,
                        previousStatus: currentState.status,
                    },
                },
            };
        });
    };

    const selectProduct = (lineId: number, stage: string, productId: number) => {
        updateStageState(lineId, stage, {
            productId,
            quantity: null,
            area: null,
        });
    };

    const openProductDialog = (lineId: number, stage: string) => {
        const state = getStageState(lineId, stage);
        setProductDialog({
            show: true,
            lineId,
            stage,
            selectedProductId: state.productId,
        });
        setProductSearch('');
    };

    const closeProductDialog = () => {
        setProductDialog({ show: false, lineId: null, stage: '', selectedProductId: null });
        setProductSearch('');
    };

    const confirmProductDialog = () => {
        if (
            productDialog.show &&
            productDialog.lineId !== null &&
            productDialog.stage &&
            productDialog.selectedProductId
        ) {
            selectProduct(productDialog.lineId, productDialog.stage, productDialog.selectedProductId);
        }
        closeProductDialog();
    };

    const openFactoryDialog = () => {
        setFactoryDialog({ show: true, selectedId: selectedFactory });
        setFactorySearch('');
    };

    const closeFactoryDialog = () => {
        setFactoryDialog({ show: false, selectedId: null });
        setFactorySearch('');
    };

    const confirmFactoryDialog = () => {
        if (!factoryDialog.selectedId) {
            closeFactoryDialog();
            return;
        }
        const factory = factories.find((f) => f.id === factoryDialog.selectedId);
        setSelectedFactory(factoryDialog.selectedId);
        if (factory && factory.lines.length > 0) {
            setSelectedLine(factory.lines[0].id);
        } else {
            setSelectedLine(null);
        }
        closeFactoryDialog();
    };

    const openLineDialog = () => {
        setLineDialog({ show: true, selectedId: selectedLine });
        setLineSearch('');
    };

    const closeLineDialog = () => {
        setLineDialog({ show: false, selectedId: null });
        setLineSearch('');
    };

    const confirmLineDialog = () => {
        if (!lineDialog.selectedId) {
            closeLineDialog();
            return;
        }
        setSelectedLine(lineDialog.selectedId);
        closeLineDialog();
    };

    const startProduction = async (lineId: number, stageName: string) => {
        const state = getStageState(lineId, stageName);
        console.log(state)
        if (!state.productId) {
            showToast('Vui lòng chọn dòng gạch trước!', 'error');
            openProductDialog(lineId, stageName);
            return;
        }
        try {
            // Get the stage ID from the stagesData state
            const stage = stagesData[lineId]?.find(s => s.name === stageName);
            if (!stage) {
                throw new Error('Không tìm thấy thông tin công đoạn');
            }

            const startTime = new Date().toISOString();
            const response = await apiFetch('/production-stages/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: StageStatus.RUNNING,
                    productionLineId: lineId,
                    stageName: stage.name,
                    productId: state.productId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ API error:', errorData);
                throw new Error('Failed to update production stage');
            }

            const responseData = await response.json();
            console.log('✅ Success response:', responseData);

            // Update local state
            updateStageState(lineId, stageName, {
                status: 'running',
                startTime: startTime,
                productId: state.productId,
                stopReason: null,
                quantity: null,
                area: null
            });
            showToast(`Đã khởi động công đoạn ${stageName}`, 'success');
            refreshVisibleHistory(lineId);
            const devicesForStage = getDeviceIdsForStage(lineId, stageName);
            devicesForStage.forEach((deviceId) => joinDeviceRoom(deviceId));
        } catch (error) {
            console.error('Error in startProduction:', error);
            showToast('Có lỗi xảy ra khi khởi động công đoạn sản xuất', 'error');
        }
    };


    const confirmStopProduction = (lineId: number, stage: string, isEmergency: boolean) => {
        stopActionRef.current = { lineId, stage, isEmergency, reason: null };
        setShowConfirmDialog({
            show: true,
            message: `Bạn chắc chắn muốn ${isEmergency ? 'Dừng khẩn cấp' : 'Dừng'} công đoạn ${stage}?`,
            selectedReason: null,
            onConfirm: async () => {
                const reason =
                    stopActionRef.current.reason ??
                    (isEmergency ? StopReason.MACHINE_ERROR : StopReason.CHANGE_PRODUCT);

                const response = await apiFetch('/production-stages/update-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        status: StageStatus.WAITING_LOG,
                        productionLineId: lineId,
                        stageName: stage,
                    }),
                });
                if (response.ok) {
                    updateStageState(lineId, stage, {
                        status: 'waiting_log',
                        stopReason: reason,
                        isEmergency,
                        startTime: getStageState(lineId, stage).startTime,
                    });
                    showToast(`Đã dừng công đoạn ${stage}`, 'success');
                    stopActionRef.current.reason = null;
                    setShowConfirmDialog({ show: false, message: '', selectedReason: null, onConfirm: null, onCancel: null });
                    refreshVisibleHistory(lineId);
                }
            },
            onCancel: () => {
                stopActionRef.current.reason = null;
                setShowConfirmDialog({ show: false, message: '', selectedReason: null, onConfirm: null, onCancel: null });
            },
        });
    };

    const confirmLogProduction = (lineId: number, stage: string) => {
        setShowLogConfirm({ show: true, lineId, stage });
    };

    const confirmResumeProduction = (lineId: number, stage: string) => {
        setShowResumeConfirm({ show: true, lineId, stage });
    };

    const resumeProduction = async (lineId: number, stage: string) => {
        try {
            setProcessingStage(stage)
            const response = await apiFetch('/production-stages/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: StageStatus.RUNNING,
                    productionLineId: lineId,
                    stageName: stage,
                }),
            });

            if (response.ok) {
                const state = getStageState(lineId, stage);

                updateStageState(lineId, stage, {
                    status: 'running',
                    stopReason: null,
                    isEmergency: false,
                    startTime: state.startTime || new Date().toISOString(),
                });
                showToast(`Tiếp tục công đoạn ${stage}`, 'success');
                setShowResumeConfirm({ show: false, lineId: null, stage: '' });
                refreshVisibleHistory(lineId);
            }
        }
        catch {

        }
        finally {
            setProcessingStage(null)
        }
    };

    const cancelResumeProduction = () => {
        setShowResumeConfirm({ show: false, lineId: null, stage: '' });
    };

    const logProduction = async (lineId: number, stage: string) => {
        const state = getStageState(lineId, stage);
        try {
            setProcessingStage(stage);
            const stageObj = stagesData[lineId]?.find(s => s.name === stage);
            const stageId = stageObj?.id;

            if (!stageId) {
                throw new Error('Stage ID not found');
            }

            // Gọi API cập nhật trạng thái về 'pending' (chốt sản lượng) - ĐẶT CUỐI CÙNG
            const response = await apiFetch('/production-stages/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: StageStatus.PENDING,
                    productionLineId: lineId,
                    stageName: stage,
                }),
            });
            // quantity: qty,
            // area: area,
            // productId: state.productId,

            if (!response.ok) {
                throw new Error('Failed to update production stage status');
            }

            // Update local state only after successful API call
            updateStageState(lineId, stage, {
                status: 'pending',
                startTime: null,
                stopReason: null,
                isEmergency: false
            });
            showToast(`Đã chốt sản lượng công đoạn ${stage}`, 'success');
            refreshVisibleHistory(lineId);
            const devicesForStage = getDeviceIdsForStage(lineId, stage);
            devicesForStage.forEach((deviceId) => leaveDeviceRoom(deviceId));
        } catch (error) {
            console.error('❌ Error in logProduction:', error);
            showToast('Lỗi khi chốt sản lượng!', 'error');
        } finally {
            setProcessingStage(null);
        }
    };

    const currentFactory = factories.find((f) => f.id === selectedFactory) || null;
    const currentLine = currentFactory?.lines.find((l) => l.id === selectedLine) || null;

    const getRunningTime = (startTime: string | null) => {
        if (!startTime) return '';
        const diff = Date.now() - new Date(startTime).getTime();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    };

    const stagesForSelectedLine = selectedLine != null ? stagesState[selectedLine] ?? {} : {};
    const stagesForSelectedLineArray = Object.entries(stagesForSelectedLine);
    let maxQuantityForLine = 0;
    let topStageName: string | null = null;

    stagesForSelectedLineArray.forEach(([stageName, state]) => {
        if (state.quantity != null && state.quantity > maxQuantityForLine) {
            maxQuantityForLine = state.quantity;
            topStageName = stageName;
        }
    });

    const stopReasonOptions: { value: StopReason; label: string }[] = [
        { value: StopReason.CHANGE_PRODUCT, label: 'Đổi sản phẩm' },
        { value: StopReason.MACHINE_ERROR, label: 'Sự cố máy' },
        { value: StopReason.MAINTENANCE, label: 'Bảo trì' },
        { value: StopReason.SHIFT_END, label: 'Kết thúc ca' },
        { value: StopReason.OTHER, label: 'Lý do khác' },
    ];

    return (
        <div className={styles.container}>
            {/* Stop / emergency dialog */}
            {showConfirmDialog.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <AlertTriangle size={32} className={styles.modalWarningIcon} />
                            <h2 className={styles.modalTitle}>
                                {stopActionRef.current.isEmergency ? 'Dừng khẩn cấp' : 'Dừng sản xuất'}
                            </h2>
                        </div>
                        <p className={styles.modalMessage}>{showConfirmDialog.message}</p>
                        <div className={styles.modalField}>
                            <label htmlFor="stopReasonSelect">Lý do dừng (tùy chọn)</label>
                            <select
                                id="stopReasonSelect"
                                className={styles.modalSelect}
                                value={showConfirmDialog.selectedReason ?? ''}
                                onChange={(event) => {
                                    const value = event.target.value as StopReason;
                                    const reason = value === '' ? null : (value as StopReason);
                                    stopActionRef.current.reason = reason;
                                    setShowConfirmDialog((prev) => ({ ...prev, selectedReason: reason }));
                                }}
                            >
                                <option value="">Không chọn lý do</option>
                                {stopReasonOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.modalBtnCancel}
                                onClick={() => {
                                    stopActionRef.current.reason = null;
                                    setShowConfirmDialog({ show: false, message: '', selectedReason: null, onConfirm: null, onCancel: null });
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className={
                                    stopActionRef.current.isEmergency ? styles.modalBtnEmergency : styles.modalBtnStop
                                }
                                onClick={() => {
                                    showConfirmDialog.onConfirm?.();
                                    setShowConfirmDialog({ show: false, message: '', selectedReason: null, onConfirm: null, onCancel: null });
                                }}
                            >
                                {stopActionRef.current.isEmergency ? 'Dừng gấp' : 'Dừng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Log Production Dialog */}
            {showLogConfirm.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <CheckCircle size={32} className={styles.modalSuccessIcon} />
                            <h2 className={styles.modalTitle}>Chốt sản lượng</h2>
                        </div>
                        <p className={styles.modalMessage}>
                            Bạn muốn chốt sản lượng công đoạn <strong>{showLogConfirm.stage}</strong>?
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.modalBtnCancel}
                                onClick={() => setShowLogConfirm({ show: false, lineId: null, stage: '' })}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className={styles.modalBtnConfirm}
                                disabled={processingStage === showLogConfirm.stage}
                                onClick={() => {
                                    logProduction(showLogConfirm.lineId!, showLogConfirm.stage);
                                    setShowLogConfirm({ show: false, lineId: null, stage: '' });
                                }}
                            >
                                {processingStage === showLogConfirm.stage ? 'Đang chốt...' : 'Xác nhận'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Resume Dialog */}
            {showResumeConfirm.show && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <RotateCcw size={32} className={styles.modalInfoIcon} />
                            <h2 className={styles.modalTitle}>Tiếp tục sản xuất</h2>
                        </div>
                        <p className={styles.modalMessage}>
                            Bạn muốn tiếp tục công đoạn <strong>{showResumeConfirm.stage}</strong> mà không chốt?
                        </p>
                        <div className={styles.modalActions}>
                            <button
                                type="button"
                                className={styles.modalBtnCancel}
                                onClick={cancelResumeProduction}
                            >
                                Hủy
                            </button>
                            <button
                                type="button"
                                className={styles.modalBtnResume}
                                onClick={() => resumeProduction(showResumeConfirm.lineId!, showResumeConfirm.stage)}
                            >
                                Quay lại
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection dialogs */}
            <SelectionDialog
                open={productDialog.show}
                title="Chọn dòng gạch"
                placeholder="Tìm theo tên hoặc SKU..."
                searchValue={productSearch}
                onSearchChange={setProductSearch}
                items={products.map((product) => ({
                    id: product.id,
                    title: product.name,
                    subtitle: `SKU: ${product.code}`,
                }))}
                selectedId={productDialog.selectedProductId}
                onSelect={(id) =>
                    setProductDialog((prev) => ({
                        ...prev,
                        selectedProductId: id,
                    }))
                }
                onClose={closeProductDialog}
                onConfirm={confirmProductDialog}
            />

            <SelectionDialog
                open={factoryDialog.show}
                title="Chọn nhà máy"
                placeholder="Tìm theo tên nhà máy..."
                searchValue={factorySearch}
                onSearchChange={setFactorySearch}
                items={factories.map((factory) => ({
                    id: factory.id,
                    title: factory.name,
                }))}
                selectedId={factoryDialog.selectedId}
                onSelect={(id) =>
                    setFactoryDialog((prev) => ({
                        ...prev,
                        selectedId: id,
                    }))
                }
                onClose={closeFactoryDialog}
                onConfirm={confirmFactoryDialog}
            />

            {currentFactory && (
                <SelectionDialog
                    open={lineDialog.show}
                    title="Chọn dây chuyền"
                    placeholder="Tìm theo tên dây chuyền..."
                    searchValue={lineSearch}
                    onSearchChange={setLineSearch}
                    items={currentFactory.lines.map((line) => ({
                        id: line.id,
                        title: line.name,
                    }))}
                    selectedId={lineDialog.selectedId}
                    onSelect={(id) =>
                        setLineDialog((prev) => ({
                            ...prev,
                            selectedId: id,
                        }))
                    }
                    onClose={closeLineDialog}
                    onConfirm={confirmLineDialog}
                />
            )}



            {/* Toasts */}
            <div className={styles.toastContainer}>
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
                    >
                        {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                        {toast.message}
                    </div>
                ))}
            </div>

            {/* Header: title + selectors */}
            <div className={styles.header}>
                <div className={styles.headerTitle}>
                    <div>
                        <h1 className={styles.title}>Quản lý dây chuyền</h1>
                        <p className={styles.subtitle}>
                            {currentFactory && currentLine
                                ? `${currentFactory.name} · ${currentLine.name}`
                                : 'Chọn nhà máy và dây chuyền để xem trạng thái sản xuất'}
                        </p>
                    </div>
                </div>
                <div className={styles.controls}>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Ca làm</div>
                        <div className={styles.summaryValue}>Shift B (2-10pm)</div>
                    </div>
                    <div className={styles.summaryCard}>
                        <div className={styles.summaryLabel}>Total Output</div>
                        <div className={styles.summaryValue}>12,450 Units</div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Nhà máy</label>
                        <button type="button" className={styles.productTrigger} onClick={openFactoryDialog}>
                            <span className={styles.productTriggerName}>
                                {currentFactory?.name ?? (loading ? 'Đang tải...' : 'Chọn nhà máy')}
                            </span>
                        </button>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Dây chuyền</label>
                        <button
                            type="button"
                            className={styles.productTrigger}
                            onClick={openLineDialog}
                            disabled={!currentFactory || (currentFactory?.lines.length ?? 0) === 0}
                        >
                            <span className={styles.productTriggerName}>
                                {currentLine?.name ?? 'Chọn dây chuyền'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            <div className={styles.mainWrapper}>
                <div className={styles.stagesGrid}>
                    {(currentLine?.stages || []).map((stage) => {
                        const state = getStageState(selectedLine ?? 0, stage);
                        const product = products.find((p) => p.id === state.productId) || null;
                        const runningTime = getRunningTime(state.startTime);
                        
                        // Get devices for this stage
                        const stageInfo = selectedLine ? stagesData[selectedLine]?.find(s => s.name === stage) : null;
                        const devices = stageInfo ? (stageDeviceAssignments[stageInfo.id] ?? []) : [];
                        
                        return (
                            <StageCard
                                key={stage}
                                lineId={selectedLine}
                                stage={stage}
                                state={state}
                                product={product}
                                devices={devices}
                                maxQuantityForLine={maxQuantityForLine}
                                runningTime={runningTime}
                                processingStage={processingStage}
                                onStart={startProduction}
                                onStop={confirmStopProduction}
                                onLog={confirmLogProduction}
                                onResume={confirmResumeProduction}
                                onOpenProductDialog={openProductDialog}
                            />
                        );
                    })}
                </div>

                <div className={styles.inlineHeader}>
                    <div className={styles.controls}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Nhà máy</label>
                            <button type="button" className={styles.productTrigger} onClick={openFactoryDialog}>
                                <span className={styles.productTriggerName}>
                                    {currentFactory?.name ?? 'Chọn nhà máy'}
                                </span>
                            </button>
                        </div>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Dây chuyền</label>
                            <button
                                type="button"
                                className={styles.productTrigger}
                                onClick={openLineDialog}
                                disabled={!currentFactory}
                            >
                                <span className={styles.productTriggerName}>
                                    {currentLine?.name ?? 'Chọn dây chuyền'}
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
                <StageHistoryPanel
                    items={stageHistory ?? []}
                    hasSelection={Boolean(selectedLine && currentLine)}
                    lineName={currentLine?.name ?? null}
                />
            </div>

        </div>
    );
}

