# 设置抽屉（`dsh-settings-cleaner`）

一个 DeepSeek Harness Web UI 插件，让你选择设置页左侧要显示哪些栏目。

取消勾选后，该项会立刻从侧栏隐藏。通用、模型、插件、Agent Presets 默认保留。

[English README](README.md)

## 功能

- 隐藏或显示设置左侧导航中的任意栏目。
- 修改立即生效，并在浏览器本地持久保存。
- 自动发现新安装插件注册的设置栏目。
- 核心设置页默认受保护，不会误隐藏。
- 纯前端 UI 插件，无额外服务、无网络请求。

## 安装

从 GitHub 安装：

```sh
dsh plugin --profile web add github:zizhongfeiyang/dsh-settings-drawer
```

桌面客户端 / EAC 一般用 `web-desktop`：

```sh
dsh plugin --profile web-desktop add github:zizhongfeiyang/dsh-settings-drawer
```

从发布包安装（每个 [Release](https://github.com/zizhongfeiyang/dsh-settings-drawer/releases) 都附了 tarball）：

```sh
dsh plugin --profile web add ./dsh-settings-cleaner-1.1.1.tgz
```

装完后重启 Web 服务或刷新页面。

## 使用

1. 打开 **设置**
2. 点左侧最上方的 **设置抽屉**
3. 取消不想看到的栏目，会立刻从侧栏隐藏

## 配置说明

| 项目 | 值 |
| --- | --- |
| npm 包名 | `dsh-settings-cleaner` |
| 界面显示名 | 设置抽屉 / Settings Drawer |
| localStorage 键 | `dsh_settings_cleaner_config_v2` |
| 默认保留栏目 | 通用、模型、插件、Agent Presets |

## 开发

```sh
npm pack
```

包内包含：

- `lib/index.js` — host 入口
- `lib/client.js` — 浏览器端
- `cordis.patch.yml` — bundle patch
- `README.md`、`README.zh.md`

## 反馈

遇到问题或有新功能建议？请到 [Issues](https://github.com/zizhongfeiyang/dsh-settings-drawer/issues) 提交，并使用项目提供的模板。

## 许可证

MIT
