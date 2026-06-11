import { useState } from 'react'
import { MessagePlugin } from 'tdesign-react'
import { useGlobalStore } from '../store/useGlobalStore'

interface ExportDataProps {
  accountId: string | null
}

function ExportData({ accountId }: ExportDataProps) {
  const { accounts, accountVideos } = useGlobalStore()

  const [timeRange, setTimeRange] = useState('7')
  const [exportFormat, setExportFormat] = useState('excel')
  const [exportMetrics, setExportMetrics] = useState(['play', 'like', 'comment', 'share', 'collect'])
  const [exporting, setExporting] = useState(false)

  // 无账号时直接显示空状态（Hooks 必须在条件判断之前）
  if (!accountId) {
    return (
      <div className="empty-state">
        <div className="empty-icon">💾</div>
        <div className="empty-title">暂无账号数据</div>
        <div className="empty-description">请点击右上角"添加账号"开始使用</div>
      </div>
    )
  }

  const currentAccount = (accounts || []).find(acc => acc.id === accountId)

  // 选项配置
  const timeOptions = [
    { value: 'all', label: '全部' },
    { value: '7', label: '近7天' },
    { value: '30', label: '近30天' },
    { value: '90', label: '近90天' }
  ]

  const formatOptions = [
    { value: 'excel', label: 'Excel', icon: '📊' },
    { value: 'csv', label: 'CSV', icon: '📄' },
    { value: 'json', label: 'JSON', icon: '📋' }
  ]

  const metricsOptions = [
    { value: 'play', label: '播放量', icon: '▶️' },
    { value: 'like', label: '点赞', icon: '❤️' },
    { value: 'comment', label: '评论', icon: '💬' },
    { value: 'share', label: '转发', icon: '🔄' },
    { value: 'collect', label: '收藏', icon: '⭐' }
  ]

  // 处理指标切换
  const toggleMetric = (metric: string) => {
    setExportMetrics(prev => {
      if (prev.includes(metric)) {
        if (prev.length === 1) {
          MessagePlugin.warning('至少选择一项指标')
          return prev
        }
        return prev.filter(m => m !== metric)
      } else {
        return [...prev, metric]
      }
    })
  }

  // 处理导出
  const handleExport = async () => {
    if (!accountId) {
      MessagePlugin.warning('请先选择账号')
      return
    }

    if (exportMetrics.length === 0) {
      MessagePlugin.warning('请至少选择一项导出内容')
      return
    }

    setExporting(true)

    try {
      let videosToExport = accountVideos[accountId] || []
      
      // 如果选择了具体时间范围，进行过滤
      if (timeRange !== 'all') {
        const days = parseInt(timeRange)
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        videosToExport = videosToExport.filter(video => {
          const createTime = new Date(video.create_time)
          return createTime >= cutoffDate
        })
      }
      
      // 按时间从新到旧排序
      videosToExport = videosToExport.sort((a, b) => {
        const timeA = new Date(a.create_time).getTime()
        const timeB = new Date(b.create_time).getTime()
        return timeB - timeA
      })

      let result
      const exportName = currentAccount?.nickname || '抖音'
      
      if (exportFormat === 'excel') {
        result = await window.electronAPI.exportContentToExcel(videosToExport, exportName)
      } else if (exportFormat === 'csv') {
        result = await window.electronAPI.exportContentToCSV(videosToExport, exportName)
      } else {
        result = await window.electronAPI.exportContentToJSON(videosToExport, exportName)
      }

      if (result && result.success && result.filePath) {
        MessagePlugin.success('导出成功！文件已保存到: ' + result.filePath)
      } else if (result && result.error) {
        throw new Error(result.error)
      } else {
        throw new Error('导出失败：未知错误')
      }
    } catch (error) {
      console.error('导出失败:', error)
      MessagePlugin.error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="export-page fade-in">
      {/* 页面标题 */}
      <div className="page-header">
        <h2>导出数据</h2>
        {currentAccount && (
          <span className="current-account-tag">
            当前账号: {currentAccount.nickname}
          </span>
        )}
      </div>

      {/* 设置卡片 */}
      <div className="export-settings">
        {/* 时间范围 */}
        <div className="export-setting-group">
          <div className="export-setting-label">
            <span>📅</span> 时间范围
          </div>
          <div className="time-range-options">
            {timeOptions.map(option => (
              <div
                key={option.value}
                className={`time-range-item ${timeRange === option.value ? 'active' : ''}`}
                onClick={() => setTimeRange(option.value)}
              >
                <span className="check-icon">{timeRange === option.value ? '✓' : ''}</span>
                <span>{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 导出格式 */}
        <div className="export-setting-group">
          <div className="export-setting-label">
            <span>📦</span> 导出格式
          </div>
          <div className="format-options">
            {formatOptions.map(option => (
              <div
                key={option.value}
                className={`format-option ${exportFormat === option.value ? 'active' : ''}`}
                onClick={() => setExportFormat(option.value)}
              >
                <span className="format-icon">{option.icon}</span>
                <span className="format-label">{option.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 导出内容 */}
        <div className="export-setting-group">
          <div className="export-setting-label">
            <span>📊</span> 导出内容
          </div>
          <div className="metrics-grid">
            {metricsOptions.map(option => (
              <div
                key={option.value}
                className={`metric-item ${exportMetrics.includes(option.value) ? 'active' : ''}`}
                onClick={() => toggleMetric(option.value)}
              >
                <span className="metric-icon">{option.icon}</span>
                <span className="metric-label">{option.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 导出按钮 */}
      <div className="export-actions">
        <button
          className="btn-primary export-btn"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? '导出中...' : '💾 开始导出'}
        </button>
      </div>

    </div>
  )
}

export default ExportData
