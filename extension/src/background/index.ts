import { Tab, TabGroup, SyncData, SyncedDeviceMetadata, SyncedTabInfo, DeviceSettings } from '../types';

// Type declarations for Chrome APIs
declare const chrome: any;

const SYNC_INTERVAL = 30000;
const SYNC_GROUP_EMOJI = '📡';
const DEFAULT_TAB_LIMIT = 50;
const MAX_TAB_LIMIT = 100;
const GROUP_COLORS = ['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'];

let syncInterval: number | null = null;
let authPollInterval: number | null = null;

chrome.runtime.onInstalled.addListener(() => {
  console.log('Tabbycat Extension installed');
  initializeDeviceSettings();
  startSync();
});

chrome.runtime.onStartup.addListener(() => {
  startSync();
});

async function initializeDeviceSettings() {
  const result = await chrome.storage.local.get('deviceSettings');

  if (!result.deviceSettings) {
    const settings: Record<string, DeviceSettings> = {};
    await chrome.storage.local.set({ deviceSettings: settings });
  }
}

async function startSync() {
  const token = await getAuthToken();
  if (token) {
    if (syncInterval) clearInterval(syncInterval);
    syncInterval = setInterval(() => {
      syncTabs(token);
    }, SYNC_INTERVAL);
    syncTabs(token);
  }
}

async function getAuthToken(): Promise<string | null> {
  const result = await chrome.storage.local.get('authToken');
  return result.authToken || null;
}

async function getDeviceId(): Promise<string> {
  const result = await chrome.storage.local.get('deviceId');
  if (result.deviceId) return result.deviceId;

  const deviceId = crypto.randomUUID();
  await chrome.storage.local.set({ deviceId });
  return deviceId;
}

async function getUserId(token: string): Promise<string> {
  const result = await chrome.storage.local.get('userId');
  return result.userId || '';
}

function getBrowserInfo() {
  const userAgent = navigator.userAgent;

  if (userAgent.includes('Chrome')) return { name: 'chrome', supportsTabGroups: true };
  if (userAgent.includes('Firefox')) return { name: 'firefox', supportsTabGroups: false };
  if (userAgent.includes('Safari')) return { name: 'safari', supportsTabGroups: true };
  if (userAgent.includes('Edge')) return { name: 'edge', supportsTabGroups: true };

  return { name: 'chrome', supportsTabGroups: true };
}

async function getSyncedDevices(): Promise<Record<string, SyncedDeviceMetadata>> {
  const result = await chrome.storage.local.get('syncedDevices');
  return result.syncedDevices || {};
}

async function getEnabledSyncedDevices(): Promise<SyncedDeviceMetadata[]> {
  const syncedDevices = await getSyncedDevices();
  return Object.values(syncedDevices).filter(d => d.syncEnabled);
}

async function getSyncedTabs(): Promise<SyncedTabInfo[]> {
  const result = await chrome.storage.local.get('syncedTabs');
  return result.syncedTabs || [];
}

async function getDeviceSettings(): Promise<Record<string, DeviceSettings>> {
  const result = await chrome.storage.local.get('deviceSettings');
  return result.deviceSettings || {};
}

function generateRandomColor(): string {
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)];
}


async function syncTabs(token: string) {
  try {
    const browserInfo = getBrowserInfo();

    if (browserInfo.supportsTabGroups) {
      await syncChrome(token);
    } else {
      await syncFirefox(token);
    }
  } catch (error) {
    console.error('Error syncing tabs:', error);
  }
}

async function syncChrome(token: string) {
  const allGroups = await chrome.tabGroups.query({});
  const syncedGroups = allGroups.filter(group =>
    group.title && group.title.includes(SYNC_GROUP_EMOJI)
  );
  const syncedGroupIds = new Set(syncedGroups.map(g => g.id));

  const allTabs = await chrome.tabs.query({});
  const nativeTabs = allTabs.filter(tab =>
    tab.groupId && !syncedGroupIds.has(tab.groupId)
  );

  const formattedTabs: Tab[] = nativeTabs.map(tab => ({
    id: String(tab.id),
    url: tab.url || '',
    title: tab.title || '',
    faviconUrl: tab.favIconUrl,
    active: tab.active,
    windowId: String(tab.windowId),
    index: tab.index,
    groupId: tab.groupId ? String(tab.groupId) : undefined,
    pinned: tab.pinned,
    lastAccessed: (tab as any).lastAccessed || Date.now()
  }));

  const formattedGroups: TabGroup[] = allGroups
    .filter(group => group.id && !syncedGroupIds.has(group.id))
    .map(group => ({
      id: String(group.id),
      title: group.title || 'Untitled',
      color: group.color,
      collapsed: group.collapsed,
      windowId: String(group.windowId),
      tabs: nativeTabs.filter(tab => tab.groupId && tab.groupId === group.id).map(tab => String(tab.id))
    }));

  await sendSyncData(token, formattedTabs, formattedGroups);
  await applyRemoteTabsChrome(token);
}

async function syncFirefox(token: string) {
  const syncedTabs = await getSyncedTabs();
  const syncedUrls = new Set(syncedTabs.map(t => t.url));

  const allTabs = await chrome.tabs.query({});
  const nativeTabs = allTabs.filter(tab =>
    tab.url && !syncedUrls.has(tab.url) && !tab.discarded
  );

  const formattedTabs: Tab[] = nativeTabs.map(tab => ({
    id: String(tab.id),
    url: tab.url || '',
    title: tab.title || '',
    faviconUrl: tab.favIconUrl,
    active: tab.active,
    windowId: String(tab.windowId),
    index: tab.index,
    groupId: undefined,
    pinned: tab.pinned,
    lastAccessed: (tab as any).lastAccessed || Date.now()
  }));

  await sendSyncData(token, formattedTabs, []);
  await applyRemoteTabsFirefox(token);
}

async function sendSyncData(token: string, tabs: Tab[], tabGroups: TabGroup[]) {
  const deviceId = await getDeviceId();

  const syncData: SyncData = {
    userId: await getUserId(token),
    deviceId,
    tabs,
    tabGroups,
    timestamp: Date.now()
  };

  const response = await fetch('http://localhost:3000/api/sync', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(syncData)
  });

  if (response.ok) {
    const data = await response.json();
    await updateSyncedDevices(data);
  }
}

async function updateSyncedDevices(data: any) {
  const currentDevices = await getSyncedDevices();
  const newDevices: Record<string, SyncedDeviceMetadata> = { ...currentDevices };
  const currentDeviceId = await getDeviceId();

  for (const [deviceId, deviceData] of Object.entries(data.deviceTabs)) {
    const existing = currentDevices[deviceId];
    const browserInfo = getBrowserInfo();

    if (!existing) {
      newDevices[deviceId] = {
        deviceId,
        deviceName: (deviceData as any).deviceName,
        browser: browserInfo.name as any,
        os: navigator.platform,
        groupColor: generateRandomColor(),
        syncEnabled: true,
        registeredAt: Date.now(),
        lastSync: Date.now()
      };
    } else {
      newDevices[deviceId] = {
        ...existing,
        lastSync: Date.now()
      };
    }
  }

  await chrome.storage.local.set({ syncedDevices: newDevices });
}

async function applyRemoteTabsChrome(token: string) {
  const enabledDevices = await getEnabledSyncedDevices();
  const deviceSettings = await getDeviceSettings();

  for (const device of enabledDevices) {
    const settings = deviceSettings[device.deviceId] || {
      tabLimit: DEFAULT_TAB_LIMIT,
      syncToMainWindows: true
    };

    const tabsToCreate = await fetchDeviceTabs(device.deviceId, settings.tabLimit);
    if (!tabsToCreate) continue;

    await createOrUpdateSyncedGroupChrome(device, tabsToCreate);
  }
}

async function applyRemoteTabsFirefox(token: string) {
  const enabledDevices = await getEnabledSyncedDevices();
  const deviceSettings = await getDeviceSettings();
  const syncedTabs = await getSyncedTabs();

  for (const device of enabledDevices) {
    const settings = deviceSettings[device.deviceId] || {
      tabLimit: DEFAULT_TAB_LIMIT,
      syncToMainWindows: true
    };

    const tabsToCreate = await fetchDeviceTabs(device.deviceId, settings.tabLimit);
    if (!tabsToCreate) continue;

    await createOrUpdateSyncedTabsFirefox(device, tabsToCreate, syncedTabs);
  }

  await chrome.storage.local.set({ syncedTabs });
}

async function fetchDeviceTabs(deviceId: string, limit: number): Promise<Tab[] | null> {
  try {
    const token = await getAuthToken();
    if (!token) return null;

    const response = await fetch('http://localhost:3000/api/devices', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return null;

    const devices = await response.json() as any[];
    const device = devices.find(d => d.deviceId === deviceId);

    if (!device) return null;

    return device.tabs.slice(0, limit).map((t: any) => ({
      id: t.url,
      url: t.url,
      title: t.title,
      faviconUrl: undefined,
      active: false,
      windowId: '',
      index: 0,
      groupId: undefined,
      pinned: false,
      lastAccessed: Date.now()
    }));
  } catch (error) {
    console.error('Error fetching device tabs:', error);
    return null;
  }
}

async function createOrUpdateSyncedGroupChrome(device: SyncedDeviceMetadata, tabs: Tab[]) {
  const groupName = `${device.deviceName} ${SYNC_GROUP_EMOJI}`;
  const allGroups = await chrome.tabGroups.query({});

  let group = allGroups.find(g => g.title === groupName);

  if (!group && typeof chrome.tabGroups !== 'undefined') {
    try {
      const newTab = await chrome.tabs.create({ url: 'about:blank' });
      if (newTab.id) {
        const newGroupId = await chrome.tabs.group({ tabIds: [newTab.id] });
        group = await chrome.tabGroups.get(newGroupId);
        if (group) {
          await chrome.tabGroups.update(newGroupId, { title: groupName, color: device.groupColor as any, collapsed: true });
          // @ts-ignore - Type mismatch
          await chrome.tabs.remove(newTab.id);
        }
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  }

  if (!group) return;

  const allTabs = await chrome.tabs.query({ groupId: group.id });
  const existingUrls = new Set(allTabs.map(t => t.url));

  for (const tab of tabs) {
    if (!tab.url) continue;

    if (existingUrls.has(tab.url)) {
      const existingTab = allTabs.find(t => t.url === tab.url);
      if (existingTab && existingTab.groupId !== group.id && existingTab.id) {
        // @ts-ignore - Type mismatch
        await chrome.tabs.group({ tabIds: [existingTab.id], groupId: group.id });
      }
      continue;
    }

    const newTab = await chrome.tabs.create({
      url: tab.url,
      active: false,
      index: 999
    });

    if (newTab.id) {
      // @ts-ignore - Type mismatch
      await chrome.tabs.group({ tabIds: [newTab.id], groupId: group.id });
    }
  }
}

// @ts-ignore - TypeScript strict null checking in this function
async function createOrUpdateSyncedTabsFirefox(device: SyncedDeviceMetadata, tabs: Tab[], syncedTabs: SyncedTabInfo[]) {
  const allTabs = await chrome.tabs.query({});
  const syncedUrls = new Set(syncedTabs.map(t => t.url));

  for (const tab of tabs) {
    if (!tab.url) continue;

    const existingTab = allTabs.find(t => t.url === tab.url);

    if (existingTab) {
      if (!syncedUrls.has(tab.url) && existingTab.id) {
        syncedTabs.push({
          tabId: String((existingTab.id as number)),
          sourceDeviceId: device.deviceId,
          url: tab.url,
          syncedAt: Date.now()
        } as SyncedTabInfo);
      }
    } else {
      const newTab = await chrome.tabs.create({
        url: tab.url,
        active: false
      });

      if (newTab.id) {
        syncedTabs.push({
          tabId: String((newTab.id as number)),
          sourceDeviceId: device.deviceId,
          url: tab.url,
          syncedAt: Date.now()
        } as SyncedTabInfo);
      }
    }
  }
}

async function startAuthPolling(tokenId?: string) {
  console.log('[Auth Polling] Starting auth polling with tokenId:', tokenId);

  if (authPollInterval) {
    clearInterval(authPollInterval);
  }

  const extensionId = chrome.runtime.id;
  console.log('[Auth Polling] Extension ID:', extensionId);

  const maxAttempts = 60; // Poll for up to 60 seconds (increased from 30)
  let attempts = 0;

  authPollInterval = setInterval(async () => {
    attempts++;
    console.log(`[Auth Polling] Attempt ${attempts}/${maxAttempts}`);

    try {
      // Build polling URL with tokenId (primary) and extensionId (fallback)
      let pollUrl = `http://localhost:3000/auth/poll`;
      const params = new URLSearchParams();

      if (tokenId) {
        params.append('tokenId', tokenId);
      }
      if (extensionId) {
        params.append('extensionId', extensionId);
      }

      if (params.toString()) {
        pollUrl += `?${params.toString()}`;
      }

      console.log('[Auth Polling] Polling URL:', pollUrl);

      const response = await fetch(pollUrl);
      const data = await response.json();

      console.log('[Auth Polling] Response:', data);

      if (data.found && data.token) {
        clearInterval(authPollInterval);
        authPollInterval = null;

        const decoded = JSON.parse(atob(data.token.split('.')[1]));
        await chrome.storage.local.set({ authToken: data.token, userId: decoded.userId, pendingTokenId: null });

        startSync();
        console.log('[Auth Polling] Authentication successful via polling');
      }

      if (attempts >= maxAttempts) {
        clearInterval(authPollInterval);
        authPollInterval = null;
        console.log('[Auth Polling] Auth polling timeout - token may need to be manually entered');
      }
    } catch (error) {
      console.error('[Auth Polling] Error polling for auth token:', error);
    }
  }, 1000); // Poll every second
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'sync') {
    getAuthToken().then(token => {
      if (token) {
        syncTabs(token);
      }
    });
  } else if (request.action === 'logout') {
    if (syncInterval) clearInterval(syncInterval);
    if (authPollInterval) clearInterval(authPollInterval);
    chrome.storage.local.remove(['authToken', 'userId']);
  } else if (request.action === 'startAuth') {
    startAuthPolling(request.tokenId);
  } else if (request.action === 'cleanupDevice') {
    cleanupDevice(request.deviceId).then(sendResponse);
    return true;
  } else if (request.action === 'toggleSync') {
    toggleDeviceSync(request.deviceId, request.enabled).then(sendResponse);
    return true;
  } else if (request.action === 'updateDeviceColor') {
    updateDeviceColor(request.deviceId, request.color).then(sendResponse);
    return true;
  } else if (request.action === 'updateTabLimit') {
    updateTabLimit(request.deviceId, request.limit).then(sendResponse);
    return true;
  }
});

chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_SUCCESS' && request.token) {
    chrome.storage.local.set({ authToken: request.token }).then(() => {
      const decoded = JSON.parse(atob(request.token.split('.')[1]));
      chrome.storage.local.set({ userId: decoded.userId }).then(() => {
        startSync();
        sendResponse({ success: true });
      });
    });
    return true;
  }
});

async function cleanupDevice(deviceId: string) {
  console.log('Cleanup not yet implemented for', deviceId);
}

async function toggleDeviceSync(deviceId: string, enabled: boolean) {
  const syncedDevices = await getSyncedDevices();
  if (syncedDevices[deviceId]) {
    syncedDevices[deviceId].syncEnabled = enabled;
    await chrome.storage.local.set({ syncedDevices });
  }
}

async function updateDeviceColor(deviceId: string, color: string) {
  const syncedDevices = await getSyncedDevices();
  if (syncedDevices[deviceId]) {
    syncedDevices[deviceId].groupColor = color;
    await chrome.storage.local.set({ syncedDevices });
  }
}

async function updateTabLimit(deviceId: string, limit: number) {
  const deviceSettings = await getDeviceSettings();
  deviceSettings[deviceId] = deviceSettings[deviceId] || {
    deviceId,
    tabLimit: DEFAULT_TAB_LIMIT,
    syncToMainWindows: true
  };
  deviceSettings[deviceId].tabLimit = Math.min(Math.max(limit, 0), MAX_TAB_LIMIT);
  await chrome.storage.local.set({ deviceSettings });
}
