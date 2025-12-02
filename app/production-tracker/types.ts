'use client';


export interface Product {
  id: number;
  name: string;
  code: string;
  specs?: {
    width?: number;
    height?: number;
    thickness?: number;
    type?: string;
  };
}

export interface ProductionLine {
    id: number;
    name: string;
    stages: string[];
}

export interface FactoryData {
    id: number;
    name: string;
    lines: ProductionLine[];
}

export interface StageDeviceInfo {
    id: number;
    deviceId: string;
    name: string;
    position?: number;
}

export type StageDeviceAssignment = Record<number, StageDeviceInfo[]>;

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error';
}
export enum StageStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    WAITING_LOG = 'waiting_log',
}

export interface StageState {
    status: 'pending' | 'running' | 'waiting_log';
    productId: number | null;
    startTime: string | null;
    stopReason: string | null;
    isEmergency?: boolean;
    quantity: number | null;
    area: number | null;
    deviceQuantities?: Record<string, number>;
    previousStatus?: 'pending' | 'running' | 'waiting_log';
}

export enum StopReason {
    MACHINE_ERROR = 'machine_error',
    CHANGE_PRODUCT = 'change_product',
    SHIFT_END = 'shift_end',
    MAINTENANCE = 'maintenance',
    OTHER = 'other'
}

export interface StageHistoryItem {
    id: number;
    timestamp: string;
    lineId: number;
    lineName: string;
    action: 'start' | 'stop' | 'emergency_stop' | 'log' | 'resume';
    quantity?: number | null;
    area?: number | null;
    stageId: number;
    stage: {
        name: string
    };
    productId?: number;
    product?: {
        id: number;
        name: string;
        code: string;
    };
    startTime: Date;
    endTime?: Date;
    stopReason?: StopReason;
    isEmergency: boolean;
    notes?: string;
    createdByUsername?: string;
    createdAt: Date;
}
