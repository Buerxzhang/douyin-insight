import React, { useEffect, useRef, useState } from 'react'
import { MessagePlugin } from 'tdesign-react'

function LoginModal({ visible, onClose, onLoginSuccess, existingAccounts, isRelogin = false }) {
  const webviewRef = useRef(null)
  const [loading, setLoading] = useState(false)

  // 处理取消
  const handleCancel = () => {
    onClose()
  }

  // 处理完成登录
  const handleComplete = async () => {
    if (!webviewRef.current) return

    setLoading(true)
    try {
      // 获取webview中的cookies
      const cookies = await window.electronAPI.getWebviewCookies()
      console.log('获取到的cookies数量:', cookies?.length || 0)
      if (!cookies || cookies.length === 0) {
        throw new Error('未检测到登录状态，请先登录 (cookies: 0)')
      }

      // 获取用户信息
      const userInfo = await window.electronAPI.getUserInfo(cookies)
      console.log('用户信息响应:', userInfo)
      if (!userInfo || !userInfo.success) {
        throw new Error(userInfo?.error || '获取用户信息失败 (API无响应)')
      }

      // 检查重复登录 - 如果存在则更新 cookies
      const existingAccount = existingAccounts?.find(acc => acc.nickname === userInfo.nickname)
      if (existingAccount) {
        // 更新该账号的 cookies
        const result = await window.electronAPI.updateAccountCookies(userInfo.nickname, cookies, userInfo)
        if (result.success) {
          MessagePlugin.success('登录已更新')
          onLoginSuccess()
          onClose()
        } else {
          throw new Error(result.error || '更新登录失败')
        }
        return
      }

      // 添加新账号
      const account = {
        platform: 'douyin',
        nickname: userInfo.nickname,
        cookies: cookies,
        fansCount: userInfo.fansCount || 0,
        avatar: userInfo.avatar
      }

      const result = await window.electronAPI.addAccount(account)
      if (result.success) {
        MessagePlugin.success('登录成功')
        onLoginSuccess()
        onClose()
      } else {
        throw new Error(result.error || '登录失败')
      }
    } catch (error) {
      console.error('登录失败:', error)
      MessagePlugin.error('登录失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 当可见性变化时，重新加载 webview
  useEffect(() => {
    if (visible && webviewRef.current) {
      webviewRef.current.src = 'https://www.douyin.com/'
    }
  }, [visible])

  if (!visible) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">登录抖音账号</h2>
          <button className="modal-close" onClick={handleCancel} disabled={loading}>
            ×
          </button>
        </div>

        <div className="login-form">
          <p className="modal-description">
            请在下方使用手机扫码或账号密码登录，登录后点击"完成登录"
          </p>

          <div className="webview-wrapper">
            <webview
              ref={webviewRef}
              src="https://www.douyin.com/"
              partition="persist:login"
              className="login-webview"
            />
          </div>

          <div className="modal-footer">
            <button
              className="btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleComplete}
              disabled={loading}
            >
              {loading ? '登录中...' : '完成登录'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginModal
