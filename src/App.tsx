import { useEffect, useState } from 'react'
import { MessagePlugin } from 'tdesign-react'
import Dashboard from './components/Dashboard'
import ContentList from './components/ContentList'
import ExportData from './components/ExportData'
import LoginModal from './components/LoginModal'
import QuitConfirmDialog from './components/QuitConfirmDialog'
import { useGlobalStore } from './store/useGlobalStore'
import './styles.css'

function App() {
  const {
    accounts,
    setAccounts,
    accountVideos,
    setAccountVideos,
    accountStats,
    setAccountStats,
    accountInfo,
    setAccountInfo
  } = useGlobalStore()
  
  // 保持这些变量用于后续可能的使用
  void accountVideos
  void accountStats
  void accountInfo

  const [activeTab, setActiveTab] = useState('dashboard')
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [loginModalVisible, setLoginModalVisible] = useState(false)
  const [isRelogin, setReloginMode] = useState(false)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)

  // 深色模式切换
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // 加载账号列表并初始化数据
  useEffect(() => {
    const loadAccountsAndData = async () => {
      try {
        console.log('开始加载账户列表...')
        const result = await window.electronAPI.getAccounts()
        console.log('原始账户列表:', result)
        
        if (result && result.length > 0) {
          setAccounts(result)
          console.log('账户列表加载完成:', result.length, '个账户')
          
          const accountId = selectedAccountId || result[0].id
          if (!selectedAccountId) {
            setSelectedAccountId(accountId)
            console.log('已设置默认账号:', accountId)
          }
          
          // 直接加载该账号数据
          console.log('开始加载账号数据:', accountId)
          setLoading(true)
          
          const videoResult = await window.electronAPI.getAwemeList(accountId)
          if (videoResult && videoResult.success && videoResult.awemes) {
            setAccountVideos(accountId, videoResult.awemes)
          }
          
          const statsResult = await window.electronAPI.getStats(accountId)
          if (statsResult && statsResult.success && statsResult.stats) {
            setAccountStats(accountId, statsResult.stats)
          }
          
          const account = result.find(acc => acc.id === accountId)
          if (account) {
            setAccountInfo(accountId, {
              id: account.id,
              nickname: account.nickname,
              avatar: account.avatar,
              fansCount: account.fansCount,
              videoCount: account.videoCount
            })
          }
          
          console.log('账号数据加载完成')
        } else {
          setAccounts([])
          console.log('没有找到账户')
        }
      } catch (error) {
        console.error('加载账户列表失败:', error)
        MessagePlugin.error('加载账户列表失败')
      } finally {
        setLoading(false)
      }
    }
    loadAccountsAndData()
  }, [])

  // 加载选中账号的数据
  useEffect(() => {
    if (!selectedAccountId) {
      setLoading(false)
      return
    }

    const loadAccountData = async () => {
      setLoading(true)
      console.log('开始加载所有数据，当前账号ID:', selectedAccountId)

      try {
        const videoResult = await window.electronAPI.getAwemeList(selectedAccountId)
        console.log('视频列表 API 响应:', JSON.stringify(videoResult)?.substring(0, 200))
        if (videoResult && videoResult.success && videoResult.awemes) {
          setAccountVideos(selectedAccountId, videoResult.awemes)
          console.log('视频列表加载结果: 成功', videoResult.awemes.length, '个视频')
        }

        const statsResult = await window.electronAPI.getStats(selectedAccountId)
        console.log('统计数据响应:', statsResult)
        if (statsResult && statsResult.success && statsResult.stats) {
          setAccountStats(selectedAccountId, statsResult.stats)
        }

        const currentAccount = (useGlobalStore.getState().accounts || []).find(acc => acc.id === selectedAccountId)
        if (currentAccount) {
          setAccountInfo(selectedAccountId, {
            id: currentAccount.id,
            nickname: currentAccount.nickname,
            avatar: currentAccount.avatar,
            fansCount: currentAccount.fansCount,
            videoCount: currentAccount.videoCount
          })
        }

        console.log('所有数据加载完成')
      } catch (error) {
        console.error('加载账号数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAccountData()
  }, [selectedAccountId])

// 处理导航切换
  const handleNavClick = (tab: string) => {
    setActiveTab(tab)
  }

  // 处理登录成功
  const handleLoginSuccess = async () => {
    try {
      const result = await window.electronAPI.getAccounts()
      if (result && result.length > 0) {
        setAccounts(result)
        const newAccount = result[result.length - 1]
        setSelectedAccountId(newAccount.id)
        
        setLoading(true)
        
        const videoResult = await window.electronAPI.getAwemeList(newAccount.id)
        if (videoResult && videoResult.success && videoResult.awemes) {
          setAccountVideos(newAccount.id, videoResult.awemes)
        }
        
        const statsResult = await window.electronAPI.getStats(newAccount.id)
        if (statsResult && statsResult.success && statsResult.stats) {
          setAccountStats(newAccount.id, statsResult.stats)
        }
        
        setAccountInfo(newAccount.id, {
          id: newAccount.id,
          nickname: newAccount.nickname,
          avatar: newAccount.avatar,
          fansCount: newAccount.fansCount,
          videoCount: newAccount.videoCount
        })
        
        setLoading(false)
        console.log('登录后数据加载完成，账号ID:', newAccount.id)
      }
    } catch (error) {
      console.error('登录后刷新数据失败:', error)
      setLoading(false)
    }
  }

  // 处理删除账号
  const handleDeleteAccount = async () => {
    if (!selectedAccountId) return
    
    try {
      const result = await window.electronAPI.removeAccount(selectedAccountId)
      if (result.success) {
        const accountsData = await window.electronAPI.getAccounts()
        const accountsList = Array.isArray(accountsData) ? accountsData : []
        setAccounts(accountsList)
        if (accountsList.length > 0) {
          setSelectedAccountId(accountsList[0].id)
        } else {
          setSelectedAccountId(null)
        }
        MessagePlugin.success('账号已退出')
      }
    } catch (error) {
      console.error('删除账号失败:', error)
      MessagePlugin.error('删除账号失败')
    }
    setDeleteDialogVisible(false)
  }

  // 刷新数据
  const handleRefresh = async () => {
    if (!selectedAccountId || refreshing) return
    
    setRefreshing(true)
    try {
      const videoResult = await window.electronAPI.getAwemeList(selectedAccountId)
      if (videoResult && videoResult.success && videoResult.awemes) {
        setAccountVideos(selectedAccountId, videoResult.awemes)
        MessagePlugin.success(`刷新成功！共 ${videoResult.awemes.length} 条数据`)
      } else if (videoResult && videoResult.error) {
        MessagePlugin.warning('登录已过期，请重新登录')
      }
      
      const statsResult = await window.electronAPI.getStats(selectedAccountId)
      if (statsResult && statsResult.success && statsResult.stats) {
        setAccountStats(selectedAccountId, statsResult.stats)
      }
    } catch (error) {
      console.error('刷新数据失败:', error)
      MessagePlugin.error(`刷新数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setRefreshing(false)
    }
  }

    return (
    <div className="app">
      {/* 主内容区 */}
      <main className="main-content">
        {/* 头部 */}
        <header className="header">
          {/* 导航 Tab */}
          <nav className="header-nav">
            <div
              className={`header-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => handleNavClick('dashboard')}
            >
              📈 数据面板
            </div>
            <div
              className={`header-nav-item ${activeTab === 'content' ? 'active' : ''}`}
              onClick={() => handleNavClick('content')}
            >
              📋 内容明细
            </div>
            <div
              className={`header-nav-item ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => handleNavClick('export')}
            >
              💾 导出数据
            </div>
          </nav>

          <div className="header-right">
            {/* 账号区域 */}
            <div className="header-account">
              {(accounts || []).length > 0 ? (
                <div className="header-account-info">
                  <div className="account-avatar">
                    {accounts[0]?.avatar ? (
                      <img src={accounts[0].avatar} alt="" />
                    ) : (
                      accounts[0]?.nickname?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <span className="account-name">{accounts[0]?.nickname || '未命名'}</span>
                  <button 
                    className="account-quit-btn"
                    onClick={() => setDeleteDialogVisible(true)}
                    title="退出账号"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button className="account-action-btn" onClick={() => setLoginModalVisible(true)}>
                  + 添加账号
                </button>
              )}
            </div>

            <button 
              className="refresh-btn"
              onClick={handleRefresh}
              disabled={!selectedAccountId || refreshing}
              title="刷新数据"
              style={{ display: activeTab === 'export' ? 'none' : 'flex' }}
            >
              {refreshing ? '🔄' : '🔃'} {refreshing ? '刷新中...' : '刷新'}
            </button>
            <button 
              className="theme-btn"
              onClick={() => setIsDarkMode(!isDarkMode)}
              title={isDarkMode ? '切换浅色模式' : '切换深色模式'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </header>

        {/* 内容区域 */}
        <div className="content-area">
          {activeTab === 'dashboard' && (
            <Dashboard
              accountId={selectedAccountId}
              loading={loading}
              refreshing={refreshing}
            />
          )}
          {activeTab === 'content' && (
            <ContentList accountId={selectedAccountId} refreshing={refreshing} />
          )}
          {activeTab === 'export' && (
            <ExportData accountId={selectedAccountId} />
          )}
        </div>

      </main>

      {/* 登录弹窗 */}
      <LoginModal
        visible={loginModalVisible}
        onClose={() => {
          setLoginModalVisible(false)
          setReloginMode(false)
        }}
        onLoginSuccess={handleLoginSuccess}
        existingAccounts={accounts}
        isRelogin={isRelogin}
      />

      {/* 删除确认弹窗 */}
      <QuitConfirmDialog
        visible={deleteDialogVisible}
        onClose={() => setDeleteDialogVisible(false)}
        onConfirm={handleDeleteAccount}
      />
    </div>
  )
}

export default App
