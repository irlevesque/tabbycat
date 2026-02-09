import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

interface DeviceSettings {
  deviceId: string;
  tabLimit: number;
}

interface SyncedDeviceMetadata {
  deviceId: string;
  deviceName: string;
  browser: 'chrome' | 'firefox' | 'safari' | 'edge';
  os: string;
  groupColor: string;
  syncEnabled: boolean;
  registeredAt: number;
  lastSync: number;
}

interface TabData {
  url: string;
  title: string;
}

interface DeviceTabs {
  deviceId: string;
  deviceName: string;
  tabs: TabData[];
  lastSync: number;
}

interface AppSettings {
  syncInterval: number;
  autoSync: boolean;
  notifyOnSync: boolean;
  deviceName: string;
}

const Popup: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncedDevices, setSyncedDevices] = useState<SyncedDeviceMetadata[]>([]);
  const [deviceTabs, setDeviceTabs] = useState<DeviceTabs[]>([]);
  const [deviceSettings, setDeviceSettings] = useState<Record<string, DeviceSettings>>({});
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');
  const [currentDeviceTabCount, setCurrentDeviceTabCount] = useState(0);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    syncInterval: 30,
    autoSync: true,
    notifyOnSync: true,
    deviceName: ''
  });
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSyncedDevices();
      loadDeviceSettings();
      loadAppSettings();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const result = await chrome.storage.local.get('authToken');
    const deviceIdResult = await chrome.storage.local.get('deviceId');
    setCurrentDeviceId(deviceIdResult.deviceId || '');

    if (result.authToken) {
      setIsAuthenticated(true);
      fetchDevices(result.authToken);
    } else {
      setLoading(false);
    }
  };

  const fetchDevices = async (token: string) => {
    try {
      const response = await fetch('http://localhost:3000/api/devices', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDeviceTabs(data);

        const deviceIdResult = await chrome.storage.local.get('deviceId');
        const currentDeviceId = deviceIdResult.deviceId;
        const currentDevice = data.find((d: DeviceTabs) => d.deviceId === currentDeviceId);
        setCurrentDeviceTabCount(currentDevice ? currentDevice.tabs.length : 0);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncedDevices = async () => {
    const result = await chrome.storage.local.get('syncedDevices');
    const deviceIdResult = await chrome.storage.local.get('deviceId');
    const currentDeviceId = deviceIdResult.deviceId;

    if (result.syncedDevices) {
      const devices: SyncedDeviceMetadata[] = Object.values(result.syncedDevices)
        .filter((d: any) => d.deviceId !== currentDeviceId)
        .map((d: any) => ({
          deviceId: d.deviceId,
          deviceName: d.deviceName,
          browser: d.browser,
          os: d.os,
          groupColor: d.groupColor,
          syncEnabled: d.syncEnabled,
          registeredAt: d.registeredAt,
          lastSync: d.lastSync
        })).sort((a: any, b: any) => b.lastSync - a.lastSync);
      setSyncedDevices(devices);
    }
  };

  const loadDeviceSettings = async () => {
    const result = await chrome.storage.local.get('deviceSettings');
    if (result.deviceSettings) {
      setDeviceSettings(result.deviceSettings);
    }
  };

  const loadAppSettings = async () => {
    const result = await chrome.storage.local.get([
      'syncInterval',
      'autoSync',
      'notifyOnSync',
      'deviceName'
    ]);

    setAppSettings({
      syncInterval: result.syncInterval || 30,
      autoSync: result.autoSync !== undefined ? result.autoSync : true,
      notifyOnSync: result.notifyOnSync !== undefined ? result.notifyOnSync : true,
      deviceName: result.deviceName || getDefaultDeviceName()
    });
  };

  const getDefaultDeviceName = () => {
    const platform = navigator.userAgent;
    let browser = 'Unknown';
    let os = 'Unknown';

    if (platform.includes('Chrome')) browser = 'Chrome';
    else if (platform.includes('Firefox')) browser = 'Firefox';
    else if (platform.includes('Safari')) browser = 'Safari';
    else if (platform.includes('Edge')) browser = 'Edge';

    if (platform.includes('Windows')) os = 'Windows';
    else if (platform.includes('Mac')) os = 'macOS';
    else if (platform.includes('Linux')) os = 'Linux';
    else if (platform.includes('Android')) os = 'Android';
    else if (platform.includes('iOS')) os = 'iOS';

    return `${browser} on ${os}`;
  };

  const handleSaveSettings = async () => {
    await chrome.storage.local.set(appSettings);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleResetSettings = async () => {
    const defaultSettings = {
      syncInterval: 30,
      autoSync: true,
      notifyOnSync: true,
      deviceName: getDefaultDeviceName()
    };
    await chrome.storage.local.set(defaultSettings);
    setAppSettings(defaultSettings);
  };

  const handleLogin = async () => {
    try {
      console.log('Starting authentication flow...');

      // Generate a unique tokenId for this authentication attempt
      const tokenId = crypto.randomUUID();
      await chrome.storage.local.set({ pendingTokenId: tokenId });

      chrome.runtime.sendMessage({ action: 'startAuth', tokenId }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Failed to start auth polling:', chrome.runtime.lastError);
        } else {
          console.log('Auth polling started successfully with tokenId:', tokenId);
        }
      });

      const extensionId = chrome.runtime.id;
      console.log('Opening OAuth with extensionId:', extensionId);
      chrome.tabs.create({
        url: `http://localhost:3000/auth/google?extensionId=${extensionId}`
      });
    } catch (error) {
      console.error('Error in handleLogin:', error);
    }
  };

  const handleLogout = async () => {
    await chrome.storage.local.remove(['authToken', 'userId']);
    chrome.runtime.sendMessage({ action: 'logout' });
    setIsAuthenticated(false);
    setSyncedDevices([]);
    setDeviceTabs([]);
  };

  const handleSync = async () => {
    setSyncStatus('syncing');
    chrome.runtime.sendMessage({ action: 'sync' });
    setTimeout(() => {
      loadSyncedDevices();
      setSyncStatus('idle');
    }, 2000);
  };

  const handleToggleSync = async (deviceId: string, enabled: boolean) => {
    chrome.runtime.sendMessage({ action: 'toggleSync', deviceId, enabled });
    setSyncedDevices(prev =>
      prev.map(d => d.deviceId === deviceId ? { ...d, syncEnabled: enabled } : d)
    );
  };

  const handleCleanup = async (deviceId: string) => {
    if (confirm('Remove all tabs from this device?')) {
      chrome.runtime.sendMessage({ action: 'cleanupDevice', deviceId });
      setDeviceTabs(prev => prev.filter(d => d.deviceId !== deviceId));
    }
  };

  const handleColorChange = async (deviceId: string, color: string) => {
    chrome.runtime.sendMessage({ action: 'updateDeviceColor', deviceId, color });
    setSyncedDevices(prev =>
      prev.map(d => d.deviceId === deviceId ? { ...d, groupColor: color } : d)
    );
  };

  const handleTabLimitChange = async (deviceId: string, limit: number) => {
    const clampedLimit = Math.min(Math.max(limit, 0), 100);
    chrome.runtime.sendMessage({ action: 'updateTabLimit', deviceId, limit: clampedLimit });
    setDeviceSettings(prev => ({
      ...prev,
      [deviceId]: { ...prev[deviceId], tabLimit: clampedLimit }
    }));
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffSecs < 20) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getBrowserInfo = () => {
    const userAgent = navigator.userAgent;

    if (userAgent.includes('Chrome')) return { name: 'chrome', icon: '🌐' };
    if (userAgent.includes('Firefox')) return { name: 'firefox', icon: '🦊' };
    if (userAgent.includes('Safari')) return { name: 'safari', icon: '🧭' };
    if (userAgent.includes('Edge')) return { name: 'edge', icon: '📘' };

    return { name: 'chrome', icon: '🌐' };
  };

  const getBrowserIcon = (browser: string) => {
    switch (browser) {
      case 'chrome': return '🌐';
      case 'firefox': return '🦊';
      case 'safari': return '🧭';
      case 'edge': return '📘';
      default: return '💻';
    }
  };

  const handleOpenTab = (url: string) => {
    chrome.tabs.create({ url });
  };

  if (loading) {
    return <div className="popup loading">Loading...</div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="popup">
        <div className="header">
          <h2>Tabbycat 😺</h2>
        </div>
        <div className="content">
          <p>Sign in to sync your tabs across browsers</p>
          <button className="btn btn-primary" onClick={handleLogin}>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="popup">
      <div className="header">
        <h2>Tabbycat 😸</h2>
        <button className="btn-icon" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div className="actions">
        <button
          className={`btn ${syncStatus === 'syncing' ? 'btn-syncing' : 'btn-primary'}`}
          onClick={handleSync}
          disabled={syncStatus === 'syncing'}
        >
          {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowSettings(!showSettings)}
        >
          {showSettings ? '▲ Hide' : '▼ Settings'}
        </button>
      </div>

      {showSettings && (
        <div className="settings-section">
          <h3>Settings</h3>

          <div className="setting">
            <label htmlFor="deviceName">Device Name</label>
            <input
              id="deviceName"
              type="text"
              value={appSettings.deviceName}
              onChange={(e) => setAppSettings({ ...appSettings, deviceName: e.target.value })}
              placeholder="My Chrome on Windows"
              className="setting-input"
            />
            <small>Identify this device in your synced devices list</small>
          </div>

          <div className="setting">
            <label htmlFor="autoSync">
              <input
                id="autoSync"
                type="checkbox"
                checked={appSettings.autoSync}
                onChange={(e) => setAppSettings({ ...appSettings, autoSync: e.target.checked })}
              />
              Auto-sync tabs
            </label>
            <small>Automatically sync your tabs in the background</small>
          </div>

          {appSettings.autoSync && (
            <div className="setting">
              <label htmlFor="syncInterval">Sync Interval (seconds)</label>
              <input
                id="syncInterval"
                type="number"
                min="10"
                max="300"
                value={appSettings.syncInterval}
                onChange={(e) => setAppSettings({ ...appSettings, syncInterval: parseInt(e.target.value) || 30 })}
                className="setting-input"
              />
              <small>How often to sync tabs (minimum 10 seconds)</small>
            </div>
          )}

          <div className="setting">
            <label htmlFor="notifyOnSync">
              <input
                id="notifyOnSync"
                type="checkbox"
                checked={appSettings.notifyOnSync}
                onChange={(e) => setAppSettings({ ...appSettings, notifyOnSync: e.target.checked })}
              />
              Show notifications on sync
            </label>
            <small>Get notified when tabs are synced from other devices</small>
          </div>

          <div className="settings-actions">
            <button className="btn btn-primary" onClick={handleSaveSettings}>
              {settingsSaved ? 'Saved!' : 'Save Settings'}
            </button>
            <button className="btn btn-secondary" onClick={handleResetSettings}>
              Reset
            </button>
          </div>
        </div>
      )}

      <div className="current-device">
        <h3>This Device</h3>
        <div className="device current">
          <div className="device-header">
            <div className="device-title">
              <span className="device-icon">{getBrowserInfo().icon}</span>
              <span className="device-name">
                {appSettings.deviceName || 'This Device'}
              </span>
            </div>
            <div className="device-meta">
              <span className="device-time">
                {syncStatus === 'syncing' ? 'Syncing...' : formatTime(Date.now())}
              </span>
            </div>
          </div>
          <div className="device-stats">
            <span className="tab-count">{currentDeviceTabCount} tabs synced</span>
            <span className="sync-status">
              {syncStatus === 'syncing' ? '🔄' : '✓'} Sync active
            </span>
          </div>
        </div>
      </div>

      <div className="devices">
        <h3>Other Synced Devices</h3>
        {syncedDevices.length === 0 ? (
          <p className="empty">No devices synced yet</p>
        ) : (
          syncedDevices.map(device => (
            <div key={device.deviceId} className="device">
              <div className="device-header">
                <div className="device-title">
                  <span className="device-icon">{getBrowserIcon(device.browser)}</span>
                  <span className="device-name">{device.deviceName}</span>
                </div>
                <div className="device-meta">
                  <span className="device-time">
                    {formatTime(device.lastSync)}
                  </span>
                </div>
              </div>

              <div className="device-controls">
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={device.syncEnabled}
                    onChange={(e) => handleToggleSync(device.deviceId, e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Sync</span>
                </label>

                <div className="color-picker">
                  <span className="color-label">Color:</span>
                  {['grey', 'blue', 'red', 'yellow', 'green', 'pink', 'purple', 'cyan'].map(color => (
                    <button
                      key={color}
                      className={`color-dot ${device.groupColor === color ? 'active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorChange(device.deviceId, color)}
                    />
                  ))}
                </div>

                <div className="tab-limit">
                  <label htmlFor={`limit-${device.deviceId}`}>
                    Limit:
                  </label>
                  <input
                    id={`limit-${device.deviceId}`}
                    type="number"
                    min="0"
                    max="100"
                    value={deviceSettings[device.deviceId]?.tabLimit || 50}
                    onChange={(e) => handleTabLimitChange(device.deviceId, parseInt(e.target.value) || 50)}
                    className="limit-input"
                  />
                </div>

                <button
                  className="btn-cleanup"
                  onClick={() => handleCleanup(device.deviceId)}
                >
                  Cleanup
                </button>
              </div>

              {device.syncEnabled && (
                <div className="tabs-list">
                  {(() => {
                    const tabs = deviceTabs.find(d => d.deviceId === device.deviceId)?.tabs || [];
                    return tabs.slice(0, 5).map((tab, index) => (
                      <div
                        key={index}
                        className="tab-item"
                        onClick={() => handleOpenTab(tab.url)}
                      >
                        {tab.title}
                      </div>
                    ));
                  })()}
                  {(() => {
                    const tabs = deviceTabs.find(d => d.deviceId === device.deviceId)?.tabs || [];
                    return tabs.length > 5 && (
                      <div className="tab-item more">
                        +{tabs.length - 5} more tabs
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(<Popup />);
