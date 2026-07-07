import { useEffect, useState, useCallback } from 'react'
import { useGlobalStore } from '../store/useGlobalStore'
import type { VideoItem } from '../types/electron'

interface ContentListProps {
  accountId: string | null
  refreshing?: boolean
}

function ContentList({ accountId, refreshing }: ContentListProps) {
  const { accountVideos } = useGlobalStore()

  const [allContentList, setAllContentList] = useState<VideoItem[]>([])
  const [filters, setFilters] = useState({
    type: 'all',
    time: 'all',
    sort: 'newest'
  })
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 20
  const [lastUpdated, setLastUpdated] = useState('-')
  const [loading, setLoading] = useState(false)

  // 下拉菜单状态
  const [showTypeMenu, setShowTypeMenu] = useState(false)
  const [showTimeMenu, setShowTimeMenu] = useState(false)
  const [showSortMenu, setShowSortMenu] = useState(false)

  // 下拉选项
  const typeOptions = [
    { value: 'all', label: '全部内容' },
    { value: 'video', label: '视频' },
    { value: 'image', label: '图文' }
  ]
  const timeOptions = [
    { value: 'all', label: '全部时间' },
    { value: 'today', label: '今天' },
    { value: 'week', label: '本周' },
    { value: 'month', label: '本月' },
    { value: '3month', label: '近三月' }
  ]
  const sortOptions = [
    { value: 'newest', label: '最新发布' },
    { value: 'popular', label: '最多播放' },
    { value: 'likes', label: '最多点赞' },
    { value: 'comments', label: '最多评论' }
  ]

  // 工具函数
  const formatNumber = (num: number | string) => {
    if (!num && num !== 0) return '-'
    if (Number(num) >= 100000000) return (Number(num) / 100000000).toFixed(1) + '亿'
    if (Number(num) >= 10000) return (Number(num) / 10000).toFixed(1) + '万'
    return String(num)
  }

  const formatDate = (timestamp: string | number) => {
    try {
      // 如果是数字（时间戳秒），乘以1000；如果是字符串，直接解析
      const date = new Date(typeof timestamp === 'number' ? timestamp * 1000 : timestamp)
      if (isNaN(date.getTime())) return '-'
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return '-'
    }
  }

  // 清理文本：去除标签、超长截断
  const cleanText = (text: string) => {
    if (!text) return '无标题'
    // 去除 #话题 标签
    let cleaned = text.replace(/#[\w\u4e00-\u9fa5]+/g, '').trim()
    // 去除多余空格
    cleaned = cleaned.replace(/\s+/g, ' ').trim()
    return cleaned
  }

  // 计算过滤后的列表
  const filteredList = () => {
    let list = [...allContentList]

    // 类型过滤：视频 / 图文（无 content_type 的旧数据按视频处理）
    if (filters.type !== 'all') {
      list = list.filter(item => (item.content_type || 'video') === filters.type)
    }

    if (filters.time !== 'all') {
      const now = new Date()
      let cutoffDate: Date
      switch (filters.time) {
        case 'today':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate())
          break
        case '3month':
          cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
          break
        default:
          return list
      }
      list = list.filter(item => new Date(item.create_time) >= cutoffDate)
    }

    switch (filters.sort) {
      case 'newest':
        list.sort((a, b) => new Date(b.create_time).getTime() - new Date(a.create_time).getTime())
        break
      case 'popular':
        list.sort((a, b) => b.play_count - a.play_count)
        break
      case 'likes':
        list.sort((a, b) => b.digg_count - a.digg_count)
        break
      case 'comments':
        list.sort((a, b) => b.comment_count - a.comment_count)
        break
    }

    return list
  }

  // 计算分页列表
  const paginatedList = () => {
    const start = (currentPage - 1) * pageSize
    const end = start + pageSize
    return filteredList().slice(start, end)
  }

  // 加载内容列表
  const loadContentList = useCallback(async () => {
    if (!accountId) {
      setAllContentList([])
      return
    }

    setLoading(true)

    const videos = accountVideos[accountId]

    if (videos && videos.length > 0) {
      setAllContentList(videos)
      setLastUpdated(new Date().toLocaleString())
    } else {
      setAllContentList([])
    }
    setLoading(false)
  }, [accountId, accountVideos])

  // 处理过滤器变化
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
    setShowTypeMenu(false)
    setShowTimeMenu(false)
    setShowSortMenu(false)
  }

  // 获取当前选中的标签
  const getCurrentLabel = (options: { value: string; label: string }[], value: string) => {
    return options.find(o => o.value === value)?.label || ''
  }

  // 初始化加载
  useEffect(() => {
    loadContentList()
  }, [accountId, loadContentList])

  // 监听刷新状态
  useEffect(() => {
    if (refreshing) {
      setLoading(true)
    } else {
      // 刷新完成后重新加载
      loadContentList()
    }
  }, [refreshing])

  // 点击其他地方关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setShowTypeMenu(false)
      setShowTimeMenu(false)
      setShowSortMenu(false)
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // 渲染无账号状态
  if (!accountId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <div className="empty-title">暂无账号数据</div>
        <div className="empty-description">请点击右上角"添加账号"开始使用</div>
      </div>
    )
  }

  return (
    <div className="content-list-page fade-in">
      {/* 页面头部 */}
      <div className="page-header">
        <div className="filters">
          {/* 内容类型下拉 */}
          <div className="dropdown-filter" onClick={(e) => { e.stopPropagation(); setShowTypeMenu(!showTypeMenu); setShowTimeMenu(false); setShowSortMenu(false) }}>
            <span className="dropdown-label">{getCurrentLabel(typeOptions, filters.type)}</span>
            <span className="dropdown-arrow">▼</span>
            {showTypeMenu && (
              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {typeOptions.map(option => (
                  <div
                    key={option.value}
                    className={`dropdown-option ${filters.type === option.value ? 'active' : ''}`}
                    onClick={() => handleFilterChange('type', option.value)}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 时间范围下拉 */}
          <div className="dropdown-filter" onClick={(e) => { e.stopPropagation(); setShowTimeMenu(!showTimeMenu); setShowTypeMenu(false); setShowSortMenu(false) }}>
            <span className="dropdown-label">{getCurrentLabel(timeOptions, filters.time)}</span>
            <span className="dropdown-arrow">▼</span>
            {showTimeMenu && (
              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {timeOptions.map(option => (
                  <div
                    key={option.value}
                    className={`dropdown-option ${filters.time === option.value ? 'active' : ''}`}
                    onClick={() => handleFilterChange('time', option.value)}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 排序方式下拉 */}
          <div className="dropdown-filter" onClick={(e) => { e.stopPropagation(); setShowSortMenu(!showSortMenu); setShowTypeMenu(false); setShowTimeMenu(false) }}>
            <span className="dropdown-label">{getCurrentLabel(sortOptions, filters.sort)}</span>
            <span className="dropdown-arrow">▼</span>
            {showSortMenu && (
              <div className="dropdown-menu" onClick={(e) => e.stopPropagation()}>
                {sortOptions.map(option => (
                  <div
                    key={option.value}
                    className={`dropdown-option ${filters.sort === option.value ? 'active' : ''}`}
                    onClick={() => handleFilterChange('sort', option.value)}
                  >
                    {option.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 内容列表 */}
      <div className="list-container">
        <div className="list-header">
          <div className="summary">
            共 <span className="highlight">{filteredList().length}</span> 条内容
            {lastUpdated && <>，最近更新于 {lastUpdated}</>}
          </div>
          <div className="pagination-controls">
            <button
              className="btn-secondary"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              上一页
            </button>
            <span style={{ padding: '0 12px', color: '#5E6C84' }}>
              第 {currentPage} / {Math.ceil(filteredList().length / pageSize) || 1} 页
            </span>
            <button
              className="btn-secondary"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage >= Math.ceil(filteredList().length / pageSize)}
            >
              下一页
            </button>
          </div>
        </div>

        {/* 表格 */}
        <table className="content-table">
          <thead>
            <tr>
              <th>发布时间</th>
              <th>内容</th>
              <th style={{ textAlign: 'center' }}>播放</th>
              <th style={{ textAlign: 'center' }}>点赞</th>
              <th style={{ textAlign: 'center' }}>评论</th>
              <th style={{ textAlign: 'center' }}>收藏</th>
              <th style={{ textAlign: 'center' }}>转发</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  加载中...
                </td>
              </tr>
            ) : paginatedList().length > 0 ? (
              paginatedList().map((item) => (
                <tr key={item.aweme_id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{formatDate(item.create_time)}</td>
                  <td>
                    <div className="content-title" title={cleanText(item.desc || item.title)}>
                      {cleanText(item.desc || item.title)}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center' }}>{formatNumber(item.play_count)}</td>
                  <td style={{ textAlign: 'center' }}>{formatNumber(item.digg_count)}</td>
                  <td style={{ textAlign: 'center' }}>{formatNumber(item.comment_count)}</td>
                  <td style={{ textAlign: 'center' }}>{formatNumber(item.collect_count)}</td>
                  <td style={{ textAlign: 'center' }}>{formatNumber(item.share_count)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px' }}>
                  暂无数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ContentList
