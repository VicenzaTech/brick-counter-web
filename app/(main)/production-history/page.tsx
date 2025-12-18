'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './production-history.module.css';
import { apiFetch } from '@/lib/http/http';

type DateFilter = 'all' | 'today' | 'week' | 'month';

interface ProductionLineOption {
    id: number;
    name: string;
}

interface BrickTypeOption {
    id: number;
    name: string;
    code?: string;
    tileSize?: string;
}

interface ProductionLineRunApi {
    id: string | number;
    productionLineId?: number;
    productionLine?: {
        id: number;
        name: string;
    };
    brickTypeId?: number;
    brickType?: {
        id: number;
        name: string;
        code?: string;
        tileSize?: string;
        description?: string | null;
    };
    startTime: string;
    endTime: string;
    totalPieces?: string | number;
    totalAreaM2?: string | number;
    packagingQuantity?: string | number;
    packagingArea?: string | number;
    a1Pieces?: string | number;
    a2Pieces?: string | number;
    cutLoPieces?: string | number;
    phe1Pieces?: string | number;
    phe2Pieces?: string | number;
    pheHuyPieces?: string | number;
    status?: string;
    dataSource?: string;
}

interface ProductionHistory {
    id: string;
    startTime: string;
    endTime: string;
    productionLineId: number | null;
    productionLineName: string;
    productId: number | null;
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
    status?: string;
    dataSource?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5555';
const PAGE_SIZE = 50;

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
    all: 'Tất cả thời gian',
    today: 'Hôm nay',
    week: '7 ngày gần nhất',
    month: '30 ngày gần nhất',
};

const STATUS_LABELS: Record<string, { label: string; className: keyof typeof styles }> = {
    completed: { label: 'Hoàn thành', className: 'statusCompleted' },
    in_progress: { label: 'Đang chạy', className: 'statusInProgress' },
};

const DATA_SOURCE_LABELS: Record<string, { label: string; className: keyof typeof styles }> = {
    auto: { label: 'Tự động', className: 'sourceAuto' },
    manual: { label: 'Thủ công', className: 'sourceManual' },
};

const parseNumericValue = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    const numeric = typeof value === 'number' ? value : parseFloat(value);
    return Number.isFinite(numeric) ? numeric : 0;
};

const getDateRange = (filter: DateFilter): { from?: string; to?: string } => {
    if (filter === 'all') return {};

    const now = new Date();
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    switch (filter) {
        case 'today':
            break;
        case 'week':
            start.setDate(start.getDate() - 7);
            break;
        case 'month':
            start.setDate(start.getDate() - 30);
            break;
    }

    return {
        from: start.toISOString(),
        to: end.toISOString(),
    };
};

const mapRunToHistory = (item: ProductionLineRunApi): ProductionHistory => {
    const productionLineId = item.productionLineId ?? item.productionLine?.id ?? null;
    const brickTypeId = item.brickTypeId ?? item.brickType?.id ?? null;
    const productCode =
        item.brickType?.code ??
        item.brickType?.tileSize ??
        (brickTypeId !== null ? `#${brickTypeId}` : '--');

    return {
        id: item.id?.toString() ?? crypto.randomUUID(),
        startTime: item.startTime,
        endTime: item.endTime,
        productionLineId,
        productionLineName: item.productionLine?.name ?? `Dây chuyền ${productionLineId ?? 'N/A'}`,
        productId: brickTypeId,
        productName: item.brickType?.name ?? 'Chưa xác định',
        productCode,
        quantity: parseNumericValue(item.packagingQuantity ?? item.totalPieces),
        area: parseNumericValue(item.packagingArea ?? item.totalAreaM2),
        a1Quantity: parseNumericValue(item.a1Pieces),
        a2Quantity: parseNumericValue(item.a2Pieces),
        cutLot: parseNumericValue(item.cutLoPieces),
        defect1: parseNumericValue(item.phe1Pieces),
        defect2: parseNumericValue(item.phe2Pieces),
        defectDestroy: parseNumericValue(item.pheHuyPieces),
        status: item.status,
        dataSource: item.dataSource,
    };
};

interface FilterChip {
    id: string;
    label: string;
    value: string;
}

export default function ProductionHistoryPage() {
    const [data, setData] = useState<ProductionHistory[]>([]);
    const [productionLines, setProductionLines] = useState<ProductionLineOption[]>([]);
    const [brickTypes, setBrickTypes] = useState<BrickTypeOption[]>([]);
    const [filterLine, setFilterLine] = useState<string>('all');
    const [filterProduct, setFilterProduct] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [total, setTotal] = useState<number>(0);
    const [page, setPage] = useState<number>(1);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [refreshKey, setRefreshKey] = useState<number>(0);

    useEffect(() => {
        let mounted = true;

        const fetchProductionLines = async () => {
            try {
                const res = await apiFetch(`${API_BASE_URL}/production-lines`);
                if (!res.ok) throw new Error('Failed to fetch production lines');
                const json = await res.json();
                if (!mounted) return;
                setProductionLines(Array.isArray(json) ? json : []);
            } catch (err) {
                console.error('Failed to fetch production lines', err);
            }
        };

        const fetchBrickTypes = async () => {
            try {
                const res = await apiFetch(`${API_BASE_URL}/brick-types`);
                if (!res.ok) throw new Error('Failed to fetch brick types');
                const json = await res.json();
                if (!mounted) return;
                setBrickTypes(Array.isArray(json) ? json : []);
            } catch (err) {
                console.error('Failed to fetch brick types', err);
            }
        };

        fetchProductionLines();
        fetchBrickTypes();

        return () => {
            mounted = false;
        };
    }, []);
    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const fetchData = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = new URLSearchParams();
                if (filterLine !== 'all') {
                    params.set('productionLineId', filterLine);
                }
                if (filterProduct !== 'all') {
                    params.set('brickTypeId', filterProduct);
                }

                const { from, to } = getDateRange(dateFilter);
                if (from) params.set('from', from);
                if (to) params.set('to', to);

                params.set('offset', ((page - 1) * PAGE_SIZE).toString());
                params.set('limit', PAGE_SIZE.toString());

                const query = params.toString();
                const url = `${API_BASE_URL}/production-line-runs${query ? `?${query}` : ''}`;

                const res = await apiFetch(url, { signal: controller.signal });
                if (!res.ok) {
                    throw new Error(`Failed to fetch production history: ${res.status}`);
                }
                const json = await res.json();
                if (!mounted) return;

                const mapped: ProductionHistory[] = Array.isArray(json?.items)
                    ? json.items.map(mapRunToHistory)
                    : [];

                setData(mapped);
                setTotal(typeof json?.total === 'number' ? json.total : mapped.length);
                setLastUpdated(new Date());
            } catch (err: any) {
                if (!mounted || err?.name === 'AbortError') return;
                console.error('Failed to fetch production history', err);
                setError('Không thể tải dữ liệu, vui lòng thử lại.');
                setData([]);
                setTotal(0);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchData();

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [filterLine, filterProduct, dateFilter, page, refreshKey]);
    const filteredData = useMemo(() => {
        if (!searchQuery.trim()) return data;
        const keyword = searchQuery.toLowerCase().trim();
        return data.filter((item) =>
            item.productName.toLowerCase().includes(keyword) ||
            item.productCode.toLowerCase().includes(keyword) ||
            item.productionLineName.toLowerCase().includes(keyword),
        );
    }, [data, searchQuery]);

    const summary = useMemo(() => {
        const totals = filteredData.reduce(
            (acc, item) => {
                acc.quantity += item.quantity;
                acc.area += item.area;
                acc.a1 += item.a1Quantity;
                acc.a2 += item.a2Quantity;
                acc.defects += item.defect1 + item.defect2 + item.defectDestroy;
                return acc;
            },
            { quantity: 0, area: 0, a1: 0, a2: 0, defects: 0 },
        );

        return {
            totalRecords: total,
            totalQuantity: totals.quantity,
            totalArea: totals.area,
            totalA1: totals.a1,
            totalA2: totals.a2,
            totalDefects: totals.defects,
        };
    }, [filteredData, total]);

    const activeFilterChips = useMemo(() => {
        const chips: FilterChip[] = [];
        if (filterLine !== 'all') {
            const line = productionLines.find((l) => l.id.toString() === filterLine);
            chips.push({
                id: 'line',
                label: 'Dây chuyền',
                value: line?.name ?? `#${filterLine}`,
            });
        }
        if (filterProduct !== 'all') {
            const product = brickTypes.find((b) => b.id.toString() === filterProduct);
            chips.push({
                id: 'product',
                label: 'Dạng gạch',
                value: product?.name ?? `#${filterProduct}`,
            });
        }
        if (dateFilter !== 'all') {
            chips.push({
                id: 'date',
                label: 'Thời gian',
                value: DATE_FILTER_LABELS[dateFilter],
            });
        }
        if (searchQuery.trim()) {
            chips.push({
                id: 'search',
                label: 'Từ khóa',
                value: `"${searchQuery.trim()}"`,
            });
        }
        return chips;
    }, [filterLine, filterProduct, dateFilter, searchQuery, productionLines, brickTypes]);

    const formatDateTime = (value: string | Date) => {
        const date = typeof value === 'string' ? new Date(value) : value;
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatNumber = (num: number) => {
        const safe = Number.isFinite(num) ? num : 0;
        return safe.toLocaleString('vi-VN');
    };
    const exportToExcel = () => {
        if (!filteredData.length) return;

        const headers = [
            'STT',
            'Bắt đầu',
            'Kết thúc',
            'Dây chuyền',
            'Trạng thái',
            'Dạng gạch',
            'Mã gạch',
            'Số lượng (viên)',
            'Diện tích (m²)',
            'A1 / A2',
            'Cắt lô',
            'Phế 1',
            'Phế 2',
            'Phế hủy',
            'Nguồn dữ liệu',
        ];

        const csvRows = [
            headers.join(','),
            ...filteredData.map((record, index) => {
                const statusKey = (record.status ?? '').toLowerCase();
                const statusLabel = STATUS_LABELS[statusKey]?.label ?? (record.status ?? 'Khác');
                const dataSourceKey = (record.dataSource ?? '').toLowerCase();
                const dataSourceLabel = DATA_SOURCE_LABELS[dataSourceKey]?.label ?? (record.dataSource ?? '---');
                return [
                    (page - 1) * PAGE_SIZE + index + 1,
                    `"${formatDateTime(record.startTime)}"`,
                    `"${formatDateTime(record.endTime)}"`,
                    `"${record.productionLineName}"`,
                    `"${statusLabel}"`,
                    `"${record.productName}"`,
                    record.productCode,
                    record.quantity,
                    record.area.toFixed(2),
                    `"${record.a1Quantity} / ${record.a2Quantity}"`,
                    record.cutLot,
                    record.defect1,
                    record.defect2,
                    record.defectDestroy,
                    `"${dataSourceLabel}"`,
                ].join(',');
            }),
        ];

        const csvContent = '\uFEFF' + csvRows.join('\n');
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

    const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;
    const isFirstPage = page === 1;
    const isLastPage = total === 0 || page >= totalPages;
    const defectRate = summary.totalQuantity
        ? (summary.totalDefects / summary.totalQuantity) * 100
        : 0;

    const handleRefresh = () => {
        setRefreshKey((prev) => prev + 1);
    };
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Lịch sử sản xuất</h1>
                    <p className={styles.subtitle}>
                        Theo dõi tiến độ, chất lượng và nguồn dữ liệu của từng dây chuyền theo thời gian thực.
                    </p>
                </div>
                <div className={styles.headerMeta}>
                    <span className={styles.headerTag}>
                        {summary.totalRecords.toLocaleString('vi-VN')} bản ghi hệ thống
                    </span>
                    <span className={styles.headerMetaText}>
                        {lastUpdated ? `Cập nhật ${formatDateTime(lastUpdated)}` : 'Đang tải dữ liệu...'}
                    </span>
                </div>
            </div>

            <div className={styles.summaryGrid}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <p className={styles.cardLabel}>Tổng lượt sản xuất</p>
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
                        <h3 className={`${styles.cardValue} ${styles.textDanger}`}>
                            {formatNumber(summary.totalDefects)}
                        </h3>
                        <p className={styles.cardSubtext}>
                            {`${defectRate.toFixed(2)}% trên sản lượng lọc`}
                        </p>
                    </div>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>Bộ lọc trực quan</h3>
                        <p className={styles.cardSubtext}>
                            Kết hợp nhiều điều kiện để soi tiến độ từng dây chuyền hoặc sản phẩm cụ thể.
                        </p>
                    </div>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterItem}>
                            <label className={styles.label}>Dây chuyền</label>
                            <select
                                className={styles.select}
                                value={filterLine}
                                onChange={(e) => {
                                    setFilterLine(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="all">Tất cả dây chuyền</option>
                                {productionLines.map((line) => (
                                    <option key={line.id} value={line.id}>
                                        {line.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label className={styles.label}>Dạng gạch</label>
                            <select
                                className={styles.select}
                                value={filterProduct}
                                onChange={(e) => {
                                    setFilterProduct(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="all">Tất cả dạng gạch</option>
                                {brickTypes.map((brick) => (
                                    <option key={brick.id} value={brick.id}>
                                        {brick.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={styles.filterItem}>
                            <label className={styles.label}>Khoảng thời gian</label>
                            <select
                                className={styles.select}
                                value={dateFilter}
                                onChange={(e) => {
                                    setDateFilter(e.target.value as DateFilter);
                                    setPage(1);
                                }}
                            >
                                <option value="all">Toàn bộ</option>
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
                                placeholder="Tìm theo tên hoặc mã gạch..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    {activeFilterChips.length > 0 && (
                        <div className={styles.activeFilters}>
                            <span className={styles.activeFiltersLabel}>Đang áp dụng:</span>
                            <div className={styles.activeFiltersList}>
                                {activeFilterChips.map((chip) => (
                                    <span key={chip.id} className={styles.filterChip}>
                                        <span className={styles.filterChipLabel}>{chip.label}:</span>
                                        <span>{chip.value}</span>
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <div>
                        <h3 className={styles.cardTitle}>
                            Dữ liệu sản xuất ({filteredData.length} bản ghi đang hiển thị)
                        </h3>
                        <p className={styles.cardSubtext}>
                            Kết quả đã bao gồm lọc & tìm kiếm, sắp xếp theo thời gian bắt đầu mới nhất.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        <button
                            className={styles.refreshButton}
                            onClick={handleRefresh}
                            disabled={loading}
                        >
                            Làm mới
                        </button>
                        <button
                            className={styles.exportButton}
                            onClick={exportToExcel}
                            disabled={!filteredData.length}
                        >
                            Xuất Excel
                        </button>
                    </div>
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
                                    <th>Trạng thái</th>
                                    <th>Dạng gạch</th>
                                    <th className={styles.textRight}>Sản lượng</th>
                                    <th className={styles.textRight}>A1 / A2</th>
                                    <th className={styles.textRight}>Cắt lô</th>
                                    <th className={styles.textRight}>Phế 1</th>
                                    <th className={styles.textRight}>Phế 2</th>
                                    <th className={styles.textRight}>Phế hủy</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={13} className={styles.emptyState}>
                                            Đang tải dữ liệu...
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={13} className={`${styles.emptyState} ${styles.textDanger}`}>
                                            {error}
                                        </td>
                                    </tr>
                                ) : filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className={styles.emptyState}>
                                            Không tìm thấy bản ghi phù hợp.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((record, index) => {
                                        const statusKey = (record.status ?? '').toLowerCase();
                                        const statusConfig = STATUS_LABELS[statusKey] ?? {
                                            label: record.status ?? 'Khác',
                                            className: 'statusUnknown' as keyof typeof styles,
                                        };
                                        const dataSourceKey = (record.dataSource ?? '').toLowerCase();
                                        const dataSourceConfig = DATA_SOURCE_LABELS[dataSourceKey] ?? {
                                            label: record.dataSource ?? '---',
                                            className: 'sourceUnknown' as keyof typeof styles,
                                        };

                                        return (
                                            <tr key={record.id}>
                                                <td className={styles.fontMedium}>{(page - 1) * PAGE_SIZE + index + 1}</td>
                                                <td className={styles.nowrap}>{formatDateTime(record.startTime)}</td>
                                                <td className={styles.nowrap}>{record.endTime ? formatDateTime(record.endTime) : '...'}</td>
                                                <td>
                                                    <span className={styles.badge}>{record.productionLineName}</span>
                                                </td>
                                                <td>
                                                    <span
                                                        className={`${styles.statusBadge} ${styles[statusConfig.className] ?? ''}`}
                                                    >
                                                        {statusConfig.label}
                                                    </span>
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
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className={styles.pagination}>
                        <div className={styles.paginationInfo}>
                            <span>Trang {total === 0 ? 0 : page} / {total === 0 ? 0 : totalPages}</span>
                            <span>Hiển thị {filteredData.length} / {total} bản ghi</span>
                        </div>
                        <div className={styles.paginationControls}>
                            <button
                                className={styles.paginationButton}
                                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                                disabled={isFirstPage || loading}
                            >
                                Trang trước
                            </button>
                            <button
                                className={styles.paginationButton}
                                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                                disabled={isLastPage || loading}
                            >
                                Trang tiếp
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
