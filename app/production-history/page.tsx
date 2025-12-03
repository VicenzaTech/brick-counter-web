'use client';

import { useState, useMemo } from 'react';
import styles from './production-history.module.css';

// Types
interface ProductionHistory {
  id: number;
  startTime: string;
  endTime: string;
  productionLineId: number;
  productionLineName: string;
  productId: number;
  productName: string;
  productCode: string;
  quantity: number;
  area: number;
  a1Quantity: number;
  a2Quantity: number;
  cutLot: number;
  defect1: number;
  defect2: number;
  defectDestroy: number;
  duration: string;
}

// Generate fake data for 2 production lines over 30 days
function generateFakeData(): ProductionHistory[] {
  const data: ProductionHistory[] = [];
  const products = [
    { id: 1, name: 'Gạch men cao cấp', code: 'GMC-001', width: 600, height: 600 },
    { id: 2, name: 'Gạch granite 60x60', code: 'GRA-002', width: 600, height: 600 },
    { id: 3, name: 'Gạch ốp tường', code: 'OT-003', width: 300, height: 600 },
    { id: 4, name: 'Gạch lát nền', code: 'LN-004', width: 800, height: 800 },
    { id: 5, name: 'Gạch mosaic', code: 'MOS-005', width: 300, height: 300 },
  ];
  
  const productionLines = [
    { id: 1, name: 'Dây chuyền 1' },
    { id: 2, name: 'Dây chuyền 2' },
  ];

  let idCounter = 1;
  const now = new Date();

  // Generate data for last 30 days
  for (let day = 29; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    
    // Each production line has 2-4 production runs per day
    productionLines.forEach(line => {
      const runsPerDay = 2 + Math.floor(Math.random() * 3); // 2-4 runs
      
      for (let run = 0; run < runsPerDay; run++) {
        const product = products[Math.floor(Math.random() * products.length)];
        const startHour = 6 + (run * 6) + Math.floor(Math.random() * 2);
        const durationHours = 2 + Math.floor(Math.random() * 4); // 2-5 hours
        
        const startTime = new Date(date);
        startTime.setHours(startHour, Math.floor(Math.random() * 60), 0);
        
        const endTime = new Date(startTime);
        endTime.setHours(startTime.getHours() + durationHours, Math.floor(Math.random() * 60), 0);
        
        const quantity = 800 + Math.floor(Math.random() * 1200); // 800-2000 pieces
        const area = parseFloat(((product.width * product.height / 1000000) * quantity).toFixed(2));
        
        // Calculate grade distribution
        const a1Ratio = 0.75 + Math.random() * 0.15; // 75-90%
        const a2Ratio = 0.05 + Math.random() * 0.10; // 5-15%
        const cutRatio = 0.02 + Math.random() * 0.03; // 2-5%
        const defect1Ratio = 0.01 + Math.random() * 0.02; // 1-3%
        const defect2Ratio = 0.005 + Math.random() * 0.015; // 0.5-2%
        const defectDestroyRatio = 0.005 + Math.random() * 0.01; // 0.5-1.5%
        
        const a1Quantity = Math.floor(quantity * a1Ratio);
        const a2Quantity = Math.floor(quantity * a2Ratio);
        const cutLot = Math.floor(quantity * cutRatio);
        const defect1 = Math.floor(quantity * defect1Ratio);
        const defect2 = Math.floor(quantity * defect2Ratio);
        const defectDestroy = Math.floor(quantity * defectDestroyRatio);
        
        const durationMs = endTime.getTime() - startTime.getTime();
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        const duration = `${hours}h ${minutes}m`;
        
        data.push({
          id: idCounter++,
          startTime: startTime.toISOString(),
          endTime: endTime.toISOString(),
          productionLineId: line.id,
          productionLineName: line.name,
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          quantity,
          area,
          a1Quantity,
          a2Quantity,
          cutLot,
          defect1,
          defect2,
          defectDestroy,
          duration,
        });
      }
    });
  }

  return data.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
}

export default function ProductionHistoryPage() {
  const [data] = useState<ProductionHistory[]>(generateFakeData());
  const [filterLine, setFilterLine] = useState<string>('all');
  const [filterProduct, setFilterProduct] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  // Get unique production lines and products
  const productionLines = useMemo(() => {
    const lines = Array.from(new Set(data.map(d => d.productionLineName)));
    return lines.sort();
  }, [data]);

  const products = useMemo(() => {
    const prods = Array.from(new Set(data.map(d => ({ name: d.productName, code: d.productCode }))
      .map(p => JSON.stringify(p))))
      .map(p => JSON.parse(p));
    return prods.sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  // Filtered data
  const filteredData = useMemo(() => {
    let filtered = data;

    // Filter by production line
    if (filterLine !== 'all') {
      filtered = filtered.filter(d => d.productionLineName === filterLine);
    }

    // Filter by product
    if (filterProduct !== 'all') {
      filtered = filtered.filter(d => d.productCode === filterProduct);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d => 
        d.productName.toLowerCase().includes(query) ||
        d.productCode.toLowerCase().includes(query) ||
        d.productionLineName.toLowerCase().includes(query)
      );
    }

    // Filter by date range
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          filtered = filtered.filter(d => new Date(d.startTime) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          filtered = filtered.filter(d => new Date(d.startTime) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          filtered = filtered.filter(d => new Date(d.startTime) >= filterDate);
          break;
      }
    }

    return filtered;
  }, [data, filterLine, filterProduct, searchQuery, dateFilter]);

  // Summary statistics
  const summary = useMemo(() => {
    return {
      totalRecords: filteredData.length,
      totalQuantity: filteredData.reduce((sum, d) => sum + d.quantity, 0),
      totalArea: filteredData.reduce((sum, d) => sum + d.area, 0),
      totalA1: filteredData.reduce((sum, d) => sum + d.a1Quantity, 0),
      totalA2: filteredData.reduce((sum, d) => sum + d.a2Quantity, 0),
      totalDefects: filteredData.reduce((sum, d) => sum + d.defect1 + d.defect2 + d.defectDestroy, 0),
    };
  }, [filteredData]);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatNumber = (num: number) => {
    return num.toLocaleString('vi-VN');
  };

  // Export to Excel function
  const exportToExcel = () => {
    // Create CSV content
    const headers = [
      'STT',
      'Thời gian bắt đầu',
      'Thời gian kết thúc',
      'Dây chuyền',
      'Dòng gạch',
      'Mã gạch',
      'Số lượng (viên)',
      'Diện tích (m²)',
      'A1 / A2',
      'Cắt lô',
      'Phế 1',
      'Phế 2',
      'Phế huỷ'
    ];

    const csvRows = [
      headers.join(','),
      ...filteredData.map((record, index) => [
        index + 1,
        `"${formatDateTime(record.startTime)}"`,
        `"${formatDateTime(record.endTime)}"`,
        `"${record.productionLineName}"`,
        `"${record.productName}"`,
        record.productCode,
        record.quantity,
        record.area.toFixed(2),
        `"${record.a1Quantity} / ${record.a2Quantity}"`,
        record.cutLot,
        record.defect1,
        record.defect2,
        record.defectDestroy
      ].join(','))
    ];

    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for UTF-8
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `lich-su-san-xuat-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Lịch sử sản xuất</h1>
        <p className={styles.subtitle}>
          Theo dõi và phân tích lịch sử sản xuất của các dây chuyền
        </p>
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.cardLabel}>Tổng lô sản xuất</p>
            <h3 className={styles.cardValue}>{summary.totalRecords}</h3>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.cardLabel}>Tổng sản lượng</p>
            <h3 className={styles.cardValue}>{formatNumber(summary.totalQuantity)}</h3>
            <p className={styles.cardSubtext}>{summary.totalArea.toFixed(2)} m²</p>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.cardLabel}>Hạng A1 / A2</p>
            <h3 className={styles.cardValue}>{formatNumber(summary.totalA1)}</h3>
            <p className={styles.cardSubtext}>{formatNumber(summary.totalA2)} viên A2</p>
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <p className={styles.cardLabel}>Tổng phế phẩm</p>
            <h3 className={`${styles.cardValue} ${styles.textDanger}`}>{formatNumber(summary.totalDefects)}</h3>
            <p className={styles.cardSubtext}>
              {((summary.totalDefects / summary.totalQuantity) * 100).toFixed(2)}%
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Bộ lọc</h3>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.filterGrid}>
            <div className={styles.filterItem}>
              <label className={styles.label}>Dây chuyền</label>
              <select 
                className={styles.select}
                value={filterLine} 
                onChange={(e) => setFilterLine(e.target.value)}
              >
                <option value="all">Tất cả dây chuyền</option>
                {productionLines.map(line => (
                  <option key={line} value={line}>{line}</option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label className={styles.label}>Dòng gạch</label>
              <select 
                className={styles.select}
                value={filterProduct} 
                onChange={(e) => setFilterProduct(e.target.value)}
              >
                <option value="all">Tất cả dòng gạch</option>
                {products.map(prod => (
                  <option key={prod.code} value={prod.code}>
                    {prod.name} ({prod.code})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.filterItem}>
              <label className={styles.label}>Khoảng thời gian</label>
              <select 
                className={styles.select}
                value={dateFilter} 
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="all">Tất cả</option>
                <option value="today">Hôm nay</option>
                <option value="week">7 ngày qua</option>
                <option value="month">30 ngày qua</option>
              </select>
            </div>

            <div className={styles.filterItem}>
              <label className={styles.label}>Tìm kiếm</label>
              <input
                type="text"
                className={styles.input}
                placeholder="Tìm theo tên, mã..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>Dữ liệu sản xuất ({filteredData.length} bản ghi)</h3>
          <button className={styles.exportButton} onClick={exportToExcel}>
            📊 Xuất Excel
          </button>
        </div>
        <div className={styles.cardContent}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Thời gian bắt đầu</th>
                  <th>Thời gian kết thúc</th>
                  <th>Dây chuyền</th>
                  <th>Dòng gạch</th>
                  <th className={styles.textRight}>Sản lượng</th>
                  <th className={styles.textRight}>A1 / A2</th>
                  <th className={styles.textRight}>Cắt lô</th>
                  <th className={styles.textRight}>Phế 1</th>
                  <th className={styles.textRight}>Phế 2</th>
                  <th className={styles.textRight}>Phế huỷ</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={11} className={styles.emptyState}>
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  filteredData.map((record, index) => (
                    <tr key={record.id}>
                      <td className={styles.fontMedium}>{index + 1}</td>
                      <td className={styles.nowrap}>{formatDateTime(record.startTime)}</td>
                      <td className={styles.nowrap}>{formatDateTime(record.endTime)}</td>
                      <td>
                        <span className={styles.badge}>{record.productionLineName}</span>
                      </td>
                      <td>
                        <div>
                          <div className={styles.fontMedium}>{record.productName}</div>
                          <div className={styles.textMuted}>{record.productCode}</div>
                        </div>
                      </td>
                      <td className={styles.textRight}>
                        <div className={styles.fontSemibold}>{formatNumber(record.quantity)} viên</div>
                        <div className={styles.textMuted}>{record.area.toFixed(2)} m²</div>
                      </td>
                      <td className={styles.textRight}>
                        <span className={styles.textSuccess}>{formatNumber(record.a1Quantity)}</span>
                        <span className={styles.textMuted}> / </span>
                        <span className={styles.textInfo}>{formatNumber(record.a2Quantity)}</span>
                      </td>
                      <td className={styles.textRight}>
                        <span className={styles.textWarning}>{formatNumber(record.cutLot)}</span>
                      </td>
                      <td className={styles.textRight}>
                        <span className={styles.textOrange}>{formatNumber(record.defect1)}</span>
                      </td>
                      <td className={styles.textRight}>
                        <span className={styles.textOrangeDark}>{formatNumber(record.defect2)}</span>
                      </td>
                      <td className={styles.textRight}>
                        <span className={styles.textDanger}>{formatNumber(record.defectDestroy)}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
