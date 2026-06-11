import { useEffect, useState, useCallback, useRef } from 'react'
import { useGlobalStore } from '../store/useGlobalStore'
import { Chart } from 'chart.js/auto'
import type { VideoItem } from '../types/electron'

interface DashboardProps {
  accountId: string | null
  loading: boolean
  refreshing: boolean
}

function Dashboard({ accountId, loading, refreshing }: DashboardProps) {
  const { accountStats, accountVideos, accountInfo, accounts } = useGlobalStore()

  const [stats, setStats] = useState({
    contentTotalCount: 0,
    contentTotalPlays: '-',
    contentTotalLikes: '-',
    fans: 0
  })
  const [rankList, setRankList] = useState<VideoItem[]>([])
  const [trendRange, setTrendRange] = useState('7')
  const [lastRefreshTime, setLastRefreshTime] = useState('-')
  const [dataLoading, setDataLoading] = useState(false)

  const trendChartRef = useRef<HTMLCanvasElement | null>(null)
  const trendChartInstance = useRef<Chart | null>(null)

  // 工具函数
  const formatNumber = (num: number | string | undefined) => {
    if (!num && num !== 0) return '-'
    const n = Number(num)
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
    if (n >= 10000) return (n / 10000).toFixed(1) + '万'
    return String(n)
  }

  // 加载统计数据
  const loadStats = useCallback(async () => {
    if (!accountId) return

    const account = accountInfo[accountId] || accounts.find(acc => acc.id === accountId)
    const videos = accountVideos[accountId] || []
    const contentTotalCount = videos.length

    let play = 0
    let like = 0
    let fans = account?.fansCount || 0

    // 从视频数据统计播放量和点赞量
    if (videos.length > 0) {
      like = videos.reduce((sum, video) => sum + (video.digg_count || 0), 0)
      play = videos.reduce((sum, video) => sum + (video.play_count || 0), 0)
    }

    // 从统计数据获取粉丝数
    const statsData = accountStats[accountId]
    if (statsData && statsData.fans) {
      fans = statsData.fans
    }

    setStats({
      contentTotalCount: contentTotalCount,
      contentTotalPlays: formatNumber(play),
      contentTotalLikes: formatNumber(like),
      fans: fans
    })

    setLastRefreshTime(new Date().toLocaleTimeString())
  }, [accountId, accounts, accountStats, accountVideos, accountInfo])

  // 加载排行榜
  const loadRankList = useCallback(() => {
    if (!accountId) return

    const videos = accountVideos[accountId]

    if (videos && videos.length > 0) {
      const ranked = videos
        .sort((a, b) => b.play_count - a.play_count)
        .slice(0, 5)
      setRankList(ranked)
    } else {
      setRankList([])
    }
  }, [accountId, accountVideos])

  // 更新趋势图
  const updateTrendChart = useCallback(() => {
    if (!accountId) return

    if (trendChartInstance.current) {
      trendChartInstance.current.destroy()
    }

    const videos = accountVideos[accountId]

    if (!videos || videos.length === 0) return

    const list = videos.sort((a, b) => new Date(a.create_time).getTime() - new Date(b.create_time).getTime())
    const now = new Date()
    let filteredList = list

    if (trendRange === '7') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filteredList = list.filter(item => new Date(item.create_time) >= sevenDaysAgo)
    } else if (trendRange === '30') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      filteredList = list.filter(item => new Date(item.create_time) >= thirtyDaysAgo)
    }
    // trendRange === 'all' 时不进行过滤

    // 按时间聚合数据
    const aggregatedData: Record<string, { label: string; play_count: number; video_count: number }> = {}
    
    filteredList.forEach(item => {
      const date = new Date(item.create_time)
      let key: string
      let label: string
      
      if (trendRange === 'all') {
        // 所有时间：按月聚合
        key = `${date.getFullYear()}-${date.getMonth() + 1}`
        label = `${date.getFullYear()}/${date.getMonth() + 1}月`
      } else {
        // 近7天/30天：按天聚合
        key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
        label = `${date.getMonth() + 1}/${date.getDate()}`
      }
      
      if (!aggregatedData[key]) {
        aggregatedData[key] = { label, play_count: 0, video_count: 0 }
      }
      aggregatedData[key].play_count += item.play_count || 0
      aggregatedData[key].video_count += 1
    })

    // 转换为数组并排序
    const sortedKeys = Object.keys(aggregatedData).sort()
    const dates = sortedKeys.map(k => aggregatedData[k].label)
    const plays = sortedKeys.map(k => aggregatedData[k].play_count)

    // 限制标签显示数量（如果太长）
    const maxLabels = 12
    const step = Math.ceil(dates.length / maxLabels)
    const labelsToShow = dates.map((d, i) => (i % step === 0 ? d : ''))

    const ctx = trendChartRef.current?.getContext('2d')
    if (!ctx) return

    trendChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labelsToShow,
        datasets: [{
          label: '播放量',
          data: plays,
          borderColor: '#FE2C55',
          backgroundColor: 'rgba(254, 44, 85, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true,
          pointBackgroundColor: '#FE2C55',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            ticks: {
              color: '#5E6C84',
              maxRotation: 0
            }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0,0,0,0.05)'
            },
            ticks: {
              color: '#5E6C84',
              callback: function(value: number | string) {
                if (typeof value === 'number' && value >= 10000) return (value / 10000).toFixed(0) + '万'
                return value
              }
            }
          }
        }
      }
    })
  }, [accountId, accountVideos, trendRange])

  // 初始化加载
  useEffect(() => {
    if (accountId) {
      // 有账号时，检测数据是否还在加载中
      const videos = accountVideos[accountId]
      if (!videos || videos.length === 0) {
        setDataLoading(true)
      } else {
        // 只有数据存在时才更新图表
        loadStats()
        loadRankList()
        updateTrendChart()
      }
    }
  }, [accountId])

  // 监听数据变化，数据到达后取消加载状态
  useEffect(() => {
    if (accountId) {
      const videos = accountVideos[accountId]
      // 如果之前没有数据，现在有了，说明数据加载完成
      if (videos && videos.length > 0) {
        setDataLoading(false)
        // 延迟更新图表，确保数据已完全更新
        setTimeout(() => {
          loadStats()
          loadRankList()
          updateTrendChart()
        }, 100)
      }
    }
  }, [accountId, accountVideos])

  // 监听趋势范围变化
  useEffect(() => {
    if (accountId) {
      updateTrendChart()
    }
  }, [trendRange, accountId])

  // 渲染加载状态
  if (loading && !accountId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div className="empty-title">加载中...</div>
        <div className="empty-description">正在获取您的数据</div>
      </div>
    )
  }

  // 渲染无账号状态
  if (!accountId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📊</div>
        <div className="empty-title">暂无账号数据</div>
        <div className="empty-description">请点击右上角"添加账号"开始使用</div>
      </div>
    )
  }

  // 渲染数据加载中状态
  if (dataLoading || refreshing) {
    return (
      <div className="empty-state">
        <div className="loading-spinner">🔄</div>
        <div className="empty-title">加载中...</div>
        <div className="empty-description">正在获取您的数据</div>
      </div>
    )
  }

  return (
    <div className="dashboard fade-in">
      {/* 统计卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">内容总数</span>
            <span className="stat-icon">📹</span>
          </div>
          <div className="stat-value">{stats.contentTotalCount || '-'}</div>
          <div className="stat-change">作品数量</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">总播放量</span>
            <span className="stat-icon">▶️</span>
          </div>
          <div className="stat-value">{stats.contentTotalPlays}</div>
          <div className="stat-change">播放次数</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">总点赞量</span>
            <span className="stat-icon">❤️</span>
          </div>
          <div className="stat-value">{stats.contentTotalLikes}</div>
          <div className="stat-change">点赞次数</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-label">粉丝数</span>
            <span className="stat-icon">👥</span>
          </div>
          <div className="stat-value">{formatNumber(stats.fans)}</div>
          <div className="stat-change">关注人数</div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="chart-grid">
        {/* 趋势图 */}
        <div className="chart-container">
          <div className="chart-header">
            <span className="chart-title">📈 播放趋势</span>
            <div className="chart-controls">
              <button
                className={`option-btn ${trendRange === '7' ? 'active' : ''}`}
                onClick={() => setTrendRange('7')}
              >
                近7天
              </button>
              <button
                className={`option-btn ${trendRange === '30' ? 'active' : ''}`}
                onClick={() => setTrendRange('30')}
              >
                近30天
              </button>
              <button
                className={`option-btn ${trendRange === 'all' ? 'active' : ''}`}
                onClick={() => setTrendRange('all')}
              >
                所有时间
              </button>
            </div>
          </div>
          <div className="chart-wrapper">
            <canvas ref={trendChartRef}></canvas>
          </div>
        </div>

        {/* 播放排行榜 */}
        <div className="chart-container">
          <div className="chart-header">
            <span className="chart-title">🏆 播放排行榜</span>
          </div>
          {rankList.length > 0 ? (
            <div className="rank-list">
              {rankList.map((video, index) => (
                <div key={video.aweme_id} className="rank-item">
                  <div className={`rank-number ${index === 0 ? 'top1' : index === 1 ? 'top2' : index === 2 ? 'top3' : ''}`}>
                    {index + 1}
                  </div>
                  <div className="rank-info">
                    <div className="rank-title">
                      {video.desc || video.title || '无标题'}
                    </div>
                    <div className="rank-stats">
                      ❤️ {formatNumber(video.digg_count)} | 💬 {formatNumber(video.comment_count)}
                    </div>
                  </div>
                  <div className="rank-plays">
                    {formatNumber(video.play_count)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <div className="empty-icon">📊</div>
              <div className="empty-title">暂无数据</div>
            </div>
          )}
        </div>
      </div>

      {/* 最后更新时间 */}
      <div style={{ textAlign: 'center', marginTop: '20px', color: '#8993A4', fontSize: '12px' }}>
        最后更新时间: {lastRefreshTime}
      </div>
    </div>
  )
}

export default Dashboard
