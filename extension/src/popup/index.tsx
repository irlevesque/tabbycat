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

const Popup: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [syncedDevices, setSyncedDevices] = useState<SyncedDeviceMetadata[]>([]);
  const [deviceTabs, setDeviceTabs] = useState<DeviceTabs[]>([]);
  const [deviceSettings, setDeviceSettings] = useState<Record<string, DeviceSettings>>({});
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadSyncedDevices();
      loadDeviceSettings();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const result = await chrome.storage.local.get('authToken');
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
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSyncedDevices = async () => {
    const result = await chrome.storage.local.get('syncedDevices');
    if (result.syncedDevices) {
      const devices: SyncedDeviceMetadata[] = Object.values(result.syncedDevices).map((d: any) => ({
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

  const handleLogin = () => {
    chrome.tabs.create({
      url: 'http://localhost:3000/auth/google'
    });
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
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
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
          <h2>Tab Sync</h2>
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
        <h2>Tab Sync</h2>
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
        <a 
          href="options.html" 
          target="_blank" 
          className="btn btn-secondary"
        >
          Settings
        </a>
      </div>

      <div className="devices">
        <h3>Synced Devices</h3>
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
