import { describe, expect, test } from "bun:test";
import {
  DISABLED_CODEX_GLASSES_MODE,
  formatCodexGlassesPrompt,
} from "../src/backends/codex/glasses-prompt.ts";

describe("Codex LiViS 眼镜入口 Prompt", () => {
  test("关闭时保持用户原文不变", () => {
    expect(formatCodexGlassesPrompt("今天天气如何？", DISABLED_CODEX_GLASSES_MODE))
      .toBe("今天天气如何？");
  });

  test("开启时附加语音长度、复杂任务和手机接续规则", () => {
    const prompt = formatCodexGlassesPrompt("帮我分析这份很长的方案", {
      enabled: true,
      maxSpokenChars: 160,
      mobileHandoffText: "请在手机 ChatGPT 中继续查看。",
    });
    expect(prompt).toContain("来自眼镜语音入口");
    expect(prompt).toContain("160 个字符以内");
    expect(prompt).toContain("复杂任务");
    expect(prompt).toContain("请在手机 ChatGPT 中继续查看。");
    expect(prompt).toContain("[用户原始请求开始]\n帮我分析这份很长的方案\n[用户原始请求结束]");
  });
});
