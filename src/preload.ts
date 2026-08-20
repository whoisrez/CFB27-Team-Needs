import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('teamNeedsAPI', {
  chooseAndLoad: () => ipcRenderer.invoke('team-needs:choose-and-load'),
  getTeamBranding: (teamName: string) => ipcRenderer.invoke('team-needs:team-branding', teamName),
});
