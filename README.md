# Settings Drawer (`dsh-settings-cleaner`)

Control which items appear in the DeepSeek Harness settings left nav.

Unchecking an item hides it from the sidebar immediately. Core pages
(General, Models, Plugins, Agent Presets) stay visible by default.

[中文说明](README.zh.md)

## Install

```sh
dsh plugin --profile web add github:zizhongfeiyang/dsh-settings-drawer
```

Desktop / EAC users typically use `web-desktop`:

```sh
dsh plugin --profile web-desktop add github:zizhongfeiyang/dsh-settings-drawer
```

Or install the packed tarball from a release:

```sh
dsh plugin --profile web add ./dsh-settings-cleaner-1.1.1.tgz
```

Restart the web service or refresh the page after installing.

## Usage

1. Open **Settings**.
2. Open **设置抽屉** (Settings Drawer) at the top of the left nav.
3. Uncheck items you do not want to see. Changes apply immediately and persist in `localStorage`.

## Notes

- Package name stays `dsh-settings-cleaner` so existing installs keep working.
- Display name in the UI is **设置抽屉**.
- Preferences are stored under `dsh_settings_cleaner_config_v2`.

## License

MIT
