# dsh-endfield-startup

终末地工业风格的 DeepSeek Harness 全屏启动序列。基于 `dsh-startup-screen` 的 Host/Client bundle 外壳重制，接管 Harness 冷启动画面；不是独立网页，也不会遮挡主界面的长期操作。开头借用了 `dsh-startup-screen` 的「居中 Logo → 扫光 → 进入」结构：完整 Logo 先在中央放大显示并扫过一道信号黄光带，再飞入左上角常驻。HUD 结构参考 `dsh-rhine-splash`（编号步骤、环形仪表、模块条、实时状态），但保持终末地的炭黑 / 信号黄 / 全直角，不使用暖白底板、过曝洗白或故障揭幕。

## 当前状态

- 已安装到当前 `desktop` profile，插件行 `dsh-endfield-startup` 为 **active**。
- 旧的 `dsh-startup-screen`（暖白档案底板）已从 bundles 中移除，避免两层启动画面叠加。
- 旧的 `dsh-endfield-boot` 不在 bundles 中；不要重新启用它。它留下的 `/dsh-endfield/splash.js` 注入会在冷启动时造成 `failed to load`，本插件不依赖它。
- 启动层注入在 **Harness 冷启动**时生效。安装/替换启动插件后需要关闭并重新打开 DeepSeek Harness；普通页面刷新可能命中上一次进程缓存的注入表。

## 交互流程

0. **入口 · Logo 进场**
   背景音乐从第 0 秒开始播。完整 Logo 在中央放大显示，信号黄扫描线从上到下扫过；随后 Logo 飞入左上角并常驻。进场约 2.2 秒，**点击或按 Enter 可立即跳过**。
1. **阶段 A · 安全唤醒**
   终端逐字打印 `DEEPSEEK HARNESS // SECURE BOOT`、`ENDFIELD INDUSTRIES TERMINAL ACCESS`、`IDENTITY REQUIRED`，每行附中文批注。打印完成后出现 `WAKE TERMINAL / 唤醒终端`；**必须点击或按 Enter 才进入 B**，不会自动跳转。
2. **阶段 B · 工业标识**
   完整终末地工业 Logo 固定在**左上角**（单色白 + 信号黄竖线），从 A 一直保留到 D。中央是环形雷达 / 链路仪表：外圈刻度、旋转扫描扇区、链路就绪环；右侧是终端接入信息、双语法务信息、条码与 `ESTABLISH TERMINAL LINK / 建立终端链路`。**必须点击链路按钮或雷达才进入 C**，去掉了自动接入。
3. **阶段 C · 硬门控（自动扫描）**
   - 左侧常驻 `01 WAKE / 02 LINK / 03 AUTH / 04 LOAD` 编号步骤，当前阶段高亮。
   - 第一次点击 / Enter / Space：捕获签名，进入 **二次确认**。确认状态是 **6 秒窗口**：`AUTH WINDOW` 数字从 `06` 走到 `00`，黄色横条同步缩短；超时只会关闭窗口并回到门控，**不会自动授权、不会自动进入下一阶段**；也可以随时点 `CANCEL` 取消。
   - 第二次点击：进入权限核验；三项权限按 **1 秒一项自动扫描**（`SCAN → GRANTED`，每秒一次确认音，面板显示 `AUTO-SCANNING 1/3`）；也可以点击某一行提前扫描。
   - 第三项扫描完成后立即出现 `INITIALIZE DEEPSEEK HARNESS / 初始化 Harness 终端`，不需要等待语音结束。
   - 语音作为反馈播放，不阻塞按钮；新的语音会打断上一条，避免叠音。
   - 右侧 `SYSTEM READOUT / 系统读数` 可点 `RUN DIAGNOSTIC / 运行诊断`，播放三段确认音并点亮节点指示。
4. **阶段 D · 加载与退场**
   中央面板收缩，出现 `TERM / ARCH / PROTO / LINK / AUTH` 五格模块条，随进度逐格点亮；底部信号黄进度条 0→100%，等高线加速，扫描线扫过一次；100% 后硬切纯炭黑 200ms，再向上折叠露出 Harness 主界面。左上角 Logo 与实时时钟保持到退场前。

所有主要标签均为中英结合；语音为 **Microsoft Edge Neural `en-US-AriaNeural` 女声**（已替换原来的 SAPI Zira），语速与音高做了轻度压低处理。

## 设置

打开 **DSH 设置 → 启动序列**：

- 启用 / 播放模式（每次会话、每次刷新、每天一次）
- 背景环境音、界面确认音、英文语音及音量
- 语音来源：内置语音文件 / Web Speech TTS
- 立即预览、保存、恢复默认

配置文件：`~/.dsh/dsh-endfield-startup.json`

背景音乐默认音量 **0.4**（上一版为 0.2，响度提高一倍）；仍可在设置里单独调节，语音播放时会自动压低。

## 音频占位

| 文件 | 用途 |
| --- | --- |
| `lib/assets/bgm.mp3` | 《协议流》截取 32 秒无缝循环，已做 −18 LUFS 归一 |
| `lib/assets/ui-click.mp3` | 按钮按压、链路/诊断的干燥机械“嗒” |
| `lib/assets/ui-confirm.mp3` | 权限条目确认“嗒”声 |
| `lib/assets/link.mp3` | 终端链路建立继电器音 |
| `lib/assets/auth-granted.mp3` | 门控触发/第三项权限低频确认 |
| `lib/assets/voice-01.mp3` … `voice-05.mp3` | 五句英文女声；Edge Neural `en-US-AriaNeural` 生成 |
| `lib/assets/endfield-logo-white.png` | 完整 Logo 白色版（用户提供图转透明底），固定在左上角 |

替换语音时保持文件名即可；若删除语音文件，运行时会回落到 Web Speech API（英文女声优先）。

## 无障碍与降级

- `prefers-reduced-motion: reduce`：跳过逐字/描边/扫屏，直接进入静态门控；**门控逻辑不变**，仍需完成二次确认与初始化。
- Esc / SKIP 在授权前只能打开遮罩；授权后才能跳过加载。
- 启动层结束后移除根节点并释放 `html.efs-lock` / body overflow。

## 文件

```
lib/index.js          Host：注入、路由、配置持久化
lib/client.js         Client：设置面板 + 桌面端自举兜底
lib/splash.js         四阶段运行时、多步门控、用户驱动
lib/splash.css        炭黑/信号黄/全直角视觉
lib/assets/*          音乐、点击音、Aria 女声、完整 Logo 白色版
locale/{zh,en}.json   插件显示元数据
```

## 已知限制

- 语音为 Edge Neural Aria 生成的素材，不是真人录音；替换同名文件即可。
- 背景音乐在启动时立即尝试播放；若运行环境禁止自动播放，会回落为首次点击/按键后启动，AUDIO 标签先显示 STANDBY。
- 桌面端启动层依赖 `dsh-app://` 自定义协议把同源 `/dsh-endfield-startup/*` 路由代理到 Host 的 webServer；请在冷启动验证，不要在旧进程上反复热刷新启动注入。
- 若再次出现 `desktop web: failed to load ... splash.js` 崩溃页：选择“Disable third-party plugins, back up profile patch, and restart”恢复，然后仅重新启用本插件；不要启用 `dsh-endfield-boot`。
