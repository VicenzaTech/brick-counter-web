'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, CheckCircle, RotateCcw, XCircle } from 'lucide-react';
import StageCard from './components/StageCard';
import { SelectionDialog } from './components/SelectionDialog';
import { StageActionsDialog } from './components/StageActionsDialog';
import { StageHistoryPanel } from './components/StageHistoryPanel';
import styles from './ProductionTracker.module.css';
import { FactoryData, Product, StageHistoryItem, StageState, StageStatus, StopReason, Toast } from './types';
import { apiFetch } from '@/lib/http/http';

export default function ProductionTracker() {
    const [products, setProducts] = useState<Product[]>([]);
    const [factories, setFactories] = useState<FactoryData[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
    const [selectedLine, setSelectedLine] = useState<number | null>(null);
    const [stagesState, setStagesState] = useState<Record<number, Record<string, StageState>>>({});
    const [processingStage, setProcessingStage] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [stageHistory, setStageHistory] = useState<StageHistoryItem[]>(() => {
        const now = new Date();
        return [
            {
                id: 1,
                timestamp: new Date(now.getTime() - 15 * 60 * 1000).toISOString(),
                lineId: 1,
                lineName: 'Dây chuyền 1',
                stageId: 101,
                stage: { name: 'Nung' },
                action: 'log',
                quantity: 12450,
                area: 1131.8,
                productId: 1,
                product: { id: 1, name: 'Gạch 4 lỗ', code: 'G4L' },
                startTime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() - 15 * 60 * 1000),
                stopReason: StopReason.CHANGE_PRODUCT,
                isEmergency: false,
                notes: 'Chốt lô ca sáng',
                createdByUsername: 'Hệ thống',
                createdAt: new Date(now.getTime() - 15 * 60 * 1000),
            },
            {
                id: 2,
                timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
                lineId: 1,
                lineName: 'Dây chuyền 1',
                stageId: 102,
                stage: { name: 'Ép gạch' },
                action: 'start',
                quantity: null,
                area: null,
                productId: 2,
                product: { id: 2, name: 'Gạch 6 lỗ', code: 'G6L' },
                startTime: new Date(now.getTime() - 5 * 60 * 1000),
                isEmergency: false,
                notes: 'bắt đầu ép gạch',
                createdByUsername: 'Hệ thống',
                createdAt: new Date(now.getTime() - 5 * 60 * 1000),
            },
            {
                id: 3,
                timestamp: new Date(now.getTime() - 2 * 60 * 1000).toISOString(),
                lineId: 2,
                lineName: 'Dây chuyền 2',
                stageId: 201,
                stage: { name: 'Đóng gói' },
                action: 'stop',
                quantity: 8200,
                area: 745.5,
                productId: 3,
                product: { id: 3, name: 'Gạch đặc', code: 'GD01' },
                startTime: new Date(now.getTime() - 5 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() - 2 * 60 * 1000),
                stopReason: StopReason.MAINTENANCE,
                isEmergency: false,
                notes: 'Tạm dừng chuyển lô',
                createdByUsername: 'Hệ thống',
                createdAt: new Date(now.getTime() - 2 * 60 * 1000),
            },
        ];
    });
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
    const [mobileStageAction, setMobileStageAction] = useState<{ lineId: number | null; stage: string } | null>(null);

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
    const previousStagesRef = useRef<Record<number, Record<string, StageState>>>({});
    const seededLinesRef = useRef<Set<number>>(new Set());

    useEffect(() => {
        void fetchFactories();
        void fetchProducts();
        loadStateFromStorage();
    }, []);

    useEffect(() => {
        if (selectedLine) {
            void fetchStagesForLine(selectedLine);
            void fetchStageHistoryForLine(selectedLine)
        }
    }, [selectedLine]);

    const fetchFactories = async () => {
        try {
            setLoading(true);
            const response = await apiFetch('/api/workshops');

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

    const fetchStagesForLine = async (lineId: number) => {
        try {
            const response = await apiFetch(`/api/production-stages/by-production-line-id/${lineId}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error((errorData as any).message || 'Failed to fetch stages');
            }

            const stages = await response.json();
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
            const response = await apiFetch(`/api/production-stage-history/by-production-line/${lineId}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error((errorData as any).message || 'Failed to fetch stages');
            }

            const history = await response.json();
            setStageHistory(history)
        } catch (error) {
            console.error('Error in fetchStagesForLine:', error);
            showToast('Không thể tải danh sách công đoạn!', 'error');
        }
    }

    useEffect(() => {
        saveStateToStorage(stagesState);
    }, [stagesState]);

    useEffect(() => {
        const previous = previousStagesRef.current;
        const current = stagesState;

        Object.entries(current).forEach(([lineIdKey, stages]) => {
            const lineId = Number(lineIdKey);
            const previousStages = previous[lineId] || {};

            Object.entries(stages).forEach(([stageName, state]) => {
                const previousState = previousStages[stageName];

                if (!previousState) {
                    return;
                }

                if (
                    previousState.status === state.status &&
                    previousState.quantity === state.quantity &&
                    previousState.area === state.area
                ) {
                    return;
                }

                if (previousState.status !== state.status) {
                    if (previousState.status === 'stopped' && state.status === 'running') {
                        addStageHistoryEntry(lineId, stageName, 'start', { productId: state.productId });
                    } else if (previousState.status === 'running' && state.status === 'waiting_log') {
                        addStageHistoryEntry(lineId, stageName, state.isEmergency ? 'emergency_stop' : 'stop', {
                            productId: state.productId,
                        });
                    } else if (previousState.status === 'waiting_log' && state.status === 'stopped') {
                        addStageHistoryEntry(lineId, stageName, 'log', {
                            quantity: state.quantity,
                            area: state.area,
                            productId: state.productId,
                        });
                    } else if (previousState.status === 'waiting_log' && state.status === 'running') {
                        addStageHistoryEntry(lineId, stageName, 'resume', { productId: state.productId });
                    }
                } else if (
                    state.status === 'stopped' &&
                    (previousState.quantity !== state.quantity || previousState.area !== state.area)
                ) {
                    addStageHistoryEntry(lineId, stageName, 'log', {
                        quantity: state.quantity,
                        area: state.area,
                        productId: state.productId,
                    });
                }
            });
        });

        previousStagesRef.current = current;
    }, [stagesState]);

    useEffect(() => {
        if (products.length === 0) return;
        const lineIdsToSeed = Object.keys(stagesState)
            .map(Number)
            .filter(
                (lineId) =>
                    !seededLinesRef.current.has(lineId) &&
                    Object.keys(stagesState[lineId] || {}).length > 0,
            );
        if (lineIdsToSeed.length === 0) {
            return;
        }
        setStagesState((prev) => {
            const nextState: typeof prev = { ...prev };
            let changed = false;
            lineIdsToSeed.forEach((lineId) => {
                const stageMap = prev[lineId];
                if (!stageMap) return;
                const updatedStages: Record<string, StageState> = {};
                let index = 0;
                Object.entries(stageMap).forEach(([stageName, stageState]) => {
                    const product = products[(lineId + index) % products.length];
                    index += 1;
                    const randomStatus =
                        stageState.status ||
                        (index === 1 ? 'running' : Math.random() > 0.45 ? 'running' : 'stopped');
                    const randomOffset = Math.floor(Math.random() * 45 * 60 * 1000);
                    const startTime =
                        randomStatus === 'running'
                            ? stageState.startTime ?? new Date(Date.now() - randomOffset).toISOString()
                            : null;
                    const randomQuantityBase = Math.floor(Math.random() * 3500) + 1500;
                    const quantity =
                        randomStatus === 'running'
                            ? Math.floor(randomQuantityBase * 0.6)
                            : randomQuantityBase;
                    const area = parseFloat((quantity / 11).toFixed(2));
                    updatedStages[stageName] = {
                        ...stageState,
                        status: randomStatus,
                        productId: stageState.productId ?? product?.id ?? null,
                        startTime,
                        quantity,
                        area,
                        isEmergency: false,
                    };
                });
                seededLinesRef.current.add(lineId);
                nextState[lineId] = updatedStages;
                changed = true;
            });
            return changed ? nextState : prev;
        });
    }, [products, stagesState]);

    useEffect(() => {
        const interval = setInterval(() => {
            setStagesState((prev) => {
                const nextState: typeof prev = { ...prev };
                let hasChanges = false;

                Object.entries(prev).forEach(([lineIdKey, stageMap]) => {
                    if (!stageMap) return;
                    const updatedStages: Record<string, StageState> = { ...stageMap };
                    let lineChanged = false;

                    Object.entries(stageMap).forEach(([stageName, stageState]) => {
                        if (stageState.status !== 'running') {
                            return;
                        }

                        const increment = Math.floor(Math.random() * 120) + 40;
                        const newQuantity = (stageState.quantity ?? 0) + increment;
                        const newArea = parseFloat((newQuantity / 11).toFixed(2));

                        updatedStages[stageName] = {
                            ...stageState,
                            quantity: newQuantity,
                            area: newArea,
                            startTime: stageState.startTime ?? new Date().toISOString(),
                        };
                        lineChanged = true;
                    });

                    if (lineChanged) {
                        nextState[Number(lineIdKey)] = updatedStages;
                        hasChanges = true;
                    }
                });

                return hasChanges ? nextState : prev;
            });
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const fetchProducts = async () => {
        try {
            const response = await apiFetch('/api/brick-types');
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

    const getLineName = (lineId: number): string => {
        for (const factory of factories) {
            const line = factory.lines.find((l) => l.id === lineId);
            if (line) {
                return line.name;
            }
        }
        return `Line #${lineId}`;
    };

    const addStageHistoryEntry = (
        lineId: number,
        stage: string,
        action: StageHistoryItem['action'],
        extras?: { quantity?: number | null; area?: number | null; productId?: number | null },
    ) => {
        const lineName = getLineName(lineId);
        const product =
            extras?.productId != null ? products.find((p) => p.id === extras.productId) ?? null : null;
        const now = new Date();
        const historyEntry: StageHistoryItem = {
            id: Date.now() + Math.random(),
            timestamp: now.toISOString(),
            lineId,
            lineName,
            stageId: Math.floor(Math.random() * 100000),
            stage: { name: stage },
            action,
            quantity: extras?.quantity ?? null,
            area: extras?.area ?? null,
            productId: product?.id,
            product: product
                ? {
                    id: product.id,
                    name: product.name,
                    code: product.code,
                }
                : undefined,
            startTime: now,
            endTime: action === 'log' ? now : undefined,
            stopReason:
                action === 'stop' || action === 'emergency_stop'
                    ? action === 'emergency_stop'
                        ? StopReason.MACHINE_ERROR
                        : StopReason.CHANGE_PRODUCT
                    : undefined,
            isEmergency: action === 'emergency_stop',
            notes: '',
            createdByUsername: 'Hệ thống',
            createdAt: now,
        };

        setStageHistory((prev) => [historyEntry, ...prev]);
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

    const startProduction = async (lineId: number, stage: string) => {
        const state = getStageState(lineId, stage);
        if (!state.productId) {
            showToast('Vui lòng chọn dòng gạch trước!', 'error');
            return;
        }

        try {
            await apiFetch('/api/production-stages/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    productionLineId: lineId,
                    stageName: stage,
                    status: 'running',
                    startTime: new Date().toISOString(),
                    productId: state.productId,
                }),
            });

            updateStageState(lineId, stage, {
                status: 'running',
                startTime: new Date().toISOString(),
                stopReason: null,
                quantity: null,
                area: null,
            });

            showToast(`Đã khởi động công đoạn ${stage}`, 'success');
        } catch (error) {
            console.error('Error starting production:', error);
            showToast('Lỗi khi cập nhật trạng thái sản xuất', 'error');
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

                const response = await apiFetch('/api/production-stages/update-status', {
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

    const resumeProduction = (lineId: number, stage: string) => {
        try {
            setProcessingStage(stage)
            const state = getStageState(lineId, stage);

            updateStageState(lineId, stage, {
                status: 'running',
                stopReason: null,
                isEmergency: false,
                startTime: state.startTime || new Date().toISOString(),
            });
            showToast(`Tiếp tục công đoạn ${stage}`, 'success');
            setShowResumeConfirm({ show: false, lineId: null, stage: '' });
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
        try {
            setProcessingStage(stage);
            const response = await apiFetch('/api/production-stages/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: StageStatus.PENDING,
                    productionLineId: lineId,
                    stageName: stage,
                }),
            });
            if (response.ok) {
                const qty = 0;
                const area = parseFloat((qty / 11).toFixed(2));
                updateStageState(lineId, stage, {
                    status: 'stopped',
                    quantity: qty,
                    area,
                    startTime: null,
                    stopReason: null,
                    isEmergency: false,
                });
                showToast(`Chốt ${stage}: ${qty.toLocaleString()} viên (${area} m²)`, 'success');
            }
        } catch (error) {
            showToast('Lỗi khi chốt sản lượng', 'error');
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

    const recentHistoryForCurrentLine =
        selectedLine == null
            ? stageHistory.slice(0, 10)
            : stageHistory.filter((item) => item.lineId === selectedLine).slice(0, 10);

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
                        return (
                            <StageCard
                                key={stage}
                                lineId={selectedLine}
                                stage={stage}
                                state={state}
                                product={product}
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
                    items={recentHistoryForCurrentLine}
                    hasSelection={Boolean(selectedLine && currentLine)}
                    lineName={currentLine?.name ?? null}
                />
            </div>

        </div>
    );
}


