import { beforeAll, describe, expect, it, vi } from "vitest";

const wasm = vi.hoisted(() => ({
  init: vi.fn(),
  run: vi.fn(),
}));

vi.mock("@/runtime/wasm/pkg/pseudocode_runtime", () => ({
  default: wasm.init,
  run_pseudocode: wasm.run,
}));

const posted: unknown[] = [];

async function send(data: unknown) {
  await (self.onmessage as unknown as (event: { data: unknown }) => Promise<void>)({ data });
}

beforeAll(async () => {
  vi.stubGlobal("fetch", vi.fn());
  self.postMessage = ((message: unknown) => posted.push(message)) as typeof self.postMessage;
  await import("@/workers/wasmRuntime.worker");
});

describe("wasmRuntime worker", () => {
  it("retries WASM initialization after a failed load", async () => {
    wasm.init.mockRejectedValueOnce(new Error("Failed to fetch WASM")).mockResolvedValue({});

    await send({ kind: "preload", id: 1 });
    expect(posted.pop()).toMatchObject({ kind: "run-result", id: 1, result: { stderr: "Failed to fetch WASM" } });

    await send({ kind: "preload", id: 2 });
    expect(posted.pop()).toEqual({ kind: "runtime-status", status: "ready" });
    expect(wasm.init).toHaveBeenCalledTimes(2);
  });

  it("forwards the seed and flags a thrown run as a crash", async () => {
    const request = { astJson: "{}", stdinLines: [], virtualFiles: {}, seed: 7 };
    wasm.run.mockImplementationOnce(() => {
      throw new Error("RuntimeError: unreachable");
    });

    await send({ kind: "run", id: 3, request });

    expect(JSON.parse(wasm.run.mock.calls[0][0])).toEqual({
      ast_json: "{}",
      stdin_lines: [],
      virtual_files: {},
      seed: 7,
    });
    expect(posted.pop()).toMatchObject({ kind: "run-result", id: 3, crashed: true, result: { success: false } });
  });
});
