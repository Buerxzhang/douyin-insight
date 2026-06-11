const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 账号管理
  getAccounts: () => ipcRenderer.invoke('getAccounts'),
  addAccount: (account) => ipcRenderer.invoke('addAccount', account),
  getUserInfo: (cookies) => ipcRenderer.invoke('getUserInfo', cookies),
  removeAccount: (id) => ipcRenderer.invoke('removeAccount', id),
  switchAccount: (id) => ipcRenderer.invoke('switchAccount', id),
  updateAccountNickname: (id, nickname) => ipcRenderer.invoke('updateAccountNickname', id, nickname),
  refreshAccountNickname: (id) => ipcRenderer.invoke('refreshAccountNickname', id),
  checkLoginStatus: (id) => ipcRenderer.invoke('checkLoginStatus', id),
  logout: () => ipcRenderer.invoke('logout'),

  // 数据
  getStats: (accountId, startDate, endDate) => ipcRenderer.invoke('getStats', accountId, startDate, endDate),
  getAwemeList: (accountId) => ipcRenderer.invoke('getAwemeList', accountId),

  refreshData: () => ipcRenderer.invoke('refreshData'),
  updateAccountCookies: (nickname, cookies, userInfo) => 
    ipcRenderer.invoke('updateAccountCookies', nickname, cookies, userInfo),



  // 导出
  exportToExcel: (accountIds, startDate, endDate, metrics) => 
    ipcRenderer.invoke('exportToExcel', accountIds, startDate, endDate, metrics),
  exportContentToExcel: (contentList, exportName) => 
    ipcRenderer.invoke('exportContentToExcel', contentList, exportName),
  exportContentToCSV: (contentList, exportName) => 
    ipcRenderer.invoke('exportContentToCSV', contentList, exportName),
  exportContentToJSON: (contentList, exportName) => 
    ipcRenderer.invoke('exportContentToJSON', contentList, exportName),


  
  // WebView Cookie (通过 webContents 获取)
  getWebviewCookies: () => ipcRenderer.invoke('getWebviewCookies'),



  // 系统
  getAppPath: () => ipcRenderer.invoke('getAppPath'),
  openExternal: (url) => ipcRenderer.invoke('openExternal', url)
})
