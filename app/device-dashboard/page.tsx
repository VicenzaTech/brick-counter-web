'use client';

import { useState, useEffect } from 'react';
import { Cpu, ArrowLeftRight, TrendingUp, TrendingDown } from 'lucide-react';
import DeviceCard from '@/components/DeviceCard';
import AnalysisMetricCard from '@/components/AnalysisMetricCard';
import { useDeviceDashboardWebSocket } from '@/hooks/useDeviceDashboardWebSocket';
import styles from './page.module.css';

interface DeviceData {
  id: string;
  name: string;
  count: number;
  lastUpdated: string;
}

// Dữ liệu thiết bị thực tế từ database - sử dụng deviceId mapping từ Django
// Device IDs phải khớp với deviceId trong MQTT messages
const INITIAL_DEVICES: DeviceData[] = [
  { id: 'SAU-ME-01', name: 'Sau máy ép 1', count: 0, lastUpdated: '-' },
  { id: 'SAU-ME-02', name: 'Sau máy ép 2', count: 0, lastUpdated: '-' },
  { id: 'TRUOC-LN-01', name: 'Trước lò nung 1', count: 0, lastUpdated: '-' },
  { id: 'TRUOC-LN-02', name: 'Trước lò nung 2', count: 0, lastUpdated: '-' },
  { id: 'SAU-LN-01', name: 'Sau lò nung 1', count: 0, lastUpdated: '-' },
  { id: 'TRUOC-MM-01', name: 'Trước mài măt 1', count: 0, lastUpdated: '-' },
  { id: 'SAU-MC-01', name: 'Sau mài cạnh 1', count: 0, lastUpdated: '-' },
  { id: 'TRUOC-DH-01', name: 'Trước đóng hộp 1', count: 0, lastUpdated: '-' },
];

export default function DeviceDashboardPage() {
  // WebSocket connection với NestJS backend
  const { devices, setDevices, isConnected } = useDeviceDashboardWebSocket(INITIAL_DEVICES, {
    enabled: true, // ✅ Bật WebSocket để kết nối với NestJS backend
    baseUrl: 'http://localhost:5555', // NestJS Socket.IO server
  });
  
  console.log('🌐 DeviceDashboardPage render');
  console.log('📊 Devices state:', devices.map(d => ({ id: d.id, name: d.name, count: d.count })));
  console.log('🔌 WebSocket connected:', isConnected);
  
  const [device1, setDevice1] = useState<string>('');
  const [device2, setDevice2] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState<string>('');

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('vi-VN'));
    };
    
    updateTime(); // Set initial time
    const interval = setInterval(updateTime, 1000); // Update every second
    
    return () => clearInterval(interval);
  }, []);

  // Tính toán các chỉ số hao phí (y hệt bên old-vicenza-ims-web Django)
  // Formulas from: templates/pages/phan-tich/analysis.html lines 1050-1083
  const calculateMetrics = () => {
    // Get device counts based on real deviceId
    const sauMe1 = devices.find(d => d.id === 'SAU-ME-01')?.count || 0;
    const sauMe2 = devices.find(d => d.id === 'SAU-ME-02')?.count || 0;
    const truocLn1 = devices.find(d => d.id === 'TRUOC-LN-01')?.count || 0;
    const truocLn2 = devices.find(d => d.id === 'TRUOC-LN-02')?.count || 0;
    const sauLn = devices.find(d => d.id === 'SAU-LN-01')?.count || 0;
    const truocMm = devices.find(d => d.id === 'TRUOC-MM-01')?.count || 0;
    const truocDh = devices.find(d => d.id === 'TRUOC-DH-01')?.count || 0;

    // Calculate loss metrics exactly as in Django
    // Hao phí mộc: Tổng sản lượng trước lò nung - Tổng sản lượng sau máy ép
    // Công thức: (TRUOC-LN-1 + TRUOC-LN-2) - (SAU-ME-1 + SAU-ME-2)
    const haophiMoc = (truocLn1 + truocLn2) - (sauMe1 + sauMe2);

    // Hao phí nung: Sản lượng sau lò nung - Tổng sản lượng trước lò nung
    // Công thức: SAU-LN - (TRUOC-LN-1 + TRUOC-LN-2)
    const haophiNung = sauLn - (truocLn1 + truocLn2);

    // Hao phí trước mài: Sản lượng trước mài mặt - Sản lượng sau lò nung
    // Công thức: TRUOC-MM - SAU-LN
    const haophiTruocMai = truocMm - sauLn;

    // Hao phí hoàn thiện: Sản lượng trước đóng hộp - Sản lượng trước mài mặt
    // Công thức: TRUOC-DH - TRUOC-MM
    const haophiHoanThien = truocDh - truocMm;

    // Helper function to determine color variant (matching Django)
    const getVariant = (value: number): 'primary' | 'success' | 'warning' | 'danger' | 'muted' => {
      if (value < 0) return 'success';  // Negative loss (gain) - green
      if (value === 0) return 'muted';   // No loss - gray
      if (value > 0 && value <= 100) return 'warning';  // Small loss - yellow
      return 'danger';  // High loss - red
    };

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

  const metrics = calculateMetrics();

  // Xử lý so sánh thiết bị
  const handleCompare = () => {
    if (!device1 || !device2) return;

    const dev1Data = devices.find(d => d.id === device1);
    const dev2Data = devices.find(d => d.id === device2);

    if (!dev1Data || !dev2Data) return;

    const diff = dev1Data.count - dev2Data.count;
    const percentage = dev2Data.count !== 0 
      ? ((diff / dev2Data.count) * 100).toFixed(2)
      : '0';

    setComparisonResult({
      device1: dev1Data,
      device2: dev2Data,
      diff,
      percentage,
      winner: diff > 0 ? 'device1' : diff < 0 ? 'device2' : 'equal',
    });
  };

  // Reset so sánh khi thay đổi thiết bị
  useEffect(() => {
    setComparisonResult(null);
  }, [device1, device2]);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Cpu size={32} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Phân tích thiết bị</h1>
            <p className={styles.subtitle}>Phân xưởng 1 - Dây chuyền 1</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
            <span className={styles.statusText}>
              {isConnected ? 'Đang kết nối' : 'Chế độ demo'}
            </span>
          </div>
          <div className={styles.headerTime}>
            {currentTime || '-'}
          </div>
        </div>
      </div>

      {/* Section Header */}
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <Cpu size={24} />
          Dây chuyền 1
        </h2>
      </div>

      {/* Device Grid */}
      <div className={styles.deviceGrid}>
        {devices.map((device) => (
          <DeviceCard
            key={device.id}
            deviceName={device.name}
            count={device.count}
            lastUpdated={device.lastUpdated}
            variant="primary"
          />
        ))}
      </div>

      {/* Metrics Section - Hao phí metrics exactly matching Django */}
      <div className={styles.metricsSection}>
        <div className={styles.metricsGrid}>
          <AnalysisMetricCard
            title="Hao phí mộc"
            value={metrics.haophiMoc}
            variant={metrics.haophiMocVariant}
          />
          <AnalysisMetricCard
            title="Hao phí nung"
            value={metrics.haophiNung}
            variant={metrics.haophiNungVariant}
          />
          <AnalysisMetricCard
            title="Hao phí trước mài"
            value={metrics.haophiTruocMai}
            variant={metrics.haophiTruocMaiVariant}
          />
          <AnalysisMetricCard
            title="Hao phí hoàn thiện"
            value={metrics.haophiHoanThien}
            variant={metrics.haophiHoanThienVariant}
          />
        </div>
      </div>

      {/* Device Comparison Section */}
      <div className={styles.comparisonSection}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>
              <ArrowLeftRight size={20} />
              So sánh thiết bị dây chuyền 1
            </h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.selectGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="device1-select" className={styles.label}>
                  Thiết bị 1 (Trái)
                </label>
                <select
                  id="device1-select"
                  className={styles.select}
                  value={device1}
                  onChange={(e) => setDevice1(e.target.value)}
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="device2-select" className={styles.label}>
                  Thiết bị 2 (Phải)
                </label>
                <select
                  id="device2-select"
                  className={styles.select}
                  value={device2}
                  onChange={(e) => setDevice2(e.target.value)}
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {devices.map((device) => (
                    <option key={device.id} value={device.id}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              className={styles.compareButton}
              onClick={handleCompare}
              disabled={!device1 || !device2}
            >
              <ArrowLeftRight size={20} />
              So sánh
            </button>

            {/* Comparison Result */}
            {comparisonResult && (
              <div className={styles.comparisonResult}>
                <div className={styles.resultCard}>
                  <h4 className={styles.resultTitle}>Kết quả so sánh</h4>
                  <div className={styles.resultGrid}>
                    {/* Device 1 */}
                    <div className={styles.deviceResult}>
                      <h5 className={styles.deviceResultTitle}>Thiết bị 1</h5>
                      <div className={`${styles.deviceResultCard} ${comparisonResult.winner === 'device1' ? styles.winner : ''}`}>
                        <div className={styles.deviceResultName}>
                          {comparisonResult.device1.name}
                        </div>
                        <div className={styles.deviceResultCount}>
                          {comparisonResult.device1.count.toLocaleString('vi-VN')}
                        </div>
                        <div className={styles.deviceResultTime}>
                          {comparisonResult.device1.lastUpdated}
                        </div>
                      </div>
                    </div>

                    {/* Comparison */}
                    <div className={styles.deviceResult}>
                      <h5 className={styles.deviceResultTitle}>So sánh</h5>
                      <div className={styles.comparisonStats}>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Chênh lệch</span>
                          <span className={`${styles.statValue} ${comparisonResult.diff > 0 ? styles.positive : styles.negative}`}>
                            {comparisonResult.diff > 0 ? '+' : ''}{comparisonResult.diff.toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Phần trăm</span>
                          <span className={`${styles.statValue} ${comparisonResult.diff > 0 ? styles.positive : styles.negative}`}>
                            {comparisonResult.diff > 0 ? '+' : ''}{comparisonResult.percentage}%
                          </span>
                        </div>
                        <div className={styles.statItem}>
                          <span className={styles.statLabel}>Kết luận</span>
                          <span className={styles.conclusion}>
                            {comparisonResult.winner === 'equal' ? (
                              'Bằng nhau'
                            ) : comparisonResult.winner === 'device1' ? (
                              <>
                                <TrendingUp size={16} />
                                Thiết bị 1 cao hơn
                              </>
                            ) : (
                              <>
                                <TrendingDown size={16} />
                                Thiết bị 2 cao hơn
                              </>
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Device 2 */}
                    <div className={styles.deviceResult}>
                      <h5 className={styles.deviceResultTitle}>Thiết bị 2</h5>
                      <div className={`${styles.deviceResultCard} ${comparisonResult.winner === 'device2' ? styles.winner : ''}`}>
                        <div className={styles.deviceResultName}>
                          {comparisonResult.device2.name}
                        </div>
                        <div className={styles.deviceResultCount}>
                          {comparisonResult.device2.count.toLocaleString('vi-VN')}
                        </div>
                        <div className={styles.deviceResultTime}>
                          {comparisonResult.device2.lastUpdated}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
