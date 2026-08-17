# LiViS 眼镜连接 ChatGPT：首期体验与验收

本文描述本项目首期实现：保留理想官方 LiViS → OpenClaw Relay 的触发和传输方式，只把
Mac mini 端的执行后端切换为本机当前登录状态的 Codex。眼镜仍然只是一个特定唤起词触发的
远程入口，不接管理想同学的全部能力。

## 首期体验

- 同一副获准眼镜固定使用一个 `sessionKey`，并恢复同一个持久 Codex `threadId`。
- 每条眼镜请求都会附加眼镜入口规则。简单问题返回适合语音播报的短答案；复杂任务由
  ChatGPT/Codex 自行判断，播报结论或状态，并提醒到手机 ChatGPT 继续查看。
- 首期只接收官方 Relay 已提供的纯文本。照片不自行 hack；等官方链路证明会把照片或附件
  转交给插件后，再扩展现有入站消息格式。
- daemon 启动并拥有独立的 `codex app-server --stdio` 进程，不连接或操纵 ChatGPT Desktop
  的后台进程。

## 配置

Mac mini 上选择当前本机 Codex runtime，并开启眼镜模式：

```json
{
  "execution": {
    "backend": "codex"
  },
  "codex": {
    "mode": "native-current",
    "command": "/opt/homebrew/bin/codex",
    "requestTimeoutMs": 30000,
    "turnTimeoutMs": 900000,
    "interruptGraceMs": 5000,
    "shutdownTimeoutMs": 5000,
    "glassesMode": {
      "enabled": true,
      "maxSpokenChars": 180,
      "mobileHandoffText": "详细内容请在手机 ChatGPT 中继续查看。"
    },
    "acknowledgeRemoteExecution": true
  }
}
```

`maxSpokenChars` 是随请求交给模型的回答约束，不是对最终文本做机械截断。这样不会在半句话、
链接或关键结论中间截断；是否遵守长度需要在真实语音 canary 中验收。

daemon 状态会显示：

- `sessionContinuity: single-persistent-thread`
- `chatgptMobileVisibility: unverified`
- `execution.harness.coordinator.threadId`

最后一项是长期会话的实际 Codex thread 标识。第一阶段不要清空 state directory，否则会创建
新会话。

## 手机 ChatGPT 可见性：实机判定

OpenAI 的 App Server 文档确认它提供 conversation history，并被 Codex 的丰富客户端使用；
ChatGPT Remote 文档也说明手机可以继续连接 Mac 上的 Codex 对话。但公开文档没有明确保证：
由第三方 daemon 自行启动的 stdio App Server 所创建的本地 thread，一定会自动出现在手机
ChatGPT 的 Remote 列表。因此本项目把它明确标为 `unverified`，不把推断当成产品能力。

在 Mac mini 部署后，用下面的单次实验判定：

1. 记录 daemon 状态中的 `threadId`。
2. 从眼镜询问一个唯一、容易搜索的问题，例如“记住暗号玻璃桥八一七，并告诉我现在的分钟数”。
3. 确认眼镜收到短回答，然后在手机 ChatGPT 的 Remote 中连接这台 Mac mini。
4. 查找包含该暗号的 Codex 对话；若能打开，直接在手机追问“我刚才的暗号是什么”。
5. 只有“原始眼镜 turn 可见，并且手机追问沿用相同上下文”两项都满足，才把手机可见性判为通过。

若未通过，LiViS 入站、固定会话和眼镜回答规则仍可保留，只替换 Codex 会话适配层；不要改造
理想眼镜的官方触发流程。

参考：[Codex App Server](https://learn.chatgpt.com/docs/app-server)、
[ChatGPT Remote](https://learn.chatgpt.com/docs/remote)。
