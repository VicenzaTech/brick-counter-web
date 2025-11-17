export const PERMISSIONS = {
    // User management
    USER_READ: 'user.read',
    USER_CREATE: 'user.create',
    USER_UPDATE: 'user.update',
    USER_DELETE: 'user.delete',
    USER_DISABLE: 'user.disable',

    // Role management
    ROLE_READ: 'role.read',
    ROLE_CREATE: 'role.create',
    ROLE_UPDATE: 'role.update',
    ROLE_DELETE: 'role.delete',

    // Workshop / production structure
    WORKSHOP_READ: 'workshop.read',
    WORKSHOP_CREATE: 'workshop.create',
    WORKSHOP_UPDATE: 'workshop.update',
    WORKSHOP_DELETE: 'workshop.delete',

    PRODUCTION_LINE_READ: 'production-line.read',
    PRODUCTION_LINE_CREATE: 'production-line.create',
    PRODUCTION_LINE_UPDATE: 'production-line.update',
    PRODUCTION_LINE_DELETE: 'production-line.delete',

    POSITION_READ: 'position.read',
    POSITION_CREATE: 'position.create',
    POSITION_UPDATE: 'position.update',
    POSITION_DELETE: 'position.delete',

    // Devices & telemetry
    DEVICE_READ: 'device.read',
    DEVICE_CREATE: 'device.create',
    DEVICE_UPDATE: 'device.update',
    DEVICE_DELETE: 'device.delete',

    // Production & brick types
    PRODUCTION_READ: 'production.read',
    PRODUCTION_CREATE: 'production.create',
    PRODUCTION_UPDATE: 'production.update',
    PRODUCTION_DELETE: 'production.delete',

    BRICK_TYPE_READ: 'brick-type.read',
    BRICK_TYPE_CREATE: 'brick-type.create',
    BRICK_TYPE_UPDATE: 'brick-type.update',
    BRICK_TYPE_DELETE: 'brick-type.delete',

    // Metrics & quotas
    PRODUCTION_METRIC_READ: 'production-metric.read',
    PRODUCTION_METRIC_CREATE: 'production-metric.create',
    PRODUCTION_METRIC_UPDATE: 'production-metric.update',
    PRODUCTION_METRIC_DELETE: 'production-metric.delete',

    QUOTA_TARGET_READ: 'quota-target.read',
    QUOTA_TARGET_CREATE: 'quota-target.create',
    QUOTA_TARGET_UPDATE: 'quota-target.update',
    QUOTA_TARGET_DELETE: 'quota-target.delete',

    // Maintenance
    MAINTENANCE_LOG_READ: 'maintenance-log.read',
    MAINTENANCE_LOG_CREATE: 'maintenance-log.create',
    MAINTENANCE_LOG_UPDATE: 'maintenance-log.update',
    MAINTENANCE_LOG_DELETE: 'maintenance-log.delete',

    // Notification

} as const

export const PERMISSION_GROUPS = {
    USER_MANAGE: [
        PERMISSIONS.USER_READ,
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_DELETE,
        PERMISSIONS.USER_DISABLE,
    ],
    ROLE_MANAGE: [
        PERMISSIONS.ROLE_READ,
        PERMISSIONS.ROLE_CREATE,
        PERMISSIONS.ROLE_UPDATE,
        PERMISSIONS.ROLE_DELETE,
    ],
    WORKSHOP_MANAGE: [
        PERMISSIONS.WORKSHOP_READ,
        PERMISSIONS.WORKSHOP_CREATE,
        PERMISSIONS.WORKSHOP_UPDATE,
        PERMISSIONS.WORKSHOP_DELETE,
    ],
    PRODUCTION_LINE_MANAGE: [
        PERMISSIONS.PRODUCTION_LINE_READ,
        PERMISSIONS.PRODUCTION_LINE_CREATE,
        PERMISSIONS.PRODUCTION_LINE_UPDATE,
        PERMISSIONS.PRODUCTION_LINE_DELETE,
    ],
    POSITION_MANAGE: [
        PERMISSIONS.POSITION_READ,
        PERMISSIONS.POSITION_CREATE,
        PERMISSIONS.POSITION_UPDATE,
        PERMISSIONS.POSITION_DELETE,
    ],
    DEVICE_MANAGE: [
        PERMISSIONS.DEVICE_READ,
        PERMISSIONS.DEVICE_CREATE,
        PERMISSIONS.DEVICE_UPDATE,
        PERMISSIONS.DEVICE_DELETE,
    ],
    PRODUCTION_MANAGE: [
        PERMISSIONS.PRODUCTION_READ,
        PERMISSIONS.PRODUCTION_CREATE,
        PERMISSIONS.PRODUCTION_UPDATE,
        PERMISSIONS.PRODUCTION_DELETE,
    ],
    BRICK_TYPE_MANAGE: [
        PERMISSIONS.BRICK_TYPE_READ,
        PERMISSIONS.BRICK_TYPE_CREATE,
        PERMISSIONS.BRICK_TYPE_UPDATE,
        PERMISSIONS.BRICK_TYPE_DELETE,
    ],
    PRODUCTION_METRIC_MANAGE: [
        PERMISSIONS.PRODUCTION_METRIC_READ,
        PERMISSIONS.PRODUCTION_METRIC_CREATE,
        PERMISSIONS.PRODUCTION_METRIC_UPDATE,
        PERMISSIONS.PRODUCTION_METRIC_DELETE,
    ],
    QUOTA_TARGET_MANAGE: [
        PERMISSIONS.QUOTA_TARGET_READ,
        PERMISSIONS.QUOTA_TARGET_CREATE,
        PERMISSIONS.QUOTA_TARGET_UPDATE,
        PERMISSIONS.QUOTA_TARGET_DELETE,
    ],
    MAINTENANCE_LOG_MANAGE: [
        PERMISSIONS.MAINTENANCE_LOG_READ,
        PERMISSIONS.MAINTENANCE_LOG_CREATE,
        PERMISSIONS.MAINTENANCE_LOG_UPDATE,
        PERMISSIONS.MAINTENANCE_LOG_DELETE,
    ],
} as const

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
export type PermissionGroupKey = keyof typeof PERMISSION_GROUPS
