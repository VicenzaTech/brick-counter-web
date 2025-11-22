import { PositionInfo } from '@/app/device-dashboard/page';
import styles from './LinePositionCard.module.css';
import { ChevronsLeftRightIcon } from 'lucide-react';
import type React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LinePositionCardProps extends PositionInfo {
    isSelected?: boolean;
    onClick?: (position: PositionInfo) => void;
    onEdit?: (position: PositionInfo) => void;
    onDelete?: (position: PositionInfo) => void;
}

export default function LinePositionCard(props: LinePositionCardProps) {
    const { id, name, description, devices, index, isSelected, onClick, onEdit, onDelete } = props;
    const deviceCount = devices?.length ?? 0;

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.8 : 1,
        cursor: 'grab',
    };

    const handleClick = () => {
        if (!onClick) return;
        onClick({
            id,
            name,
            description,
            index,
            devices,
        });
    };

    const handleEditClick = (event: React.MouseEvent<HTMLDivElement>) => {
        event.stopPropagation();
        if (!onEdit) return;
        onEdit({
            id,
            name,
            description,
            index,
            devices,
        });
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`${styles.slot} ${isSelected ? styles.slotSelected : ''}`}
            onClick={handleClick}
            {...attributes}
            {...listeners}
        >
            <div className={styles.header}>
                <div className={styles.index}>{index}</div>
                <div className={styles.config} onClick={handleEditClick}>
                    <ChevronsLeftRightIcon />
                </div>
            </div>
            <div className={styles.device}>
                <div className={styles.title}>{name}</div>
                {description && <div className={styles.desc}>{description}</div>}
                <div className={styles.metaRow}>
                    <span className={styles.metaText}>{deviceCount} thiết bị</span>
                </div>
            </div>
        </div>
    );
}

