# 理想 LiViS PC Kit 到 ChatGPT / Codex 的改造研究

日期：2026-08-17

## 结论

理想的 `livis-pc-kit` 不是独立的本机守护程序，而是一个 OpenClaw 渠道插件。它借用
OpenClaw Gateway 的常驻进程，通过理想云的 WebSocket 中继接收眼镜或理想同学 App 发来的
任务，再把任务交给 OpenClaw 智能体执行。

要停止使用 OpenClaw，同时继续让眼镜控制 Mac mini，合理目标不是操纵 ChatGPT 窗口，而是
实现独立的 LiViS → Codex 桥接服务：

1. 保留理想的登录、Agent ID、WebSocket 和结果回传协议。
2. 用 Codex App Server 取代 OpenClaw 的智能体运行时。
3. 使用 Mac mini 上当前登录的 Codex/ChatGPT 状态。
4. 将服务作为受限的 macOS LaunchAgent 常驻运行。

## 官方插件现在做什么

```text
LiViS 眼镜 / 理想同学 App
        |
        v
理想账号、设备绑定和云端中继
        |
        v  WSS
livis-pc-kit 插件（运行在 OpenClaw Gateway 内）
        |
        v
OpenClaw 智能体、工具和本机权限
        |
        v
文本结果 / Word、PDF、HTML、Markdown 文件
        |
        v
理想云 -> App 展示或眼镜语音播报
```

2026-08-17 的静态审计确认：

- 插件描述是 `Remote control channel plugin via WebSocket relay server`。
- 连接地址是 `wss://livis-pc-kit-gateway.livis.com/api/v1/ws`，登录使用
  `https://id.lixiang.com/api` 的 OAuth Device Flow。
- 插件没有安装独立 LaunchAgent；安装器启用插件并重启 `openclaw gateway`，因此实际守护
  进程是 OpenClaw Gateway。
- 远端任务类型为 `exec`。插件把输入标记为 `CommandAuthorized: true` 后交给 OpenClaw 的
  回复分发器；底层工具是否仍需审批取决于 OpenClaw 配置。
- 回答和任务原始载荷保存在 `~/.openclaw/livis-pc-kit-messages.db`，日志会保存提示和结果预览。
- 本机文件可上传到理想网关，支持 Word、PDF、HTML 和 Markdown，单文件上限 100 MB。
- OAuth refresh token 以 `0600` 权限保存在本机 JSON 文件中，也会用于 WebSocket 建联和刷新。

## 安全和维护风险

高优先级：

1. 远端任务进入本地智能体时被标记为已授权命令。客户端未显示逐条本地确认或消息级签名校验；
   安全边界主要依赖理想账号、Agent 绑定、TLS 和中继服务。
2. 顶层安装链继续在线下载脚本和插件压缩包，没有固定 SHA-256 或签名校验，且 `latest` 可变。
3. 插件把自然语言交给 OpenClaw，实际权限由 OpenClaw 工具、沙箱和审批配置决定。

中优先级：

1. 提示、原始载荷和结果以 SQLite 明文保存在本机；日志最多滚动保存约 20 × 5 MB。
2. 文件上传会把指定文件交给理想网关，输出规则还会鼓励智能体使用 `message` 工具发文件。
3. 客户端以 `job_id` 做幂等恢复，但静态代码中未看到对时间戳、来源节点或独立签名的严格校验。
4. 独立实现依赖未公开承诺稳定的 LiViS 私有协议；官方包元数据未提供明确再分发许可证，
   因此本仓库不纳入审计取得的官方 bundle，只保留摘要和哈希指纹。

## 评估过的方案

| 方案 | 是否仍需 OpenClaw | 稳定性 | 能否复用 ChatGPT 登录 | 结论 |
|---|---:|---:|---:|---|
| 用 macOS 辅助功能操纵 ChatGPT 窗口 | 否 | 低 | 是 | 不采用；容易受 UI、焦点、会话和响应抓取影响。 |
| OpenClaw 薄壳 + `codex exec` | 是 | 中高 | 是 | 可做快速 POC，但不是最终形态。 |
| 独立 LiViS → Codex LaunchAgent | 否 | 中 | 是 | 当前实现方向；保留官方入口，替换本机智能体运行时。 |

## 已确定的首期范围

- 官方 LiViS/OpenClaw Relay 的唤起词和云端路由保持不变。
- 只把官方路由到 OpenClaw 的那一类请求转到 Codex，不接管理想同学的全部能力。
- 同一副眼镜映射到一个长期持久 Codex thread。
- 每个眼镜请求附加专用交互规则：简单问题短答；复杂问题给出结论或状态并提示手机接续。
- 首期只处理官方 Relay 已提供的纯文本。
- 照片不另造或 hack 新链路；先确认官方拍照动作是否会把图片/附件交给现有插件，再扩展协议。
- 手机 ChatGPT 是否能看到 daemon 自行启动的 App Server thread，必须通过 Mac mini 实机验证。

## 后续阶段与停止条件

后续可以补充图片附件、手机审批以及更细的项目路由，但必须满足：

- 破坏性操作必须在手机或桌面确认，不能用纯语音直接批准。
- 工作区、命令、插件、MCP、网络域名和文件大小都要有明确白名单。
- 如果理想服务端拒绝非 OpenClaw 客户端、协议频繁变化、使用条款不允许独立客户端，或无法建立
  可靠审批回路，则停止独立化，不继续扩大权限。
- 不把 ChatGPT/Codex 长期凭据交给理想云或其他第三方。

## 静态审计指纹

- `setup.sh`: `0DDF7FF36E6AC67399D219B8DFD5A036F1067CC2CD3BB4E418CD2E3986C6355F`
- `install-plugin.sh`: `FF2FDA3638D4FE5C3C52A86361F60C44A68E2870E69136381D2D11D593C35CEB`
- `install-skills.sh`: `A72BF84180247799600263B08364CC1E02954DF915D1F38A9212908DCEEF7788`
- 插件包 v2.0.0: `300A6AD49F2CA11195A30945E6F052CC649A5F40CA876790A2FE0B00E09D608F`
- 输出规则包: `C7E0F75B25B0B1945E9531042173E1D9954E8D2FBA347979229226E893FC7E5A`

这些哈希只是当日下载内容的审计指纹，不代表理想官方签名或未来 `latest` 的内容。

## 资料

- [理想官方安装说明](https://li-center.lixiang.com/livis-pc-kit/README.html)
- [OpenAI Codex App Server](https://learn.chatgpt.com/docs/app-server)
- [OpenAI Codex SDK](https://learn.chatgpt.com/docs/codex-sdk)
- [OpenAI Codex 非交互模式](https://learn.chatgpt.com/docs/non-interactive-mode)
- [OpenAI Codex 登录方式](https://learn.chatgpt.com/docs/auth)

