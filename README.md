# CodeInterviewAssist

一个用于编程题练习的开源桌面助手：截取题目后，通过你配置的 AI 服务生成解题思路、代码和复杂度分析，也可根据代码或错误截图提供调试建议。

提供 OpenAI、Gemini 和 Anthropic 接入。应用在本机运行，AI 分析通过所选服务商的 API 完成，相关费用由服务商收取。

[快速开始](#快速开始) · [快捷键](#快捷键) · [模型与费用](#模型与费用) · [常见问题](#常见问题) · [参与贡献](#参与贡献)

> 本仓库沿用 Interview Coder 的代码与命名，应用界面和安装包中仍显示 **Interview Coder / Unlocked Edition**。本文以 CodeInterviewAssist 指代本项目。

## 核心功能

- **截图识题**：截取屏幕上的编程题，提取题目、约束和示例。
- **解题与解释**：生成代码、解题思路，以及时间和空间复杂度分析。
- **调试辅助**：补充代码、错误信息或测试结果截图，获取修改建议。
- **模型与语言选择**：选择 AI 服务商，分别设置识题、解题和调试模型，并选择代码输出语言。
- **桌面快捷操作**：通过全局快捷键截图、提交分析、切换窗口，以及调整位置、透明度和缩放。

## 快速开始

### 1. 准备环境

- **Node.js 22.x 和 npm**：推荐使用此版本；锁文件中的 Vite、rimraf 和 electron-store 依赖约束均允许 Node.js 22。仓库 CI 同样使用 Node.js 22。
- **一个模型服务商的 API Key**：OpenAI、Gemini 或 Anthropic，需具有所选模型的访问权限和可用额度。
- **桌面环境与网络连接**：代码包含 macOS、Windows 和 Linux 相关配置，实际截图与窗口行为需在目标系统上验证。
- **macOS 截屏权限**：在系统设置中找到屏幕录制权限，为实际运行应用的程序授权；从终端或 IDE 启动时，也检查对应程序的权限，授权后重新启动。

### 2. 获取代码并启动

```bash
git clone https://github.com/GoodScholar/interview-coder-withoupaywall-opensource.git
cd interview-coder-withoupaywall-opensource
npm install
npm run build
npm run run-prod
```

请确认每一步成功后再执行下一步。构建产物位于 `dist/` 和 `dist-electron/`；`run-prod` 使用这些产物启动桌面应用。

首次启动默认显示窗口。如果窗口不可见，按 **Cmd+B（macOS）或 Ctrl+B（Windows/Linux）** 切换显示。

### 3. 配置 AI 服务

1. 在首次启动的设置窗口中选择服务商；也可以从欢迎页点击 **Open Settings**。
2. 填入该服务商的 API Key。
3. 选择识题、解题和调试阶段使用的模型。
4. 点击 **Save Settings**，并选择需要的代码输出语言。

当前代码默认选择 Gemini。界面提供的模型列表来自仓库配置，不代表服务商当前仍开放所有模型；若返回模型不可用错误，请参阅[常见问题](#常见问题)。

### 4. 完成第一次分析

1. 在屏幕上打开一道练习题，确保题目、约束和示例清晰可见。
2. 按 **Cmd/Ctrl+H** 截图，确认截图预览已出现在队列中。必要时翻页并补充截图。
3. 按 **Cmd/Ctrl+Enter** 提交分析。
4. 等待结果页显示代码、解题说明和复杂度分析，即完成第一次使用。

截图会捕获屏幕内容，请在提交前检查预览。当前主截图队列和补充截图队列各最多保留 **5 张**，超出后移除最早的一张。

## 常见用法

**分析新题目**：按 Cmd/Ctrl+R 清空当前队列并重置，再截图并提交。

**调试已有解答**：在结果页截取代码、错误信息或测试结果，然后按 Cmd/Ctrl+Enter 获取调试分析。

**修正截图**：按 Cmd/Ctrl+L 删除当前队列的最后一张截图，再重新截取。

生成的代码和解释需要自行运行、检查；模型输出不保证正确或最优。

## 快捷键

下表中的 `Cmd/Ctrl` 表示 macOS 使用 `Cmd`，Windows/Linux 使用 `Ctrl`。

| 操作 | 快捷键 |
| --- | --- |
| 显示或隐藏窗口 | `Cmd/Ctrl+B` |
| 截图 | `Cmd/Ctrl+H` |
| 删除最后一张截图 | `Cmd/Ctrl+L` |
| 分析截图 / 提交调试 | `Cmd/Ctrl+Enter` |
| 重置并开始新题目 | `Cmd/Ctrl+R` |
| 移动窗口 | `Cmd/Ctrl+方向键` |
| 降低 / 提高透明度 | `Cmd/Ctrl+[` / `Cmd/Ctrl+]` |
| 缩小 / 放大界面 | `Cmd/Ctrl+-` / `Cmd/Ctrl+=` |
| 恢复默认缩放 | `Cmd/Ctrl+0` |
| 退出应用 | `Cmd/Ctrl+Q` |

## 模型与费用

| 服务商 | 配置方式 |
| --- | --- |
| OpenAI | 选择 OpenAI，填写对应 API Key，再选择各阶段模型 |
| Google Gemini | 选择 Gemini，填写对应 API Key，再选择各阶段模型 |
| Anthropic | 选择 Anthropic，填写对应 API Key，再选择各阶段模型 |

这三种服务商均有设置界面与调用实现；具体模型能否使用取决于服务商的模型生命周期、账号权限和额度。切换服务商时，请同时更换为对应的 Key。

应用不收取订阅费；模型 API 的费用、限额和可用性由所选服务商决定。一次题目分析包含识题和解题阶段，补充调试也会产生 API 请求。

模型选项、服务商类型与默认值统一定义在 [modelConfig.ts](electron/modelConfig.ts)，设置界面、配置校验和请求默认值共用这份定义。调用逻辑位于 [ProcessingHelper.ts](electron/ProcessingHelper.ts)；新增模型时请同时确认其接口兼容性。

## 数据处理与已知限制

- **本地存储**：API Key 和偏好设置保存在应用用户数据目录的 `config.json` 中。当前使用普通 JSON 文件保存，未通过系统钥匙串加密。
- **外部处理**：截图、提取的题目内容及相关调试上下文会按处理阶段发送给所选模型服务商。这不是离线推理工具。
- **截图文件**：主截图与补充截图分别保存在用户数据目录的 `screenshots/` 和 `extra_screenshots/` 中；代码在重置、删除和应用启动时执行相应清理。清理失败时文件可能残留。
- **窗口捕获**：应用启用了 Electron 内容保护并提供隐藏窗口操作，效果取决于操作系统及录屏、共享软件。不保证窗口在所有截图或屏幕共享方式中不可见。
- **平台差异**：Linux 截图依赖桌面环境与底层截图工具；仓库中的跨平台构建配置不等于所有桌面环境都经过验证。
- **功能范围**：当前流程围绕截图展开，未提供实时语音转写功能。

本项目用于学习与练习。在面试、考试或其他评估场景使用时，请遵守相关规则和授权要求。

## 常见问题

### 启动后没有窗口

先按 Cmd/Ctrl+B 切换显示；若窗口透明度过低，使用 Cmd/Ctrl+] 提高透明度。仍无响应时，查看启动终端中的错误信息，并检查应用是否仍在运行。窗口管理工具也可能影响位置快捷键。

### 截图失败或内容为空

检查系统屏幕录制权限，并在授权后重新启动实际运行应用的程序。Linux 用户还需检查截图工具和桌面会话兼容性。截图成功后应先能在队列中看到预览，再提交 AI 分析。

### API Key 或模型调用失败

- 确认所选服务商与 Key 对应，并检查账号额度、模型权限和网络连接。
- 若提示模型不存在或已停用，先尝试列表中其他可用模型；若列表整体过时，需要更新上述模型配置与调用代码。
- 修改设置后点击 **Save Settings**；必要时重启应用。
- 提交问题时附上错误信息，移除 API Key、个人信息和截图中的敏感内容。

### 配置文件在哪里

配置使用 Electron 的应用用户数据目录。源码运行时通常为：

| 系统 | 配置路径 |
| --- | --- |
| macOS | `~/Library/Application Support/interview-coder-v1/config.json` |
| Windows | `%APPDATA%\interview-coder-v1\config.json` |
| Linux | `${XDG_CONFIG_HOME:-~/.config}/interview-coder-v1/config.json` |

打包或更改应用名称后路径可能不同，以启动日志中的 `Config path:` 为准。截图目录位于同一用户数据目录下。不要在 Issue 中上传包含 Key 的配置文件。

### 构建失败或缺少构建产物

检查 Node.js 版本及 `npm install` 是否成功，再执行 `npm run build`。构建命令已经清理旧的 `dist/` 与 `dist-electron/`，通常无需另外运行清理命令。

也可使用 `stealth-run.sh`（macOS/Linux）或 `stealth-run.bat`（Windows）构建并启动。脚本会保留 `.env`，构建失败时立即退出；应用在前台运行，使用期间请保持终端开启。

## 开发与构建

技术栈：Electron、React、TypeScript、Vite、Tailwind CSS 和 Radix UI。

安装依赖后启动开发模式：

```bash
npm run dev
```

开发模式使用本地 Vite 服务（端口 `54321`）和 Electron 窗口。

| 命令 | 用途 |
| --- | --- |
| `npm run build` | 清理并构建前端和 Electron 主进程 |
| `npm run run-prod` | 启动已有构建产物 |
| `npm test` | 运行自动发现的回归测试 |
| `npm run check:quality` | 阻止新增 ESLint 和严格 TypeScript 诊断 |
| `npm run typecheck:electron` | 检查 Electron 项目类型 |
| `npm run lint` | 执行完整 JavaScript/TypeScript ESLint 检查 |
| `npm run package-mac` | 构建 macOS DMG / ZIP |
| `npm run package-win` | 构建 Windows 安装包 |

安装包输出到 `release/`。macOS 打包配置启用了签名和公证，需要相应的开发者凭据；打包配置还引用根目录 `.env`。打包前请检查 [package.json](package.json) 中的资源、签名和发布目标设置。

CI 会运行回归测试、Electron 类型检查、生产构建和新增诊断检查。仓库仍有历史 Lint 和严格类型错误，质量基线通过表示没有新增诊断，并不表示这些历史问题已全部修复。基线范围和维护方式见[质量检查说明](tooling/README.md)。

## 参与贡献

欢迎提交错误复现、文档修正和功能改进。请先阅读[贡献指南](CONTRIBUTING.md)；涉及运行环境时，以本 README 和当前依赖约束为准。

反馈问题请使用[本仓库 Issues](https://github.com/GoodScholar/interview-coder-withoupaywall-opensource/issues)，附上操作系统、运行方式、复现步骤和去除敏感信息后的错误日志。

本项目由社区维护，功能请求与支持取决于贡献者的时间。清晰的复现步骤和小范围 PR 都能帮助改进项目。

## 来源与许可证

感谢 Interview Coder 的原始作者，以及移除付费限制、扩展模型接入和维护文档的贡献者。本仓库保留了相关项目的代码与署名；可通过 Git 历史查看具体贡献记录。

`package.json` 中的许可证标识为 `AGPL-3.0-or-later`。完整文本见 [LICENSE](LICENSE)，仓库另附 [LICENSE-SHORT](LICENSE-SHORT)。使用与分发时请保留相关许可证和版权声明。
