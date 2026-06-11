export interface Account {
  id: string
  nickname: string
  avatar?: string
  fansCount?: number
  videoCount?: number
  cookies: any[]
  userInfo?: any
}

export interface VideoItem {
  aweme_id: string
  title: string
  desc: string
  play_count: number
  digg_count: number
  comment_count: number
  share_count: number
  collect_count: number
  create_time: string
  keywords: string[]
}

export interface AccountStats {
  fans: number
  following: number
  like_count: number
  videos: number
  total_plays: number
  total_likes: number
}

export interface ElectronAPI {
  // 账号管理
  getAccounts: () => Promise<Account[]>
  addAccount: (account: Account) => Promise<{ success: boolean; account?: Account; error?: string }>
  getUserInfo: (cookies: any[]) => Promise<{ success: boolean; userInfo?: any; error?: string }>
  removeAccount: (id: string) => Promise<{ success: boolean; error?: string }>
  switchAccount: (id: string) => Promise<{ success: boolean; error?: string }>
  updateAccountNickname: (id: string, nickname: string) => Promise<{ success: boolean; error?: string }>
  refreshAccountNickname: (id: string) => Promise<{ success: boolean; error?: string }>
  checkLoginStatus: (id: string) => Promise<{ isLoggedIn: boolean | null; uncertain?: boolean; error?: string }>
  logout: () => Promise<{ success: boolean; error?: string }>

  // 数据
  getStats: (accountId: string, startDate?: string, endDate?: string) => Promise<{ success: boolean; stats?: AccountStats; error?: string }>
  getAwemeList: (accountId: string) => Promise<{ success: boolean; awemes?: VideoItem[]; error?: string }>
  refreshData: () => Promise<{ success: boolean; error?: string }>
  updateAccountCookies: (nickname: string, cookies: any[], userInfo?: any) => Promise<{ success: boolean; account?: Account; error?: string }>

  // 导出
  exportToExcel: (accountIds: string[], startDate?: string, endDate?: string, metrics?: string[]) => Promise<{ success: boolean; filePath?: string; error?: string }>
  exportContentToExcel: (contentList: VideoItem[], exportName?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  exportContentToCSV: (contentList: VideoItem[], exportName?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>
  exportContentToJSON: (contentList: VideoItem[], exportName?: string) => Promise<{ success: boolean; filePath?: string; error?: string }>

  // WebView Cookie
  getWebviewCookies: () => Promise<any[]>

  // 系统
  getAppPath: () => Promise<string>
  openExternal: (url: string) => Promise<void>
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}

export {}
