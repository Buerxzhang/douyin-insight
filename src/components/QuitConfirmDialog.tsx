import React from 'react'

function QuitConfirmDialog({ visible, onClose, onConfirm, accountName = '' }: {
  visible: boolean
  onClose: () => void
  onConfirm: () => void
  accountName?: string
}) {
  if (!visible) return null

  return (
    <div className="quit-dialog-overlay" onClick={onClose}>
      <div className="quit-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="quit-dialog-header">
          <span className="quit-dialog-icon">🚪</span>
          <span>退出账号</span>
        </div>
        <div className="quit-dialog-body">
          <p>确定要退出当前账号吗？</p>
          <p className="quit-dialog-hint">退出后相关数据将被清除，重新登录后可继续使用</p>
        </div>
        <div className="quit-dialog-footer">
          <button className="quit-dialog-btn cancel" onClick={onClose}>
            取消
          </button>
          <button className="quit-dialog-btn danger" onClick={onConfirm}>
            确定退出
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuitConfirmDialog
