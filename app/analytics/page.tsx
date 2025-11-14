'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import MetricCard from '@/components/MetricCard';
import AnalysisMetricCard from '@/components/AnalysisMetricCard';

type DatePreset = 'today' | '7days' | '30days' | 'custom';

interface MetricsSummary {
  ty_le_hao_phi_tong: number;
  hieu_suat_san_xuat: number;
  ty_le_dat_khoan: number;
  san_luong_thuc_te: number;
  san_luong_khoan: number;
  hao_phi_moc: {
    value: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
  };
  hao_phi_lo: {
    value: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
  };
  hao_phi_truoc_mai: {
    value: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
  };
  hao_phi_hoan_thien: {
    value: number;
    percentage: number;
    status: 'good' | 'warning' | 'danger';
  };
  trend_data: Array<{
    timestamp: Date;
    ty_le_hao_phi: number;
    hieu_suat: number;
  }>;
  alerts: string[];
  shift_comparison: Array<{
    shift: string;
    san_luong: number;
    hieu_suat: number;
    ty_le_hao_phi: number;
  }>;
}

interface SankeyData {
  nodes: Array<{ name: string }>;
  links: Array<{
    source: number;
    target: number;
    value: number;
  }>;
}

interface QuotaComparison {
  san_luong_khoan: number;
  san_luong_thuc_te: number;
  chenh_lech: number;
  ty_le_vuot_khoan: number;
  performance_status: 'below' | 'meeting' | 'exceeding';
  quota_target: any;
}

export default function AnalyticsPage() {
  const [selectedLine, setSelectedLine] = useState<number>(1);
  const [selectedBrickType, setSelectedBrickType] = useState<number | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('7days');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [selectedShift, setSelectedShift] = useState<string>('');
  
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [quotaComparison, setQuotaComparison] = useState<QuotaComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    
    let startDate = endDate;
    switch (preset) {
      case 'today':
        startDate = endDate;
        break;
      case '7days':
        startDate = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30days':
        startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'custom':
        return;
    }
    
    setDateRange({ startDate, endDate });
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedLine, selectedBrickType, dateRange, selectedShift]);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        productionLineId: selectedLine.toString(),
      });

      if (selectedBrickType) {
        queryParams.append('brickTypeId', selectedBrickType.toString());
      }
      if (selectedShift) {
        queryParams.append('shift', selectedShift);
      }

      // Fetch summary
      const summaryRes = await fetch(`${API_URL}/production-metrics/summary?${queryParams}`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      } else {
        setError('Không có dữ liệu cho khoảng thời gian này');
      }

      // Fetch Sankey data
      const sankeyRes = await fetch(`${API_URL}/production-metrics/sankey?${queryParams}`);
      if (sankeyRes.ok) {
        const sankeyDataRes = await sankeyRes.json();
        setSankeyData(sankeyDataRes);
      }

      // Fetch quota comparison
      const quotaRes = await fetch(`${API_URL}/quota-targets/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionLineId: selectedLine,
          brickTypeId: selectedBrickType,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
        }),
      });
      if (quotaRes.ok) {
        const quotaData = await quotaRes.json();
        setQuotaComparison(quotaData);
      }
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setError('Lỗi kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: 'good' | 'warning' | 'danger') => {
    switch (status) {
      case 'good': return '#4caf50';
      case 'warning': return '#ff9800';
      case 'danger': return '#f44336';
      default: return '#999';
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu phân tích...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerText}>
            <h1>📊 Phân Tích Sản Xuất & Hao Phí</h1>
            <p>Theo dõi hiệu suất và hao phí chi tiết theo từng công đoạn</p>
          </div>
          <div className={styles.headerStats}>
            <div className={styles.statBadge}>
              <span className={styles.statLabel}>Dây chuyền</span>
              <span className={styles.statValue}>{selectedLine}</span>
            </div>
            <div className={styles.statBadge}>
              <span className={styles.statLabel}>Khoảng thời gian</span>
              <span className={styles.statValue}>
                {datePreset === 'today' ? 'Hôm nay' : 
                 datePreset === '7days' ? '7 ngày' : 
                 datePreset === '30days' ? '30 ngày' : 'Tùy chỉnh'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className={styles.filtersCard}>
        <div className={styles.filtersHeader}>
          <h3>🔍 Bộ Lọc</h3>
        </div>
        
        <div className={styles.filtersBody}>
          {/* Date Presets */}
          <div className={styles.datePresets}>
            <button 
              className={`${styles.presetBtn} ${datePreset === 'today' ? styles.active : ''}`}
              onClick={() => handleDatePresetChange('today')}
            >
              📅 Hôm nay
            </button>
            <button 
              className={`${styles.presetBtn} ${datePreset === '7days' ? styles.active : ''}`}
              onClick={() => handleDatePresetChange('7days')}
            >
              📆 7 ngày
            </button>
            <button 
              className={`${styles.presetBtn} ${datePreset === '30days' ? styles.active : ''}`}
              onClick={() => handleDatePresetChange('30days')}
            >
              📅 30 ngày
            </button>
            <button 
              className={`${styles.presetBtn} ${datePreset === 'custom' ? styles.active : ''}`}
              onClick={() => setDatePreset('custom')}
            >
              ⚙️ Tùy chỉnh
            </button>
          </div>

          {/* Filter Controls */}
          <div className={styles.filterControls}>
            <div className={styles.filterGroup}>
              <label>🏭 Dây chuyền</label>
              <select value={selectedLine} onChange={(e) => setSelectedLine(Number(e.target.value))}>
                <option value={1}>Dây chuyền 1</option>
                <option value={2}>Dây chuyền 2</option>
                <option value={6}>Dây chuyền 6</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label>⏰ Ca làm việc</label>
              <select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}>
                <option value="">Tất cả các ca</option>
                <option value="A">Ca A (Sáng)</option>
                <option value="B">Ca B (Chiều)</option>
                <option value="C">Ca C (Đêm)</option>
              </select>
            </div>

            {datePreset === 'custom' && (
              <>
                <div className={styles.filterGroup}>
                  <label>📅 Từ ngày</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  />
                </div>

                <div className={styles.filterGroup}>
                  <label>📅 Đến ngày</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className={styles.errorMessage}>
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* KPI Cards */}
      {summary && (
        <>
          <div className={styles.kpiSection}>
            <h2>Chỉ Số Hiệu Suất Chính (KPI)</h2>
            <div className={styles.kpiGrid}>
              <MetricCard
                title="Tỷ Lệ Hao Phí Tổng"
                value={`${summary.ty_le_hao_phi_tong.toFixed(2)}%`}
                unit="%"
                status={summary.ty_le_hao_phi_tong > 9 ? 'danger' : summary.ty_le_hao_phi_tong > 7 ? 'warning' : 'good'}
              />
              <MetricCard
                title="Hiệu Suất Sản Xuất"
                value={`${summary.hieu_suat_san_xuat.toFixed(2)}%`}
                unit="%"
                status={summary.hieu_suat_san_xuat < 85 ? 'danger' : summary.hieu_suat_san_xuat < 90 ? 'warning' : 'good'}
              />
              {quotaComparison && (
                <>
                  <MetricCard
                    title="Tỷ Lệ Đạt Khoán"
                    value={`${quotaComparison.ty_le_vuot_khoan.toFixed(2)}%`}
                    unit="%"
                    status={quotaComparison.performance_status === 'below' ? 'danger' : quotaComparison.performance_status === 'exceeding' ? 'good' : 'warning'}
                  />
                  <MetricCard
                    title="Sản Lượng Thực Tế"
                    value={`${quotaComparison.san_luong_thuc_te.toLocaleString()}`}
                    subtitle={`Khoán: ${quotaComparison.san_luong_khoan.toLocaleString()}`}
                    unit="m²"
                    status={quotaComparison.performance_status === 'below' ? 'danger' : 'good'}
                  />
                </>
              )}
            </div>
          </div>

          {/* Waste Details */}
          <div className={styles.wasteSection}>
            <h2>Chi Tiết Hao Phí Theo Công Đoạn</h2>
            <div className={styles.wasteGrid}>
              <AnalysisMetricCard
                title="Hao Phí Mộc"
                value={summary.hao_phi_moc.value}
                percentage={summary.hao_phi_moc.percentage}
                threshold={2}
                status={summary.hao_phi_moc.status}
                description="Hao phí giữa máy ép và trước lò nung"
              />
              <AnalysisMetricCard
                title="Hao Phí Lò"
                value={summary.hao_phi_lo.value}
                percentage={summary.hao_phi_lo.percentage}
                threshold={3}
                status={summary.hao_phi_lo.status}
                description="Hao phí trong quá trình nung"
              />
              <AnalysisMetricCard
                title="Hao Phí Trước Mài"
                value={summary.hao_phi_truoc_mai.value}
                percentage={summary.hao_phi_truoc_mai.percentage}
                threshold={2}
                status={summary.hao_phi_truoc_mai.status}
                description="Hao phí từ sau lò đến trước mài"
              />
              <AnalysisMetricCard
                title="Hao Phí Hoàn Thiện"
                value={summary.hao_phi_hoan_thien.value}
                percentage={summary.hao_phi_hoan_thien.percentage}
                threshold={2}
                status={summary.hao_phi_hoan_thien.status}
                description="Hao phí trong quá trình hoàn thiện"
              />
            </div>
          </div>

          {/* Alerts */}
          {summary.alerts && summary.alerts.length > 0 && (
            <div className={styles.alertsSection}>
              <h2>⚠️ Cảnh Báo</h2>
              <div className={styles.alertsList}>
                {summary.alerts.map((alert, index) => (
                  <div key={index} className={styles.alertItem}>
                    {alert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sankey Diagram Placeholder */}
          {sankeyData && (
            <div className={styles.sankeySection}>
              <h2>Biểu Đồ Dòng Chảy Sản Xuất</h2>
              <div className={styles.sankeyPlaceholder}>
                <p>Sankey diagram sẽ được hiển thị tại đây</p>
                <p className={styles.sankeyInfo}>
                  Nodes: {sankeyData.nodes.map(n => n.name).join(', ')}
                </p>
                <div className={styles.sankeyLinks}>
                  {sankeyData.links.map((link, idx) => (
                    <div key={idx} className={styles.linkItem}>
                      {sankeyData.nodes[link.source].name} → {sankeyData.nodes[link.target].name}: {link.value.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Shift Comparison */}
          {summary.shift_comparison && summary.shift_comparison.length > 0 && (
            <div className={styles.shiftSection}>
              <h2>So Sánh Theo Ca</h2>
              <div className={styles.shiftTable}>
                <table>
                  <thead>
                    <tr>
                      <th>Ca</th>
                      <th>Sản Lượng (m²)</th>
                      <th>Hiệu Suất (%)</th>
                      <th>Tỷ Lệ Hao Phí (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.shift_comparison.map((shift, idx) => (
                      <tr key={idx}>
                        <td><strong>{shift.shift}</strong></td>
                        <td>{shift.san_luong.toLocaleString()}</td>
                        <td>{shift.hieu_suat.toFixed(2)}%</td>
                        <td style={{ color: shift.ty_le_hao_phi > 9 ? '#f44336' : '#4caf50' }}>
                          {shift.ty_le_hao_phi.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trend Chart Placeholder */}
          <div className={styles.trendSection}>
            <h2>Xu Hướng Theo Thời Gian</h2>
            <div className={styles.trendPlaceholder}>
              <p>Biểu đồ line chart sẽ hiển thị xu hướng hao phí và hiệu suất theo thời gian</p>
              {summary.trend_data && summary.trend_data.length > 0 && (
                <div className={styles.trendData}>
                  <p>Có {summary.trend_data.length} điểm dữ liệu</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
