import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    },
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/lib/**", "src/hooks/**"],
      exclude: [
        "src/lib/database.types.ts",
        "src/lib/supabase/**",
        "**/*.d.ts",
      ],
      thresholds: {
        "src/lib/validations/": { statements: 90 },
        "src/lib/utils.ts": { statements: 90 },
      },
    },
  },
});
