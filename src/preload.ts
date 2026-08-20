import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('teamNeedsAPI', {
  chooseAndLoad: () => ipcRenderer.invoke('team-needs:choose-and-load'),
  prepareSync: () => ipcRenderer.invoke('team-needs:prepare-sync'),
  getTeamBranding: (teamName: string) => ipcRenderer.invoke('team-needs:team-branding', teamName),
});
