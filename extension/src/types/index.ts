export interface Tab {
  id: string;
  url: string;
  title: string;
  faviconUrl?: string;
  active: boolean;
  windowId: string;
  index: number;
  groupId?: string;
  pinned: boolean;
  lastAccessed: number;
}

export interface TabGroup {
  id: string;
  title: string;
  color: string;
  collapsed: boolean;
  windowId: string;
  tabs: string[];
}

export interface Device {
  id: string;
  name: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  os: string;
  lastSync: number;
}

export interface SyncData {
  userId: string;
  deviceId: string;
  tabs: Tab[];
  tabGroups: TabGroup[];
  timestamp: number;
}

export interface SyncedDeviceMetadata {
  deviceId: string;
  deviceName: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  os: string;
  groupColor: string;
  syncEnabled: boolean;
  registeredAt: number;
  lastSync: number;
}

export interface SyncedTabInfo {
  tabId: string;
  sourceDeviceId: string;
  url: string;
  syncedAt: number;
}

export interface DeviceSettings {
  deviceId: string;
  tabLimit: number;
  syncToMainWindows: boolean;
}
