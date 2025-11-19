'use client';

import { useState, useEffect } from 'react';
import { Cpu } from 'lucide-react';
import ProductionLineSection from '@/components/ProductionLineSection/ProductionLineSection';
import DeviceConfigModal from '@/components/DeviceConfigModal/DeviceConfigModal';
import { useDeviceDashboardWebSocket } from '@/hooks/useDeviceDashboardWebSocket';
import { useAnalytics } from '@/hooks/useAnalytics';
import styles from './page.module.css';

interface DeviceData {
  id: string;
  name: string;
  count: number;
  lastUpdated: string;
  // Analytics data
  speedPerMinute?: number;
  speedPerHour?: number;
  isRunning?: boolean;
  trend?: 'increasing' | 'stable' | 'decreasing' | 'stopped';
  idleTimeSeconds?: number;
  position?: string;
}

interface ProductionLineInfo {
  id: number;
  name: string;
  brickType?: {
    id: number;
    name: string;
    description?: string;
  };
  status?: string;
}

// Initial devices for Line 1 (real devices with WebSocket)
const INITIAL_DEVICES_LINE1: DeviceData[] = [
  { id: 'SAU-ME-01', name: 'Sau máy ép 1', count: 0, lastUpdated: '-' },
  { id: 'SAU-ME-02', name: 'Sau máy ép 2', count: 0, lastUpdated: '-' },
  { id: 'TRUOC-LN-01', name: 'Trước lò nung 1', count: 0, lastUpdated: '-' },
  { id: 'TRUOC-LN-02', name: 'Trước lò nung 2', count: 0, lastUpdated: '-' },
  { id: 'SAU-LN-01', name: 'Sau lò nung 1', count: 0, lastUpdated: '-' },
  { id: 'TRUOC-MM-01', name: 'Trước mài măt 1', count: 0, lastUpdated: '-' },
  { id: 'SAU-MC-01', name: 'Sau mài cạnh 1', count: 0, lastUpdated: '-' },
  { id: 'TRUOC-DH-01', name: 'Trước đóng hộp 1', count: 0, lastUpdated: '-' },
];

export default function DeviceDashboardPage() {
  // WebSocket for Line 1 devices (count data)
  const { devices: devicesLine1, isConnected } = useDeviceDashboardWebSocket(INITIAL_DEVICES_LINE1, {
    enabled: true,
    baseUrl: 'http://localhost:5555',
  });

  // Analytics hook for speed, trend, etc.
  const { lineMetrics, deviceMetrics, isConnected: analyticsConnected } = useAnalytics('http://localhost:5555');

  const [currentTime, setCurrentTime] = useState<string>('');
  const [productionLines, setProductionLines] = useState<ProductionLineInfo[]>([]);
  const [isResetting, setIsResetting] = useState<{ [key: number]: boolean }>({});
  const [resetMessage, setResetMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [configModal, setConfigModal] = useState<{ lineId: number; lineName: string } | null>(null);

  // Fake devices for Lines 2, 5, 6 (clone from Line 1 data with different IDs)
  const [devicesLine2, setDevicesLine2] = useState<DeviceData[]>(
    INITIAL_DEVICES_LINE1.map((d, idx) => ({ 
      ...d, 
      id: `${d.id}-L2` // Add line suffix to make unique
    }))
  );
  const [devicesLine5, setDevicesLine5] = useState<DeviceData[]>(
    INITIAL_DEVICES_LINE1.map((d, idx) => ({ 
      ...d, 
      id: `${d.id}-L5` // Add line suffix to make unique
    }))
  );
  const [devicesLine6, setDevicesLine6] = useState<DeviceData[]>(
    INITIAL_DEVICES_LINE1.map((d, idx) => ({ 
      ...d, 
      id: `${d.id}-L6` // Add line suffix to make unique
    }))
  );

  // Fetch production lines info
  useEffect(() => {
    const fetchProductionLines = async () => {
      try {
        const response = await fetch('http://localhost:5555/api/production-lines');
        const data = await response.json();
        
        // Handle both array and object response
        const lines = Array.isArray(data) ? data : (data.data || data.items || []);
        
        // Filter for lines 1, 2, 5, 6
        const filteredLines = lines.filter((line: ProductionLineInfo) => 
          [1, 2, 5, 6].includes(line.id)
        );
        setProductionLines(filteredLines);
      } catch (error) {
        console.error('Error fetching production lines:', error);
        // Fallback data if API fails
        setProductionLines([
          { id: 1, name: 'Dây chuyền 1', status: 'active' },
          { id: 2, name: 'Dây chuyền 2', status: 'active' },
          { id: 5, name: 'Dây chuyền 5', status: 'active' },
          { id: 6, name: 'Dây chuyền 6', status: 'active' },
        ]);
      }
    };

    fetchProductionLines();
  }, []);

  // Update fake devices data from Line 1 (simulating same data)
  useEffect(() => {
    // Line 2: Update counts and timestamp
    setDevicesLine2(devicesLine1.map(d => ({
      ...d,
      id: `${d.id}-L2`,
    })));
    
    // Line 5: Update counts and timestamp
    setDevicesLine5(devicesLine1.map(d => ({
      ...d,
      id: `${d.id}-L5`,
    })));
    
    // Line 6: Update counts and timestamp
    setDevicesLine6(devicesLine1.map(d => ({
      ...d,
      id: `${d.id}-L6`,
    })));
  }, [devicesLine1]);

  // Merge device data with analytics
  const mergeDeviceWithAnalytics = (devices: DeviceData[]): DeviceData[] => {
    return devices.map(device => {
      const analytics = deviceMetrics.get(device.id);
      
      if (analytics) {
        return {
          ...device,
          speedPerMinute: analytics.speedPerMinute,
          speedPerHour: analytics.speedPerHour,
          isRunning: analytics.isRunning,
          trend: analytics.trend,
          idleTimeSeconds: analytics.idleTimeSeconds,
          position: analytics.position,
          // Keep lastUpdated from WebSocket telemetry (MQTT message timestamp)
        };
      }
      
      return device;
    });
  };

  // Get enhanced devices with analytics
  const enhancedDevicesLine1 = mergeDeviceWithAnalytics(devicesLine1);
  // const enhancedDevicesLine2 = mergeDeviceWithAnalytics(devicesLine2);
  // const enhancedDevicesLine5 = mergeDeviceWithAnalytics(devicesLine5);
  // const enhancedDevicesLine6 = mergeDeviceWithAnalytics(devicesLine6);
  const enhancedDevicesLine2 = mergeDeviceWithAnalytics(devicesLine1);
  const enhancedDevicesLine5 = mergeDeviceWithAnalytics(devicesLine1);
  const enhancedDevicesLine6 = mergeDeviceWithAnalytics(devicesLine1);
  
  

  // Update current time
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleString('vi-VN'));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    
    return () => clearInterval(interval);
  }, []);

  // Handle reset for specific line
  const handleResetLine = async (lineId: number) => {
    if (!confirm(`Bạn có chắc chắn muốn reset toàn bộ thiết bị của Dây chuyền ${lineId}?\n\nTất cả số đếm sẽ về 0.`)) {
      return;
    }

    setIsResetting(prev => ({ ...prev, [lineId]: true }));
    setResetMessage(null);

    try {
      const response = await fetch(`http://localhost:5555/api/mqtt/device-command/reset-line/${lineId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (result.success) {
        setResetMessage({
          type: 'success',
          text: `✅ ${result.message} - Lệnh ID: ${result.commandId.substring(0, 8)}...`
        });
        setTimeout(() => setResetMessage(null), 5000);
      } else {
        setResetMessage({
          type: 'error',
          text: `❌ ${result.message}`
        });
      }
    } catch (error) {
      console.error('Reset error:', error);
      setResetMessage({
        type: 'error',
        text: '❌ Lỗi kết nối đến server'
      });
    } finally {
      setIsResetting(prev => ({ ...prev, [lineId]: false }));
    }
  };

  // Get line info by ID
  const getLineInfo = (lineId: number) => {
    return productionLines.find(line => line.id === lineId) || {
      id: lineId,
      name: `Dây chuyền ${lineId}`,
      status: 'active'
    };
  };

  // Handle device config
  const handleLineConfig = (lineId: number, lineName: string) => {
    setConfigModal({ lineId, lineName });
  };

  // Save device config
  const handleSaveConfig = async (interval: number) => {
    if (!configModal) return;

    try {
      const response = await fetch(
        `http://localhost:5555/api/mqtt/device-command/config-line/${configModal.lineId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ interval }),
        }
      );

      const result = await response.json();

      if (result.success) {
        setResetMessage({
          type: 'success',
          text: `✅ ${result.message}`
        });
        setTimeout(() => setResetMessage(null), 5000);
      } else {
        throw new Error(result.message);
      }
    } catch (error: any) {
      console.error('Config error:', error);
      throw new Error(error.message || 'Lỗi kết nối đến server');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Cpu size={32} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Phân tích thiết bị</h1>
            <p className={styles.subtitle}>Phân xưởng 1 - Tất cả dây chuyền</p>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.connectionStatus}>
            <span className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></span>
            <span className={styles.statusText}>
              {isConnected ? 'WebSocket' : 'Offline'}
            </span>
          </div>
          <div className={styles.connectionStatus} style={{ marginLeft: '12px' }}>
            <span className={`${styles.statusDot} ${analyticsConnected ? styles.connected : styles.disconnected}`}></span>
            <span className={styles.statusText}>
              {analyticsConnected ? 'Analytics' : 'Offline'}
            </span>
          </div>
          <div className={styles.headerTime}>
            {currentTime || '-'}
          </div>
        </div>
      </div>

      {/* Reset Message */}
      {resetMessage && (
        <div className={`${styles.resetMessage} ${styles[resetMessage.type]}`}>
          {resetMessage.text}
        </div>
      )}

      {/* Production Line 1 */}
      <ProductionLineSection
        lineInfo={getLineInfo(1)}
        devices={enhancedDevicesLine1}
        onReset={() => handleResetLine(1)}
        isResetting={isResetting[1] || false}
        showResetButton={true}
        onConfig={() => handleLineConfig(1, getLineInfo(1).name)}
      />

      {/* Production Line 2 */}
      <ProductionLineSection
        lineInfo={getLineInfo(2)}
        devices={enhancedDevicesLine2}
        onReset={() => handleResetLine(2)}
        isResetting={isResetting[2] || false}
        showResetButton={true}
        onConfig={() => handleLineConfig(2, getLineInfo(2).name)}
      />

      {/* Production Line 5 */}
      <ProductionLineSection
        lineInfo={getLineInfo(5)}
        devices={enhancedDevicesLine5}
        onReset={() => handleResetLine(5)}
        isResetting={isResetting[5] || false}
        showResetButton={true}
        onConfig={() => handleLineConfig(5, getLineInfo(5).name)}
      />

      {/* Production Line 6 */}
      <ProductionLineSection
        lineInfo={getLineInfo(6)}
        devices={enhancedDevicesLine6}
        onReset={() => handleResetLine(6)}
        isResetting={isResetting[6] || false}
        showResetButton={true}
        onConfig={() => handleLineConfig(6, getLineInfo(6).name)}
      />

      {/* Device Config Modal */}
      {configModal && (
        <DeviceConfigModal
          lineId={configModal.lineId}
          lineName={configModal.lineName}
          deviceCount={8}
          onClose={() => setConfigModal(null)}
          onSave={handleSaveConfig}
        />
      )}
    </div>
  );
}
