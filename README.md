# 📊 抖音数据洞察 - 本地抖音数据分析工具

<div align="center">

[![GitHub Stars](https://img.shields.io/github/stars/Buerxzhang/douyin-insight?style=social)](https://github.com/Buerxzhang/douyin-insight/stargazers)
[![GitHub Forks](https://img.shields.io/github/forks/Buerxzhang/douyin-insight?style=social)](https://github.com/Buerxzhang/douyin-insight/network/members)
[![GitHub Issues](https://img.shields.io/github/issues/Buerxzhang/douyin-insight)](https://github.com/Buerxzhang/douyin-insight/issues)
[![GitHub Release](https://img.shields.io/github/v/release/Buerxzhang/douyin-insight)](https://github.com/Buerxzhang/douyin-insight/releases)
[![License](https://img.shields.io/badge/license-非商业(保留所有权利)-red)](README.md)

</div>

> **免责声明：**
>
> 本仓库的所有内容仅供学习和参考之用，禁止用于商业用途。任何人或组织不得将本仓库的内容用于非法用途或侵犯他人合法权益。本仓库所涉及的数据获取技术仅用于学习和研究，不得用于对其他平台进行大规模数据获取或其他非法行为。对于因使用本仓库内容而引起的任何法律责任，本仓库不承担任何责任。使用本仓库的内容即表示您同意本免责声明的所有条款和条件。
>
> 点击查看更为详细的免责声明。[点击跳转](#disclaimer)

## 📖 项目简介

一个跑在本地的小工具，用 Electron 套了层壳，主要给自己和团队看抖音账号的内容表现。数据同步到本地后做看板、列表和导出，不依赖任何第三方服务。所有数据都只留在本地，不上传任何服务器。

## ✨ 功能特性

| 功能 | 说明 |
| ---- | ---- |
| 📈 数据看板 | 粉丝、播放、点赞等核心指标的走势一目了然 |
| 📋 内容列表 | 已发布的视频 / 图文，带播放、点赞、评论、收藏、转发数据 |
| 🔍 内容筛选 | 按时间范围、内容类型（视频 / 图文）筛选 |
| ↕️ 内容排序 | 按最新 / 播放 / 点赞 / 评论排序 |
| 📤 数据导出 | 把选中的内容导出成 Excel / CSV / JSON，方便二次处理或写汇报 |
| 👥 多账号 | 本地管理多个抖音账号的登录态，切换不用反复扫码 |

## 🔧 技术栈

| 层面 | 技术 |
| ---- | ---- |
| 桌面框架 | Electron 28 |
| 前端 | React 18 + TypeScript |
| 构建 | Vite 7 |
| UI | TDesign React |
| 状态管理 | Zustand |
| 图表 | Chart.js |
| 导出 | SheetJS (xlsx) |
| 打包 | electron-builder |

## 🚀 快速开始

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

## 📂 目录结构

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
├── index.js            # Electron 主进程（数据处理、导出逻辑都在这）
├── preload.js          # 预加载脚本
└── package.json
```

## 💾 数据存储

所有数据（包括账号登录态）都只留在本地，不会上传到任何第三方服务器。

## 📦 打包构建

Electron 的原生模块和二进制是平台相关的，没法跨平台交叉编译，得在目标系统上各自构建：

| 目标平台 | 构建机器 | 命令 |
| -------- | -------- | ---- |
| macOS | macOS | `npm run build:mac` |
| Windows | Windows | `npm run build:win` |
| Linux | Linux | `npm run build:linux` |

> 比如 Mac 上直接跑 `npm run build:win` 会挂，得去 Windows 机器上打。
> 真要量产建议上 GitHub Actions 的多平台流水线做自动构建。

## 🔒 风险与合规须知

本项目用于抖音账号数据的本地管理与可视化分析，使用前请务必了解以下风险与应对方式：

- ⚠️ **账号风险**：本工具依赖账号数据的读取，相关操作可能受平台用户协议约束。使用过程中账号存在被限流或限制访问的风险。**建议使用专门用于测试的账号，切勿使用重要主账号。** 由此导致的账号损失由使用者自行承担。

- 📵 **收到侵权投诉 / DMCA 下架通知**：若开发者或用户收到平台、权利方或相关主体的侵权投诉、DMCA 删除通知或其他法律函件，应**立即停止相关数据的读取与分发**，删除本地已存储的相关内容，并配合权利方与平台的处理要求。本项目不提供任何对抗风控、规避下架或绕过平台限制的技术支持。

- 🔐 **隐私与数据合规**：严禁使用本项目读取、存储、传播他人个人隐私信息（如手机号、身份证号、住址、通讯录等）。因违规使用导致的任何法律责任由使用者自行承担。

- 🛑 **开发者响应**：若本项目收到有效的法律要求、平台下架通知或权利方投诉，维护者有权在不另行通知的情况下移除相关功能、限制访问或下线仓库。

# 免责声明
<div id="disclaimer">

## 1. 项目目的与性质

本项目（以下简称"本项目"）是作为一个技术研究与学习工具而创建的，旨在探索和学习抖音数据的本地采集与可视化技术，提供给学习者和研究者作为技术交流之用。

## 2. 法律合规性声明

本项目开发者（以下简称"开发者"）郑重提醒用户在下载、安装和使用本项目时，严格遵守中华人民共和国相关法律法规，包括但不限于《中华人民共和国网络安全法》等所有适用的国家法律和政策。用户应自行承担一切因使用本项目而可能引起的法律责任。

## 3. 使用目的限制

本仓库的所有内容仅供学习和参考之用，禁止用于商业用途。任何人或组织不得将本仓库的内容用于非法用途或侵犯他人合法权益。本仓库所涉及的数据获取技术仅用于学习和研究，不得用于对其他平台进行大规模数据获取或其他非法行为。本工具依赖账号数据的读取，相关操作可能受平台用户协议约束，使用者应自行承担由此产生的一切后果，开发者不建议使用重要主账号运行本项目。

## 4. 免责声明

对于因使用本仓库内容而引起的任何法律责任，本仓库不承担任何责任。开发者已尽最大努力确保本项目的正当性及安全性，但不对用户使用本项目可能引起的任何形式的直接或间接损失承担责任。若开发者或用户收到平台、权利方或相关主体发出的侵权投诉、DMCA 删除通知或其他法律函件，应立即停止相关数据的抓取与分发，删除本地已存储的相关内容，并配合权利方与平台的处理要求；开发者有权在不另行通知的情况下移除相关功能、限制访问或下线仓库。

## 5. 知识产权声明

本项目的知识产权归开发者所有，受到著作权法和国际著作权条约以及其他知识产权法律和条约的保护。用户在遵守本声明及相关法律法规的前提下，可以下载和使用本项目。

## 6. 最终解释权

关于本项目的最终解释权归开发者所有。使用本仓库的内容即表示您同意本免责声明的所有条款和条件。开发者保留随时更改或更新本免责声明的权利，恕不另行通知。
