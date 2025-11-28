'use client';

import { useEffect, useState } from 'react';
import { Calendar, Filter, Notebook, Search, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/Button/Button';
import RowActionsMenu from '@/components/RowActionsMenu/RowActionsMenu';
import styles from './ActivityLogsPage.module.css';
import { apiFetch } from '@/lib/http/http';
import { Dialog } from '@/components/Dialog/Dialog';

type LogStatus = 'SUCCESS' | 'FAILED';
type LogSeverity = 'low' | 'medium' | 'high' | 'critical';
type LogActionType = 'auth' | 'config' | 'system' | 'data' | 'security';
type LogDateRange = '24h' | '7d' | '30d' | 'all';

interface ActivityLog {
    id: string;
    action: string;
    entity: string;
    status: LogStatus;
    severity: LogSeverity;
    actionType: LogActionType;
    createdAt: string;
    description: string | null;
    metadata: Record<string, unknown> | null;
    user: {
        id: number,
        username: string,
        email: string
    } & any
}

interface FetchActivityLogsParams {
    search: string;
    dateRange: LogDateRange;
    actionFilter: LogActionType | 'all';
    statusFilter: LogStatus | 'all';
    severityFilter: LogSeverity | 'all';
    page: number;
    pageSize: number;
}

interface FetchActivityLogsResult {
    data: ActivityLog[];
    total: number;
}

function formatDateTime(iso: string) {
    const date = new Date(iso);
    return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getSeverityClassName(severity: LogSeverity) {
    switch (severity) {
        case 'low':
            return `${styles.severityPill} ${styles.severityLow}`;
        case 'medium':
            return `${styles.severityPill} ${styles.severityMedium}`;
        case 'high':
            return `${styles.severityPill} ${styles.severityHigh}`;
        case 'critical':
        default:
            return `${styles.severityPill} ${styles.severityCritical}`;
    }
}

function getSeverityLabel(severity: LogSeverity) {
    switch (severity) {
        case 'low':
            return 'Thấp';
        case 'medium':
            return 'Trung bình';
        case 'high':
            return 'Cao';
        case 'critical':
        default:
            return 'Nghiêm trọng';
    }
}

type PaginationItem = number | 'ellipsis';

function getPaginationItems(
    currentPage: number,
    totalPages: number,
    siblingCount = 1,
    boundaryCount = 1,
): PaginationItem[] {
    const range = (start: number, end: number): number[] =>
        Array.from({ length: end - start + 1 }, (_, index) => index + start);

    const totalPageNumbers = boundaryCount * 2 + siblingCount * 2 + 3;

    if (totalPages <= totalPageNumbers) {
        return range(1, totalPages);
    }

    const startPages = range(1, boundaryCount);
    const endPages = range(totalPages - boundaryCount + 1, totalPages);

    const siblingsStart = Math.max(
        Math.min(currentPage - siblingCount, totalPages - boundaryCount - siblingCount * 2 - 1),
        boundaryCount + 2,
    );
    const siblingsEnd = siblingsStart + siblingCount * 2;

    const items: PaginationItem[] = [];

    items.push(...startPages);

    if (siblingsStart > boundaryCount + 2) {
        items.push('ellipsis');
    } else if (boundaryCount + 1 < totalPages - boundaryCount) {
        items.push(boundaryCount + 1);
    }

    for (let page = siblingsStart; page <= siblingsEnd; page += 1) {
        items.push(page);
    }

    if (siblingsEnd < totalPages - boundaryCount - 1) {
        items.push('ellipsis');
    } else if (totalPages - boundaryCount > boundaryCount) {
        items.push(totalPages - boundaryCount);
    }

    items.push(...endPages);

    return items;
}

const dateRangeLabel: Record<LogDateRange, string> = {
    '24h': '24 giờ qua',
    '7d': '7 ngày qua',
    '30d': '30 ngày qua',
    all: 'Toàn bộ thời gian',
};

const actionFilterLabel: Record<LogActionType | 'all', string> = {
    all: 'Tất cả loại hành động',
    auth: 'Xác thực & người dùng',
    system: 'Hệ thống',
    config: 'Cấu hình',
    data: 'Dữ liệu',
    security: 'Bảo mật',
};

const statusFilterLabel: Record<LogStatus | 'all', string> = {
    all: 'Tất cả trạng thái',
    SUCCESS: 'Thành công',
    FAILED: 'Thất bại',
};

const severityFilterLabel: Record<LogSeverity | 'all', string> = {
    all: 'Tất cả mức độ',
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    critical: 'Nghiêm trọng',
};

const dateRangeToTimestamp: Record<LogDateRange, '24hour' | '7day' | '30day' | 'all'> = {
    '24h': '24hour',
    '7d': '7day',
    '30d': '30day',
    all: 'all',
};

async function fetchActivityLogs(
    params: FetchActivityLogsParams,
): Promise<FetchActivityLogsResult> {
    const { search, dateRange, actionFilter, statusFilter, severityFilter, page, pageSize } =
        params;

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '';
    const searchParams = new URLSearchParams();

    searchParams.set('page', String(page));
    searchParams.set('limit', String(pageSize));
    searchParams.set('timestamp', dateRangeToTimestamp[dateRange]);

    if (actionFilter !== 'all') {
        searchParams.set('actionType', actionFilter);
    }

    if (statusFilter !== 'all') {
        searchParams.set('status', statusFilter);
    }

    if (severityFilter !== 'all') {
        searchParams.set('severity', severityFilter);
    }

    if (search) {
        searchParams.set('search', search);
    }

    const url = `${baseUrl}/api/activity-log?${searchParams.toString()}`;

    const res = await apiFetch(url);
    if (!res.ok) {
        return { data: [], total: 0 };
    }

    const json = await res.json();
    console.log(json)
    const items = (json.pagidata ?? []) as ActivityLog[];
    const meta = json.meta ?? {};
    const total =
        typeof meta.total === 'number'
            ? meta.total
            : Array.isArray(items)
                ? items.length
                : 0;

    return { data: items, total };
}

export default function ActivityLogsPage() {
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState<LogDateRange>('30d');
    const [actionFilter, setActionFilter] = useState<LogActionType | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<LogStatus | 'all'>('all');
    const [severityFilter, setSeverityFilter] = useState<LogSeverity | 'all'>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const [openDetail, setOpenDetail] = useState(false);
    const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

    const [data, setData] = useState<ActivityLog[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const pageSize = 10;

    useEffect(() => {
        let cancelled = false;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLoading(true);

        fetchActivityLogs({
            search,
            dateRange,
            actionFilter,
            statusFilter,
            severityFilter,
            page: currentPage,
            pageSize,
        })
            .then((result) => {
                if (cancelled) return;
                setData(result.data);
                setTotal(result.total);
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [search, dateRange, actionFilter, statusFilter, severityFilter, currentPage]);

    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const currentPageSafe = Math.min(currentPage, totalPages);
    const paginationItems = getPaginationItems(currentPageSafe, totalPages);

    const handleOpenDetail = (log: ActivityLog) => {
        setSelectedLog(log);
        setOpenDetail(true);
    };

    const handleCloseDetail = () => {
        setOpenDetail(false);
        setSelectedLog(null);
    };

    const handleChangePage = (page: number) => {
        if (page < 1 || page > totalPages) return;
        setCurrentPage(page);
    };

    const startIndex = total === 0 ? 0 : (currentPageSafe - 1) * pageSize + 1;
    const endIndex = Math.min(currentPageSafe * pageSize, total);

    return (
        <div className={styles.pageWrapper}>
            <Dialog
                open={openDetail}
                onClose={handleCloseDetail}
                title="Chi tiết nhật ký hoạt động"
            >
                {selectedLog && (
                    <div className={styles.detailDialog}>
                        <div className={styles.detailGrid}>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Hành động</div>
                                <div className={styles.detailValue}>{selectedLog.action}</div>
                            </div>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Loại hành động</div>
                                <div className={styles.detailValue}>
                                    {actionFilterLabel[selectedLog.actionType] ??
                                        selectedLog.actionType}
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Đối tượng</div>
                                <div className={styles.detailValue}>
                                    {selectedLog.entity || '-'}
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Thời gian</div>
                                <div
                                    className={`${styles.detailValue} ${styles.detailValueMuted}`}
                                >
                                    {formatDateTime(selectedLog.createdAt)}
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Trạng thái</div>
                                <div className={styles.detailValue}>
                                    <span
                                        className={`${styles.statusBadge} ${selectedLog.status === 'SUCCESS'
                                            ? styles.statusSuccess
                                            : styles.statusError
                                            }`}
                                    >
                                        {statusFilterLabel[selectedLog.status]}
                                    </span>
                                </div>
                            </div>
                            <div className={styles.detailItem}>
                                <div className={styles.detailLabel}>Mức độ</div>
                                <div className={styles.detailValue}>
                                    <span
                                        className={getSeverityClassName(selectedLog.severity)}
                                    >
                                        {getSeverityLabel(selectedLog.severity)}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className={styles.detailSection}>
                            <div className={styles.detailLabel}>Mô tả</div>
                            <div className={styles.detailDescription}>
                                {selectedLog.description || 'Không có mô tả'}
                            </div>
                        </div>

                        <div className={styles.detailSection}>
                            <div className={styles.detailLabel}>Người dùng</div>
                            <div className={styles.detailDescription}>
                                {selectedLog?.user?.username || 'Không có không có người dùng'}
                            </div>
                        </div>
                        <div className={styles.detailSection}>
                            <div className={styles.detailLabel}>Metadata</div>
                            {selectedLog.metadata &&
                            typeof selectedLog.metadata === 'object' &&
                            'before' in selectedLog.metadata &&
                            'after' in selectedLog.metadata ? (
                                <div className={styles.metadataDiff}>
                                    <div className={styles.metadataColumn}>
                                        <div className={styles.metadataTitle}>Trước khi thay đổi</div>
                                        <pre className={styles.detailMetadata}>
                                            {JSON.stringify(
                                                (selectedLog.metadata as any).before,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    </div>
                                    <div className={styles.metadataColumn}>
                                        <div className={styles.metadataTitle}>Sau khi thay đổi</div>
                                        <pre className={styles.detailMetadata}>
                                            {JSON.stringify(
                                                (selectedLog.metadata as any).after,
                                                null,
                                                2,
                                            )}
                                        </pre>
                                    </div>
                                </div>
                            ) : (
                                <pre className={styles.detailMetadata}>
                                    {selectedLog.metadata
                                        ? JSON.stringify(selectedLog.metadata, null, 2)
                                        : 'Không có metadata'}
                                </pre>
                            )}
                        </div>
                    </div>
                )}
            </Dialog>

            <div className={styles.card}>
                <div className={styles.headerRow}>
                    <div className={styles.titleBlock}>
                        <h1 className={styles.title}>
                            <Notebook /> <span>Nhật ký hoạt động</span>
                        </h1>
                        <p className={styles.subtitle}>
                            Theo dõi các hành động quan trọng trên hệ thống tile counter.
                        </p>
                    </div>
                    <div className={styles.exportButtonWrapper}>
                        <Button typeBtn="primaryButton">Xuất file nhật ký</Button>
                    </div>
                </div>

                <div className={styles.filtersRow}>
                    <div className={styles.search}>
                        <span className={styles.filterSelectLabel}>Tìm kiếm</span>
                        <div className={styles.searchInputWrapper}>
                            <span className={styles.searchIcon}>
                                <Search size={16} />
                            </span>
                            <input
                                className={styles.searchInput}
                                placeholder="Tìm theo hành động hoặc mô tả..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                    </div>

                    <div className={styles.filterGroup}>
                        <div className={styles.filterSelect}>
                            <span className={styles.filterSelectLabel}>Khoảng thời gian</span>
                            <div className={styles.filterSelectControl}>
                                <span className={styles.filterIcon}>
                                    <Calendar size={14} />
                                </span>
                                <select
                                    className={styles.filterSelectInput}
                                    value={dateRange}
                                    onChange={(e) => {
                                        setDateRange(e.target.value as LogDateRange);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="24h">{dateRangeLabel['24h']}</option>
                                    <option value="7d">{dateRangeLabel['7d']}</option>
                                    <option value="30d">{dateRangeLabel['30d']}</option>
                                    <option value="all">{dateRangeLabel.all}</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.filterSelect}>
                            <span className={styles.filterSelectLabel}>Loại hành động</span>
                            <div className={styles.filterSelectControl}>
                                <span className={styles.filterIcon}>
                                    <Filter size={14} />
                                </span>
                                <select
                                    className={styles.filterSelectInput}
                                    value={actionFilter}
                                    onChange={(e) => {
                                        setActionFilter(e.target.value as LogActionType | 'all');
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="all">{actionFilterLabel.all}</option>
                                    <option value="auth">{actionFilterLabel.auth}</option>
                                    <option value="system">{actionFilterLabel.system}</option>
                                    <option value="config">{actionFilterLabel.config}</option>
                                    <option value="data">{actionFilterLabel.data}</option>
                                    <option value="security">{actionFilterLabel.security}</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.filterSelect}>
                            <span className={styles.filterSelectLabel}>Trạng thái</span>
                            <div className={styles.filterSelectControl}>
                                <span className={styles.filterIcon}>
                                    <Filter size={14} />
                                </span>
                                <select
                                    className={styles.filterSelectInput}
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value as LogStatus | 'all');
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="all">{statusFilterLabel.all}</option>
                                    <option value="SUCCESS">{statusFilterLabel.SUCCESS}</option>
                                    <option value="FAILED">{statusFilterLabel.FAILED}</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.filterSelect}>
                            <span className={styles.filterSelectLabel}>Mức độ</span>
                            <div className={styles.filterSelectControl}>
                                <span className={styles.filterIcon}>
                                    <TriangleAlert size={14} />
                                </span>
                                <select
                                    className={styles.filterSelectInput}
                                    value={severityFilter}
                                    onChange={(e) => {
                                        setSeverityFilter(e.target.value as LogSeverity | 'all');
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="all">{severityFilterLabel.all}</option>
                                    <option value="low">{severityFilterLabel.low}</option>
                                    <option value="medium">{severityFilterLabel.medium}</option>
                                    <option value="high">{severityFilterLabel.high}</option>
                                    <option value="critical">
                                        {severityFilterLabel.critical}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead className={styles.thead}>
                            <tr>
                                <th className={styles.th}>Hành động</th>
                                <th className={styles.th}>Mô tả</th>
                                <th className={styles.th}>Người dùng</th>
                                <th className={styles.th}>Mức độ</th>
                                <th className={styles.th}>Thời gian</th>
                                <th className={`${styles.th} ${styles.actionCell}`} />
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td className={styles.td} colSpan={5}>
                                        Đang tải nhật ký hoạt động...
                                    </td>
                                </tr>
                            )}
                            {!loading && data.length === 0 && (
                                <tr>
                                    <td className={styles.td} colSpan={5}>
                                        Không có bản ghi nào phù hợp với bộ lọc hiện tại.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                data.map((log) => (
                                    <tr key={log.id} className={styles.trBody}>
                                        <td className={`${styles.td} ${styles.tdAction}`}>
                                            {log.action}
                                        </td>
                                        <td className={`${styles.td} ${styles.tdDescription}`}>
                                            {log.description || 'Không có mô tả'}
                                        </td>
                                         <td className={`${styles.td} ${styles.tdDescription}`}>
                                            {log?.user?.username || '...'}
                                        </td>
                                        <td className={styles.td}>
                                            <span className={getSeverityClassName(log.severity)}>
                                                {getSeverityLabel(log.severity)}
                                            </span>
                                        </td>
                                        <td className={`${styles.td} ${styles.tdTime}`}>
                                            {formatDateTime(log.createdAt)}
                                        </td>
                                        <td className={`${styles.td} ${styles.actionCell}`}>
                                            <RowActionsMenu
                                                onViewDetail={() => handleOpenDetail(log)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                <div className={styles.paginationRow}>
                    <div className={styles.paginationInfo}>
                        <span>
                            {total === 0
                                ? 'Không có bản ghi nào'
                                : `Hiển thị ${startIndex}–${endIndex} trên tổng ${total} bản ghi`}
                        </span>
                    </div>
                    <div className={styles.pagination}>
                        <button
                            type="button"
                            className={styles.pageButton}
                            onClick={() => handleChangePage(currentPageSafe - 1)}
                            disabled={currentPageSafe === 1}
                        >
                            {'<'}
                        </button>
                        {paginationItems.map((item, index) => {
                            if (item === 'ellipsis') {
                                return (
                                    <button
                                        key={`ellipsis-${index}`}
                                        type="button"
                                        className={`${styles.pageButton} ${styles.pageButtonEllipsis}`}
                                        disabled
                                    >
                                        {'...'}
                                    </button>
                                );
                            }

                            const pageNumber = item;
                            const isActive = pageNumber === currentPageSafe;

                            return (
                                <button
                                    key={pageNumber}
                                    type="button"
                                    className={`${styles.pageButton} ${isActive ? styles.pageButtonActive : ''
                                        }`.trim()}
                                    onClick={() => handleChangePage(pageNumber)}
                                >
                                    {pageNumber}
                                </button>
                            );
                        })}
                        <button
                            type="button"
                            className={styles.pageButton}
                            onClick={() => handleChangePage(currentPageSafe + 1)}
                            disabled={currentPageSafe === totalPages}
                        >
                            {'>'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
