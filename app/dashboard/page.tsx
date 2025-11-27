'use client';

import React, { useState, useMemo } from 'react';
import { Card, Col, DatePicker, Row, Select, Space, Button, Typography, Table, Tag } from 'antd';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  BarElement,
} from 'chart.js';
import dayjs, { Dayjs } from 'dayjs';
import { ReloadOutlined, FilterOutlined, RiseOutlined, FallOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// Đăng ký các thành phần của Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ChartTitle,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

// // =================== ĐỊNH NGHĨA KIỂU DỮ LIỆU MỚI ===================
interface DetailedProductionRecord {
  key: string;
  date: string; // YYYY-MM-DD
  factory: '1' | '2';
  lineName: string;
  stage: string; // Tên công đoạn: 'Nung', 'Mài', etc.
  productType: string;
  quantity: number; // Sản lượng tại công đoạn đó (m²)
  shift: string; // Ca sản xuất
}

interface ProductionRecord {
  key: string;
  date: string; // YYYY-MM-DD
  lineName: string;
  productType: string;
  originalOutput: number; // m²
  a1: number; // m²
  a2: number; // m²
  cut: number; // m²
  waste1: number; // m²
  waste2: number; // m²
  scrap: number; // m²
  waste_moc: number; // %
  waste_lo: number; // %
  waste_truoc_mai: number; // %
  waste_thanh_pham: number; // %
}

const FACTORIES = ['1', '2'];
const LINES = ['Dây chuyền A', 'Dây chuyền B', 'Dây chuyền C', 'Dây chuyền D'];
const PRODUCT_TYPES = ['Gạch Porcelain 300x600', 'Gạch Porcelain 400x800', 'Gạch Ceramic 300x600', 'Gạch Granite 600x600'];
const STAGES = ['Nung', 'Mài Nóng', 'Mài Lạnh', 'Ép', 'Trước đóng hộp'];
const SHIFTS = ['Ca 1', 'Ca 2', 'Ca 3'];

// =================== HÀM TẠO DỮ LIỆU GIẢ CHI TIẾT ===================
const generateDetailedMockData = (): DetailedProductionRecord[] => {
  const today = dayjs();
  const records: DetailedProductionRecord[] = [];

  for (let i = 0; i < 90; i++) {
    const date = today.subtract(i, 'day').format('YYYY-MM-DD');
    const numLinesToRun = Math.floor(Math.random() * 3) + 1;

    for (let j = 0; j < numLinesToRun; j++) {
      const lineName = LINES[j];
      const factoryId = FACTORIES[Math.floor(Math.random() * FACTORIES.length)];

      // Mỗi dây chuyền trong ngày có thể chạy qua nhiều công đoạn
      const numStagesToRun = Math.floor(Math.random() * STAGES.length) + 1;
      for (let k = 0; k < numStagesToRun; k++) {
        const stage = STAGES[k];
        const productType = PRODUCT_TYPES[Math.floor(Math.random() * PRODUCT_TYPES.length)];
        const quantity = Math.floor(Math.random() * 2000) + 500; // 500-2500 m²
        const shift = SHIFTS[Math.floor(Math.random() * SHIFTS.length)];

        records.push({
          key: `${date}-${lineName}-${stage}-${k}`,
          date,
          factory: factoryId as '1' | '2',
          lineName,
          stage,
          productType,
          quantity,
          shift,
        });
      }
    }
  }
  return records;
};


// Đăng ký các thành phần của Chart.js
// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   BarElement,
//   ChartTitle,
//   Tooltip,
//   Legend,
//   Filler,
//   ArcElement
// );

// =================== ĐỊNH NGHĨA KIỂU DỮ LIỆU ===================
interface ProductionRecord {
  key: string;
  date: string; // YYYY-MM-DD
  lineName: string;
  productType: string;
  // Sản lượng gốc (100%)
  originalOutput: number; // m²
  // Sản lượng thành phẩm (chốt cuối cùng)
  a1: number; // m²
  a2: number; // m²
  cut: number; // m²
  waste1: number; // m²
  waste2: number; // m²
  scrap: number; // m²
  // Hao phí theo công đoạn
  waste_moc: number; // %
  waste_lo: number; // %
  waste_truoc_mai: number; // %
  waste_thanh_pham: number; // %
}

// =================== HÀM TẠO DỮ LIỆU GIẢ ===================
const generateMockData = (): ProductionRecord[] => {
  const today = dayjs();
  const records: ProductionRecord[] = [];

  for (let i = 0; i < 90; i++) {
    const date = today.subtract(i, 'day').format('YYYY-MM-DD');
    const numLinesToRun = Math.floor(Math.random() * 4) + 1;

    for (let j = 0; j < numLinesToRun; j++) {
      const lineName = LINES[j];
      const productType = PRODUCT_TYPES[Math.floor(Math.random() * PRODUCT_TYPES.length)];
      const originalOutput = Math.floor(Math.random() * 5000) + 3000; // Sản lượng gốc 3000-8000 m²

      // Tỷ lệ chất lượng cuối cùng
      const a1Rate = 0.80 + Math.random() * 0.1; // 80% - 90%
      const a2Rate = 0.05 + Math.random() * 0.05; // 5% - 10%
      const cutRate = 0.02 + Math.random() * 0.04; // 2% - 6%
      const waste1Rate = 0.01 + Math.random() * 0.02; // 1% - 3%
      const waste2Rate = 0.005 + Math.random() * 0.01; // 0.5% - 1.5%
      const scrapRate = 0.001 + Math.random() * 0.009; // 0.1% - 1%

      const record: ProductionRecord = {
        key: `${date}-${lineName}`,
        date,
        lineName,
        productType,
        originalOutput,
        a1: Math.floor(originalOutput * a1Rate),
        a2: Math.floor(originalOutput * a2Rate),
        cut: Math.floor(originalOutput * cutRate),
        waste1: Math.floor(originalOutput * waste1Rate),
        waste2: Math.floor(originalOutput * waste2Rate),
        scrap: Math.floor(originalOutput * scrapRate),
        // Hao phí theo công đoạn (tỷ lệ % trên sản lượng gốc)
        waste_moc: 1 + Math.random() * 2, // 1% - 3%
        waste_lo: 0.5 + Math.random() * 1.5, // 0.5% - 2%
        waste_truoc_mai: 0.8 + Math.random() * 1.2, // 0.8% - 2%
        waste_thanh_pham: 0.5 + Math.random() * 1.5, // 0.5% - 2%
      };
      records.push(record);
    }
  }
  return records;
};
const mockData = generateMockData();
const detailedData = generateDetailedMockData();

// =================== COMPONENT CHÍNH ===================
export default function Dashboard() {
  const [activeFactory, setActiveFactory] = useState<'1' | '2'>('1');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedLine, setSelectedLine] = useState<string>('all');

  // Lọc dữ liệu
  const data = useMemo(() => {
    let filtered = [...mockData];

    if (selectedLine !== 'all') {
      filtered = filtered.filter(r => r.lineName === selectedLine);
    }

    if (dateRange && dateRange[0] && dateRange[1]) {
      const [start, end] = dateRange;
      filtered = filtered.filter(r => {
        const d = dayjs(r.date);
        return d.isAfter(start.subtract(1, 'day')) && d.isBefore(end.add(1, 'day'));
      });
    }

    return filtered;
  }, [activeFactory, dateRange, selectedLine]);

  // Tính toán các chỉ số KPI
  const kpiData = useMemo(() => {
    const totalOriginalOutput = data.reduce((sum, r) => sum + r.originalOutput, 0);
    const totalFinalOutput = data.reduce((sum, r) => sum + r.a1 + r.a2 + r.cut + r.waste1 + r.waste2 + r.scrap, 0);
    const totalWaste = data.reduce((sum, r) => sum + r.cut + r.waste1 + r.waste2 + r.scrap, 0);
    const lines = new Set(data.map(r => r.lineName)).size;

    // Hiệu suất toàn bộ quá trình = (Tổng sản phẩm cuối cùng / Tổng sản lượng gốc) * 100
    const overallEfficiency = totalOriginalOutput > 0 ? (totalFinalOutput / totalOriginalOutput) * 100 : 0;
    // Tỷ lệ hao phí = (Tổng phế phẩm / Tổng sản lượng gốc) * 100
    const overallWasteRate = totalOriginalOutput > 0 ? (totalWaste / totalOriginalOutput) * 100 : 0;

    return { totalOriginalOutput, overallEfficiency, overallWasteRate, lines };
  }, [data]);

  // --- Dữ liệu cho các biểu đồ ---

  // 1. Biểu đồ so sánh thực tế vs kế hoạch
  const planVsActualData = useMemo(() => {
    const grouped = data.reduce((acc, r) => {
      const month = dayjs(r.date).format('MM/YYYY');
      if (!acc[month]) acc[month] = { actual: 0 };
      acc[month].actual += r.a1 + r.a2 + r.cut; // Chỉ tính A1, A2, Cắt lô là sản phẩm chính
      return acc;
    }, {} as Record<string, { actual: number }>);

    const sortedMonths = Object.keys(grouped).sort((a, b) => dayjs(a, 'MM/YYYY').unix() - dayjs(b, 'MM/YYYY').unix());

    // Giả lập kế hoạch = actual * 95%
    return {
      labels: sortedMonths,
      datasets: [
        {
          label: 'Kế hoạch (m²)',
          data: sortedMonths.map(month => grouped[month].actual * 0.95),
          backgroundColor: 'rgba(96, 165, 250, 0.5)',
          borderColor: 'rgba(96, 165, 250, 1)',
          borderWidth: 1,
          type: 'bar' as const,
          order: 2,
        },
        {
          label: 'Thực tế (m²)',
          data: sortedMonths.map(month => grouped[month].actual),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.3,
          type: 'line' as const,
          fill: true,
          order: 1,
        },
      ],
    };
  }, [data]);

  // 2. Biểu đồ tròn phân bổ chất lượng
  const qualityPieData = useMemo(() => {
    const grouped = data.reduce((acc, r) => {
      acc.A1 = (acc.A1 || 0) + r.a1;
      acc.A2 = (acc.A2 || 0) + r.a2;
      acc.CắtLô = (acc.CắtLô || 0) + r.cut;
      acc.Phế1 = (acc.Phế1 || 0) + r.waste1;
      acc.Phế2 = (acc.Phế2 || 0) + r.waste2;
      acc.PhếHủy = (acc.PhếHủy || 0) + r.scrap;
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: 'Sản lượng (m²)',
          data: Object.values(grouped),
          backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#dc2626', '#6b7280'],
          borderWidth: 0,
        },
      ],
    };
  }, [data]);

  // 3. Biểu đồ đường tỷ lệ hao phí theo công đoạn
  const wasteByStageData = useMemo(() => {
    const stages = ['Hao phí mộc', 'Hao phí lò', 'Hao phí trước mài', 'Hao phí thành phẩm'];
    const grouped = data.reduce((acc, r) => {
      const date = dayjs(r.date).format('DD/MM');
      if (!acc[date]) acc[date] = { date, 'Hao phí mộc': 0, 'Hao phí lò': 0, 'Hao phí trước mài': 0, 'Hao phí thành phẩm': 0 };
      acc[date]['Hao phí mộc'] += r.waste_moc;
      acc[date]['Hao phí lò'] += r.waste_lo;
      acc[date]['Hao phí trước mài'] += r.waste_truoc_mai;
      acc[date]['Hao phí thành phẩm'] += r.waste_thanh_pham;
      return acc;
    }, {} as any);

    const sortedDates = Object.keys(grouped).sort((a, b) => dayjs(a, 'DD/MM').unix() - dayjs(b, 'DD/MM').unix());

    return {
      labels: sortedDates,
      datasets: stages.map(stage => ({
        label: stage,
        data: sortedDates.map(date => grouped[date][stage]),
        borderColor: stage === 'Hao phí mộc' ? '#f59e0b' : stage === 'Hao phí lò' ? '#ef4444' : stage === 'Hao phí trước mài' ? '#f97316' : '#dc2626',
        backgroundColor: 'transparent',
        tension: 0.3,
      })),
    };
  }, [data]);

  // 4. Biểu đồ cột sản lượng theo dây chuyền
  const outputByLineData = useMemo(() => {
    const grouped = data.reduce((acc, r) => {
      if (!acc[r.lineName]) acc[r.lineName] = 0;
      acc[r.lineName] += r.a1 + r.a2 + r.cut;
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(grouped),
      datasets: [
        {
          label: 'Sản lượng (m²)',
          data: Object.values(grouped),
          backgroundColor: '#3b82f6',
          borderColor: '#3b82f6',
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  // --- Cấu hình cho Chart.js ---
  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: { color: '#e2e8f0', font: { size: 12 } },
      },
      tooltip: {
        titleFont: { size: 14 },
        bodyFont: { size: 12 },
        callbacks: {
          label: (context: any) => `${context.dataset.label}: ${context.parsed.y?.toLocaleString('vi-VN')}`,
        }
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { size: 11 } },
        grid: { color: '#334155', drawBorder: false },
      },
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#334155', drawBorder: false },
        title: { display: true, color: '#e2e8f0' }
      }
    }
  };

  const planVsActualOptions = {
    ...commonChartOptions,
    scales: {
      x: commonChartOptions.scales.x,
      y: { ...commonChartOptions.scales.y, title: { ...commonChartOptions.scales.y.title, text: 'Sản lượng (m²)' } }
    }
  };

  const wasteByStageOptions = {
    ...commonChartOptions,
    scales: {
      x: commonChartOptions.scales.x,
      y: { ...commonChartOptions.scales.y, title: { ...commonChartOptions.scales.y.title, text: 'Tỷ lệ hao phí (%)' }, ticks: { ...commonChartOptions.scales.y.ticks, callback: (value) => value + '%' } }
    }
  };

  const outputByLineOptions = {
    ...commonChartOptions,
    plugins: { ...commonChartOptions.plugins, legend: { display: false } },
    scales: {
      x: commonChartOptions.scales.x,
      y: { ...commonChartOptions.scales.y, title: { ...commonChartOptions.scales.y.title, text: 'Tổng sản lượng (m²)' } }
    }
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: '#e2e8f0', padding: 20 },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value.toLocaleString('vi-VN')} m² (${percentage}%)`;
          },
        },
      },
    },
  };
  const detailedTableColumns = [
    {
      title: 'Ngày',
      dataIndex: 'date',
      key: 'date',
      render: (text: string) => dayjs(text).format('DD/MM/YYYY'),
      sorter: (a, b) => dayjs(a.date).unix() - dayjs(b.date).unix(),
    },
    {
      title: 'Nhà máy',
      dataIndex: 'factory',
      key: 'factory',
      render: (text: '1' | '2') => `Nhà máy ${text}`,
      filters: [
        { text: 'Nhà máy 1', value: '1' },
        { text: 'Nhà máy 2', value: '2' },
      ],
      onFilter: (value: any, record: DetailedProductionRecord) => record.factory === value,
    },
    {
      title: 'Dây chuyền',
      dataIndex: 'lineName',
      key: 'lineName',
      filters: LINES.map(line => ({ text: line, value: line })),
      onFilter: (value: any, record: DetailedProductionRecord) => record.lineName === value,
    },
    {
      title: 'Công đoạn',
      dataIndex: 'stage',
      key: 'stage',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
      filters: STAGES.map(stage => ({ text: stage, value: stage })),
      onFilter: (value: any, record: DetailedProductionRecord) => record.stage === value,
    },
    {
      title: 'Dòng gạch',
      dataIndex: 'productType',
      key: 'productType',
      filters: PRODUCT_TYPES.map(type => ({ text: type, value: type })),
      onFilter: (value: any, record: DetailedProductionRecord) => record.productType === value,
    },
    {
      title: 'Sản lượng (m²)',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (value: number) => value.toLocaleString('vi-VN'),
      sorter: (a, b) => a.quantity - b.quantity,
    },
    {
      title: 'Ca',
      dataIndex: 'shift',
      key: 'shift',
      render: (text: string) => <Tag color="green">{text}</Tag>,
      filters: SHIFTS.map(shift => ({ text: shift, value: shift })),
      onFilter: (value: any, record: DetailedProductionRecord) => record.shift === value,
    },
  ];


  // --- Render giao diện ---
  return (
    <div className="app-wrapper">

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="dashboard-header">
          <div>
            <p className="breadcrumb">Trang chủ / Nhà máy {activeFactory === '1' ? '1' : '2'}</p>
            <h1>Dashboard Quản Lý Sản Xuất</h1>
          </div>
          <div className="header-actions">
            <select value={activeFactory} onChange={(e) => setActiveFactory(e.target.value as '1' | '2')} className="form-select">
              <option value="1">Nhà máy 1</option>
              <option value="2">Nhà máy 2</option>
            </select>
            <button className="btn btn-secondary">
              <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M11.534 7h3.932a.25.25 0 0 1 .192.41l-1.966 2.36a.25.25 0 0 1-.384 0l-1.966-2.36a.25.25 0 0 1 .192-.41zm-11 2h3.932a.25.25 0 0 0 .192-.41L2.692 6.23a.25.25 0 0 0-.384 0L.342 8.59A.25.25 0 0 0 .534 9z" />
                <path fillRule="evenodd" d="M8 3c-1.552 0-2.94.707-3.857 1.818a.5.5 0 1 1-.771-.636A6.002 6.002 0 0 1 13.917 7H12.9A5.002 5.002 0 0 0 8 3zM3.1 9a5.002 5.002 0 0 0 8.9 5h1.016A6.002 6.002 0 0 1 3.416 9.818a.5.5 0 1 1 .771-.636A5.002 5.002 0 0 0 3.1 9z" />
              </svg>
              Cập nhật
            </button>
          </div>
        </header>

        {/* Filters */}
        <div className="filters-section">
          <select value={selectedLine} onChange={(e) => setSelectedLine(e.target.value)} className="form-select">
            <option value="all">Tất cả dây chuyền</option>
            {LINES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <input type="date" onChange={(e) => {
            const date = dayjs(e.target.value);
            setDateRange(prev => prev ? [date, prev[1]] : [date, date]);
          }} className="form-input" />
          <input type="date" onChange={(e) => {
            const date = dayjs(e.target.value);
            setDateRange(prev => prev ? [prev[0], date] : [date, date]);
          }} className="form-input" />
          <button className="btn btn-primary" onClick={() => { setSelectedLine('all'); setDateRange(null); }}>
            Xóa lọc
          </button>
        </div>

        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-header">
              <svg width="24" height="24" fill="#60a5fa" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z" /></svg>
              <span>Tổng sản lượng (m²)</span>
            </div>
            <p className="kpi-value">{kpiData.totalOriginalOutput.toLocaleString('vi-VN')}</p>
          </div>
          <div className="kpi-card">
            <div className="kpi-header">
              <svg width="24" height="24" fill="#34d399" viewBox="0 0 16 16"><path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2z" /></svg>
              <span>Hiệu suất TB toàn bộ</span>
            </div>
            <p className="kpi-value">{kpiData.overallEfficiency.toFixed(2)}%</p>
          </div>
          <div className="kpi-card">
            <div className="kpi-header">
              <svg width="24" height="24" fill="#f87171" viewBox="0 0 16 16"><path d="M7.938 2.016A.13.13 0 0 1 8.002 2a.13.13 0 0 1 .063.016.146.146 0 0 1 .054.057l6.857 11.667c.036.06.035.124.002.183a.163.163 0 0 1-.054.06.116.116 0 0 1-.066.017H1.146a.115.115 0 0 1-.066-.017.163.163 0 0 1-.054-.06.176.176 0 0 1 .002-.183L7.884 2.073a.147.147 0 0 1 .054-.057zm1.044-.45a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566z" /><path d="M7.002 12a1 1 0 1 1 2 0 1 1 0 0 1-2 0zM7.1 5.995a.905.905 0 1 1 1.8 0l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995z" /></svg>
              <span>Tỷ lệ hao phí TB</span>
            </div>
            <p className="kpi-value">{kpiData.overallWasteRate.toFixed(2)}%</p>
          </div>
          <div className="kpi-card">
            <div className="kpi-header">
              <svg width="24" height="24" fill="#fbbf24" viewBox="0 0 16 16"><path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-3zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2z" /></svg>
              <span>Dây chuyền hoạt động</span>
            </div>
            <p className="kpi-value">{kpiData.lines}</p>
          </div>
        </div>

        {/* Biểu đồ */}
        <div className="charts-section">
          <div className="card full-width">
            <h2 className="card-title">So Sánh Thực Tế vs. Kế Hoạch</h2>
            <div className="chart-container" style={{ height: '420px' }}>
              <Bar data={planVsActualData} options={planVsActualOptions} />
            </div>
          </div>
          <div className="card half-width">
            <h2 className="card-title">Phân Bổ Chất Lượng Cuối Cùng</h2>
            <div className="chart-container" style={{ height: '360px' }}>
              <Doughnut data={qualityPieData} options={pieOptions} />
            </div>
          </div>
          <div className="card half-width">
            <h2 className="card-title">Sản Lượng Theo Dây Chuyền</h2>
            <div className="chart-container" style={{ height: '360px' }}>
              <Bar data={outputByLineData} options={outputByLineOptions} />
            </div>
          </div>
        </div>

        <div className="card full-width">
          <h2 className="card-title">Xu Hướng Tỷ Lệ Hao Phí Theo Công Đoạn</h2>
          <div className="chart-container" style={{ height: '350px' }}>
            <Line data={wasteByStageData} options={wasteByStageOptions} />
          </div>
        </div>

        {/* Bảng chi tiết sản xuất */}
        <Card title="Chi Tiết Sản Lượng Theo Công Đoạn" styles={{ body: { padding: 0 } }} style={{ background: '#ffffff', border: '1px solid #ffffff', borderRadius: 12 }}>
          <Table
            columns={detailedTableColumns}
            dataSource={detailedData}
            pagination={{ pageSize: 10 }}
            scroll={{ x: 1200 }}
            rowKey="key"
            style={{ background: 'transparent' }}
          />
        </Card>

      </main>

      {/* CSS Styles */}
      <style jsx>{`
        /* === CSS Variables === */
        :root {
          --bg-primary: #0f172a;
          --bg-secondary: #1e293b;
          --bg-tertiary: #334155;
          --text-primary: #f1f5f9;
          --text-secondary: #e2e8f0;
          --text-muted: #94a3b8;
          --border-color: #334155;
          --color-blue: #60a5fa;
          --color-green: #34d399;
          --color-yellow: #fbbf24;
          --color-red: #f87171;
        }

        /* === Global Styles === */
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'system-ui', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: var(--bg-primary); color: var(--text-secondary); }

        /* === Layout === */
        .app-wrapper { display: flex; min-height: 100vh; }
        .sidebar { width: 250px; background-color: #0f1629; border-right: 1px solid var(--border-color); display: flex; flex-direction: column; padding: 24px 0; }
        .main-content { flex: 1; padding: 0 32px; overflow-x: auto; }
        .dashboard-header { padding: 20px 0; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); }
        .breadcrumb { color: var(--text-muted); font-size: 14px; }
        .dashboard-header h1 { color: var(--text-primary); font-size: 28px; margin-top: 4px; }
        .header-actions { display: flex; gap: 12px; }
        .filters-section { padding: 24px 0; display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
        .kpi-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; padding: 0 0 24px 0; }
        .charts-section { display: flex; flex-wrap: wrap; gap: 24px; padding-bottom: 32px; }
        .full-width { width: 100%; }
        .half-width { width: calc(50% - 12px); }
        @media (max-width: 1024px) { .half-width { width: 100%; } }

        /* === Components === */
        .card { background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; }
        .card-title { color: var(--text-primary); font-size: 18px; margin-bottom: 20px; }
        .kpi-card { background-color: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 12px; padding: 24px; }
        .kpi-header { display: flex; align-items: center; gap: 8px; color: var(--text-muted); font-size: 14px; margin-bottom: 12px; }
        .kpi-value { font-size: 32px; font-weight: bold; color: var(--text-primary); }
        .form-select, .form-input { background-color: var(--bg-tertiary); border: 1px solid var(--border-color); color: var(--text-secondary); padding: 8px 12px; border-radius: 6px; font-size: 14px; }
        .form-select:focus, .form-input:focus { outline: none; border-color: var(--color-blue); }
        .btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 6px; border: 1px solid transparent; font-size: 14px; cursor: pointer; transition: all 0.2s ease-in-out; }
        .btn-primary { background-color: var(--bg-tertiary); color: var(--text-secondary); }
        .btn-primary:hover { background-color: var(--border-color); }
        .btn-secondary { background-color: var(--bg-tertiary); color: var(--text-secondary); }
        .btn-secondary:hover { background-color: var(--border-color); }
        .chart-container { position: relative; }

        /* === Sidebar Styles === */
        .sidebar-header { padding: 0 24px; margin-bottom: 32px; text-align: center; }
        .logo { width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; margin: 0 auto 12px; color: #fff; font-size: 20px; font-weight: bold; }
        .company-name { color: var(--text-primary); font-weight: 600; }
        .user-role { color: var(--text-muted); font-size: 12px; }
        .sidebar-nav { flex: 1; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 12px 24px; margin: 4px 12px; border-radius: 8px; color: var(--text-muted); text-decoration: none; transition: all 0.2s ease-in-out; }
        .nav-item:hover { background-color: rgba(255, 255, 255, 0.05); color: var(--text-secondary); }
        .nav-item.active { background-color: var(--color-blue); color: #fff; }
        .nav-item.logout { color: var(--text-muted); border-top: 1px solid var(--border-color); margin-top: auto; }
        .nav-icon { width: 20px; height: 20px; flex-shrink: 0; }
      `}</style>
    </div>
  );
}