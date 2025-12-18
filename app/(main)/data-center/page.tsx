'use client';

import { useState, useMemo } from 'react';
import { Database, Factory, Calendar, TrendingUp, Download } from 'lucide-react';
import styles from './page.module.css';

interface ProductionData {
  date: string;
  factory: string;
  line: string;
  shift: 'morning' | 'afternoon' | 'night';
  deviceId: string;
  deviceName: string;
  count: number;
  target: number;
}

// Dummy data - sẽ được thay thế bằng data từ API
const DUMMY_DATA: ProductionData[] = [
  // Factory 1, Line 1
  { date: '2025-11-10', factory: '1', line: '1', shift: 'morning', deviceId: 'dc1_r1c1', deviceName: 'Sau máy ép 1', count: 1850, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'morning', deviceId: 'dc1_r1c2', deviceName: 'Sau máy ép 2', count: 1820, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'morning', deviceId: 'dc1_r1c3', deviceName: 'Trước lò nung 1', count: 1200, target: 1500 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'morning', deviceId: 'dc1_r1c4', deviceName: 'Trước lò nung 2', count: 1180, target: 1500 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'afternoon', deviceId: 'dc1_r1c1', deviceName: 'Sau máy ép 1', count: 1920, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'afternoon', deviceId: 'dc1_r1c2', deviceName: 'Sau máy ép 2', count: 1890, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'afternoon', deviceId: 'dc1_r1c3', deviceName: 'Trước lò nung 1', count: 1280, target: 1500 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'afternoon', deviceId: 'dc1_r1c4', deviceName: 'Trước lò nung 2', count: 1250, target: 1500 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'night', deviceId: 'dc1_r1c1', deviceName: 'Sau máy ép 1', count: 1770, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'night', deviceId: 'dc1_r1c2', deviceName: 'Sau máy ép 2', count: 1779, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'night', deviceId: 'dc1_r1c3', deviceName: 'Trước lò nung 1', count: 1089, target: 1500 },
  { date: '2025-11-10', factory: '1', line: '1', shift: 'night', deviceId: 'dc1_r1c4', deviceName: 'Trước lò nung 2', count: 1081, target: 1500 },
  
  // Factory 1, Line 2
  { date: '2025-11-10', factory: '1', line: '2', shift: 'morning', deviceId: 'dc2_r1c1', deviceName: 'Sau máy ép 3', count: 1650, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '2', shift: 'morning', deviceId: 'dc2_r1c2', deviceName: 'Sau máy ép 4', count: 1620, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '2', shift: 'afternoon', deviceId: 'dc2_r1c1', deviceName: 'Sau máy ép 3', count: 1720, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '2', shift: 'afternoon', deviceId: 'dc2_r1c2', deviceName: 'Sau máy ép 4', count: 1690, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '2', shift: 'night', deviceId: 'dc2_r1c1', deviceName: 'Sau máy ép 3', count: 1570, target: 2000 },
  { date: '2025-11-10', factory: '1', line: '2', shift: 'night', deviceId: 'dc2_r1c2', deviceName: 'Sau máy ép 4', count: 1579, target: 2000 },

  // Yesterday data
  { date: '2025-11-09', factory: '1', line: '1', shift: 'morning', deviceId: 'dc1_r1c1', deviceName: 'Sau máy ép 1', count: 1800, target: 2000 },
  { date: '2025-11-09', factory: '1', line: '1', shift: 'morning', deviceId: 'dc1_r1c2', deviceName: 'Sau máy ép 2', count: 1780, target: 2000 },
  { date: '2025-11-09', factory: '1', line: '1', shift: 'afternoon', deviceId: 'dc1_r1c1', deviceName: 'Sau máy ép 1', count: 1870, target: 2000 },
  { date: '2025-11-09', factory: '1', line: '1', shift: 'afternoon', deviceId: 'dc1_r1c2', deviceName: 'Sau máy ép 2', count: 1850, target: 2000 },
  { date: '2025-11-09', factory: '1', line: '1', shift: 'night', deviceId: 'dc1_r1c1', deviceName: 'Sau máy ép 1', count: 1720, target: 2000 },
  { date: '2025-11-09', factory: '1', line: '1', shift: 'night', deviceId: 'dc1_r1c2', deviceName: 'Sau máy ép 2', count: 1729, target: 2000 },
];

const SHIFT_NAMES = {
  morning: 'Ca sáng',
  afternoon: 'Ca chiều',
  night: 'Ca tối',
};

export default function DataCenterPage() {
  const [selectedDate, setSelectedDate] = useState<string>('2025-11-10');
  const [selectedFactory, setSelectedFactory] = useState<string>('all');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');

  // Get unique values for filters
  const factories = useMemo(() => {
    const unique = new Set(DUMMY_DATA.map(d => d.factory));
    return Array.from(unique).sort();
  }, []);

  const lines = useMemo(() => {
    const filtered = selectedFactory === 'all' 
      ? DUMMY_DATA 
      : DUMMY_DATA.filter(d => d.factory === selectedFactory);
    const unique = new Set(filtered.map(d => d.line));
    return Array.from(unique).sort();
  }, [selectedFactory]);

  // Filter data based on selections
  const filteredData = useMemo(() => {
    return DUMMY_DATA.filter(d => {
      if (d.date !== selectedDate) return false;
      if (selectedFactory !== 'all' && d.factory !== selectedFactory) return false;
      if (selectedLine !== 'all' && d.line !== selectedLine) return false;
      if (selectedShift !== 'all' && d.shift !== selectedShift) return false;
      return true;
    });
  }, [selectedDate, selectedFactory, selectedLine, selectedShift]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const totalCount = filteredData.reduce((sum, d) => sum + d.count, 0);
    const totalTarget = filteredData.reduce((sum, d) => sum + d.target, 0);
    const achievementRate = totalTarget > 0 ? (totalCount / totalTarget) * 100 : 0;
    const deviceCount = new Set(filteredData.map(d => d.deviceId)).size;

    return {
      totalCount,
      totalTarget,
      achievementRate,
      deviceCount,
    };
  }, [filteredData]);

  // Group data by shift
  const dataByShift = useMemo(() => {
    const grouped: Record<string, ProductionData[]> = {
      morning: [],
      afternoon: [],
      night: [],
    };

    filteredData.forEach(d => {
      grouped[d.shift].push(d);
    });

    return grouped;
  }, [filteredData]);

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Exporting data...', filteredData);
    alert('Chức năng xuất dữ liệu sẽ được phát triển sau');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Database size={32} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Trung tâm dữ liệu</h1>
            <p className={styles.subtitle}>Thống kê sản lượng theo ngày</p>
          </div>
        </div>
        <button className={styles.exportButton} onClick={handleExport}>
          <Download size={20} />
          Xuất dữ liệu
        </button>
      </div>

      {/* Filters */}
      <div className={styles.filtersSection}>
        <div className={styles.filtersGrid}>
          {/* Date Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="date-filter" className={styles.filterLabel}>
              <Calendar size={16} />
              Ngày
            </label>
            <input
              id="date-filter"
              type="date"
              className={styles.filterInput}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Factory Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="factory-filter" className={styles.filterLabel}>
              <Factory size={16} />
              Phân xưởng
            </label>
            <select
              id="factory-filter"
              className={styles.filterSelect}
              value={selectedFactory}
              onChange={(e) => {
                setSelectedFactory(e.target.value);
                setSelectedLine('all'); // Reset line when factory changes
              }}
            >
              <option value="all">Tất cả phân xưởng</option>
              {factories.map(f => (
                <option key={f} value={f}>Phân xưởng {f}</option>
              ))}
            </select>
          </div>

          {/* Line Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="line-filter" className={styles.filterLabel}>
              <TrendingUp size={16} />
              Dây chuyền
            </label>
            <select
              id="line-filter"
              className={styles.filterSelect}
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
            >
              <option value="all">Tất cả dây chuyền</option>
              {lines.map(l => (
                <option key={l} value={l}>Dây chuyền {l}</option>
              ))}
            </select>
          </div>

          {/* Shift Filter */}
          <div className={styles.filterGroup}>
            <label htmlFor="shift-filter" className={styles.filterLabel}>
              Ca làm việc
            </label>
            <select
              id="shift-filter"
              className={styles.filterSelect}
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
            >
              <option value="all">Tất cả ca</option>
              <option value="morning">Ca sáng</option>
              <option value="afternoon">Ca chiều</option>
              <option value="night">Ca tối</option>
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Summary */}
      <div className={styles.statsSection}>
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Tổng sản lượng</div>
            <div className={styles.statValue}>{statistics.totalCount.toLocaleString('vi-VN')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Mục tiêu</div>
            <div className={styles.statValue}>{statistics.totalTarget.toLocaleString('vi-VN')}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Tỷ lệ đạt</div>
            <div className={`${styles.statValue} ${statistics.achievementRate >= 100 ? styles.success : styles.warning}`}>
              {statistics.achievementRate.toFixed(1)}%
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Số thiết bị</div>
            <div className={styles.statValue}>{statistics.deviceCount}</div>
          </div>
        </div>
      </div>

      {/* Data by Shift */}
      <div className={styles.dataSection}>
        {(['morning', 'afternoon', 'night'] as const).map(shift => {
          const shiftData = dataByShift[shift];
          if (shiftData.length === 0) return null;

          const shiftTotal = shiftData.reduce((sum, d) => sum + d.count, 0);
          const shiftTarget = shiftData.reduce((sum, d) => sum + d.target, 0);
          const shiftRate = shiftTarget > 0 ? (shiftTotal / shiftTarget) * 100 : 0;

          return (
            <div key={shift} className={styles.shiftSection}>
              <div className={styles.shiftHeader}>
                <h2 className={styles.shiftTitle}>{SHIFT_NAMES[shift]}</h2>
                <div className={styles.shiftStats}>
                  <span className={styles.shiftStat}>
                    Sản lượng: <strong>{shiftTotal.toLocaleString('vi-VN')}</strong>
                  </span>
                  <span className={styles.shiftStat}>
                    Mục tiêu: <strong>{shiftTarget.toLocaleString('vi-VN')}</strong>
                  </span>
                  <span className={`${styles.shiftStat} ${shiftRate >= 100 ? styles.success : styles.warning}`}>
                    Đạt: <strong>{shiftRate.toFixed(1)}%</strong>
                  </span>
                </div>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Phân xưởng</th>
                      <th>Dây chuyền</th>
                      <th>Thiết bị</th>
                      <th className={styles.textRight}>Sản lượng</th>
                      <th className={styles.textRight}>Mục tiêu</th>
                      <th className={styles.textRight}>Tỷ lệ đạt</th>
                      <th className={styles.textCenter}>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shiftData.map((item, index) => {
                      const rate = item.target > 0 ? (item.count / item.target) * 100 : 0;
                      return (
                        <tr key={index}>
                          <td>Phân xưởng {item.factory}</td>
                          <td>Dây chuyền {item.line}</td>
                          <td>{item.deviceName}</td>
                          <td className={styles.textRight}>{item.count.toLocaleString('vi-VN')}</td>
                          <td className={styles.textRight}>{item.target.toLocaleString('vi-VN')}</td>
                          <td className={styles.textRight}>
                            <span className={rate >= 100 ? styles.rateSuccess : rate >= 80 ? styles.rateWarning : styles.rateDanger}>
                              {rate.toFixed(1)}%
                            </span>
                          </td>
                          <td className={styles.textCenter}>
                            {rate >= 100 ? (
                              <span className={styles.badgeSuccess}>Đạt</span>
                            ) : rate >= 80 ? (
                              <span className={styles.badgeWarning}>Gần đạt</span>
                            ) : (
                              <span className={styles.badgeDanger}>Chưa đạt</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {filteredData.length === 0 && (
          <div className={styles.emptyState}>
            <Database size={48} />
            <p>Không có dữ liệu cho bộ lọc đã chọn</p>
          </div>
        )}
      </div>
    </div>
  );
}
