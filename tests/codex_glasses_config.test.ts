import { describe, expect, test } from "bun:test";
import { parseRelayConfig } from "../src/config.ts";
import { testConfig } from "./helpers.ts";

function nativeGlassesConfig(): Record<string, unknown> {
  const config = testConfig("D:\\livis-test-state") as unknown as Record<string, unknown>;
  return {
    ...config,
    execution: { backend: "codex" },
    codex: {
      mode: "native-current",
      command: "D:\\tools\\codex.exe",
      requestTimeoutMs: 30_000,
      turnTimeoutMs: 900_000,
      interruptGraceMs: 5_000,
      shutdownTimeoutMs: 5_000,
      glassesMode: {
        enabled: true,
        maxSpokenChars: 160,
        mobileHandoffText: "请在手机 ChatGPT 中继续查看。",
      },
      acknowledgeRemoteExecution: true,
    },
  };
}

describe("Codex 眼镜模式配置", () => {
  test("native-current 可显式启用眼镜回答规则", () => {
    const parsed = parseRelayConfig(JSON.stringify(nativeGlassesConfig()), "D:\\config.json");
    expect(parsed.codex.glassesMode).toEqual({
      enabled: true,
      maxSpokenChars: 160,
      mobileHandoffText: "请在手机 ChatGPT 中继续查看。",
    });
  });

  test("拒绝超长播报设置和 private-api-key 误启用", () => {
    const oversized = nativeGlassesConfig();
    (oversized.codex as Record<string, unknown>).glassesMode = {
      enabled: true,
      maxSpokenChars: 1_001,
    };
    expect(() => parseRelayConfig(JSON.stringify(oversized), "D:\\config.json"))
      .toThrow("不能超过 1000");

    const privateMode = nativeGlassesConfig();
    const codex = privateMode.codex as Record<string, unknown>;
    codex.mode = "private-api-key";
    codex.provider = { type: "openai" };
    codex.model = null;
    codex.toolchainReadRoots = [];
    expect(() => parseRelayConfig(JSON.stringify(privateMode), "D:\\config.json"))
      .toThrow("只支持 codex.mode=native-current");
  });
});
