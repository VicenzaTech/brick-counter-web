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
  status: 'pending' | 'running' | 'waiting_log';
  productId: number | null;
  startTime: string | null;
  stopReason: string | null;
  isEmergency?: boolean;
  // Thêm các thuộc tính mới
  quantity: number | null;
  area: number | null;
  // Thêm thuộc tính để lưu trạng thái trước đó
  previousStatus?: 'pending' | 'running' | 'waiting_log';
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
  const [stagesData, setStagesData] = useState<Record<number, Array<{ id: number, name: string }>>>({});

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
      // Store the stages data with their IDs
      setStagesData(prev => ({
        ...prev,
        [lineId]: stages.map((stage: any) => ({
          id: stage.id,
          name: stage.name || stage.stageName
        }))
      }));
      // Update the stages state with the data from the database
      stages.forEach((stage: any) => {
        updateStageState(lineId, stage.name || stage.stageName, {
          status: stage.status || 'pending',
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
      status: 'pending',
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

  const startProduction = async (lineId: number, stageName: string) => {
    const state = getStageState(lineId, stageName);
    if (!state.productId) {
      showToast('Vui lòng chọn dòng gạch trước!', 'error');
      return;
    }

    try {
      // Get the stage ID from the stagesData state
      const stage = stagesData[lineId]?.find(s => s.name === stageName);
      if (!stage) {
        throw new Error('Không tìm thấy thông tin công đoạn');
      }

      const startTime = new Date().toISOString();

      // Your existing API call to update status
      const response = await fetch('http://localhost:5555/api/production-stages/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productionLineId: lineId,
          stageName: stageName,
          status: 'running',
          startTime: startTime,
          productId: state.productId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update production stage');
      }

      // Create history record with the actual stage ID
      const historyResponse = await fetch('http://localhost:5555/api/production-stage-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stageId: stage.id, // Use the actual stage ID
          productId: state.productId,
          startTime: startTime,
          isEmergency: false,
        }),
      });

      if (!historyResponse.ok) {
        throw new Error('Failed to create production stage history');
      }

      // Update local state
      updateStageState(lineId, stageName, {
        status: 'running',
        startTime: startTime,
        stopReason: null,
        quantity: null,
        area: null
      });

      showToast(`Đã khởi động công đoạn ${stageName}`, 'success');
    } catch (error) {
      console.error('Error in startProduction:', error);
      showToast('Có lỗi xảy ra khi khởi động công đoạn sản xuất', 'error');
    }
  };

  const confirmStopProduction = (lineId: number, stage: string, isEmergency: boolean) => {
    stopActionRef.current = { lineId, stage, isEmergency };
    setShowConfirmDialog({
      show: true,
      message: `Bạn có chắc chắn muốn ${isEmergency ? 'DỪNG KHẨN CẤP' : 'DỪNG'} công đoạn ${stage}?`,
      onConfirm: async () => {
        try {
          const reason = isEmergency ? 'machine_error' : 'change_product';
          const currentState = getStageState(lineId, stage);

          // Call API to update production stage status to 'waiting_log'
          const response = await fetch('http://localhost:5555/api/production-stages/update-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify({
              productionLineId: lineId,
              stageName: stage,
              status: 'waiting_log',
              stopReason: reason,
              isEmergency: isEmergency,
              startTime: currentState.startTime,
              productId: currentState.productId
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to update production stage status');
          }

          // Update local state only after successful API call
          updateStageState(lineId, stage, {
            status: 'waiting_log',
            stopReason: reason,
            isEmergency,
            startTime: currentState.startTime // Keep the start time for production logging
          });

          showToast(`Công đoạn ${stage} đã dừng. Vui lòng chốt sản lượng.`, 'success');
        } catch (error) {
          console.error('Error stopping production:', error);
          showToast('Có lỗi xảy ra khi dừng công đoạn sản xuất', 'error');
        } finally {
          setShowConfirmDialog({ show: false, message: '', onConfirm: null, onCancel: null });
        }
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

  const resumeProduction = async (lineId: number, stage: string) => {
    try {
      const state = getStageState(lineId, stage);

      // Call API to update production stage status to 'running'
      const response = await fetch('http://localhost:5555/api/production-stages/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          productionLineId: lineId,
          stageName: stage,
          status: 'running',
          stopReason: null,
          isEmergency: false,
          startTime: state.startTime || new Date().toISOString(),
          productId: state.productId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update production stage status');
      }

      // Update local state only after successful API call
      updateStageState(lineId, stage, {
        status: 'running',
        stopReason: null,
        isEmergency: false,
        startTime: state.startTime || new Date().toISOString()
      });

      showToast(`Đã tiếp tục công đoạn ${stage}`, 'success');
    } catch (error) {
      console.error('Error resuming production:', error);
      showToast('Có lỗi xảy ra khi tiếp tục công đoạn sản xuất', 'error');
    } finally {
      setShowResumeConfirm({ show: false, lineId: null, stage: '' });
    }
  };

  const cancelResumeProduction = () => {
    setShowResumeConfirm({ show: false, lineId: null, stage: '' });
  };

  const logProduction = async (lineId: number, stage: string) => {
    const state = getStageState(lineId, stage);
    try {
      setProcessingStage(stage);
      // Giả lập số lượng và diện tích
      const qty = Math.floor(Math.random() * 500) + 800;
      const area = parseFloat((qty / 11).toFixed(2));

      // Gọi API cập nhật trạng thái về 'pending' (chốt sản lượng)
      const response = await fetch('http://localhost:5555/api/production-stages/update-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          productionLineId: lineId,
          stageName: stage,
          status: 'pending',
          quantity: qty,
          area: area,
          productId: state.productId
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update production stage status');
      }

      // Tìm stageId từ stagesData
      const stageObj = stagesData[lineId]?.find(s => s.name === stage);
      const stageId = stageObj?.id;

      // Gọi API cập nhật production stage history gần nhất (cập nhật endTime, quantity, area, stopReason, notes, created_by_username)
      if (stageId && state.productId) {
        // endTime là thời điểm hiện tại
        const endTime = new Date().toISOString();
        // stopReason: chuyển đổi dòng gạch hoặc dừng sự cố
        let stopReason = state.stopReason || 'change_product';
        if (state.isEmergency) stopReason = 'machine_error';
        await fetch(`http://localhost:5555/api/production-stage-history/update-latest`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            stageId: stageId,
            productId: state.productId,
            endTime: endTime,
            quantity: qty,
            area: area,
            stopReason: stopReason,
            notes: 'Fake note',
            created_by_username: 'fake_user'
          })
        });
      }

      // Update local state only after successful API call
      updateStageState(lineId, stage, {
        status: 'pending',
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

              {state.status === 'pending' && (
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