import { create } from 'zustand'
import type { Account, VideoItem, AccountStats } from '../types/electron.d'

interface GlobalState {
  // 状态
  accounts: Account[]
  currentAccountId: string | null
  isLoggedIn: boolean
  accountStats: Record<string, AccountStats>
  accountVideos: Record<string, VideoItem[]>
  accountInfo: Record<string, any>

  // 更新状态的方法
  setAccounts: (accounts: Account[]) => void
  setCurrentAccountId: (currentAccountId: string | null) => void
  setIsLoggedIn: (isLoggedIn: boolean) => void
  setAccountStats: (accountId: string, stats: AccountStats) => void
  setAccountVideos: (accountId: string, videos: VideoItem[]) => void
  setAccountInfo: (accountId: string, info: any) => void

  // 批量更新
  updateState: (updates: Partial<GlobalState>) => void

  // 获取当前账户
  getCurrentAccount: () => Account | null
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  // 状态
  accounts: [],
  currentAccountId: null,
  isLoggedIn: false,
  accountStats: {},
  accountVideos: {},
  accountInfo: {},

  // 更新状态的方法
  setAccounts: (accounts) => set({ accounts }),
  setCurrentAccountId: (currentAccountId) => set({ currentAccountId }),
  setIsLoggedIn: (isLoggedIn) => set({ isLoggedIn }),
  setAccountStats: (accountId, stats) => set((state) => ({
    accountStats: { ...state.accountStats, [accountId]: stats }
  })),
  setAccountVideos: (accountId, videos) => set((state) => ({
    accountVideos: { ...state.accountVideos, [accountId]: videos }
  })),
  setAccountInfo: (accountId, info) => set((state) => ({
    accountInfo: { ...state.accountInfo, [accountId]: info }
  })),

  // 批量更新
  updateState: (updates) => set(updates),

  // 获取当前账户
  getCurrentAccount: () => {
    const { accounts, currentAccountId } = get()
    return accounts.find(acc => acc.id === currentAccountId) || null
  }
}))