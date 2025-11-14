'use client';

import { useState } from 'react';
import { Factory, Info, TrendingUp, X } from 'lucide-react';
import styles from './page.module.css';

interface DeviceInfo {
  id: string;
  name: string;
  sensor: string;
  count: number;
  tileType: string;
  status: 'active' | 'warning' | 'inactive';
  description: string;
}

interface ProcessStep {
  id: string;
  name: string;
  devices: DeviceInfo[];
  position: number;
}

interface ProductionLine {
  id: string;
  name: string;
  factory: string;
  steps: ProcessStep[];
}

// Dummy data - sẽ được thay thế bằng data từ backend
const PRODUCTION_LINES: ProductionLine[] = [
  // Phân xưởng 1 - Dây chuyền 1
  {
    id: 'dc1',
    name: 'Dây chuyền 1',
    factory: 'Phân xưởng 1',
    steps: [
      {
        id: 'step1',
        name: 'Máy ép',
        position: 1,
        devices: [
          {
            id: 'dc1_me1',
            name: 'Sau máy ép 1',
            sensor: 'Cảm biến hồng ngoại IR-2000',
            count: 5549,
            tileType: 'Gạch 60x60 bóng kính',
            status: 'active',
            description: 'Đếm gạch sau khi qua máy ép thủy lực, kiểm tra số lượng đầu ra'
          },
          {
            id: 'dc1_me2',
            name: 'Sau máy ép 2',
            sensor: 'Cảm biến hồng ngoại IR-2000',
            count: 5489,
            tileType: 'Gạch 60x60 bóng kính',
            status: 'active',
            description: 'Đếm gạch sau khi qua máy ép thủy lực, kiểm tra số lượng đầu ra'
          }
        ]
      },
      {
        id: 'step2',
        name: 'Lò nung',
        position: 2,
        devices: [
          {
            id: 'dc1_ln1',
            name: 'Trước lò nung 1',
            sensor: 'Cảm biến laser LX-3000',
            count: 3569,
            tileType: 'Gạch 60x60 bóng kính',
            status: 'active',
            description: 'Đếm gạch trước khi vào lò nung, đảm bảo số lượng chính xác'
          },
          {
            id: 'dc1_ln2',
            name: 'Trước lò nung 2',
            sensor: 'Cảm biến laser LX-3000',
            count: 3561,
            tileType: 'Gạch 60x60 bóng kính',
            status: 'warning',
            description: 'Đếm gạch trước khi vào lò nung, đảm bảo số lượng chính xác'
          },
          {
            id: 'dc1_sln',
            name: 'Sau lò nung 1',
            sensor: 'Cảm biến nhiệt độ cao TS-5000',
            count: 2794,
            tileType: 'Gạch 60x60 bóng kính',
            status: 'active',
            description: 'Đếm gạch sau khi qua lò nung, kiểm tra sản phẩm hoàn thiện'
          }
        ]
      },
      {
        id: 'step3',
        name: 'Mài',
        position: 3,
        devices: [
          {
            id: 'dc1_mm',
            name: 'Trước mài mặt 1',
            sensor: 'Cảm biến quang học OS-4000',
            count: 2503,
            tileType: 'Gạch 60x60 bóng kính',
            status: 'active',
            description: 'Đếm gạch trước khi mài mặt, chuẩn bị cho công đoạn hoàn thiện'
          },
          {
            id: 'dc1_mc',
            name: 'Sau mài cạnh 1',
            sensor: 'Cảm biến quang học OS-4000',
            count: 2302,
            tileType: 'Gạch 60x60 bóng kính',
            status: 'active',
            description: 'Đếm gạch sau khi mài cạnh, đảm bảo độ chính xác'
          }
        ]
      },
      {
        id: 'step4',
        name: 'Đóng hộp',
        position: 4,
        devices: [
          {
            id: 'dc1_dh',
            name: 'Trước đóng hộp 1',
            sensor: 'Cảm biến đếm tự động AC-6000',
            count: 1671,
            tileType: 'Gạch 60x60 bóng kính',
            status: 'active',
            description: 'Đếm gạch trước đóng hộp, kiểm tra số lượng thành phẩm'
          }
        ]
      }
    ]
  },
  // Phân xưởng 1 - Dây chuyền 2
  {
    id: 'dc2',
    name: 'Dây chuyền 2',
    factory: 'Phân xưởng 1',
    steps: [
      {
        id: 'step1',
        name: 'Máy ép',
        position: 1,
        devices: [
          {
            id: 'dc2_me1',
            name: 'Sau máy ép 3',
            sensor: 'Cảm biến hồng ngoại IR-2000',
            count: 4850,
            tileType: 'Gạch 80x80 vân đá',
            status: 'active',
            description: 'Đếm gạch sau khi qua máy ép thủy lực'
          },
          {
            id: 'dc2_me2',
            name: 'Sau máy ép 4',
            sensor: 'Cảm biến hồng ngoại IR-2000',
            count: 4789,
            tileType: 'Gạch 80x80 vân đá',
            status: 'active',
            description: 'Đếm gạch sau khi qua máy ép thủy lực'
          }
        ]
      },
      {
        id: 'step2',
        name: 'Lò nung',
        position: 2,
        devices: [
          {
            id: 'dc2_ln1',
            name: 'Trước lò nung 3',
            sensor: 'Cảm biến laser LX-3000',
            count: 3200,
            tileType: 'Gạch 80x80 vân đá',
            status: 'active',
            description: 'Đếm gạch trước khi vào lò nung'
          },
          {
            id: 'dc2_sln',
            name: 'Sau lò nung 2',
            sensor: 'Cảm biến nhiệt độ cao TS-5000',
            count: 2450,
            tileType: 'Gạch 80x80 vân đá',
            status: 'active',
            description: 'Đếm gạch sau khi qua lò nung'
          }
        ]
      },
      {
        id: 'step3',
        name: 'Đóng hộp',
        position: 3,
        devices: [
          {
            id: 'dc2_dh',
            name: 'Trước đóng hộp 2',
            sensor: 'Cảm biến đếm tự động AC-6000',
            count: 1950,
            tileType: 'Gạch 80x80 vân đá',
            status: 'active',
            description: 'Đếm gạch trước đóng hộp'
          }
        ]
      }
    ]
  },
  // Phân xưởng 2 - Dây chuyền 5
  {
    id: 'dc5',
    name: 'Dây chuyền 5',
    factory: 'Phân xưởng 2',
    steps: [
      {
        id: 'step1',
        name: 'Máy ép',
        position: 1,
        devices: [
          {
            id: 'dc5_me1',
            name: 'Sau máy ép 5',
            sensor: 'Cảm biến hồng ngoại IR-2000',
            count: 3920,
            tileType: 'Gạch 30x60 ốp tường',
            status: 'active',
            description: 'Đếm gạch sau khi qua máy ép'
          },
          {
            id: 'dc5_me2',
            name: 'Sau máy ép 6',
            sensor: 'Cảm biến hồng ngoại IR-2000',
            count: 3890,
            tileType: 'Gạch 30x60 ốp tường',
            status: 'active',
            description: 'Đếm gạch sau khi qua máy ép'
          }
        ]
      },
      {
        id: 'step2',
        name: 'Lò nung',
        position: 2,
        devices: [
          {
            id: 'dc5_ln1',
            name: 'Trước lò nung 5',
            sensor: 'Cảm biến laser LX-3000',
            count: 2600,
            tileType: 'Gạch 30x60 ốp tường',
            status: 'warning',
            description: 'Đếm gạch trước khi vào lò nung'
          },
          {
            id: 'dc5_sln',
            name: 'Sau lò nung 5',
            sensor: 'Cảm biến nhiệt độ cao TS-5000',
            count: 2100,
            tileType: 'Gạch 30x60 ốp tường',
            status: 'active',
            description: 'Đếm gạch sau khi qua lò nung'
          }
        ]
      },
      {
        id: 'step3',
        name: 'Đóng hộp',
        position: 3,
        devices: [
          {
            id: 'dc5_dh',
            name: 'Trước đóng hộp 5',
            sensor: 'Cảm biến đếm tự động AC-6000',
            count: 1850,
            tileType: 'Gạch 30x60 ốp tường',
            status: 'active',
            description: 'Đếm gạch trước đóng hộp'
          }
        ]
      }
    ]
  },
  // Phân xưởng 2 - Dây chuyền 6
  {
    id: 'dc6',
    name: 'Dây chuyền 6',
    factory: 'Phân xưởng 2',
    steps: [
      {
        id: 'step1',
        name: 'Máy ép',
        position: 1,
        devices: [
          {
            id: 'dc6_me1',
            name: 'Sau máy ép 7',
            sensor: 'Cảm biến hồng ngoại IR-2000',
            count: 4120,
            tileType: 'Gạch 40x40 lát sân',
            status: 'active',
            description: 'Đếm gạch sau khi qua máy ép'
          }
        ]
      },
      {
        id: 'step2',
        name: 'Lò nung',
        position: 2,
        devices: [
          {
            id: 'dc6_ln1',
            name: 'Trước lò nung 6',
            sensor: 'Cảm biến laser LX-3000',
            count: 2800,
            tileType: 'Gạch 40x40 lát sân',
            status: 'active',
            description: 'Đếm gạch trước khi vào lò nung'
          },
          {
            id: 'dc6_sln',
            name: 'Sau lò nung 6',
            sensor: 'Cảm biến nhiệt độ cao TS-5000',
            count: 2350,
            tileType: 'Gạch 40x40 lát sân',
            status: 'active',
            description: 'Đếm gạch sau khi qua lò nung'
          }
        ]
      },
      {
        id: 'step3',
        name: 'Đóng hộp',
        position: 3,
        devices: [
          {
            id: 'dc6_dh',
            name: 'Trước đóng hộp 6',
            sensor: 'Cảm biến đếm tự động AC-6000',
            count: 2100,
            tileType: 'Gạch 40x40 lát sân',
            status: 'active',
            description: 'Đếm gạch trước đóng hộp'
          }
        ]
      }
    ]
  }
];

export default function DashboardPage() {
  const [selectedDevice, setSelectedDevice] = useState<DeviceInfo | null>(null);
  const [selectedFactory, setSelectedFactory] = useState<string>('all');

  const factories = ['Phân xưởng 1', 'Phân xưởng 2'];
  
  const filteredLines = selectedFactory === 'all' 
    ? PRODUCTION_LINES 
    : PRODUCTION_LINES.filter(line => line.factory === selectedFactory);

  const handleDeviceClick = (device: DeviceInfo) => {
    setSelectedDevice(device);
  };

  const closeModal = () => {
    setSelectedDevice(null);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Factory size={32} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Dashboard Sản Xuất</h1>
            <p className={styles.subtitle}>Theo dõi quy trình sản xuất gạch men</p>
          </div>
        </div>

        {/* Factory Filter */}
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Lọc theo phân xưởng:</label>
          <select
            className={styles.filterSelect}
            value={selectedFactory}
            onChange={(e) => setSelectedFactory(e.target.value)}
          >
            <option value="all">Tất cả phân xưởng</option>
            {factories.map(factory => (
              <option key={factory} value={factory}>{factory}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Production Lines */}
      <div className={styles.linesContainer}>
        {filteredLines.map((line) => (
          <div key={line.id} className={styles.lineCard}>
            {/* Line Header */}
            <div className={styles.lineHeader}>
              <div className={styles.lineInfo}>
                <h2 className={styles.lineName}>{line.factory}</h2>
                <h3 className={styles.lineSubname}>{line.name}</h3>
              </div>
              <div className={styles.lineBadge}>
                <TrendingUp size={16} />
                <span>Đang hoạt động</span>
              </div>
            </div>

            {/* Timeline Flowchart */}
            <div className={styles.timeline}>
              {line.steps.map((step, stepIndex) => (
                <div key={step.id} className={styles.timelineStep}>
                  {/* Step Label */}
                  <div className={styles.stepLabel}>
                    <span className={styles.stepNumber}>{step.position}</span>
                    <span className={styles.stepName}>{step.name}</span>
                  </div>

                  {/* Devices Grid */}
                  <div className={styles.devicesGrid}>
                    {step.devices.map((device) => (
                      <div
                        key={device.id}
                        className={`${styles.deviceMilestone} ${styles[device.status]}`}
                        onClick={() => handleDeviceClick(device)}
                      >
                        <div className={styles.deviceDot}></div>
                        <div className={styles.deviceInfo}>
                          <div className={styles.deviceName}>{device.name}</div>
                          <div className={styles.deviceCount}>
                            {device.count.toLocaleString('vi-VN')} viên
                          </div>
                        </div>
                        <Info size={16} className={styles.infoIcon} />
                      </div>
                    ))}
                  </div>

                  {/* Connector Arrow */}
                  {stepIndex < line.steps.length - 1 && (
                    <div className={styles.connector}>
                      <div className={styles.arrow}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Device Detail Modal */}
      {selectedDevice && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{selectedDevice.name}</h3>
              <button className={styles.closeButton} onClick={closeModal}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Cảm biến:</span>
                <span className={styles.detailValue}>{selectedDevice.sensor}</span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Số lượng đo được:</span>
                <span className={styles.detailValue}>
                  {selectedDevice.count.toLocaleString('vi-VN')} viên
                </span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Loại gạch:</span>
                <span className={styles.detailValue}>{selectedDevice.tileType}</span>
              </div>

              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Trạng thái:</span>
                <span className={`${styles.statusBadge} ${styles[selectedDevice.status]}`}>
                  {selectedDevice.status === 'active' ? 'Hoạt động' : 
                   selectedDevice.status === 'warning' ? 'Cảnh báo' : 'Ngưng'}
                </span>
              </div>

              <div className={styles.detailDescription}>
                <span className={styles.detailLabel}>Mô tả:</span>
                <p>{selectedDevice.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
