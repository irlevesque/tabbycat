export const getModule = (path: string) => require(path);

export const User = getModule('../src/models/User').User;
export const Device = getModule('../src/models/Device').Device;
export const Tab = getModule('../src/models/Tab').Tab;
export const TabGroup = getModule('../src/models/TabGroup').TabGroup;
export const app = getModule('../src/server').app;
