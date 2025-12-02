'use client';

import styles from '../ProductionTracker.module.css';
import { useMemo } from 'react';
import { X } from 'lucide-react';

export interface SelectionDialogItem {
  id: number;
  title: string;
  subtitle?: string;
}

interface SelectionDialogProps {
  open: boolean;
  title: string;
  placeholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  items: SelectionDialogItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function SelectionDialog({
  open,
  title,
  placeholder,
  searchValue,
  onSearchChange,
  items,
  selectedId,
  onSelect,
  onClose,
  onConfirm,
}: SelectionDialogProps) {
  const filteredItems = useMemo(() => {
    const q = searchValue.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q),
    );
  }, [items, searchValue]);

  if (!open) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.productModal}>
        <div className={styles.productModalHeader}>
          <h2 className={styles.productModalTitle}>{title}</h2>
          <button
            type="button"
            className={styles.productModalClose}
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>
        <div className={styles.productSearch}>
          <input
            className={styles.productSearchInput}
            placeholder={placeholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className={styles.productList}>
          {filteredItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`${styles.productItem} ${
                selectedId === item.id ? styles.productItemActive : ''
              }`}
              onClick={() => onSelect(item.id)}
            >
              <div className={styles.productItemText}>
                <span className={styles.productItemName}>{item.title}</span>
                {item.subtitle && (
                  <span className={styles.productItemSku}>{item.subtitle}</span>
                )}
              </div>
              <span className={styles.productRadioOuter}>
                {selectedId === item.id && (
                  <span className={styles.productRadioInner} />
                )}
              </span>
            </button>
          ))}
          {filteredItems.length === 0 && (
            <div className={styles.productEmpty}>
              Không tìm thấy kết quả.
            </div>
          )}
        </div>
        <div className={styles.productModalActions}>
          <button
            type="button"
            className={styles.productConfirmBtn}
            disabled={!selectedId}
            onClick={onConfirm}
          >
            Xác nhận
          </button>
          <button
            type="button"
            className={styles.productCancelBtn}
            onClick={onClose}
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  );
}

