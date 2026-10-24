import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Integration tests share one database, so files run one after another.
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
