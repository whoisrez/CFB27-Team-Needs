import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('teamNeedsAPI', {
  chooseAndLoad: () => ipcRenderer.invoke('team-needs:choose-and-load'),
});
