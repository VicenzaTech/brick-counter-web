'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import MetricCard from '@/components/MetricCard/MetricCard';
import AnalysisMetricCard from '@/components/AnalysisMetricCard/AnalysisMetricCard';
import { apiFetch } from '@/lib/http/http';

type DatePreset = 'today' | '7days' | '14days' | '30days' | 'custom';
type ActiveTab = 'overview' | 'waste' | 'efficiency' | 'quota' | 'trends';

interface BrickType {
  id: number;
  name: string;
  description?: string;
  unit?: string;
}

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

interface ProductionFlowData {
  SL_Ep: number;              // Sau máy ép
  SL_TruocLo: number;         // Trước lò nung
  SL_SauLo: number;           // Sau lò nung
  SL_TruocMai: number;        // Trước mài mặt
  SL_SauMaiCanh: number;      // Sau mài cạnh
  SL_TruocDongHop: number;    // Trước đóng hộp (thành phẩm)
  
  // Hao phí
  HP_Moc: number;             // Hao phí mộc
  TyLe_HP_Moc: number;
  HP_Lo: number;              // Hao phí lò
  TyLe_HP_Lo: number;
  HP_TM: number;              // Hao phí trước mài
  TyLe_HP_TM: number;
  HP_HT: number;              // Hao phí hoàn thiện
  TyLe_HP_HT: number;
  TongHaoPhi: number;
  TyLe_TongHaoPhi: number;
  
  // Hiệu suất
  HieuSuat_Moc: number;
  HieuSuat_Lo: number;
  HieuSuat_TruocMai: number;
  HieuSuat_ThanhPham: number;
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
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [selectedLine, setSelectedLine] = useState<number>(1);
  const [selectedBrickType, setSelectedBrickType] = useState<number | null>(null);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [datePreset, setDatePreset] = useState<DatePreset>('today');
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  });
  const [viewMode, setViewMode] = useState<'single' | 'range'>('single'); // single day or range
  const [dailyData, setDailyData] = useState<any[]>([]); // For multi-day table view
  
  const [summary, setSummary] = useState<MetricsSummary | null>(null);
  const [sankeyData, setSankeyData] = useState<SankeyData | null>(null);
  const [productionFlow, setProductionFlow] = useState<ProductionFlowData | null>(null);
  const [quotaComparison, setQuotaComparison] = useState<QuotaComparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

  const fetchBrickTypes = async () => {
    try {
      console.log('🔍 Fetching brick types from:', `${API_URL}/brick-types`);
      const res = await apiFetch(`${API_URL}/brick-types`);
      console.log('📦 Brick types response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Brick types loaded:', data);
        setBrickTypes(data);
      } else {
        console.error('❌ Failed to fetch brick types:', res.status, res.statusText);
      }
    } catch (error) {
      console.error('❌ Error fetching brick types:', error);
    }
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    
    let startDate = endDate;
    let mode: 'single' | 'range' = 'single';
    
    switch (preset) {
      case '7days':
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        mode = 'range';
        break;
      case '14days':
        startDate = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        mode = 'range';
        break;
      case '30days':
        startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        mode = 'range';
        break;
      case 'custom':
        // Don't change dates, just set preset
        return;
      case 'today':
      default:
        startDate = endDate;
        mode = 'single';
        break;
    }
    
    setDateRange({ startDate, endDate });
    setViewMode(mode);
  };

  useEffect(() => {
    fetchBrickTypes();
  }, []);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedLine, selectedBrickType, dateRange]);

  useEffect(() => {
    console.log('dailyData changed:', dailyData);
  }, [dailyData]);

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

      console.log('🔍 Fetching analytics with params:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        productionLineId: selectedLine,
        brickTypeId: selectedBrickType,
        queryString: queryParams.toString()
      });

      // Determine if we need daily breakdown
      const start = new Date(dateRange.startDate);
      const end = new Date(dateRange.endDate);
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      const isMultipleDays = daysDiff > 0;

      console.log('fetchAnalyticsData called:', {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        daysDiff,
        isMultipleDays
      });

      if (isMultipleDays) {
        // Fetch daily breakdown data using the new endpoint
        try {
          console.log(`Fetching daily breakdown: ${API_URL}/production-metrics/daily-breakdown?${queryParams}`);
          const dailyRes = await apiFetch(`${API_URL}/production-metrics/daily-breakdown?${queryParams}`);
          
          if (dailyRes.ok) {
            const dailyBreakdown = await dailyRes.json();
            console.log('Daily breakdown received:', dailyBreakdown);
            
            // Add date to each item
            const start = new Date(dateRange.startDate);
            const dataWithDates = dailyBreakdown.map((item: any, index: number) => {
              const currentDate = new Date(start);
              currentDate.setDate(start.getDate() + index);
              return {
                date: currentDate.toISOString().split('T')[0],
                ...item
              };
            });
            
            console.log(`Setting dailyData with ${dataWithDates.length} items:`, dataWithDates);
            setDailyData(dataWithDates);
          } else {
            console.warn('Failed to fetch daily breakdown, status:', dailyRes.status);
            setDailyData([]);
          }
        } catch (err) {
          console.error('Error fetching daily breakdown:', err);
          setDailyData([]);
        }
      } else {
        setDailyData([]);
      }

      // Fetch summary for current selection
      const summaryRes = await apiFetch(`${API_URL}/production-metrics/summary?${queryParams}`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      } else {
        setError('Không có dữ liệu cho khoảng thời gian này');
      }

      // Fetch Sankey data
      const sankeyRes = await apiFetch(`${API_URL}/production-metrics/sankey?${queryParams}`);
      if (sankeyRes.ok) {
        const sankeyDataRes = await sankeyRes.json();
        setSankeyData(sankeyDataRes);
        
        // Transform to production flow data
        if (sankeyDataRes && sankeyDataRes.links && sankeyDataRes.links.length >= 4) {
          const SL_Ep = sankeyDataRes.links[0]?.value || 0;
          const SL_TruocLo = sankeyDataRes.links[1]?.value || 0;
          const SL_SauLo = sankeyDataRes.links[2]?.value || 0;
          const SL_TruocMai = sankeyDataRes.links[3]?.value || 0;
          const SL_TruocDongHop = sankeyDataRes.links[sankeyDataRes.links.length - 1]?.value || 0;
          
          const HP_Moc = SL_Ep - SL_TruocLo;
          const HP_Lo = SL_TruocLo - SL_SauLo;
          const HP_TM = SL_SauLo - SL_TruocMai;
          const HP_HT = SL_TruocMai - SL_TruocDongHop;
          const TongHaoPhi = HP_Moc + HP_Lo + HP_TM + HP_HT;
          
          setProductionFlow({
            SL_Ep,
            SL_TruocLo,
            SL_SauLo,
            SL_TruocMai,
            SL_SauMaiCanh: SL_TruocMai, // Placeholder
            SL_TruocDongHop,
            
            HP_Moc,
            TyLe_HP_Moc: SL_Ep > 0 ? (HP_Moc / SL_Ep) * 100 : 0,
            HP_Lo,
            TyLe_HP_Lo: SL_Ep > 0 ? (HP_Lo / SL_Ep) * 100 : 0,
            HP_TM,
            TyLe_HP_TM: SL_Ep > 0 ? (HP_TM / SL_Ep) * 100 : 0,
            HP_HT,
            TyLe_HP_HT: SL_Ep > 0 ? (HP_HT / SL_Ep) * 100 : 0,
            TongHaoPhi,
            TyLe_TongHaoPhi: SL_Ep > 0 ? (TongHaoPhi / SL_Ep) * 100 : 0,
            
            HieuSuat_Moc: SL_Ep > 0 ? (SL_TruocLo / SL_Ep) * 100 : 0,
            HieuSuat_Lo: SL_Ep > 0 ? (SL_SauLo / SL_Ep) * 100 : 0,
            HieuSuat_TruocMai: SL_Ep > 0 ? (SL_TruocMai / SL_Ep) * 100 : 0,
            HieuSuat_ThanhPham: SL_Ep > 0 ? (SL_TruocDongHop / SL_Ep) * 100 : 0,
          });
        }
      }

      // Fetch quota comparison
      const quotaRes = await apiFetch(`${API_URL}/quota-targets/compare`, {
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

  const renderDailyTable = () => {
    if (!dailyData || dailyData.length === 0) {
      return (
        <div className={styles.dailyTableSection}>
          <div className={styles.tableHeader}>
            <h3>📊 Báo cáo chi tiết theo ngày</h3>
          </div>
          <div className={styles.noData}>
            <p>⏳ Đang tải dữ liệu theo ngày...</p>
            <p className={styles.noDataSub}>Hoặc không có dữ liệu cho khoảng thời gian này</p>
          </div>
        </div>
      );
    }

    return (
      <>
      <div className={styles.dailyTableSection}>
        <div className={styles.tableHeader}>
          <h3>📊 Báo cáo chi tiết theo ngày</h3>
          <div className={styles.tableMeta}>
            <span className={styles.dayCount}>{dailyData.length} ngày</span>
            <span>•</span>
            <span>{new Date(dateRange.startDate).toLocaleDateString('vi-VN')} - {new Date(dateRange.endDate).toLocaleDateString('vi-VN')}</span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.dailyTable}>
            <thead>
              <tr>
                <th rowSpan={2} className={styles.stickyCol}>Ngày</th>
                <th colSpan={2}>Hiệu suất</th>
                <th colSpan={5}>Hao phí (%)</th>
                <th colSpan={2}>Sản lượng (m²)</th>
                <th colSpan={2}>Đạt khoán</th>
                <th rowSpan={2}>Trạng thái</th>
              </tr>
              <tr>
                <th>HS (%)</th>
                <th>Đánh giá</th>
                <th>HP Mộc</th>
                <th>HP Lò</th>
                <th>HP Trước mài</th>
                <th>HP Hoàn thiện</th>
                <th>Tổng HP</th>
                <th>Thực tế</th>
                <th>Khoán</th>
                <th>Tỷ lệ (%)</th>
                <th>Kết quả</th>
              </tr>
            </thead>
            <tbody>
              {dailyData.map((day: any, idx: number) => {
                const chenh_lech = (day.san_luong_thuc_te || 0) - (day.san_luong_khoan || 0);
                const ty_le_dat_khoan = day.san_luong_khoan ? ((day.san_luong_thuc_te / day.san_luong_khoan) * 100) : 0;
                
                return (
                  <tr key={idx}>
                    <td className={`${styles.dateCell} ${styles.stickyCol}`}>
                      {new Date(day.date).toLocaleDateString('vi-VN', { 
                        weekday: 'short', 
                        day: '2-digit', 
                        month: '2-digit' 
                      })}
                    </td>
                    
                    {/* Hiệu suất */}
                    <td className={day.hieu_suat_san_xuat >= 90 ? styles.good : day.hieu_suat_san_xuat >= 85 ? styles.warning : styles.danger}>
                      <strong>{day.hieu_suat_san_xuat?.toFixed(1) || '-'}%</strong>
                    </td>
                    <td>
                      {day.hieu_suat_san_xuat >= 90 
                        ? <span className={`${styles.badge} ${styles.badgeGood}`}>Xuất sắc</span>
                        : day.hieu_suat_san_xuat >= 85
                        ? <span className={`${styles.badge} ${styles.badgeWarning}`}>Tốt</span>
                        : <span className={`${styles.badge} ${styles.badgeDanger}`}>Kém</span>
                      }
                    </td>
                    
                    {/* Hao phí */}
                    <td className={day.hao_phi_moc?.percentage > 2 ? styles.danger : styles.good}>
                      {day.hao_phi_moc?.percentage?.toFixed(2) || '-'}
                    </td>
                    <td className={day.hao_phi_lo?.percentage > 3 ? styles.danger : styles.good}>
                      {day.hao_phi_lo?.percentage?.toFixed(2) || '-'}
                    </td>
                    <td className={day.hao_phi_truoc_mai?.percentage > 2 ? styles.danger : styles.good}>
                      {day.hao_phi_truoc_mai?.percentage?.toFixed(2) || '-'}
                    </td>
                    <td className={day.hao_phi_hoan_thien?.percentage > 2 ? styles.danger : styles.good}>
                      {day.hao_phi_hoan_thien?.percentage?.toFixed(2) || '-'}
                    </td>
                    <td className={day.ty_le_hao_phi_tong > 9 ? styles.danger : day.ty_le_hao_phi_tong > 7 ? styles.warning : styles.good}>
                      <strong>{day.ty_le_hao_phi_tong?.toFixed(2) || '-'}</strong>
                    </td>
                    
                    {/* Sản lượng */}
                    <td><strong>{day.san_luong_thuc_te?.toLocaleString() || '-'}</strong></td>
                    <td className={styles.mutedText}>{day.san_luong_khoan?.toLocaleString() || '-'}</td>
                    
                    {/* Đạt khoán */}
                    <td className={ty_le_dat_khoan >= 100 ? styles.good : styles.warning}>
                      <strong>{ty_le_dat_khoan.toFixed(1)}%</strong>
                    </td>
                    <td>
                      {ty_le_dat_khoan >= 110 
                        ? <span className={`${styles.badge} ${styles.badgeGood}`}>Vượt khoán</span>
                        : ty_le_dat_khoan >= 100
                        ? <span className={`${styles.badge} ${styles.badgeGood}`}>Đạt</span>
                        : <span className={`${styles.badge} ${styles.badgeDanger}`}>Chưa đạt</span>
                      }
                    </td>
                    
                    {/* Trạng thái tổng thể */}
                    <td>
                      {day.hieu_suat_san_xuat >= 90 && day.ty_le_hao_phi_tong <= 7 
                        ? <span className={`${styles.statusBadge} ${styles.statusGood}`}>✓ Tốt</span>
                        : day.hieu_suat_san_xuat < 85 || day.ty_le_hao_phi_tong > 9
                        ? <span className={`${styles.statusBadge} ${styles.statusDanger}`}>✗ Kém</span>
                        : <span className={`${styles.statusBadge} ${styles.statusWarning}`}>! TB</span>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.stickyCol}><strong>Trung bình / Tổng</strong></td>
                
                {/* Hiệu suất TB */}
                <td colSpan={2}>
                  <strong>
                    {(dailyData.reduce((sum: number, d: any) => sum + (d.hieu_suat_san_xuat || 0), 0) / dailyData.length).toFixed(1)}%
                  </strong>
                </td>
                
                {/* Hao phí TB */}
                <td>
                  {(dailyData.reduce((sum: number, d: any) => sum + (d.hao_phi_moc?.percentage || 0), 0) / dailyData.length).toFixed(2)}
                </td>
                <td>
                  {(dailyData.reduce((sum: number, d: any) => sum + (d.hao_phi_lo?.percentage || 0), 0) / dailyData.length).toFixed(2)}
                </td>
                <td>
                  {(dailyData.reduce((sum: number, d: any) => sum + (d.hao_phi_truoc_mai?.percentage || 0), 0) / dailyData.length).toFixed(2)}
                </td>
                <td>
                  {(dailyData.reduce((sum: number, d: any) => sum + (d.hao_phi_hoan_thien?.percentage || 0), 0) / dailyData.length).toFixed(2)}
                </td>
                <td>
                  <strong>{(dailyData.reduce((sum: number, d: any) => sum + (d.ty_le_hao_phi_tong || 0), 0) / dailyData.length).toFixed(2)}</strong>
                </td>
                
                {/* Sản lượng tổng */}
                <td>
                  <strong>{dailyData.reduce((sum: number, d: any) => sum + (d.san_luong_thuc_te || 0), 0).toLocaleString()}</strong>
                </td>
                <td>
                  {dailyData.reduce((sum: number, d: any) => sum + (d.san_luong_khoan || 0), 0).toLocaleString()}
                </td>
                
                {/* Đạt khoán TB */}
                <td colSpan={2}>
                  <strong>
                    {(dailyData.reduce((sum: number, d: any) => {
                      const ty_le = d.san_luong_khoan ? ((d.san_luong_thuc_te / d.san_luong_khoan) * 100) : 0;
                      return sum + ty_le;
                    }, 0) / dailyData.length).toFixed(1)}%
                  </strong>
                </td>
                
                <td>-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Trend Analysis Chart - Line Chart */}
      <div className={styles.chartSection}>
        <h3>📈 Phân tích xu hướng sản xuất</h3>
        <div className={styles.chartContainer}>
          <svg className={styles.lineChart} viewBox="0 0 1000 400" preserveAspectRatio="xMidYMid meet">
            <defs>
              <linearGradient id="efficiencyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#4caf50', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#4caf50', stopOpacity: 0.05 }} />
              </linearGradient>
              <linearGradient id="wasteGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#f44336', stopOpacity: 0.3 }} />
                <stop offset="100%" style={{ stopColor: '#f44336', stopOpacity: 0.05 }} />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <g className={styles.gridLines}>
              {[0, 20, 40, 60, 80, 100].map((y) => (
                <line
                  key={y}
                  x1="50"
                  y1={350 - (y * 3)}
                  x2="950"
                  y2={350 - (y * 3)}
                  stroke="#e0e0e0"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
              ))}
            </g>

            {/* Y-axis labels */}
            <g className={styles.axisLabels}>
              {[0, 20, 40, 60, 80, 100].map((y) => (
                <text
                  key={y}
                  x="40"
                  y={355 - (y * 3)}
                  textAnchor="end"
                  fontSize="12"
                  fill="#666"
                >
                  {y}%
                </text>
              ))}
            </g>

            {/* Efficiency Line with Area */}
            {(() => {
              const points = dailyData.map((d, i) => {
                const x = 50 + (i * (900 / (dailyData.length - 1)));
                const y = 350 - ((d.hieu_suat_san_xuat || 0) * 3);
                return `${x},${y}`;
              }).join(' ');
              
              const areaPoints = `50,350 ${points} ${50 + (900)},350`;
              
              return (
                <>
                  <polygon
                    points={areaPoints}
                    fill="url(#efficiencyGradient)"
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#4caf50"
                    strokeWidth="3"
                  />
                  {dailyData.map((d, i) => {
                    const x = 50 + (i * (900 / (dailyData.length - 1)));
                    const y = 350 - ((d.hieu_suat_san_xuat || 0) * 3);
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r="5" fill="#4caf50" stroke="#fff" strokeWidth="2" />
                        <title>
                          {new Date(d.date).toLocaleDateString('vi-VN')}
                          {'\n'}Hiệu suất: {d.hieu_suat_san_xuat?.toFixed(1)}%
                        </title>
                      </g>
                    );
                  })}
                </>
              );
            })()}

            {/* Waste Line with Area */}
            {(() => {
              const points = dailyData.map((d, i) => {
                const x = 50 + (i * (900 / (dailyData.length - 1)));
                const y = 350 - ((d.ty_le_hao_phi_tong || 0) * 3);
                return `${x},${y}`;
              }).join(' ');
              
              const areaPoints = `50,350 ${points} ${50 + (900)},350`;
              
              return (
                <>
                  <polygon
                    points={areaPoints}
                    fill="url(#wasteGradient)"
                  />
                  <polyline
                    points={points}
                    fill="none"
                    stroke="#f44336"
                    strokeWidth="3"
                  />
                  {dailyData.map((d, i) => {
                    const x = 50 + (i * (900 / (dailyData.length - 1)));
                    const y = 350 - ((d.ty_le_hao_phi_tong || 0) * 3);
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r="5" fill="#f44336" stroke="#fff" strokeWidth="2" />
                        <title>
                          {new Date(d.date).toLocaleDateString('vi-VN')}
                          {'\n'}Hao phí: {d.ty_le_hao_phi_tong?.toFixed(2)}%
                        </title>
                      </g>
                    );
                  })}
                </>
              );
            })()}

            {/* X-axis labels (dates) */}
            <g className={styles.xAxisLabels}>
              {dailyData.map((d, i) => {
                const step = Math.ceil(dailyData.length / 10);
                if (i % step !== 0 && i !== dailyData.length - 1) return null;
                
                const x = 50 + (i * (900 / (dailyData.length - 1)));
                return (
                  <text
                    key={i}
                    x={x}
                    y="375"
                    textAnchor="middle"
                    fontSize="10"
                    fill="#666"
                  >
                    {new Date(d.date).toLocaleDateString('vi-VN', { 
                      day: '2-digit',
                      month: '2-digit'
                    })}
                  </text>
                );
              })}
            </g>

            {/* Reference lines */}
            <line
              x1="50"
              y1={350 - (90 * 3)}
              x2="950"
              y2={350 - (90 * 3)}
              stroke="#4caf50"
              strokeWidth="2"
              strokeDasharray="10,5"
              opacity="0.5"
            />
            <text x="955" y={355 - (90 * 3)} fontSize="11" fill="#4caf50" fontWeight="bold">
              Mục tiêu 90%
            </text>

            <line
              x1="50"
              y1={350 - (10 * 3)}
              x2="950"
              y2={350 - (10 * 3)}
              stroke="#ff9800"
              strokeWidth="2"
              strokeDasharray="10,5"
              opacity="0.5"
            />
            <text x="955" y={355 - (10 * 3)} fontSize="11" fill="#ff9800" fontWeight="bold">
              Ngưỡng HP 10%
            </text>
          </svg>

          {/* Legend */}
          <div className={styles.chartLegend}>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#4caf50' }}></div>
              <span>Hiệu suất sản xuất (%)</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendColor} style={{ backgroundColor: '#f44336' }}></div>
              <span>Tỷ lệ hao phí (%)</span>
            </div>
          </div>

          {/* Statistical Analysis */}
          <div className={styles.trendStats}>
            <div className={styles.trendStatCard}>
              <div className={styles.statLabel}>Hiệu suất TB</div>
              <div className={styles.statValue}>
                {(dailyData.reduce((sum, d) => sum + (d.hieu_suat_san_xuat || 0), 0) / dailyData.length).toFixed(1)}%
              </div>
              <div className={styles.statTrend}>
                {(() => {
                  const first = dailyData[0]?.hieu_suat_san_xuat || 0;
                  const last = dailyData[dailyData.length - 1]?.hieu_suat_san_xuat || 0;
                  const change = last - first;
                  return change > 0 
                    ? <span style={{ color: '#4caf50' }}>↑ {change.toFixed(1)}% so với đầu kỳ</span>
                    : <span style={{ color: '#f44336' }}>↓ {Math.abs(change).toFixed(1)}% so với đầu kỳ</span>;
                })()}
              </div>
            </div>
            
            <div className={styles.trendStatCard}>
              <div className={styles.statLabel}>Hao phí TB</div>
              <div className={styles.statValue}>
                {(dailyData.reduce((sum, d) => sum + (d.ty_le_hao_phi_tong || 0), 0) / dailyData.length).toFixed(2)}%
              </div>
              <div className={styles.statTrend}>
                {(() => {
                  const first = dailyData[0]?.ty_le_hao_phi_tong || 0;
                  const last = dailyData[dailyData.length - 1]?.ty_le_hao_phi_tong || 0;
                  const change = last - first;
                  return change < 0 
                    ? <span style={{ color: '#4caf50' }}>↓ {Math.abs(change).toFixed(2)}% (Cải thiện)</span>
                    : <span style={{ color: '#f44336' }}>↑ {change.toFixed(2)}% (Tăng)</span>;
                })()}
              </div>
            </div>

            <div className={styles.trendStatCard}>
              <div className={styles.statLabel}>Số ngày đạt mục tiêu</div>
              <div className={styles.statValue}>
                {dailyData.filter(d => (d.hieu_suat_san_xuat || 0) >= 90).length}/{dailyData.length}
              </div>
              <div className={styles.statTrend}>
                {((dailyData.filter(d => (d.hieu_suat_san_xuat || 0) >= 90).length / dailyData.length) * 100).toFixed(0)}% ngày đạt HS ≥ 90%
              </div>
            </div>

            <div className={styles.trendStatCard}>
              <div className={styles.statLabel}>Biến động</div>
              <div className={styles.statValue}>
                {(() => {
                  const efficiencies = dailyData.map(d => d.hieu_suat_san_xuat || 0);
                  const max = Math.max(...efficiencies);
                  const min = Math.min(...efficiencies);
                  return (max - min).toFixed(1) + '%';
                })()}
              </div>
              <div className={styles.statTrend}>
                Độ lệch chuẩn: {(() => {
                  const values = dailyData.map(d => d.hieu_suat_san_xuat || 0);
                  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
                  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
                  return Math.sqrt(variance).toFixed(2);
                })()}%
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  };

  const renderTabContent = () => {
    if (!summary) return null;

    // Show table view for multi-day range
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log('Render check:', {
      daysDiff,
      dailyDataLength: dailyData?.length || 0,
      viewMode,
      dateRange,
      dailyData
    });
    
    
    if (daysDiff > 0 && dailyData && dailyData.length > 0) {
      console.log('Rendering table view');
      return renderDailyTable();
    }

    console.log('Rendering single day view');
    // Single day view
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Quick Stats */}
            <div className={styles.quickStats}>
              <div className={styles.statCard}>
                <div className={styles.statIcon}>📈</div>
                <div className={styles.statContent}>
                  <div className={styles.statLabel}>Hiệu suất</div>
                  <div className={styles.statValue}>{summary.hieu_suat_san_xuat.toFixed(1)}%</div>
                  <div className={`${styles.statTrend} ${summary.hieu_suat_san_xuat >= 90 ? styles.positive : styles.negative}`}>
                    {summary.hieu_suat_san_xuat >= 90 ? '↗' : '↘'} {summary.hieu_suat_san_xuat >= 90 ? 'Tốt' : 'Cần cải thiện'}
                  </div>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon}>⚠️</div>
                <div className={styles.statContent}>
                  <div className={styles.statLabel}>Hao phí</div>
                  <div className={styles.statValue}>{summary.ty_le_hao_phi_tong.toFixed(1)}%</div>
                  <div className={`${styles.statTrend} ${summary.ty_le_hao_phi_tong <= 7 ? styles.positive : styles.negative}`}>
                    {summary.ty_le_hao_phi_tong <= 7 ? '✓' : '✗'} {summary.ty_le_hao_phi_tong <= 7 ? 'Trong ngưỡng' : 'Vượt ngưỡng'}
                  </div>
                </div>
              </div>

              {quotaComparison && (
                <>
                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>🎯</div>
                    <div className={styles.statContent}>
                      <div className={styles.statLabel}>Đạt khoán</div>
                      <div className={styles.statValue}>{quotaComparison.ty_le_vuot_khoan.toFixed(1)}%</div>
                      <div className={`${styles.statTrend} ${quotaComparison.performance_status !== 'below' ? styles.positive : styles.negative}`}>
                        {quotaComparison.performance_status === 'exceeding' ? '⭐' : quotaComparison.performance_status === 'meeting' ? '✓' : '↓'}
                        {' '}
                        {quotaComparison.performance_status === 'exceeding' ? 'Vượt khoán' : quotaComparison.performance_status === 'meeting' ? 'Đạt khoán' : 'Chưa đạt'}
                      </div>
                    </div>
                  </div>

                  <div className={styles.statCard}>
                    <div className={styles.statIcon}>📦</div>
                    <div className={styles.statContent}>
                      <div className={styles.statLabel}>Sản lượng</div>
                      <div className={styles.statValue}>{(quotaComparison.san_luong_thuc_te / 1000).toFixed(1)}K</div>
                      <div className={styles.statInfo}>
                        Khoán: {(quotaComparison.san_luong_khoan / 1000).toFixed(1)}K m²
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Alerts Section */}
            {summary.alerts && summary.alerts.length > 0 && (
              <div className={styles.alertsCompact}>
                <h3>⚠️ Cảnh báo ({summary.alerts.length})</h3>
                <div className={styles.alertsGrid}>
                  {summary.alerts.slice(0, 3).map((alert, index) => (
                    <div key={index} className={styles.alertCard}>
                      {alert}
                    </div>
                  ))}
                  {summary.alerts.length > 3 && (
                    <div className={styles.alertMore}>
                      +{summary.alerts.length - 3} cảnh báo khác
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Production Flow */}
            {productionFlow && (
              <div className={styles.flowSection}>
                <h3>🔄 Dòng chảy sản xuất</h3>
                
                {/* Main Flow Stages */}
                <div className={styles.flowVertical}>
                  {/* 1. Sau máy ép */}
                  <div className={styles.flowStage}>
                    <div className={styles.processStage}>
                      <div className={styles.stageNumber}>1</div>
                      <div className={styles.stageInfo}>
                        <div className={styles.stageName}>SAU MÁY ÉP</div>
                        <div className={styles.stageQuantity}>
                          <span className={styles.quantityValue}>{productionFlow.SL_Ep.toLocaleString()}</span>
                          <span className={styles.quantityUnit}>m²</span>
                        </div>
                        <div className={styles.stageEfficiency}>
                          Hiệu suất: <strong>100%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Hao phí mộc */}
                    <div className={styles.verticalArrow}>
                      <div className={styles.arrowLine}></div>
                      <div className={styles.arrowIcon}>↓</div>
                      <div className={`${styles.lossBox} ${productionFlow.TyLe_HP_Moc > 2 ? styles.warning : styles.good}`}>
                        <span className={styles.lossLabel}>⚠️ HAO PHÍ MỘC</span>
                        <span className={styles.lossAmount}>
                          {productionFlow.HP_Moc.toLocaleString()} m²
                        </span>
                        <span className={`${styles.lossPercent} ${productionFlow.TyLe_HP_Moc > 2 ? styles.danger : ''}`}>
                          {productionFlow.TyLe_HP_Moc.toFixed(2)}% {productionFlow.TyLe_HP_Moc > 2 ? '(⚠️ Vượt 2%)' : '(✓ OK)'}
                        </span>
                        <div className={styles.formula}>
                          <span className={styles.formulaLabel}>Công thức:</span>
                          <span className={styles.formulaText}>
                            HP_Mộc = SL_Ep - SL_TruocLo
                          </span>
                          <span className={styles.formulaText}>
                            = {productionFlow.SL_Ep.toLocaleString()} - {productionFlow.SL_TruocLo.toLocaleString()} = {productionFlow.HP_Moc.toLocaleString()} m²
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Trước lò nung */}
                  <div className={styles.flowStage}>
                    <div className={styles.processStage}>
                      <div className={styles.stageNumber}>2</div>
                      <div className={styles.stageInfo}>
                        <div className={styles.stageName}>TRƯỚC LÒ NUNG</div>
                        <div className={styles.stageQuantity}>
                          <span className={styles.quantityValue}>{productionFlow.SL_TruocLo.toLocaleString()}</span>
                          <span className={styles.quantityUnit}>m²</span>
                        </div>
                        <div className={styles.stageEfficiency}>
                          Hiệu suất: <strong>{productionFlow.HieuSuat_Moc.toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Hao phí lò */}
                    <div className={styles.verticalArrow}>
                      <div className={styles.arrowLine}></div>
                      <div className={styles.arrowIcon}>↓</div>
                      <div className={`${styles.lossBox} ${productionFlow.TyLe_HP_Lo > 3 ? styles.warning : styles.good}`}>
                        <span className={styles.lossLabel}>🔥 HAO PHÍ LÒ</span>
                        <span className={styles.lossAmount}>
                          {productionFlow.HP_Lo.toLocaleString()} m²
                        </span>
                        <span className={`${styles.lossPercent} ${productionFlow.TyLe_HP_Lo > 3 ? styles.danger : ''}`}>
                          {productionFlow.TyLe_HP_Lo.toFixed(2)}% {productionFlow.TyLe_HP_Lo > 3 ? '(⚠️ Vượt 3%)' : '(✓ OK)'}
                        </span>
                        <div className={styles.formula}>
                          <span className={styles.formulaLabel}>Công thức:</span>
                          <span className={styles.formulaText}>
                            HP_Lò = SL_TruocLo - SL_SauLo
                          </span>
                          <span className={styles.formulaText}>
                            = {productionFlow.SL_TruocLo.toLocaleString()} - {productionFlow.SL_SauLo.toLocaleString()} = {productionFlow.HP_Lo.toLocaleString()} m²
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Sau lò nung */}
                  <div className={styles.flowStage}>
                    <div className={styles.processStage}>
                      <div className={styles.stageNumber}>3</div>
                      <div className={styles.stageInfo}>
                        <div className={styles.stageName}>SAU LÒ NUNG</div>
                        <div className={styles.stageQuantity}>
                          <span className={styles.quantityValue}>{productionFlow.SL_SauLo.toLocaleString()}</span>
                          <span className={styles.quantityUnit}>m²</span>
                        </div>
                        <div className={styles.stageEfficiency}>
                          Hiệu suất: <strong>{productionFlow.HieuSuat_Lo.toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Hao phí trước mài */}
                    <div className={styles.verticalArrow}>
                      <div className={styles.arrowLine}></div>
                      <div className={styles.arrowIcon}>↓</div>
                      <div className={`${styles.lossBox} ${productionFlow.TyLe_HP_TM > 2 ? styles.warning : styles.good}`}>
                        <span className={styles.lossLabel}>⚙️ HAO PHÍ TRƯỚC MÀI</span>
                        <span className={styles.lossAmount}>
                          {productionFlow.HP_TM.toLocaleString()} m²
                        </span>
                        <span className={`${styles.lossPercent} ${productionFlow.TyLe_HP_TM > 2 ? styles.danger : ''}`}>
                          {productionFlow.TyLe_HP_TM.toFixed(2)}% {productionFlow.TyLe_HP_TM > 2 ? '(⚠️ Vượt 2%)' : '(✓ OK)'}
                        </span>
                        <div className={styles.formula}>
                          <span className={styles.formulaLabel}>Công thức:</span>
                          <span className={styles.formulaText}>
                            HP_TM = SL_SauLo - SL_TruocMai
                          </span>
                          <span className={styles.formulaText}>
                            = {productionFlow.SL_SauLo.toLocaleString()} - {productionFlow.SL_TruocMai.toLocaleString()} = {productionFlow.HP_TM.toLocaleString()} m²
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Trước mài mặt */}
                  <div className={styles.flowStage}>
                    <div className={styles.processStage}>
                      <div className={styles.stageNumber}>4</div>
                      <div className={styles.stageInfo}>
                        <div className={styles.stageName}>TRƯỚC MÀI MẶT</div>
                        <div className={styles.stageQuantity}>
                          <span className={styles.quantityValue}>{productionFlow.SL_TruocMai.toLocaleString()}</span>
                          <span className={styles.quantityUnit}>m²</span>
                        </div>
                        <div className={styles.stageEfficiency}>
                          Hiệu suất: <strong>{productionFlow.HieuSuat_TruocMai.toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>

                    {/* Hao phí hoàn thiện */}
                    <div className={styles.verticalArrow}>
                      <div className={styles.arrowLine}></div>
                      <div className={styles.arrowIcon}>↓</div>
                      <div className={`${styles.lossBox} ${productionFlow.TyLe_HP_HT > 2 ? styles.warning : styles.good}`}>
                        <span className={styles.lossLabel}>✨ HAO PHÍ HOÀN THIỆN</span>
                        <span className={styles.lossAmount}>
                          {productionFlow.HP_HT.toLocaleString()} m²
                        </span>
                        <span className={`${styles.lossPercent} ${productionFlow.TyLe_HP_HT > 2 ? styles.danger : ''}`}>
                          {productionFlow.TyLe_HP_HT.toFixed(2)}% {productionFlow.TyLe_HP_HT > 2 ? '(⚠️ Vượt 2%)' : '(✓ OK)'}
                        </span>
                        <div className={styles.formula}>
                          <span className={styles.formulaLabel}>Công thức:</span>
                          <span className={styles.formulaText}>
                            HP_HT = SL_TruocMai - SL_TruocDongHop
                          </span>
                          <span className={styles.formulaText}>
                            = {productionFlow.SL_TruocMai.toLocaleString()} - {productionFlow.SL_TruocDongHop.toLocaleString()} = {productionFlow.HP_HT.toLocaleString()} m²
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 5. Thành phẩm (Trước đóng hộp) */}
                  <div className={styles.flowStage}>
                    <div className={`${styles.processStage} ${styles.finalStage}`}>
                      <div className={styles.stageNumber}>5</div>
                      <div className={styles.stageInfo}>
                        <div className={styles.stageName}>THÀNH PHẨM</div>
                        <div className={styles.stageQuantity}>
                          <span className={styles.quantityValue}>{productionFlow.SL_TruocDongHop.toLocaleString()}</span>
                          <span className={styles.quantityUnit}>m²</span>
                        </div>
                        <div className={styles.stageEfficiency}>
                          Hiệu suất: <strong>{productionFlow.HieuSuat_ThanhPham.toFixed(1)}%</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className={styles.flowSummaryCards}>
                  <div className={styles.summaryCard}>
                    <div className={styles.cardIcon}>📥</div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardLabel}>Đầu vào (Sau máy ép)</div>
                      <div className={styles.cardValue}>
                        {productionFlow.SL_Ep.toLocaleString()}
                        <span className={styles.cardUnit}>m²</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.summaryCard}>
                    <div className={styles.cardIcon}>📤</div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardLabel}>Đầu ra (Thành phẩm)</div>
                      <div className={styles.cardValue}>
                        {productionFlow.SL_TruocDongHop.toLocaleString()}
                        <span className={styles.cardUnit}>m²</span>
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.summaryCard} ${productionFlow.TyLe_TongHaoPhi > 9 ? styles.danger : styles.warning}`}>
                    <div className={styles.cardIcon}>⚠️</div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardLabel}>Tổng hao phí</div>
                      <div className={styles.cardValue}>
                        {productionFlow.TongHaoPhi.toLocaleString()}
                        <span className={styles.cardUnit}>m² ({productionFlow.TyLe_TongHaoPhi.toFixed(2)}%)</span>
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.summaryCard} ${productionFlow.HieuSuat_ThanhPham >= 90 ? styles.success : styles.warning}`}>
                    <div className={styles.cardIcon}>✅</div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardLabel}>Hiệu suất tổng thể</div>
                      <div className={styles.cardValue}>
                        {productionFlow.HieuSuat_ThanhPham.toFixed(1)}
                        <span className={styles.cardUnit}>%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        );

      case 'waste':
        return (
          <div className={styles.wasteAnalysis}>
            <h3>📊 Phân tích hao phí chi tiết</h3>
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
        );

      case 'efficiency':
        return (
          <div className={styles.efficiencyAnalysis}>
            <h3>⚡ Hiệu suất công đoạn</h3>
            <div className={styles.kpiGrid}>
              <MetricCard
                title="Hiệu suất tổng thể"
                value={`${summary.hieu_suat_san_xuat.toFixed(2)}%`}
                unit="%"
                status={summary.hieu_suat_san_xuat < 85 ? 'danger' : summary.hieu_suat_san_xuat < 90 ? 'warning' : 'good'}
              />
              <MetricCard
                title="Tỷ lệ hao phí"
                value={`${summary.ty_le_hao_phi_tong.toFixed(2)}%`}
                unit="%"
                status={summary.ty_le_hao_phi_tong > 9 ? 'danger' : summary.ty_le_hao_phi_tong > 7 ? 'warning' : 'good'}
              />
            </div>
          </div>
        );

      case 'quota':
        return (
          <div className={styles.quotaAnalysis}>
            <h3>🎯 So sánh khoán sản xuất</h3>
            {quotaComparison && (
              <div className={styles.quotaComparison}>
                <div className={styles.quotaCard}>
                  <div className={styles.quotaLabel}>Khoán</div>
                  <div className={styles.quotaValue}>{quotaComparison.san_luong_khoan.toLocaleString()} m²</div>
                </div>
                <div className={styles.quotaCard}>
                  <div className={styles.quotaLabel}>Thực tế</div>
                  <div className={styles.quotaValue}>{quotaComparison.san_luong_thuc_te.toLocaleString()} m²</div>
                </div>
                <div className={styles.quotaCard}>
                  <div className={styles.quotaLabel}>Chênh lệch</div>
                  <div className={`${styles.quotaValue} ${quotaComparison.chenh_lech >= 0 ? styles.positive : styles.negative}`}>
                    {quotaComparison.chenh_lech >= 0 ? '+' : ''}{quotaComparison.chenh_lech.toLocaleString()} m²
                  </div>
                </div>
                <div className={styles.quotaCard}>
                  <div className={styles.quotaLabel}>Tỷ lệ đạt</div>
                  <div className={styles.quotaValue}>{quotaComparison.ty_le_vuot_khoan.toFixed(1)}%</div>
                </div>
              </div>
            )}
          </div>
        );

      case 'trends':
        return (
          <div className={styles.trendsAnalysis}>
            <h3>📈 Xu hướng & So sánh ca</h3>
            
            {summary.shift_comparison && summary.shift_comparison.length > 0 && (
              <div className={styles.shiftComparison}>
                <h4>So sánh theo ca làm việc</h4>
                <div className={styles.shiftGrid}>
                  {summary.shift_comparison.map((shift, idx) => (
                    <div key={idx} className={styles.shiftCard}>
                      <div className={styles.shiftHeader}>Ca {shift.shift}</div>
                      <div className={styles.shiftMetrics}>
                        <div className={styles.shiftMetric}>
                          <span className={styles.metricLabel}>Sản lượng</span>
                          <span className={styles.metricValue}>{shift.san_luong.toLocaleString()} m²</span>
                        </div>
                        <div className={styles.shiftMetric}>
                          <span className={styles.metricLabel}>Hiệu suất</span>
                          <span className={styles.metricValue}>{shift.hieu_suat.toFixed(1)}%</span>
                        </div>
                        <div className={styles.shiftMetric}>
                          <span className={styles.metricLabel}>Hao phí</span>
                          <span className={`${styles.metricValue} ${shift.ty_le_hao_phi > 9 ? styles.danger : styles.good}`}>
                            {shift.ty_le_hao_phi.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.trend_data && summary.trend_data.length > 0 && (
              <div className={styles.trendData}>
                <h4>Dữ liệu xu hướng</h4>
                <p>Có {summary.trend_data.length} điểm dữ liệu để phân tích</p>
                <div className={styles.trendPlaceholder}>
                  Biểu đồ line chart sẽ hiển thị tại đây
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      {/* Sticky Header with Filters */}
      <div className={styles.stickyHeader}>
        <div className={styles.headerTop}>
          <div className={styles.headerTitle}>
            <h1>📊 Phân Tích Sản Xuất</h1>
            <div className={styles.headerMeta}>
              <span>Dây chuyền {selectedLine}</span>
              <span>•</span>
              <span>
                {viewMode === 'single' 
                  ? new Date(dateRange.startDate).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })
                  : `${new Date(dateRange.startDate).toLocaleDateString('vi-VN')} - ${new Date(dateRange.endDate).toLocaleDateString('vi-VN')}`
                }
              </span>
              {viewMode === 'range' && (
                <>
                  <span>•</span>
                  <span className={styles.dayCount}>{dailyData.length} ngày</span>
                </>
              )}
            </div>
          </div>

          {/* Compact Filters */}
          <div className={styles.compactFilters}>
            <select value={selectedLine} onChange={(e) => setSelectedLine(Number(e.target.value))} className={styles.filterSelect}>
              <option value={1}>Dây chuyền 1</option>
              <option value={2}>Dây chuyền 2</option>
              <option value={6}>Dây chuyền 6</option>
            </select>

            <select 
              value={selectedBrickType || ''} 
              onChange={(e) => setSelectedBrickType(e.target.value ? Number(e.target.value) : null)} 
              className={styles.filterSelect}
            >
              <option value="">Tất cả loại gạch</option>
              {brickTypes.map((brick) => (
                <option key={brick.id} value={brick.id}>
                  {brick.name}{brick.description ? ` - ${brick.description}` : ''}
                </option>
              ))}
            </select>

            {/* Date Range Picker - Always visible */}
            <div className={styles.dateRangePicker}>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  setDateRange({ ...dateRange, startDate: newStartDate });
                  setDatePreset('custom');
                  setViewMode(newStartDate === dateRange.endDate ? 'single' : 'range');
                }}
                className={styles.dateInput}
              />
              <span className={styles.dateRangeSeparator}>→</span>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  setDateRange({ ...dateRange, endDate: newEndDate });
                  setDatePreset('custom');
                  setViewMode(dateRange.startDate === newEndDate ? 'single' : 'range');
                }}
                className={styles.dateInput}
              />
            </div>

            {/* Quick Preset Buttons */}
            <div className={styles.dateQuickPicks}>
              <button 
                className={`${styles.dateBtn} ${datePreset === '7days' ? styles.active : ''}`}
                onClick={() => handleDatePresetChange('7days')}
              >
                📊 7 ngày
              </button>
              <button 
                className={`${styles.dateBtn} ${datePreset === '14days' ? styles.active : ''}`}
                onClick={() => handleDatePresetChange('14days')}
              >
                📊 14 ngày
              </button>
              <button 
                className={`${styles.dateBtn} ${datePreset === '30days' ? styles.active : ''}`}
                onClick={() => handleDatePresetChange('30days')}
              >
                📊 30 ngày
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Only show for single day view */}
        {viewMode === 'single' && (
          <div className={styles.tabNav}>
            <button 
              className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className={styles.tabIcon}>📊</span>
              Tổng quan
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'waste' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('waste')}
            >
              <span className={styles.tabIcon}>⚠️</span>
              Hao phí
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'efficiency' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('efficiency')}
            >
              <span className={styles.tabIcon}>⚡</span>
              Hiệu suất
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'quota' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('quota')}
            >
              <span className={styles.tabIcon}>🎯</span>
              Khoán
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'trends' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('trends')}
            >
              <span className={styles.tabIcon}>📈</span>
              Xu hướng
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className={styles.mainContent}>
        {error && (
          <div className={styles.errorBanner}>
            <span>⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className={styles.loadingWrapper}>
            <div className={styles.spinner}></div>
            <p>Đang tải dữ liệu...</p>
          </div>
        ) : (
          renderTabContent()
        )}
      </div>
    </div>
  );
}
