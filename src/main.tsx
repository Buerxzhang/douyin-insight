import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import { MessagePlugin } from 'tdesign-react'
import './types/electron.d'

// 全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error)
  MessagePlugin.error('发生未知错误，请检查控制台')
})

// 渲染应用
const container = document.getElementById('app')
if (container) {
  const root = ReactDOM.createRoot(container)
  root.render(
    <StrictMode>
      <App />
    </StrictMode>
  )
}
