'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Factory, Play, Pause, AlertTriangle, TrendingUp,
  RefreshCw, CheckCircle, XCircle, Clock, Package, AlertCircle, RotateCcw
} from 'lucide-react';
import styles from './ProductionTracker.module.css';
import { useAuthStore } from '@/store/auth.store';

// ... (Interfaces Product, Toast giữ nguyên)
interface Product {
  id: number;
  name: string;
  code: string;
}

interface FactoryData {
  id: number;
  name: string;
  lines: ProductionLine[];
}

interface ProductionLine {
  id: number;
  name: string;
  stages: string[];
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
  // Thêm thuộc tính để lưu trạng thái trước đó
  previousStatus?: 'stopped' | 'running' | 'waiting_log';
}

export default function ProductionTracker() {
  const [products, setProducts] = useState<Product[]>([]);
  const [factories, setFactories] = useState<FactoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFactory, setSelectedFactory] = useState<number | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [stagesState, setStagesState] = useState<Record<number, Record<string, StageState>>>({});
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState<{ show: boolean, message: string, onConfirm: (() => void) | null, onCancel: (() => void) | null }>({ show: false, message: '', onConfirm: null, onCancel: null });
  const [showResumeConfirm, setShowResumeConfirm] = useState<{ show: boolean, lineId: number | null, stage: string }>({ show: false, lineId: null, stage: '' });
  const [showLogConfirm, setShowLogConfirm] = useState<{ show: boolean, lineId: number | null, stage: string }>({ show: false, lineId: null, stage: '' });
  const stopActionRef = useRef<{ lineId: number | null, stage: string, isEmergency: boolean }>({ lineId: null, stage: '', isEmergency: false });
  const { accessToken } = useAuthStore.getState()

  useEffect(() => {
    if (selectedLine) {
      fetchStagesForLine(selectedLine);
    }
  }, [selectedLine]);

  useEffect(() => {
    fetchFactories();
    fetchProducts();
    loadStateFromStorage();
  }, []);

  const fetchFactories = async () => {
    try {
      setLoading(true);
      const { accessToken } = useAuthStore.getState();

      const response = await fetch('http://localhost:5555/api/workshops', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch factories');
      }

      const data = await response.json();

      // Ensure each line has a stages array
      const factoriesWithStages = data.map((factory: any) => ({
        ...factory,
        lines: factory.lines?.map((line: any) => ({
          ...line,
          stages: line.stages || [] // Ensure stages is always an array
        })) || []
      }));

      setFactories(factoriesWithStages);

      if (factoriesWithStages.length > 0) {
        setSelectedFactory(factoriesWithStages[0].id);
        if (factoriesWithStages[0].lines.length > 0) {
          setSelectedLine(factoriesWithStages[0].lines[0].id);
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
    const { accessToken } = useAuthStore.getState();
    console.log(accessToken)
    const response = await fetch(
      `http://localhost:5555/api/production-stages/by-production-line-id/${lineId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch stages');
    }

    const stages = await response.json();
    console.log('Fetched stages:', stages); // Debug log

    // Update the stages state with the data from the database
    stages.forEach((stage: any) => {
      updateStageState(lineId, stage.name || stage.stageName, {
        status: stage.status || 'stopped',
        productId: stage.productId || null,
        startTime: stage.startTime || null,
        stopReason: stage.stopReason || null,
        quantity: stage.quantity || null,
        area: stage.area || null
      });
    });

    // Return the stages to update the UI
    setFactories(prevFactories => {
      return prevFactories.map(factory => ({
        ...factory,
        lines: factory.lines.map(line => 
          line.id === lineId 
            ? { 
                ...line, 
                stages: stages.map((s: any) => s.name || s.stageName || 'Unnamed Stage') 
              } 
            : line
        )
      }));
    });

  } catch (error) {
    console.error('Error in fetchStagesForLine:', error);
    showToast('Không thể tải danh sách công đoạn!', 'error');
  }
};

  

  useEffect(() => {
    saveStateToStorage(stagesState);
  }, [stagesState]);

  const fetchProducts = async () => {
    try {
      const { accessToken } = useAuthStore.getState();
      const response = await fetch('http://localhost:5555/api/brick-types', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log(data)
      setProducts(data as Product[]);
    } catch (error) {
      console.error('Error fetching brick types:', error);
      showToast('Không thể tải danh sách gạch', 'error');
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

  const getStageState = (lineId: number, stage: string): StageState => {
  return stagesState[lineId]?.[stage] || { 
    status: 'stopped', 
    productId: null, 
    startTime: null, 
    stopReason: null, 
    quantity: null, 
    area: null 
  };
}
    

  const updateStageState = (lineId: number, stage: string, updates: Partial<StageState>) => {
    setStagesState(prev => {
      const currentState = getStageState(lineId, stage);
      return {
        ...prev,
        [lineId]: {
          ...prev[lineId],
          [stage]: { 
            ...currentState, 
            ...updates,
            // Lưu trạng thái trước đó
            previousStatus: currentState.status
          }
        }
      };
    });
  };

  const selectProduct = (lineId: number, stage: string, productId: number) => {
    updateStageState(lineId, stage, {
      productId,
      quantity: null, // Xóa kết quả cũ
      area: null // Xóa kết quả cũ
    });
  };

  const startProduction = async (lineId: number, stage: string) => {
    const state = getStageState(lineId, stage);
    if (!state.productId) {
      showToast('Vui lòng chọn dòng gạch trước!', 'error');
      return;
    }

    try {
      // Call API to update production stage status
      console.log(JSON.stringify({
        productionLineId: lineId,
        stageName: stage,
        status: 'running',
        startTime: new Date().toISOString(),
        productId: state.productId
      }))
      const response = await fetch('http://localhost:5555/api/production-stages/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productionLineId: lineId,
          stageName: stage,
          status: 'running',
          startTime: new Date().toISOString(),
          productId: state.productId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update production stage');
      }

      // Update local state only after successful API call
      updateStageState(lineId, stage, {
        status: 'running',
        startTime: new Date().toISOString(),
        stopReason: null,
        quantity: null,
        area: null
      });

      showToast(`Đã khởi động công đoạn ${stage}`, 'success');
    } catch (error) {
      console.error('Error updating production stage:', error);
      showToast('Có lỗi xảy ra khi cập nhật trạng thái sản xuất', 'error');
    }
  };

  const confirmStopProduction = (lineId: number, stage: string, isEmergency: boolean) => {
    stopActionRef.current = { lineId, stage, isEmergency };
    setShowConfirmDialog({
      show: true,
      message: `Bạn có chắc chắn muốn ${isEmergency ? 'DỪNG KHẨN CẤP' : 'DỪNG'} công đoạn ${stage}?`,
      onConfirm: () => {
        const reason = isEmergency ? 'machine_error' : 'change_product';
        updateStageState(lineId, stage, { 
          status: 'waiting_log', 
          stopReason: reason, 
          isEmergency,
          startTime: getStageState(lineId, stage).startTime // Keep the start time for production logging
        });
        showToast(`Công đoạn ${stage} đã dừng. Vui lòng chốt sản lượng.`, 'success');
        setShowConfirmDialog({ show: false, message: '', onConfirm: null, onCancel: null });
      },
      onCancel: () => {
        setShowConfirmDialog({ show: false, message: '', onConfirm: null, onCancel: null });
      }
    });
  };

  const confirmLogProduction = (lineId: number, stage: string) => {
    setShowLogConfirm({ show: true, lineId, stage });
  };

  const confirmResumeProduction = (lineId: number, stage: string) => {
    setShowResumeConfirm({ show: true, lineId, stage });
  };

  const resumeProduction = (lineId: number, stage: string) => {
    const state = getStageState(lineId, stage);
    updateStageState(lineId, stage, { 
      status: 'running',
      stopReason: null,
      isEmergency: false,
      startTime: state.startTime || new Date().toISOString()
    });
    showToast(`Đã tiếp tục công đoạn ${stage}`, 'success');
    setShowResumeConfirm({ show: false, lineId: null, stage: '' });
  };

  const cancelResumeProduction = () => {
    setShowResumeConfirm({ show: false, lineId: null, stage: '' });
  };

  const logProduction = async (lineId: number, stage: string) => {
    const state = getStageState(lineId, stage);
    try {
      setProcessingStage(stage);
      await new Promise(r => setTimeout(r, 1500));
      const qty = Math.floor(Math.random() * 500) + 800;
      // Hệ số quy đổi: 1m² = 11 viên (ví dụ cho gạch 30x30)
      const area = parseFloat((qty / 11).toFixed(2));

      // Update the state with production data
      updateStageState(lineId, stage, {
        status: 'stopped',
        quantity: qty,
        area: area,
        startTime: null,
        stopReason: null,
        isEmergency: false
      });
      showToast(`Đã chốt sản lượng công đoạn ${stage}: ${qty.toLocaleString()} viên (${area} m²)`, 'success');
    } catch {
      showToast('Lỗi khi chốt sản lượng!', 'error');
    } finally {
      setProcessingStage(null);
    }
  };

  const currentFactory = factories.find(f => f.id === selectedFactory);
  const currentLine = currentFactory?.lines.find(l => l.id === selectedLine);

  const getRunningTime = (startTime: string | null) => {
    if (!startTime) return '';
    const diff = Date.now() - new Date(startTime).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m`;
  };

  // Stage descriptions for each stage
  const stageDescriptions: Record<string, string> = {
    'Đúc gạch mộc': 'Công đoạn tạo hình viên gạch từ nguyên liệu thô',
    'Phơi gạch': 'Làm khô gạch tự nhiên trước khi nung',
    'Nung gạch': 'Nung gạch ở nhiệt độ cao để tạo độ cứng',
    'Phân loại': 'Kiểm tra và phân loại gạch thành phẩm',
    'Đóng gói': 'Đóng gói sản phẩm trước khi xuất xưởng'
  };

  // Get stage description, fallback to default if not found
  const getStageDescription = (stageName: string): string => {
    return stageDescriptions[stageName] || 'Công đoạn sản xuất gạch';
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
      {/* Confirmation Dialog */}
      {showConfirmDialog.show && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <AlertTriangle size={32} className={styles.modalWarningIcon} />
            <h2 className={styles.modalTitle}>
              {stopActionRef.current.isEmergency ? 'DỪNG KHẨN CẤP' : 'DỪNG SẢN XUẤT'}
            </h2>
          </div>
          <p className={styles.modalMessage}>
            {showConfirmDialog.message}
          </p>
          <div className={styles.modalActions}>
            <button
              className={styles.modalBtnCancel}
              onClick={() => {
                setShowConfirmDialog({ show: false, message: '', onConfirm: null, onCancel: null });
                stopActionRef.current = { lineId: null, stage: '', isEmergency: false };
              }}
            >
              Hủy bỏ
            </button>
            <button
              className={stopActionRef.current.isEmergency ? styles.modalBtnEmergency : styles.modalBtnStop}
              onClick={() => {
                showConfirmDialog.onConfirm?.();
                stopActionRef.current = { lineId: null, stage: '', isEmergency: false };
              }}
            >
              {stopActionRef.current.isEmergency ? 'DỪNG GẤP' : 'Dừng'}
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Resume Production Confirmation Dialog */}
      {showLogConfirm.show && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <CheckCircle size={32} className={styles.modalSuccessIcon} />
            <h2 className={styles.modalTitle}>Chốt sản lượng</h2>
          </div>
          <p className={styles.modalMessage}>
            Bạn có chắc chắn muốn chốt sản lượng cho công đoạn <strong>{showLogConfirm.stage}</strong>?
          </p>
          <div className={styles.modalActions}>
            <button
              className={styles.modalBtnCancel}
              onClick={() => setShowLogConfirm({ show: false, lineId: null, stage: '' })}
            >
              Hủy
            </button>
            <button
              className={styles.modalBtnConfirm}
              disabled={processingStage === showLogConfirm.stage}
              onClick={() => {
                logProduction(showLogConfirm.lineId!, showLogConfirm.stage);
                setShowLogConfirm({ show: false, lineId: null, stage: '' });
              }}
            >
              {processingStage === showLogConfirm.stage ? 'Đang chốt...' : 'Xác nhận chốt'}
            </button>
          </div>
        </div>
      </div>
    )}

      {/* Log Production Confirmation Dialog */}
      {showResumeConfirm.show && (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <div className={styles.modalHeader}>
            <RotateCcw size={32} className={styles.modalInfoIcon} />
            <h2 className={styles.modalTitle}>Tiếp tục sản xuất</h2>
          </div>
          <p className={styles.modalMessage}>
            Bạn muốn quay lại sản xuất công đoạn <strong>{showResumeConfirm.stage}</strong> mà không chốt sản lượng?
          </p>
          <div className={styles.modalActions}>
            <button
              className={styles.modalBtnCancel}
              onClick={() => setShowResumeConfirm({ show: false, lineId: null, stage: '' })}
            >
              Hủy
            </button>
            <button
              className={styles.modalBtnResume}
              onClick={() => {
                resumeProduction(showResumeConfirm.lineId!, showResumeConfirm.stage);
              }}
            >
              Quay lại sản xuất
            </button>
          </div>
        </div>
      </div>
    )}

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
              value={selectedFactory ?? ''}
              onChange={(e) => {
                const fid = Number(e.target.value);
                setSelectedFactory(fid);
                const first = factories.find(f => f.id === fid)?.lines[0]?.id;
                if (first) setSelectedLine(first);
              }}
              className={styles.select}
            >
              {factories.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Dây chuyền</label>
            <select
              value={selectedLine ?? ''}
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
        {(currentLine?.stages || []).map((stage: string, index: number) => {
          const state = getStageState(selectedLine ?? 0, stage);
          console.log(state)
          const product = products.find(p => p.id === state.productId);
          const runningTime = getRunningTime(state.startTime);

          return (
            <div
              key={stage}
              className={`${styles.stageCard} ${state.status === 'running' ? styles.stageCardRunning :
                state.status === 'waiting_log' ? styles.stageCardWaiting :
                  ''
                }`}
            >
              <div className={styles.stageHeader}>
                <div>
                  <h3 className={styles.stageName}>{stage}</h3>
                  <p className={styles.stageDescription}>{getStageDescription(stage)}</p>
                </div>
                <span className={`${styles.statusBadge} ${state.status === 'running' ? styles.statusRunning :
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
                      onChange={e => {
                        if (selectedLine !== null) {
                          selectProduct(selectedLine, stage, Number(e.target.value));
                        }
                      }}
                      className={styles.select}
                    >
                      <option value="">-- Chọn dòng gạch --</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => selectedLine !== null && startProduction(selectedLine, stage)}
                    disabled={!state.productId || selectedLine === null}
                    className={`${styles.button} ${styles.buttonStart} ${!state.productId || selectedLine === null ? styles.buttonDisabled : ''}`}
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
                      onClick={() => selectedLine !== null && confirmStopProduction(selectedLine, stage, false)}
                      disabled={selectedLine === null}
                      className={`${styles.button} ${styles.buttonStop} ${selectedLine === null ? styles.buttonDisabled : ''}`}
                    >
                      <Pause size={20} /> DỪNG
                    </button>
                    <button
                      onClick={() => selectedLine !== null && confirmStopProduction(selectedLine, stage, true)}
                      disabled={selectedLine === null}
                      className={`${styles.button} ${styles.buttonEmergency} ${selectedLine === null ? styles.buttonDisabled : ''}`}
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

                  <div className={styles.buttonGroup}>
                    <button
                      onClick={() => selectedLine !== null && confirmLogProduction(selectedLine, stage)}
                      disabled={processingStage === stage || selectedLine === null}
                      className={`${styles.button} ${styles.buttonLog} ${processingStage === stage || selectedLine === null ? styles.buttonDisabled : ''}`}
                    >
                      <TrendingUp size={20} />
                      {processingStage === stage ? 'ĐANG CHỐT...' : 'CHỐT SẢN LƯỢNG'}
                    </button>
                    <button
                      onClick={() => selectedLine !== null && confirmResumeProduction(selectedLine, stage)}
                      disabled={processingStage === stage || selectedLine === null}
                      className={`${styles.button} ${styles.buttonSecondary} ${processingStage === stage || selectedLine === null ? styles.buttonDisabled : ''}`}
                    >
                      <RotateCcw size={20} /> QUAY LẠI SẢN XUẤT
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}