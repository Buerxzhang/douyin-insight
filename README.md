# 抖音数据洞察 (Douyin Insight)

一个基于 Electron + React 的抖音数据本地分析工具，帮助创作者和管理者监控、分析抖音账号内容表现。

## 功能

- 📊 **数据看板** — 总览账号粉丝、播放、点赞等核心指标趋势
- 📋 **内容列表** — 查看和管理已发布视频及其数据
- 📤 **数据导出** — 一键导出分析报告为 Excel 格式
- 🔑 **账号登录** — 本地管理多个抖音账号登录态

## 技术栈

| 层面 | 技术 |
|------|------|
| 桌面框架 | Electron 28 |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite 7 |
| UI 组件 | TDesign React |
| 状态管理 | Zustand |
| 图表 | Chart.js |
| 数据导出 | SheetJS (xlsx) |
| 打包 | electron-builder |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式启动
npm run dev

# 生产构建
npm run build
```

各平台打包命令：

```bash
npm run build:mac   # macOS DMG
npm run build:win   # Windows NSIS 安装包
npm run build:linux # Linux AppImage
```

## 项目结构

```
douyin-insight/
├── src/
│   ├── components/     # 功能组件
│   │   ├── Dashboard.tsx      # 数据看板
│   │   ├── ContentList.tsx    # 内容列表
│   │   ├── ExportData.tsx     # 数据导出
│   │   ├── LoginModal.tsx     # 登录弹窗
│   │   └── QuitConfirmDialog.tsx # 退出确认
│   ├── store/          # Zustand 状态管理
│   ├── types/          # TypeScript 类型定义
│   ├── App.tsx         # 主应用组件
│   ├── main.tsx        # 入口
│   └── styles.css      # 全局样式
├── build/              # 打包图标
├── index.js            # Electron 主进程
├── preload.js          # 预加载脚本
└── package.json
```

## 数据安全

所有数据均存储在本地，不会上传至任何第三方服务器。

## License

MIT

## 跨平台构建说明

Electron 的 native 模块和二进制文件是平台相关的，无法跨平台交叉编译，需要在目标平台上分别构建。

| 目标平台 | 构建机器 | 命令 |
|---------|---------|------|
| macOS (Intel) | macOS Intel | `npm run build:mac` |
| macOS (Apple Silicon / arm64) | macOS ARM64 | `npm run build:mac` |
| Windows (x64) | Windows x64 | `npm run build:win` |
| Linux (x64) | Linux x64 | `npm run build:linux` |

> 例如：在 Mac ARM64 机器上执行 `npm run build:win` 会失败，必须在 Windows x64 机器上运行打包命令。
>
> 生产环境建议使用 CI 多平台流水线（如 GitHub Actions）进行自动化构建。
