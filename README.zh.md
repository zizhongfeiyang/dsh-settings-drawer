# 设置抽屉（`dsh-settings-cleaner`）

控制 DeepSeek Harness 设置页左侧要显示哪些栏目。

取消勾选后，该项会立刻从侧栏隐藏。通用、模型、插件、Agent Presets 默认保留。

## 安装

```sh
dsh plugin --profile web add github:zizhongfeiyang/dsh-settings-drawer
```

桌面客户端 / EAC 一般用 `web-desktop`：

```sh
dsh plugin --profile web-desktop add github:zizhongfeiyang/dsh-settings-drawer
```

也可以安装发布包：

```sh
dsh plugin --profile web add ./dsh-settings-cleaner-1.1.1.tgz
```

装完后重启 Web 服务或刷新页面。

## 使用

1. 打开 **设置**
2. 点左侧最上方的 **设置抽屉**
3. 取消不想看到的栏目，会立刻隐藏，并保存在浏览器 `localStorage`

## 说明

- npm 包名仍是 `dsh-settings-cleaner`，方便覆盖已有安装。
- 界面显示名为 **设置抽屉**。
- 偏好键名：`dsh_settings_cleaner_config_v2`。

## 许可证

MIT
