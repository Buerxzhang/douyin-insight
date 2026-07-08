# 抖音数据洞察

> **免责声明**
>
> 本仓库的所有内容仅供学习和参考之用，禁止用于商业用途。任何人或组织不得将本仓库的内容用于非法用途或侵犯他人合法权益。本仓库所涉及的爬虫技术仅用于学习和研究，不得用于对其他平台进行大规模爬虫或其他非法行为。对于因使用本仓库内容而引起的任何法律责任，本仓库不承担任何责任。使用本仓库的内容即表示您同意本免责声明的所有条款和条件。

一个跑在本地的小工具,用 Electron 套了层壳,主要给自己和团队看抖音账号的内容表现。数据抓回来后做看板、列表和导出,不依赖任何第三方服务。

## 能干什么

- **数据看板** — 粉丝、播放、点赞这些核心指标的走势一目了然
- **内容列表** — 已发布的视频 / 图文,带播放、点赞、评论、收藏、转发数据;支持按时间范围、内容类型筛选,也能按最新 / 播放 / 点赞 / 评论排序
- **数据导出** — 把选中的内容导出成 Excel / CSV / JSON,方便二次处理或写汇报
- **多账号** — 本地管理多个抖音账号的登录态,切换不用反复扫码

## 技术栈

| 层面 | 技术 |
|------|------|
| 桌面框架 | Electron 28 |
| 前端 | React 18 + TypeScript |
| 构建 | Vite 7 |
| UI | TDesign React |
| 状态管理 | Zustand |
| 图表 | Chart.js |
| 导出 | SheetJS (xlsx) |
| 打包 | electron-builder |

## 跑起来

```bash
npm install
npm run dev        # 开发模式：同时起 Vite 和 Electron
npm run build      # 生产构建
```

各平台打包：

```bash
npm run build:mac     # macOS DMG
npm run build:win     # Windows NSIS 安装包
npm run build:linux   # Linux AppImage
```

## 目录结构

```
douyin-insight/
├── src/
│   ├── components/     # 功能组件
│   │   ├── Dashboard.tsx         # 数据看板
│   │   ├── ContentList.tsx       # 内容列表（含视频/图文筛选、排序）
│   │   ├── ExportData.tsx        # 数据导出
│   │   ├── LoginModal.tsx        # 登录弹窗
│   │   └── QuitConfirmDialog.tsx # 退出确认
│   ├── store/          # Zustand 状态
│   ├── types/          # TypeScript 类型定义
│   ├── App.tsx         # 主应用
│   ├── main.tsx        # 渲染入口
│   └── styles.css      # 全局样式
├── index.js            # Electron 主进程（数据抓取、导出逻辑都在这）
├── preload.js          # 预加载脚本
└── package.json
```

## 数据存在哪

所有数据（包括账号登录态）都只留在本地，不会上传到任何第三方服务器。

## 打包要注意的事

Electron 的原生模块和二进制是平台相关的，没法跨平台交叉编译，得在目标系统上各自构建：

| 目标平台 | 构建机器 | 命令 |
|---------|---------|------|
| macOS | macOS | `npm run build:mac` |
| Windows | Windows | `npm run build:win` |
| Linux | Linux | `npm run build:linux` |

> 比如 Mac 上直接跑 `npm run build:win` 会挂，得去 Windows 机器上打。
> 真要量产建议上 GitHub Actions 的多平台流水线做自动构建。

## License

MIT
