import { useState } from 'react';
import styles from './RowActionsMenu.module.css';
import { MoreHorizontal } from 'lucide-react';

interface RowActionsMenuProps {
    onViewDetail?: () => void;
}

export default function RowActionsMenu({
    onViewDetail,
}: RowActionsMenuProps) {

    return (
        <button
            type="button"
            className={styles.menuItem}
            onClick={onViewDetail}
        >
            Xem chi tiết
        </button>
    );
}

