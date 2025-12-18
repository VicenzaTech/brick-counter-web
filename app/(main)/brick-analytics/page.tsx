'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import MetricCard from '@/components/MetricCard/MetricCard';
import { apiFetch } from '@/lib/http/http';

type DatePreset = 'today' | '7days' | '14days' | '30days' | 'custom';

interface BrickType {
  id: number;
  name: string;
  description?: string;
  unit?: string;
}

interface ProductionLine {
  id: number;
  name: string;
}

interface BrickProductionRecord {
  recordDate: string;
  productionLineId: number;
  productionLineName: string;
  sl_ep: number;
  sl_truoc_dong_hop: number;
  tong_hao_phi: number;
  ty_le_tong_hao_phi: number;
  hieu_suat_thanh_pham: number;
  hp_moc: number;
  hp_lo: number;
  hp_tm: number;
  hp_ht: number;
}

interface BrickAnalyticsSummary {
  brickType: BrickType;
  totalProduction: number;
  averageEfficiency: number;
  averageWaste: number;
  totalWaste: number;
  productionDays: number;
  productionLines: Array<{
    lineId: number;
    lineName: string;
    daysProduced: number;
    totalProduction: number;
  }>;
  records: BrickProductionRecord[];
}

export default function BrickAnalyticsPage() {
  const [selectedBrickType, setSelectedBrickType] = useState<number | null>(null);
  const [brickTypes, setBrickTypes] = useState<BrickType[]>([]);
  const [selectedProductionLine, setSelectedProductionLine] = useState<number | null>(null);
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [dateRange, setDateRange] = useState(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    };
  });
  
  const [summary, setSummary] = useState<BrickAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5555/api';

  const fetchBrickTypes = async () => {
    try {
      const res = await apiFetch(`${API_URL}/brick-types`);
      if (res.ok) {
        const data = await res.json();
        setBrickTypes(data);
        // Auto-select first brick type
        if (data.length > 0 && !selectedBrickType) {
          setSelectedBrickType(data[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching brick types:', error);
    }
  };

  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const endDate = today.toISOString().split('T')[0];
    
    let startDate = endDate;
    
    switch (preset) {
      case '7days':
        startDate = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '14days':
        startDate = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case '30days':
        startDate = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        break;
      case 'custom':
        return;
      case 'today':
      default:
        startDate = endDate;
        break;
    }
    
    setDateRange({ startDate, endDate });
  };

  useEffect(() => {
    fetchBrickTypes();
  }, []);

  useEffect(() => {
    if (selectedBrickType) {
      fetchBrickAnalytics();
    }
  }, [selectedBrickType, dateRange]);

  const fetchBrickAnalytics = async () => {
    if (!selectedBrickType) return;

    setLoading(true);
    setError(null);
    
    try {
      const queryParams = new URLSearchParams({
        brickTypeId: selectedBrickType.toString(),
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      console.log('🔍 Fetching brick analytics:', queryParams.toString());

      // Fetch all metrics for this brick type
      const res = await apiFetch(`${API_URL}/production-metrics?${queryParams}`);
      
      if (res.ok) {
        const metrics = await res.json();
        console.log('📊 Metrics received:', metrics);

        if (metrics.length === 0) {
          setSummary(null);
          setError('Không có dữ liệu sản xuất cho loại gạch này trong khoảng thời gian được chọn');
          return;
        }

        // Process data
        const brickType = brickTypes.find(bt => bt.id === selectedBrickType);
        
        // Group by production line
        const lineStats = new Map<number, {
          lineId: number;
          lineName: string;
          daysProduced: number;
          totalProduction: number;
        }>();

        const records: BrickProductionRecord[] = metrics.map((m: any) => {
          const lineId = m.productionLine?.id || m.productionLineId;
          const lineName = m.productionLine?.name || `Dây chuyền ${lineId}`;

          // Update line stats
          if (!lineStats.has(lineId)) {
            lineStats.set(lineId, {
              lineId,
              lineName,
              daysProduced: 0,
              totalProduction: 0,
            });
          }
          const stat = lineStats.get(lineId)!;
          stat.daysProduced += 1;
          stat.totalProduction += Number(m.sl_truoc_dong_hop || 0);

          return {
            recordDate: m.recordDate,
            productionLineId: lineId,
            productionLineName: lineName,
            sl_ep: Number(m.sl_ep || 0),
            sl_truoc_dong_hop: Number(m.sl_truoc_dong_hop || 0),
            tong_hao_phi: Number(m.tong_hao_phi || 0),
            ty_le_tong_hao_phi: Number(m.ty_le_tong_hao_phi || 0),
            hieu_suat_thanh_pham: Number(m.hieu_suat_thanh_pham || 0),
            hp_moc: Number(m.hp_moc || 0),
            hp_lo: Number(m.hp_lo || 0),
            hp_tm: Number(m.hp_tm || 0),
            hp_ht: Number(m.hp_ht || 0),
          };
        });

        // Calculate totals
        const totalProduction = records.reduce((sum, r) => sum + r.sl_truoc_dong_hop, 0);
        const totalWaste = records.reduce((sum, r) => sum + r.tong_hao_phi, 0);
        const averageEfficiency = records.reduce((sum, r) => sum + r.hieu_suat_thanh_pham, 0) / records.length;
        const averageWaste = records.reduce((sum, r) => sum + r.ty_le_tong_hao_phi, 0) / records.length;

        setSummary({
          brickType: brickType!,
          totalProduction,
          averageEfficiency,
          averageWaste,
          totalWaste,
          productionDays: records.length,
          productionLines: Array.from(lineStats.values()),
          records: records.sort((a, b) => b.recordDate.localeCompare(a.recordDate)),
        });
      } else {
        setError('Lỗi khi tải dữ liệu phân tích');
      }
    } catch (err) {
      console.error('Error fetching brick analytics:', err);
      setError('Lỗi kết nối đến server');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filteredRecords = summary?.records.filter(record => {
    if (!selectedProductionLine) return true;
    return record.productionLineId === selectedProductionLine;
  }) || [];

  const getWasteDistribution = () => {
    if (!summary) return [];
    const total = summary.records.reduce((sum, r) => sum + r.tong_hao_phi, 0);
    const hp_moc = summary.records.reduce((sum, r) => sum + r.hp_moc, 0);
    const hp_lo = summary.records.reduce((sum, r) => sum + r.hp_lo, 0);
    const hp_tm = summary.records.reduce((sum, r) => sum + r.hp_tm, 0);
    const hp_ht = summary.records.reduce((sum, r) => sum + r.hp_ht, 0);

    return [
      { name: 'Hao phí mộc', value: hp_moc, percentage: (hp_moc / total * 100).toFixed(1), color: '#ef4444' },
      { name: 'Hao phí lò', value: hp_lo, percentage: (hp_lo / total * 100).toFixed(1), color: '#f59e0b' },
      { name: 'Hao phí trước mài', value: hp_tm, percentage: (hp_tm / total * 100).toFixed(1), color: '#eab308' },
      { name: 'Hao phí hoàn thiện', value: hp_ht, percentage: (hp_ht / total * 100).toFixed(1), color: '#84cc16' },
    ];
  };

  const getTrendData = () => {
    if (!summary) return [];
    return summary.records
      .slice()
      .sort((a, b) => a.recordDate.localeCompare(b.recordDate))
      .map(r => ({
        date: formatDate(r.recordDate).slice(0, 5), // DD/MM
        efficiency: r.hieu_suat_thanh_pham,
        waste: r.ty_le_tong_hao_phi,
      }));
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>📊 Phân tích theo dòng gạch</h1>
        <p className={styles.subtitle}>Theo dõi sản xuất của từng loại gạch trên các dây chuyền</p>
      </div>

      {/* Filters */}
      <div className={styles.filterBar}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Loại gạch:</label>
          <select 
            value={selectedBrickType || ''} 
            onChange={(e) => setSelectedBrickType(e.target.value ? Number(e.target.value) : null)} 
            className={styles.filterSelect}
          >
            <option value="">Chọn loại gạch</option>
            {brickTypes.map((brick) => (
              <option key={brick.id} value={brick.id}>
                {brick.name}{brick.description ? ` - ${brick.description}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Thời gian:</label>
          <div className={styles.datePresets}>
            <button 
              className={datePreset === 'today' ? styles.presetActive : styles.preset}
              onClick={() => handleDatePresetChange('today')}
            >
              Hôm nay
            </button>
            <button 
              className={datePreset === '7days' ? styles.presetActive : styles.preset}
              onClick={() => handleDatePresetChange('7days')}
            >
              7 ngày
            </button>
            <button 
              className={datePreset === '14days' ? styles.presetActive : styles.preset}
              onClick={() => handleDatePresetChange('14days')}
            >
              14 ngày
            </button>
            <button 
              className={datePreset === '30days' ? styles.presetActive : styles.preset}
              onClick={() => handleDatePresetChange('30days')}
            >
              30 ngày
            </button>
          </div>
        </div>

        <div className={styles.dateRangePicker}>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => {
              setDateRange({ ...dateRange, startDate: e.target.value });
              setDatePreset('custom');
            }}
            className={styles.dateInput}
          />
          <span className={styles.dateSeparator}>đến</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => {
              setDateRange({ ...dateRange, endDate: e.target.value });
              setDatePreset('custom');
            }}
            className={styles.dateInput}
          />
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      )}

      {error && !loading && (
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>⚠️ {error}</p>
        </div>
      )}

      {!loading && !error && !selectedBrickType && (
        <div className={styles.emptyState}>
          <p>👆 Vui lòng chọn loại gạch để xem phân tích</p>
        </div>
      )}

      {!loading && !error && summary && (
        <>
          {/* Summary Cards */}
          <div className={styles.summaryGrid}>
            <MetricCard
              title="Tổng sản lượng"
              value={formatNumber(summary.totalProduction)}
              subtitle={`${summary.productionDays} ngày sản xuất`}
              unit="viên"
              status="good"
            />
            <MetricCard
              title="Hiệu suất trung bình"
              value={summary.averageEfficiency.toFixed(1)}
              subtitle="Thành phẩm"
              unit="%"
              status={summary.averageEfficiency >= 90 ? 'good' : summary.averageEfficiency >= 85 ? 'warning' : 'danger'}
            />
            <MetricCard
              title="Tỷ lệ hao phí TB"
              value={summary.averageWaste.toFixed(1)}
              subtitle={`Tổng: ${formatNumber(summary.totalWaste)} viên`}
              unit="%"
              status={summary.averageWaste <= 10 ? 'good' : summary.averageWaste <= 15 ? 'warning' : 'danger'}
            />
            <MetricCard
              title="Số dây chuyền"
              value={summary.productionLines.length.toString()}
              subtitle="Đã sản xuất loại gạch này"
              status="good"
            />
          </div>

          {/* Production Lines Distribution */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>🏭 Phân bổ theo dây chuyền</h2>
            <div className={styles.linesGrid}>
              {summary.productionLines.map((line) => {
                const percentage = (line.totalProduction / summary.totalProduction * 100).toFixed(1);
                return (
                  <div key={line.lineId} className={styles.lineCard}>
                    <div className={styles.lineHeader}>
                      <h3 className={styles.lineName}>{line.lineName}</h3>
                      <span className={styles.lineBadge}>{line.daysProduced} ngày</span>
                    </div>
                    <div className={styles.lineProgressBar}>
                      <div className={styles.lineProgress} style={{ width: `${percentage}%` }}></div>
                    </div>
                    <div className={styles.lineStats}>
                      <div className={styles.lineStat}>
                        <span className={styles.lineStatLabel}>Sản lượng:</span>
                        <span className={styles.lineStatValue}>{formatNumber(line.totalProduction)} viên</span>
                      </div>
                      <div className={styles.lineStat}>
                        <span className={styles.lineStatLabel}>Tỷ trọng:</span>
                        <span className={styles.lineStatValue}>{percentage}%</span>
                      </div>
                      <div className={styles.lineStat}>
                        <span className={styles.lineStatLabel}>TB/ngày:</span>
                        <span className={styles.lineStatValue}>
                          {formatNumber(Math.round(line.totalProduction / line.daysProduced))} viên
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts Row */}
          <div className={styles.chartsRow}>
            {/* Waste Distribution Pie Chart */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📊 Phân bố hao phí theo công đoạn</h3>
              <div className={styles.pieChartContainer}>
                {getWasteDistribution().map((item, index) => (
                  <div key={index} className={styles.pieItem}>
                    <div className={styles.pieColor} style={{ background: item.color }}></div>
                    <div className={styles.pieInfo}>
                      <span className={styles.pieName}>{item.name}</span>
                      <div className={styles.pieStats}>
                        <span className={styles.pieValue}>{formatNumber(item.value)} viên</span>
                        <span className={styles.piePercent}>{item.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trend Line Chart */}
            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>📈 Xu hướng hiệu suất & hao phí</h3>
              <div className={styles.lineChartContainer}>
                <div className={styles.chartLegend}>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#10b981' }}></span>
                    <span>Hiệu suất (%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span className={styles.legendDot} style={{ background: '#ef4444' }}></span>
                    <span>Hao phí (%)</span>
                  </div>
                </div>
                <div className={styles.miniChart}>
                  {getTrendData().slice(-10).map((point, index) => (
                    <div key={index} className={styles.chartPoint}>
                      <div className={styles.pointBar}>
                        <div 
                          className={styles.efficiencyBar} 
                          style={{ height: `${point.efficiency}%` }}
                          title={`Hiệu suất: ${point.efficiency.toFixed(1)}%`}
                        ></div>
                        <div 
                          className={styles.wasteBar} 
                          style={{ height: `${Math.min(point.waste * 5, 100)}%` }}
                          title={`Hao phí: ${point.waste.toFixed(1)}%`}
                        ></div>
                      </div>
                      <span className={styles.pointLabel}>{point.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Production Records Table */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>📋 Lịch sử sản xuất chi tiết</h2>
              <div className={styles.tableFilters}>
                <label className={styles.tableFilterLabel}>Lọc dây chuyền:</label>
                <select 
                  value={selectedProductionLine || ''} 
                  onChange={(e) => setSelectedProductionLine(e.target.value ? Number(e.target.value) : null)} 
                  className={styles.tableFilterSelect}
                >
                  <option value="">Tất cả dây chuyền</option>
                  {summary.productionLines.map((line) => (
                    <option key={line.lineId} value={line.lineId}>
                      {line.lineName}
                    </option>
                  ))}
                </select>
                <span className={styles.recordCount}>
                  {filteredRecords.length} / {summary.records.length} bản ghi
                </span>
              </div>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Ngày</th>
                    <th>Dây chuyền</th>
                    <th>Sau ép</th>
                    <th>Thành phẩm</th>
                    <th>Tổng hao phí</th>
                    <th>Tỷ lệ HP</th>
                    <th>Hiệu suất</th>
                    <th>HP Mộc</th>
                    <th>HP Lò</th>
                    <th>HP TM</th>
                    <th>HP HT</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={11} className={styles.emptyRow}>
                        Không có dữ liệu phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, idx) => (
                      <tr key={idx}>
                        <td>{formatDate(record.recordDate)}</td>
                        <td>
                          <span className={styles.lineTag}>{record.productionLineName}</span>
                        </td>
                        <td>{formatNumber(record.sl_ep)}</td>
                        <td className={styles.highlightCell}>{formatNumber(record.sl_truoc_dong_hop)}</td>
                        <td>{formatNumber(record.tong_hao_phi)}</td>
                        <td className={record.ty_le_tong_hao_phi > 15 ? styles.dangerCell : record.ty_le_tong_hao_phi > 10 ? styles.warningCell : ''}>
                          {record.ty_le_tong_hao_phi.toFixed(1)}%
                        </td>
                        <td className={record.hieu_suat_thanh_pham >= 90 ? styles.goodCell : record.hieu_suat_thanh_pham >= 85 ? styles.warningCell : styles.dangerCell}>
                          {record.hieu_suat_thanh_pham.toFixed(1)}%
                        </td>
                        <td>{formatNumber(record.hp_moc)}</td>
                        <td>{formatNumber(record.hp_lo)}</td>
                        <td>{formatNumber(record.hp_tm)}</td>
                        <td>{formatNumber(record.hp_ht)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
