import { useState } from 'react';
import styles from './RowActionsMenu.module.css';
import { MoreHorizontal } from 'lucide-react';

interface RowActionsMenuProps {
    onViewDetail?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

export default function RowActionsMenu({
    onViewDetail,
    onEdit,
    onDelete,
}: RowActionsMenuProps) {
    const [open, setOpen] = useState(false);

    const toggleOpen = () => setOpen((prev) => !prev);

    const handleViewDetail = () => {
        onViewDetail && onViewDetail();
        setOpen(false);
    };

    const handleEdit = () => {
        onEdit && onEdit();
        setOpen(false);
    };

    const handleDelete = () => {
        onDelete && onDelete();
        setOpen(false);
    };

    const hasAnyAction = Boolean(onViewDetail || onEdit || onDelete);

    if (!hasAnyAction) {
        return null;
    }

    return (
        <div className={styles.menuWrapper}>
            <button
                type="button"
                className={styles.triggerButton}
                onClick={toggleOpen}
                onMouseDown={(e) => e.stopPropagation()}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Thao tác thiết bị"
            >
                <MoreHorizontal size={16} />
            </button>
            {open && (
                <div
                    className={styles.menu}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    {onViewDetail && (
                        <button
                            type="button"
                            className={styles.menuItem}
                            onClick={handleViewDetail}
                        >
                            Xem chi tiết
                        </button>
                    )}
                    {onEdit && (
                        <button
                            type="button"
                            className={styles.menuItem}
                            onClick={handleEdit}
                        >
                            Cấu hình thiết bị
                        </button>
                    )}
                    {onDelete && (
                        <button
                            type="button"
                            className={`${styles.menuItem} ${styles.menuItemDanger}`}
                            onClick={handleDelete}
                        >
                            Xóa thiết bị
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

