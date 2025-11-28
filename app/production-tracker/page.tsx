'use client';

import { useState, useEffect } from 'react';
import {
  Factory, Play, Pause, AlertTriangle, TrendingUp,
  RefreshCw, CheckCircle, XCircle, Clock, Package
} from 'lucide-react';
import styles from './ProductionTracker.module.css';

// ... (Interfaces Product, Toast giữ nguyên)
interface Product {
  id: number;
  name: string;
  code: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// Cập nhật interface StageState để lưu kết quả
interface StageState {
  status: 'stopped' | 'running' | 'waiting_log';
  productId: number | null;
  startTime: string | null;
  stopReason: string | null;
  isEmergency?: boolean;
  // Thêm các thuộc tính mới
  quantity: number | null;
  area: number | null;
}

const FACTORIES = [
  // ... (Constants giữ nguyên)
  {
    id: 1,
    name: 'Nhà máy 1',
    lines: [
      { id: 1, name: 'Dây chuyền 1', hasCoolMilling: false, stages: ['Nung', 'Ép', 'Mài nóng', 'Đóng hộp'] },
      { id: 2, name: 'Dây chuyền 2', hasCoolMilling: true, stages: ['Nung', 'Ép', 'Mài nguội', 'Đóng hộp'] }
    ]
  },
  {
    id: 2,
    name: 'Nhà máy 2',
    lines: [
      { id: 5, name: 'Dây chuyền 5', hasCoolMilling: true, stages: ['Nung', 'Ép', 'Mài nguội', 'Đóng hộp'] },
      { id: 6, name: 'Dây chuyền 6', hasCoolMilling: true, stages: ['Nung', 'Ép', 'Mài nguội', 'Đóng hộp'] }
    ]
  }
];

export default function ProductionTracker() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactory, setSelectedFactory] = useState(1);
  const [selectedLine, setSelectedLine] = useState(1);
  const [stagesState, setStagesState] = useState<Record<number, Record<string, StageState>>>({});
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    fetchProducts();
    loadStateFromStorage();
  }, []);

  useEffect(() => {
    saveStateToStorage(stagesState);
  }, [stagesState]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      await new Promise(r => setTimeout(r, 800));
      const mockData: Product[] = [
        { id: 1, name: 'Gạch 60x60 Bóng', code: 'G6060B' },
        { id: 2, name: 'Gạch 60x60 Mờ', code: 'G6060M' },
        { id: 3, name: 'Gạch 80x80 Bóng', code: 'G8080B' },
        { id: 4, name: 'Gạch 80x80 Mờ', code: 'G8080M' },
        { id: 5, name: 'Gạch 100x100 Bóng', code: 'G100100B' }
      ];
      setProducts(mockData);
    } catch {
      showToast('Không thể tải danh sách dòng gạch!', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadStateFromStorage = () => {
    try {
      const saved = localStorage.getItem('production_stages_state');
      if (saved) setStagesState(JSON.parse(saved));
    } catch (e) {
      console.error(e);
    }
  };

  const saveStateToStorage = (state: typeof stagesState) => {
    try {
      localStorage.setItem('production_stages_state', JSON.stringify(state));
    } catch (e) {
      console.error(e);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const getStageState = (lineId: number, stage: string): StageState =>
    stagesState[lineId]?.[stage] || { status: 'stopped', productId: null, startTime: null, stopReason: null, quantity: null, area: null };

  const updateStageState = (lineId: number, stage: string, updates: Partial<StageState>) => {
    setStagesState(prev => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        [stage]: { ...getStageState(lineId, stage), ...updates }
      }
    }));
  };

  const selectProduct = (lineId: number, stage: string, productId: number) => {
    updateStageState(lineId, stage, { 
      productId,
      quantity: null, // Xóa kết quả cũ
      area: null // Xóa kết quả cũ
    });
  };

  const startProduction = (lineId: number, stage: string) => {
    const state = getStageState(lineId, stage);
    if (!state.productId) return showToast('Vui lòng chọn dòng gạch trước!', 'error');

    updateStageState(lineId, stage, {
      status: 'running',
      startTime: new Date().toISOString(),
      stopReason: null,
      quantity: null, // Xóa kết quả cũ
      area: null // Xóa kết quả cũ
    });
    showToast(`Đã khởi động công đoạn ${stage}`, 'success');
  };

  const stopProduction = (lineId: number, stage: string, reason: string, emergency = false) => {
    updateStageState(lineId, stage, { status: 'waiting_log', stopReason: reason, isEmergency: emergency });
    showToast(`Công đoạn ${stage} đã dừng. Vui lòng chốt sản lượng.`, 'success');
  };

  const logProduction = async (lineId: number, stage: string) => {
    const state = getStageState(lineId, stage);
    try {
      setProcessingStage(stage);
      await new Promise(r => setTimeout(r, 1500));
      const qty = Math.floor(Math.random() * 500) + 800;
      // Hệ số quy đổi: 1m² = 11 viên (ví dụ cho gạch 30x30)
      const area = parseFloat((qty / 11).toFixed(2));
      
      // Không còn showToast, cập nhật state trực tiếp
      updateStageState(lineId, stage, {
        status: 'stopped',
        quantity: qty,
        area: area,
        startTime: null,
        stopReason: null,
        isEmergency: false
      });
    } catch {
      showToast('Lỗi khi chốt sản lượng!', 'error');
    } finally {
      setProcessingStage(null);
    }
  };

  const currentFactory = FACTORIES.find(f => f.id === selectedFactory);
  const currentLine = currentFactory?.lines.find(l => l.id === selectedLine);

  const getRunningTime = (startTime: string | null) => {
    if (!startTime) return '';
    const diff = Date.now() - new Date(startTime).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <RefreshCw className={styles.loadingIcon} size={48} />
          <p className={styles.loadingText}>Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toastContainer}>
        {toasts.map(t => (
          <div key={t.id} className={`${styles.toast} ${t.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
            {t.type === 'success' ? <CheckCircle size={20} /> : <XCircle size={20} />}
            {t.message}
          </div>
        ))}
      </div>

      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <Factory size={40} className={styles.headerIcon} />
          <h1 className={styles.title}>Hệ Thống Quản Lý Sản Xuất</h1>
        </div>

        <div className={styles.controls}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Nhà máy</label>
            <select
              value={selectedFactory}
              onChange={(e) => {
                const fid = Number(e.target.value);
                setSelectedFactory(fid);
                const first = FACTORIES.find(f => f.id === fid)?.lines[0]?.id;
                if (first) setSelectedLine(first);
              }}
              className={styles.select}
            >
              {FACTORIES.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Dây chuyền</label>
            <select
              value={selectedLine}
              onChange={e => setSelectedLine(Number(e.target.value))}
              className={styles.select}
            >
              {currentFactory?.lines.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className={styles.stagesGrid}>
        {currentLine?.stages.map(stage => {
          const state = getStageState(selectedLine, stage);
          const product = products.find(p => p.id === state.productId);
          const runningTime = getRunningTime(state.startTime);

          return (
            <div
              key={stage}
              className={`${styles.stageCard} ${
                state.status === 'running' ? styles.stageCardRunning :
                state.status === 'waiting_log' ? styles.stageCardWaiting :
                ''
              }`}
            >
              <div className={styles.stageHeader}>
                <h3 className={styles.stageName}>{stage}</h3>
                <span className={`${styles.statusBadge} ${
                  state.status === 'running' ? styles.statusRunning :
                  state.status === 'waiting_log' ? styles.statusWaiting :
                  styles.statusStopped
                }`}>
                  {state.status === 'running' ? 'ĐANG CHẠY' :
                   state.status === 'waiting_log' ? 'CHỜ CHỐT' :
                   'DỪNG'}
                </span>
              </div>

              {state.status === 'stopped' && (
                <div className={styles.buttonContainer}>
                  {/* Hiển thị kết quả lần chốt gần nhất */}
                  {state.quantity && state.area && (
                    <div className={styles.resultBox}>
                      <p className={styles.resultTitle}>Kết quả lần chốt gần nhất</p>
                      <p className={styles.resultValue}>{state.quantity.toLocaleString()} viên ({state.area} m²)</p>
                    </div>
                  )}
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>
                      <Package size={16} style={{ marginRight: '6px' }} />
                      Chọn dòng gạch
                    </label>
                    <select
                      value={state.productId || ''}
                      onChange={e => selectProduct(selectedLine, stage, Number(e.target.value))}
                      className={styles.select}
                    >
                      <option value="">-- Chọn dòng gạch --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => startProduction(selectedLine, stage)}
                    disabled={!state.productId}
                    className={`${styles.button} ${styles.buttonStart} ${!state.productId ? styles.buttonDisabled : ''}`}
                  >
                    <Play size={20} /> KHỞI ĐỘNG
                  </button>
                </div>
              )}

              {state.status === 'running' && (
                <div className={styles.buttonContainer}>
                  <div className={styles.infoBox}>
                    <p className={styles.infoLabel}>Dòng gạch:</p>
                    <p className={styles.infoValue}>{product?.name} ({product?.code})</p>
                    <p className={styles.infoTime}>
                      <Clock size={14} /> Thời gian chạy: {runningTime}
                    </p>
                  </div>

                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => stopProduction(selectedLine, stage, 'change_product')}
                      className={`${styles.button} ${styles.buttonStop}`}
                    >
                      <Pause size={20} /> DỪNG
                    </button>
                    <button
                      onClick={() => stopProduction(selectedLine, stage, 'machine_error', true)}
                      className={`${styles.button} ${styles.buttonEmergency}`}
                    >
                      <AlertTriangle size={20} /> DỪNG GẤP
                    </button>
                  </div>
                </div>
              )}

              {state.status === 'waiting_log' && (
                <div className={styles.buttonContainer}>
                  <div className={styles.waitingBox}>
                    <p className={styles.infoLabel}>Dòng gạch vừa chạy:</p>
                    <p className={styles.infoValue}>{product?.name} ({product?.code})</p>
                    <p className={styles.infoTime}>
                      <Clock size={14} /> Thời gian chạy: {runningTime}
                    </p>
                    {state.isEmergency && (
                      <p className={styles.emergencyText}>Dừng gấp – Sự cố máy</p>
                    )}
                  </div>

                  <button
                    onClick={() => logProduction(selectedLine, stage)}
                    disabled={processingStage === stage}
                    className={`${styles.button} ${styles.buttonLog} ${processingStage === stage ? styles.buttonDisabled : ''}`}
                  >
                    <TrendingUp size={20} />
                    {processingStage === stage ? 'ĐANG CHỐT...' : 'CHỐT SẢN LƯỢNG'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}