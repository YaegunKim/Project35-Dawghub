import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Bare 'node_modules' only matches a top-level node_modules relative to root — it doesn't
    // glob-match a nested one like .claude/worktrees/<branch>/node_modules (another session's
    // isolated worktree checkout, see CLAUDE.md-adjacent memory on concurrent sessions), so
    // without the ** prefix/suffix a worktree left checked out under .claude/ gets its entire
    // node_modules tree swept into test collection. .claude/** is excluded outright on top of
    // that — a worktree under there is a full separate checkout of this same repo with its own
    // src/e2e, meant to be run from inside that worktree's own directory, not picked up here.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e', '.claude/**'],
  },
})
