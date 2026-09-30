# 设置抽屉（`dsh-settings-drawer`）

一个 DeepSeek Harness Web UI 插件，让你选择要显示的设置栏目、插件标签和插件配置项。

取消勾选后，对应入口会立即隐藏。通用、模型、插件、Agent Presets 和账户默认保留。隐藏入口不会禁用对应插件。

[English README](README.md)

## 预览

![设置抽屉](docs/screenshots/settings-drawer.png)

截图为 1.2.0；1.3.0 会按入口所在位置分组展示。

## 功能

- 隐藏或显示设置左侧导航中的任意栏目。
- 修改立即生效，并在浏览器本地持久保存。
- 自动发现 `settings.section`、`settings.plugins.tab` 和 `plugins.item`，支持 DSH 0.2 新版插件配置入口。
- 已删除的插件不会残留：列表只显示当前实际注册的栏目。
- 右上角 `⟳` 可手动刷新列表，不会删除暂时卸载的插件的显示偏好。
- 账户等核心栏目默认保留；新插件标签和配置项默认全部显示。
- 禁用或卸载抽屉时，恢复原有栏目接口并清理订阅。
- 无需匹配构建生成的 CSS 类名，也无需监听 DOM 变动。
- 纯前端 UI 插件，无额外服务、无网络请求。

## 安装

从 GitHub 安装：

```sh
dsh plugin --profile web add github:zizhongfeiyang/dsh-settings-drawer
```

官方 DSH 0.2 桌面端使用 `desktop` profile。先通过应用菜单的“管理 dsh 命令”安装内置命令，并至少启动一次桌面端完成初始化，然后完全退出应用再执行：

```sh
dsh plugin --profile desktop add github:zizhongfeiyang/dsh-settings-drawer
```

必须使用桌面端内置的 `dsh`；通过 npm 安装的命令不能管理这个 profile。旧版 EAC 可能仍使用 `web-desktop`，请以对应发行版实际运行的 profile 为准。参见[官方桌面端命令说明](https://github.com/deepseek-ai/deepseek-harness/blob/dsh-v0.2.0-rc.2/apps/desktop/README.zh.md#内置命令运行时)。

从本地打包文件或 [Release](https://github.com/zizhongfeiyang/dsh-settings-drawer/releases) 的 tarball 安装：

```sh
dsh plugin --profile web add ./dsh-settings-drawer-1.3.0.tgz
```

桌面端安装 tarball 时，使用内置命令并改为 `--profile desktop`。安装后重启桌面端或 Web 服务，并重新加载页面。从 1.2.0 升级时，需要完整刷新页面或重启应用，以清除旧版未托管的监听器和栏目包装函数。

## 使用

1. 打开 **设置**
2. 点左侧最上方的 **设置抽屉**
3. 在“设置栏目”“插件标签”或“插件配置项”中取消勾选，对应入口会立即隐藏；没有实际注册入口的分组不会显示
4. “只显示核心项”保留核心栏目、`all` 插件标签以及 Shell、Agent Loop、Subagent、Web Search 内置配置项；“恢复默认”清除保存的覆盖选择

## 配置说明

| 项目 | 值 |
| --- | --- |
| npm 包名 | `dsh-settings-drawer` |
| 界面显示名 | 设置抽屉 / Settings Drawer |
| localStorage 键 | `dsh_settings_drawer_config_v2` |
| 默认保留栏目 | 通用、模型、插件、Agent Presets、账户，以及旧版 `dock` / `dsh-prompt` 入口 |
| 新插件入口 | 默认显示，分别使用 `visiblePluginTabs` 和 `visiblePluginItems` 配置 |

沿用原有存储键并保留 1.2.0 的 `enableDrawer` 和 `visibleCards`，包括用户明确隐藏核心栏目的选择。未注册的入口从列表消失，但其显示偏好会保留，重新启用插件时继续生效。

## 测试环境

- 1.3.0：使用已发布的 DSH 0.2.0-rc.2 SlotRegistry、Cordis 和 React 组件进行自动化集成验证，并验证已发布的 0.1.0-rc.7 SlotCore 接口。
- 1.2.0 历史人工测试：DSH 0.1.0-rc.6 / rc.7、EAC 3.0.1 / 4.1.0、Windows + Chrome 内核 Web UI。

1.3.0 测试覆盖注册、过滤、旧配置保留、动态更新、浏览器存储事件和禁用/重新启用。测试没有启动完整桌面应用，也不等同于浏览器端到端测试。

## 开发

```sh
npm ci --legacy-peer-deps --ignore-scripts
npm run check
npm test
npm pack
```

`--legacy-peer-deps` 用于同时安装两组固定版本测试依赖，它们的 DSH peer 范围不同。测试依赖仅用于开发，不会打入插件安装包。

包内包含：

- `lib/index.js` — host 入口
- `lib/client.js` — 浏览器端
- `cordis.patch.yml` — bundle patch
- `README.md`、`README.zh.md`

## 反馈

遇到问题或有新功能建议？请到 [Issues](https://github.com/zizhongfeiyang/dsh-settings-drawer/issues) 提交，并使用项目提供的模板。

## 许可证

MIT
