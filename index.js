const { app, BrowserWindow, session, ipcMain, Notification, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const axios = require('axios')

// 数据存储路径
const DATA_DIR = app.getPath('userData')
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json')
const STATS_FILE = path.join(DATA_DIR, 'stats_history.csv')
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

let mainWindow

// 安全的日志输出，避免管道错误
const safeLog = (...args) => {
  try {
    console.log(...args)
  } catch (err) {
    // 忽略日志输出错误
  }
}

// 文件锁，防止并发写入导致 EPERM 错误
let fileLock = false

// 等待文件锁释放
async function waitForLock(maxRetries = 10, delayMs = 100) {
  for (let i = 0; i < maxRetries; i++) {
    if (!fileLock) return true
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }
  return false
}

// 初始化
function initStorage() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  if (!fs.existsSync(ACCOUNTS_FILE)) fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify({ accounts: [], currentAccount: null }, null, 2))
  if (!fs.existsSync(STATS_FILE)) fs.writeFileSync(STATS_FILE, '日期,账号ID,账号名称,播放,点赞,评论,转发,收藏,粉丝数\n')
  if (!fs.existsSync(COMMENTS_FILE)) fs.writeFileSync(COMMENTS_FILE, JSON.stringify({ comments: [] }, null, 2))
  if (!fs.existsSync(SETTINGS_FILE)) fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ refreshInterval: 15, enableNotification: true, enableSound: true }, null, 2))
}

function readJSON(file) { try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch { return null } }

async function writeJSON(file, data) { 
  await waitForLock()
  fileLock = true
  try { 
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('写入文件失败:', error)
    throw error
  } finally {
    fileLock = false
  }
}

function createWindow() {
  try {
    console.log('正在创建浏览器窗口...')
    mainWindow = new BrowserWindow({
      width: 1400, height: 900, minWidth: 1000, minHeight: 700,
      x: 100, y: 100, // 确保窗口在屏幕可见区域
      center: true,
      show: false,
      skipTaskbar: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webviewTag: true
      }
    })
    console.log('浏览器窗口创建成功，加载HTML文件...')
    
    // 判断开发模式
    const isDev = process.argv.includes('--dev')
    
    if (isDev) {
      // 开发模式：等待 Vite 就绪后加载
      const viteDevServerUrl = 'http://localhost:5173'
      console.log('开发模式，等待 Vite 就绪:', viteDevServerUrl)
      
      const waitForVite = async (retries = 30) => {
        for (let i = 0; i < retries; i++) {
          try {
            const http = require('http')
            await new Promise((resolve, reject) => {
              const req = http.get(viteDevServerUrl, (res) => {
                res.resume()
                resolve()
              })
              req.on('error', reject)
              req.setTimeout(1000, () => { req.destroy(); reject(new Error('timeout')) })
            })
            console.log('Vite 已就绪，加载页面...')
            await mainWindow.loadURL(viteDevServerUrl)
            return
          } catch {
            console.log('等待 Vite 就绪... (' + (i + 1) + '/' + retries + ')')
            await new Promise(r => setTimeout(r, 1000))
          }
        }
        console.error('Vite 启动超时')
        mainWindow.loadURL(viteDevServerUrl).catch(err => {
          console.error('加载失败:', err)
          mainWindow.show()
          mainWindow.webContents.openDevTools()
        })
      }
      mainWindow.show()
      waitForVite()
    } else {
      // 生产模式：加载构建后的文件
      const indexPath = path.join(__dirname, 'dist', 'index.html')
      console.log('生产模式，加载构建文件:', indexPath)
      mainWindow.loadFile(indexPath).catch(err => {
        console.error('加载构建文件失败:', err)
        // 如果加载失败，直接显示窗口
        mainWindow.show()
      })
    }
    
    mainWindow.once('ready-to-show', () => {
      console.log('窗口准备就绪，正在显示...')
      mainWindow.show()
      mainWindow.focus()
      mainWindow.restore() // 如果最小化则恢复
      console.log('窗口显示完成，已获得焦点')
      // 打开开发者工具以便调试（默认关闭，需要时按F12打开）
      // mainWindow.webContents.openDevTools()
    })
    
    // 添加其他错误处理
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('页面加载失败:', errorCode, errorDescription)
    })
    
    mainWindow.webContents.on('crashed', () => {
      console.error('渲染进程崩溃')
    })
    
    // 捕获渲染进程的控制台输出
    mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
      const levelStr = ['', 'INFO', 'WARNING', 'ERROR'][level] || 'DEBUG'
      console.log(`[渲染进程 ${levelStr}] ${message} (${sourceId}:${line})`)
    })
    
  } catch (error) {
    console.error('创建窗口失败:', error)
  }
}

// ============ IPC 处理 ============

// 账号管理
ipcMain.handle('getAccounts', () => {
  const data = readJSON(ACCOUNTS_FILE) || { accounts: [], currentAccount: null }
  let accounts = data.accounts || []
  
  // 确保是数组
  if (!Array.isArray(accounts)) {
    accounts = []
  }
  
  // 检查每个账号的登录状态
  const accountsWithStatus = accounts.map(account => {
    if (!account || typeof account !== 'object') return null
    const cookiePath = path.join(DATA_DIR, `cookies_${account.id}.json`)
    const hasLogin = fs.existsSync(cookiePath)
    return { ...account, isLoggedIn: hasLogin }
  }).filter(Boolean)
  
  return accountsWithStatus
})

ipcMain.handle('addAccount', async (event, accountData) => {
  const data = readJSON(ACCOUNTS_FILE) || { accounts: [], currentAccount: null }
  const newAccount = {
    id: 'acc_' + Date.now(),
    platform: accountData.platform || 'douyin',
    nickname: accountData.nickname || '抖音用户',
    cookies: accountData.cookies || [],
    status: 'active',
    createdAt: new Date().toISOString(),
    lastFetch: null,
    fansCount: accountData.fansCount || 0,
    avatar: accountData.avatar || ''
  }
  data.accounts.push(newAccount)
  if (!data.currentAccount) data.currentAccount = newAccount.id
  await writeJSON(ACCOUNTS_FILE, data)
  
  // 保存 cookies
  if (accountData.cookies?.length) {
    fs.writeFileSync(path.join(DATA_DIR, `cookies_${newAccount.id}.json`), JSON.stringify(accountData.cookies))
  }
  console.log('添加账号成功:', newAccount.id, newAccount.nickname)
  return { success: true, account: newAccount }
})

// 更新账号 cookies（用于重新登录）
ipcMain.handle('updateAccountCookies', async (event, nickname, cookies, userInfo) => {
  const data = readJSON(ACCOUNTS_FILE) || { accounts: [], currentAccount: null }
  const account = data.accounts.find(acc => acc.nickname === nickname)
  
  if (!account) {
    return { success: false, error: '账号不存在' }
  }
  
  // 更新账号信息
  account.fansCount = userInfo?.fansCount || account.fansCount
  account.avatar = userInfo?.avatar || account.avatar
  account.lastFetch = null
  
  await writeJSON(ACCOUNTS_FILE, data)
  
  // 更新 cookies 文件
  if (cookies?.length) {
    fs.writeFileSync(path.join(DATA_DIR, `cookies_${account.id}.json`), JSON.stringify(cookies))
  }
  
  console.log('更新账号 cookies 成功:', account.id, account.nickname)
  return { success: true, account }
})

// 获取用户信息（用于获取昵称）
ipcMain.handle('getUserInfo', async (event, cookies) => {
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')
  
  try {
    console.log('获取用户信息，Cookie数量:', cookies.length)
    console.log('Cookie名称:', cookies.map(c => c.name).join(', '))
    
    // 尝试主要API端点
    const res = await axios.get('https://www.douyin.com/aweme/v1/web/user/profile/self/', {
      params: { 
        publish_video_strategy_type: 2,
        fields_groups: '1',
        aid: '6383'
      },
      headers: { 
        Cookie: cookieStr, 
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.douyin.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 15000
    })
    
    console.log('获取用户信息API响应:', JSON.stringify(res.data)?.substring(0, 500))
    
    if (res.data?.user) {
      const user = res.data.user
      return { 
        success: true, 
        id: user.uid || user.sec_uid || `user_${Date.now()}`,
        nickname: user.nickname || '抖音用户',
        fansCount: user.follower_count || 0,
        avatar: user.avatar_larger?.url_list?.[0] || user.avatar_thumb?.url_list?.[0] || ''
      }
    }
    
    console.log('API返回数据中没有user字段:', res.data)
    
    // 尝试备用API端点
    try {
      console.log('尝试备用API端点...')
      const res2 = await axios.get('https://www.douyin.com/aweme/v1/web/user/profile/other/', {
        params: {
          sec_user_id: '', // 需要sec_user_id，但我们可以尝试空值
          aid: '6383'
        },
        headers: { 
          Cookie: cookieStr, 
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          'Referer': 'https://www.douyin.com/',
          'Accept': 'application/json, text/plain, */*'
        },
        timeout: 10000
      })
      
      console.log('备用API响应:', JSON.stringify(res2.data)?.substring(0, 300))
      
      if (res2.data?.user) {
        const user = res2.data.user
        return { 
          success: true, 
          id: user.uid || user.sec_uid || `user_${Date.now()}`,
          nickname: user.nickname || '抖音用户',
          fansCount: user.follower_count || 0,
          avatar: user.avatar_larger?.url_list?.[0] || user.avatar_thumb?.url_list?.[0] || ''
        }
      }
    } catch (err2) {
      console.log('备用API也失败:', err2.message)
    }
    
    return { success: false, error: '获取用户信息失败: API返回数据格式不正确' }
  } catch (err) {
    console.log('获取用户信息失败:', err.message)
    if (err.response) {
      console.log('响应状态:', err.response.status)
      console.log('响应数据:', JSON.stringify(err.response.data)?.substring(0, 200))
    }
    return { success: false, error: err.message }
  }
})

ipcMain.handle('removeAccount', async (event, accountId) => {
  const data = readJSON(ACCOUNTS_FILE)
  data.accounts = data.accounts.filter(a => a.id !== accountId)
  if (data.currentAccount === accountId) data.currentAccount = data.accounts[0]?.id || null
  await writeJSON(ACCOUNTS_FILE, data)
  const cookiePath = path.join(DATA_DIR, `cookies_${accountId}.json`)
  if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath)
  return { success: true }
})

// 退出登录
ipcMain.handle('logout', async () => {
  try {
    const data = readJSON(ACCOUNTS_FILE)
    if (data.currentAccount) {
      // 删除当前账号
      data.accounts = data.accounts.filter(a => a.id !== data.currentAccount)
      const cookiePath = path.join(DATA_DIR, `cookies_${data.currentAccount}.json`)
      if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath)
      data.currentAccount = data.accounts[0]?.id || null
      await writeJSON(ACCOUNTS_FILE, data)
    }
    
    // 清除 persist:login session 中的 cookies
    try {
      const ses = session.fromPartition('persist:login')
      const cookies = await ses.cookies.get({})
      for (const cookie of cookies) {
        await ses.cookies.remove(cookie.url || `https://${cookie.domain}${cookie.path}`, cookie.name)
      }
      console.log('已清除登录 session cookies')
    } catch (e) {
      console.log('清除 session cookies 失败:', e)
    }
    
    return { success: true }
  } catch (err) {
    console.error('退出登录失败:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.handle('updateAccountNickname', async (event, accountId, nickname) => {
  const data = readJSON(ACCOUNTS_FILE)
  const account = data.accounts.find(a => a.id === accountId)
  if (account) {
    account.nickname = nickname
    await writeJSON(ACCOUNTS_FILE, data)
    return { success: true }
  }
  return { success: false, error: '账号不存在' }
})

ipcMain.handle('refreshAccountNickname', async (event, accountId) => {
  const data = readJSON(ACCOUNTS_FILE)
  const account = data.accounts.find(a => a.id === accountId)
  if (!account) return { success: false, error: '账号不存在' }
  
  const cookiePath = path.join(DATA_DIR, `cookies_${accountId}.json`)
  const cookies = fs.existsSync(cookiePath) ? readJSON(cookiePath) : []
  if (!cookies.length) return { success: false, error: '无登录信息' }
  
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')
  
  try {
    const res = await axios.get('https://www.douyin.com/aweme/v1/web/user/profile/self/', {
      params: { aid: '6383', publish_video_strategy_type: 2 },
      headers: {
        Cookie: cookieStr,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.douyin.com/',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 10000
    })
    
    if (res.data?.user?.nickname) {
      account.nickname = res.data.user.nickname
      writeJSON(ACCOUNTS_FILE, data)
      return { success: true, nickname: account.nickname }
    }
    return { success: false, error: '获取昵称失败' }
  } catch (err) {
    return { success: false, error: err.message }
  }
})

// 检查登录态
ipcMain.handle('checkLoginStatus', async (event, accountId) => {
  try {
    const cookiePath = path.join(DATA_DIR, `cookies_${accountId}.json`)
    
    // 先检查本地是否有 cookies 文件
    if (!fs.existsSync(cookiePath)) {
      console.log('检查登录态: 无本地cookies文件')
      return { isLoggedIn: false, error: '无登录信息' }
    }
    
    const cookies = readJSON(cookiePath)
    if (!cookies || !cookies.length) {
      console.log('检查登录态: cookies文件为空')
      return { isLoggedIn: false, error: '无登录信息' }
    }
    
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')
    
    const res = await axios.get('https://www.douyin.com/aweme/v1/web/user/profile/self/', {
      params: { Aid: '6383', publish_video_strategy_type: 2 },
      headers: {
        Cookie: cookieStr,
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.douyin.com/',
        'Accept': 'application/json, text/plain, */*'
      },
      timeout: 10000
    })
    
    if (res.data?.user) {
      console.log('检查登录态: API验证成功')
      return { isLoggedIn: true, user: res.data.user }
    }
    console.log('检查登录态: API返回无用户数据')
    // API 返回无用户数据，可能是 cookies 失效或 API 问题
    return { isLoggedIn: false, error: '登录已失效' }
  } catch (err) {
    console.log('检查登录态 API异常:', err.message, '状态码:', err.response?.status)
    
    // 检查是否是网络连接错误
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.message.includes('timeout') || err.response?.status >= 500) {
      // 网络问题或服务器错误，返回 uncertain，保留现有状态
      return { isLoggedIn: null, uncertain: true, error: '网络问题，请稍后重试' }
    }
    
    // 4xx 错误（认证失败），视为失效
    if (err.response?.status >= 400 && err.response?.status < 500) {
      return { isLoggedIn: false, error: '登录已失效' }
    }
    
    // 其他错误，视为不确定
    return { isLoggedIn: null, uncertain: true, error: err.message }
  }
})

ipcMain.handle('switchAccount', (event, accountId) => {
  const data = readJSON(ACCOUNTS_FILE)
  data.currentAccount = accountId
  writeJSON(ACCOUNTS_FILE, data)
  return { success: true }
})

// 获取统计数据
ipcMain.handle('getStats', async (_, accountId, startDate, endDate) => {
  const stats = []
  if (fs.existsSync(STATS_FILE)) {
    const lines = fs.readFileSync(STATS_FILE, 'utf-8').split('\n').filter(l => l.trim())
    for (let i = 1; i < lines.length; i++) {
      const [date, accId, accName, play, like, comment, share, collect, fans] = lines[i].split(',')
      if (accountId === 'all' || accId === accountId) {
        if (!startDate || date >= startDate) {
          if (!endDate || date <= endDate) {
            stats.push({ date, accountId: accId, accountName: accName, play, like, comment, share, collect, fans })
          }
        }
      }
    }
  }
  return stats
})



// 刷新数据
ipcMain.handle('refreshData', async () => {
  const accountsData = readJSON(ACCOUNTS_FILE)
  const results = []
  for (const account of accountsData.accounts) {
    try {
      const result = await fetchAccountData(account)
      results.push(result)
    } catch (err) {
      results.push({ accountId: account.id, success: false, error: err.message })
    }
  }
  return results
})

async function fetchAccountData(account) {
  const cookiePath = path.join(DATA_DIR, `cookies_${account.id}.json`)
  const cookies = fs.existsSync(cookiePath) ? readJSON(cookiePath) : []
  if (!cookies.length) return { accountId: account.id, success: false, error: '无登录信息' }
  
  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')
  console.log('使用 Cookie 刷新数据, 共', cookies.length, '条')
  
  try {
    // 方法1: 用户中心 API - 获取用户基本数据
    const res = await axios.get('https://www.douyin.com/aweme/v1/web/user/profile/self/', {
      params: { 
        publish_video_strategy_type: 2,
        fields_groups: '1',
        aid: '6383'
      },
      headers: { 
        Cookie: cookieStr, 
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://www.douyin.com/',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 15000
    })
    
    console.log('用户API 响应:', JSON.stringify(res.data)?.substring(0, 500))
    
    let userData = null
    let realNickname = null
    
    // 尝试从 response 提取数据
    if (res.data?.user) {
      const user = res.data.user
      realNickname = user.nickname || user.unique_id || null
      userData = {
        fans_count: user.follower_count || 0,
        aweme_count: user.aweme_count || 0,
        like_count: user.like_count || 0,
        comment_count: user.comment_count || 0,
        forward_count: user.forward_count || 0,
        collect_count: user.collect_count || 0
      }
      console.log('提取的用户数据:', userData)
    }
    
    // 方法2: 获取视频列表，计算总播放量
    let totalPlayCount = 0
    let totalLikeCount = 0
    let videoList = []
    try {
      console.log('尝试获取视频列表...')
      const res2 = await axios.get('https://www.douyin.com/aweme/v1/web/aweme/post/', {
        params: {
          aid: '6383',
          count: 50,
          max_cursor: 0,
          publish_video_strategy_type: 2
        },
        headers: {
          Cookie: cookieStr,
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
          'Referer': 'https://www.douyin.com/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: 15000
      })
      
      console.log('视频列表API响应:', JSON.stringify(res2.data)?.substring(0, 300))
      
      if (res2.data?.aweme_list && res2.data.aweme_list.length > 0) {
        videoList = res2.data.aweme_list
        totalPlayCount = videoList.reduce((sum, item) => sum + (item.statistics?.play_count || 0), 0)
        console.log(`获取到 ${videoList.length} 个视频，总播放量: ${totalPlayCount}`)
        
        // 计算总点赞数
        totalLikeCount = videoList.reduce((sum, item) => sum + (item.statistics?.digg_count || 0), 0)
        console.log(`从视频列表计算总点赞数: ${totalLikeCount}`)
      } else {
        console.log('视频列表为空')
      }
    } catch (err2) {
      console.log('获取视频列表失败:', err2.message)
      // 不影响主流程，继续使用用户API数据
    }
    
    // 如果用户数据为空，尝试备用方案
    if (!userData || (!userData.fans_count && !userData.aweme_count)) {
      // 尝试粉丝列表接口
      try {
        const res3 = await axios.get('https://www.douyin.com/aweme/v1/web/fans/data/', {
          headers: { 
            Cookie: cookieStr, 
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
            'Referer': 'https://www.douyin.com/'
          },
          timeout: 10000
        })
        console.log('粉丝 API 响应:', JSON.stringify(res3.data)?.substring(0, 200))
      } catch (e3) {
        console.log('粉丝 API 失败:', e3.message)
      }
    }
    
    // 如果仍然没有数据，返回错误
    if (!userData || (!userData.fans_count && !userData.aweme_count)) {
      return { 
        accountId: account.id, 
        success: false, 
        error: 'API 返回数据为空，可能是 Cookie 过期或需要重新登录'
      }
    }
    
    const today = new Date().toISOString().split('T')[0]
    // CSV列: 日期,账号ID,账号名称,播放,点赞,评论,转发,收藏,粉丝数
    // 播放列使用总播放量（如果获取到），否则使用视频数量
    const playValue = totalPlayCount > 0 ? totalPlayCount : (userData.aweme_count || 0)
    // 点赞数优先级：API返回的like_count > 视频列表计算的总点赞数 > 0
    const likeValue = userData?.like_count > 0 ? userData.like_count : (totalLikeCount > 0 ? totalLikeCount : 0)
    const csvLine = `${today},${account.id},"${account.nickname}",${playValue},${likeValue},${userData.comment_count || 0},${userData.forward_count || 0},${userData.collect_count || 0},${userData.fans_count || 0}\n`
    fs.appendFileSync(STATS_FILE, csvLine)
    
    // 更新账号数据
    const accountsData = readJSON(ACCOUNTS_FILE)
    const idx = accountsData.accounts.findIndex(a => a.id === account.id)
    if (idx !== -1) {
      accountsData.accounts[idx].lastFetch = new Date().toISOString()
      accountsData.accounts[idx].fansCount = userData.fans_count || 0
      accountsData.accounts[idx].videoCount = userData.aweme_count || 0
      // 如果获取到真实昵称，更新账号昵称
      if (realNickname) {
        accountsData.accounts[idx].nickname = realNickname
        accountsData.accounts[idx].realNickname = realNickname
      }
      await writeJSON(ACCOUNTS_FILE, accountsData)
    }
    
    return { 
      accountId: account.id, 
      success: true, 
      data: { 
        fans: userData.fans_count || 0, 
        nickname: realNickname,
        videoCount: userData.aweme_count || 0,
        totalPlay: totalPlayCount,
        totalLike: userData.like_count || 0
      } 
    }
  } catch (err) {
    console.log('API 调用失败:', err.message)
    if (err.response) {
      console.log('响应状态:', err.response.status)
      console.log('响应数据:', JSON.stringify(err.response.data)?.substring(0, 200))
    }
    return { accountId: account.id, success: false, error: err.message }
  }
}



// 导出 Excel
ipcMain.handle('exportToExcel', async (event, accountIds, startDate, endDate, metrics) => {
  const XLSX = require('xlsx')
  const data = [['日期', '账号', ...metrics.map(m => ({ play: '播放量', like: '点赞数', comment: '评论数', share: '转发数', collect: '收藏数', fans: '粉丝数' }[m]))]]
  
  if (fs.existsSync(STATS_FILE)) {
    const lines = fs.readFileSync(STATS_FILE, 'utf-8').split('\n').filter(l => l.trim())
    for (let i = 1; i < lines.length; i++) {
      const [date, accId, accName, play, like, comment, share, collect, fans] = lines[i].split(',')
      if (accountIds === 'all' || (Array.isArray(accountIds) && accountIds.includes(accId))) {
        if ((!startDate || date >= startDate) && (!endDate || date <= endDate)) {
          const row = [date, accName]
          for (const m of metrics) row.push({ play, like, comment, share, collect, fans }[m] || '')
          data.push(row)
        }
      }
    }
  }
  
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '数据统计')
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `抖音数据_${new Date().toISOString().split('T')[0]}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  })
  
  if (filePath) { XLSX.writeFile(wb, filePath); return { success: true, path: filePath } }
  return { success: false, error: '取消' }
})

// 获取指定日期的粉丝数
function getFansCountOnDate(accountId, targetDate) {
  if (!fs.existsSync(STATS_FILE)) return 0
  
  const lines = fs.readFileSync(STATS_FILE, 'utf-8').split('\n').filter(l => l.trim())
  let closestFans = 0
  let minDiff = Infinity
  
  for (let i = 1; i < lines.length; i++) {
    const [date, accId, accName, play, like, comment, share, collect, fans] = lines[i].split(',')
    if (accId === accountId) {
      const fansNum = parseInt(fans) || 0
      if (date === targetDate) {
        return fansNum
      }
      // 计算日期差
      const dateDiff = Math.abs(new Date(date) - new Date(targetDate))
      if (dateDiff < minDiff) {
        minDiff = dateDiff
        closestFans = fansNum
      }
    }
  }
  
  return closestFans
}

// 导出内容列表到 Excel
ipcMain.handle('exportContentToExcel', async (event, contentList, exportName) => {
  const XLSX = require('xlsx')
  
  // 使用传入的名称或获取当前账号
  const accountName = exportName || '抖音账号'
  
  // 定义表头（按用户要求的顺序）
  const headers = [
    '标题', 
    '账号名称', 
    '创建日期', 
    '播放量', 
    '点赞数', 
    '评论数', 
    '转发数', 
    '收藏数'
  ]
  
  // 构建数据行
  const data = [headers]
  
  for (const aweme of contentList) {
    // 格式化创建日期
    const createTime = aweme.create_time ? new Date(aweme.create_time) : null
    const createDate = createTime ? createTime.toLocaleDateString('zh-CN') : ''
    
    const row = [
      aweme.title || '',
      accountName,
      createDate,
      aweme.play_count || 0,
      aweme.digg_count || 0,
      aweme.comment_count || 0,
      aweme.share_count || 0,
      aweme.collect_count || 0
    ]
    
    data.push(row)
  }
  
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, '内容列表')
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${accountName}_${new Date().toISOString().split('T')[0]}.xlsx`,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  })
  
  if (filePath) { 
    XLSX.writeFile(wb, filePath)
    return { success: true, path: filePath } 
  }
  
  return { success: false, error: '取消' }
})

// CSV导出
ipcMain.handle('exportContentToCSV', async (event, contentList, exportName) => {
  // 使用传入的名称或获取当前账号
  const accountName = exportName || '抖音账号'
  
  // 定义表头（按用户要求的顺序）
  const headers = [
    '标题', 
    '账号名称', 
    '创建日期', 
    '播放量', 
    '点赞数', 
    '评论数', 
    '转发数', 
    '收藏数'
  ]
  
  // 构建数据行
  const data = [headers]
  
  for (const aweme of contentList) {
    // 格式化创建日期
    const createTime = aweme.create_time ? new Date(aweme.create_time) : null
    const createDate = createTime ? createTime.toLocaleDateString('zh-CN') : ''
    
    const row = [
      aweme.title || '',
      accountName,
      createDate,
      aweme.play_count || 0,
      aweme.digg_count || 0,
      aweme.comment_count || 0,
      aweme.share_count || 0,
      aweme.collect_count || 0
    ]
    
    data.push(row)
  }
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${accountName}_${new Date().toISOString().split('T')[0]}.csv`,
    filters: [{ name: 'CSV', extensions: ['csv'] }]
  })
  
  if (filePath) { 
    // 构建CSV内容
    const csvContent = data.map(row => 
      row.map(cell => {
        // 转义CSV特殊字符
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`
        }
        return cell
      }).join(',')
    ).join('\n')
    
    fs.writeFileSync(filePath, csvContent, 'utf-8')
    return { success: true, path: filePath } 
  }
  
  return { success: false, error: '取消' }
})

// JSON导出
ipcMain.handle('exportContentToJSON', async (event, contentList, exportName) => {
  // 使用传入的名称或获取当前账号
  const accountName = exportName || '抖音账号'
  
  // 构建JSON数据
  const jsonData = []
  
  for (const aweme of contentList) {
    // 格式化创建日期
    const createTime = aweme.create_time ? new Date(aweme.create_time) : null
    const createDate = createTime ? createTime.toLocaleDateString('zh-CN') : ''
    
    const item = {
      标题: aweme.title || '',
      账号名称: accountName,
      创建日期: createDate,
      播放量: aweme.play_count || 0,
      点赞数: aweme.digg_count || 0,
      评论数: aweme.comment_count || 0,
      转发数: aweme.share_count || 0,
      收藏数: aweme.collect_count || 0
    }
    
    jsonData.push(item)
  }
  
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `${accountName}_${new Date().toISOString().split('T')[0]}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }]
  })
  
  if (filePath) { 
    fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf-8')
    return { success: true, path: filePath } 
  }
  
  return { success: false, error: '取消' }
})



// 从 webview partition 获取 cookies
ipcMain.handle('getWebviewCookies', async () => {
  try {
    // partition 'persist:login' 会持久化存储
    const ses = session.fromPartition('persist:login')
    const cookies = await ses.cookies.get({ domain: '.douyin.com' })
    console.log('从 persist:login partition 获取到 cookies:', cookies.length)
    if (cookies.length > 0) {
      console.log('前几个cookies:', cookies.slice(0, 3).map(c => `${c.name}=${c.value.substring(0, 10)}...`))
    } else {
      console.log('警告: 没有获取到cookies，请确保已在webview中登录')
      // 尝试获取所有cookies，不限制域名
      const allCookies = await ses.cookies.get({})
      console.log('所有cookies数量:', allCookies.length)
    }
    return cookies
  } catch (e) {
    console.log('获取 webview cookies 失败:', e)
    return []
  }
})

// 获取视频列表（用于排行榜和关键词云）- 支持分页获取所有历史数据
ipcMain.handle('getAwemeList', async (_, accountId) => {
  const cookiePath = path.join(DATA_DIR, `cookies_${accountId}.json`)
  const cookies = fs.existsSync(cookiePath) ? readJSON(cookiePath) : []
  if (!cookies.length) return { success: false, error: '无登录信息' }

  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ')
  
  // 从 cookies 中提取 sec_user_id
  const secUserIdCookie = cookies.find(c => c.name === 'sid_guard' || c.name === 'sessionid' || c.name === 'sid_tt')
  let secUserId = ''
  if (secUserIdCookie && secUserIdCookie.value) {
    try {
      // 尝试解析 cookie 值来获取 sec_user_id
      const decoded = decodeURIComponent(secUserIdCookie.value)
      const match = decoded.match(/sec_user_id[=:]([^,;]+)/i)
      if (match) secUserId = match[1]
    } catch (e) {}
  }
  
  const allAwemes = []
  let maxCursor = 0
  let hasMore = 1
  let pageCount = 0
  const maxPages = 200 // 最多请求200页，防止无限循环

  try {
    while (hasMore === 1 && pageCount < maxPages) {
      pageCount++
      safeLog(`正在获取第 ${pageCount} 页视频列表，max_cursor: ${maxCursor}`)
      
      const res = await axios.get('https://www.douyin.com/aweme/v1/web/aweme/post/', {
        params: {
          aid: '6383',
          count: 18,
          max_cursor: maxCursor,
          publish_video_strategy_type: 2,
          sec_user_id: secUserId
        },
        headers: {
          Cookie: cookieStr,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.douyin.com/',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        },
        timeout: 20000
      })

      const awemeList = res.data?.aweme_list || []
      hasMore = res.data?.has_more || 0
      maxCursor = res.data?.max_cursor || 0

      // 详细日志
      safeLog(`第 ${pageCount} 页: 获取到 ${awemeList.length} 个视频, has_more: ${hasMore}, max_cursor: ${maxCursor}`)
      if (pageCount === 1) {
        safeLog('API 完整响应:', JSON.stringify(res.data)?.substring(0, 500))
      }

      if (awemeList.length > 0) {
        const mapped = awemeList.map(item => {
          const stats = item.statistics || {}
          const desc = item.desc || ''
          
          // 提取关键词（从描述中）
          const keywords = extractKeywords(desc)
          
          // 尝试多种方式获取标题
          let title = desc
          if (!title && item.share_info) {
            title = item.share_info.share_title || item.share_info.share_desc || ''
          }
          if (!title) {
            title = `视频 ${item.aweme_id.slice(0, 8)}`
          }
          
          return {
            aweme_id: item.aweme_id,
            desc: desc,
            title: title.substring(0, 50),
            play_count: stats.play_count || 0,
            digg_count: stats.digg_count || 0,
            comment_count: stats.comment_count || 0,
            share_count: stats.share_count || 0,
            collect_count: stats.collect_count || 0,
            create_time: item.create_time ? new Date(item.create_time * 1000).toISOString() : null,
            keywords: keywords
          }
        })
        allAwemes.push(...mapped)
      }

      // 如果没有更多数据或没有视频，停止请求
      if (hasMore === 0 || awemeList.length === 0) break
      
      // 避免请求过快（增加间隔避免被限流）
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    safeLog(`视频列表获取完成，共 ${pageCount} 页，${allAwemes.length} 个视频`)

    if (allAwemes.length > 0) {
      return { success: true, awemes: allAwemes }
    }

    return { success: false, error: '暂无视频数据', awemes: [] }
  } catch (err) {
    safeLog('获取视频列表失败:', err.message)
    // 即使出错，也返回已经获取到的数据
    if (allAwemes.length > 0) {
      return { success: true, awemes: allAwemes, partial: true, error: err.message }
    }
    return { success: false, error: err.message, awemes: [] }
  }
})

// 提取关键词（简单实现）
function extractKeywords(text) {
  if (!text) return []
  
  // 移除特殊字符，保留中文、英文、数字
  const clean = text.replace(/[^\w\u4e00-\u9fa5]/g, ' ')
  
  // 常见停用词
  const stopWords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '个', '吗', '吧', '呢', '哦', '啊', '呀', '哈哈', '嘿嘿', '嗯', '啦', '噢']
  
  const words = clean.split(/\s+/).filter(w => w.length > 1 && !stopWords.includes(w))
  
  // 统计词频
  const freq = {}
  words.forEach(w => { freq[w] = (freq[w] || 0) + 1 })
  
  // 返回前10个高频词
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ text: word, count }))
}

// 系统
ipcMain.handle('getAppPath', () => DATA_DIR)
ipcMain.handle('openExternal', (event, url) => require('electron').shell.openExternal(url))

// ============ 启动 ============
console.log('应用启动中...')

app.whenReady().then(() => {
  console.log('Electron应用准备就绪，正在初始化...')
  
  // 在macOS上显示Dock图标
  if (process.platform === 'darwin' && app.dock) {
    app.dock.show()
    console.log('Dock图标已显示')
  }
  
  try {
    initStorage()
    console.log('存储初始化完成')
  } catch (error) {
    console.error('存储初始化失败:', error)
  }
  createWindow()
  
  // 显示启动通知（macOS）
  if (Notification.isSupported()) {
    console.log('发送启动通知...')
    const notification = new Notification({
      title: '数据管家',
      body: '应用已启动，请查看窗口'
    })
    notification.show()
  }
  
  // 备用：如果3秒后窗口仍未显示，使用多种方法确保可见
  setTimeout(() => {
    if (mainWindow) {
      if (!mainWindow.isVisible()) {
        console.log('窗口不可见，尝试多种方法显示...')
        
        // 1. 确保窗口在屏幕内
        mainWindow.center()
        
        // 2. 显示窗口
        mainWindow.show()
        
        // 3. 获得焦点
        mainWindow.focus()
        
        // 4. 如果最小化则恢复
        if (mainWindow.isMinimized()) mainWindow.restore()
        
        // 5. 在macOS上弹跳Dock图标
        if (process.platform === 'darwin' && app.dock) {
          app.dock.bounce('informational')
        }
        
        // 6. 再次置顶确保可见
        mainWindow.setAlwaysOnTop(true)
        setTimeout(() => {
          mainWindow.setAlwaysOnTop(false)
        }, 5000)
        
        console.log('已尝试所有显示方法')
      } else {
        console.log('窗口已可见，确保获得焦点')
        mainWindow.focus()
        
        // 短暂置顶确保用户能看到
        mainWindow.setAlwaysOnTop(true)
        setTimeout(() => {
          mainWindow.setAlwaysOnTop(false)
        }, 3000)
      }
    } else {
      console.error('主窗口未创建')
    }
  }, 3000)
})

app.on('window-all-closed', () => {

  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
