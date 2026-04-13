# Claude Code Plugin & MCP Recommendations for OluHome

## Recommended MCP Servers

### 1. Context7 — Library Documentation (ESSENTIAL)

Fetches real-time, version-specific documentation for any npm library directly into Claude's context. This is critical for OluHome because the stack includes libraries (Drizzle ORM, @react-pdf/renderer, shadcn/ui, NextAuth v5, dnd-kit) where Claude's training data may be outdated or wrong.

```bash
claude mcp add context7 -- npx -y @upstash/context7-mcp
```

**When it helps:** Every prompt. Claude will look up current Drizzle API, NextAuth v5 config patterns, @react-pdf/renderer component APIs, and shadcn/ui component props instead of guessing from potentially stale training data.

---

### 2. Postgres MCP — Database Inspection (ESSENTIAL)

Lets Claude query your Neon database directly — inspect the schema, verify migrations landed correctly, check seed data, and debug query issues.

```bash
claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres
```

Set the connection string in your `.mcp.json`:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    }
  }
}
```

**Security:** Use a read-only database user for this connection if you're uncomfortable with Claude having write access. For local dev, the full connection string is fine since the Neon dev branch is disposable.

**When it helps:** Prompt 1 (schema verification), Prompt 5 (debugging item queries), Prompt 8 (analytics query development), and any time you're debugging data issues.

---

### 3. Next.js DevTools MCP — Runtime Debugging (RECOMMENDED)

Official Vercel MCP server that connects to your running Next.js dev server. Claude can check for hydration errors, inspect server component output, and verify API routes.

```bash
claude mcp add next-devtools -- npx -y next-devtools-mcp@latest
```

**Note:** Requires Next.js 16+ for full `nextjs_index` and `nextjs_call` tools. The `nextjs_docs` tool works regardless of version and gives Claude access to current Next.js documentation. If you're on Next.js 15, the docs tool alone is worth it.

**When it helps:** Debugging hydration mismatches (common with the dynamic form rendering), verifying Server Component vs Client Component boundaries, and checking for runtime errors.

---

### 4. GitHub MCP — PR and Repo Management (RECOMMENDED)

Create branches, open PRs, manage issues directly from Claude Code. Useful for the build-prompt-by-prompt workflow where each prompt should be its own branch/PR.

```bash
claude mcp add github --transport http -- https://mcp.github.com
```

You'll need a GitHub Personal Access Token with `repo` scope. Set it as `GITHUB_TOKEN` in your environment.

**When it helps:** After each build prompt, Claude can commit to a feature branch and open a PR for review before merging to main. Keeps the build clean and reviewable.

---

### 5. Playwright MCP — Browser Testing (OPTIONAL)

Automates browser interactions for testing. Claude can navigate to pages, fill forms, click buttons, and verify the UI renders correctly.

```bash
claude mcp add playwright -- npx -y @anthropic/mcp-playwright
```

**When it helps:** Testing the dynamic item form (Prompt 5), photo upload flow (Prompt 6), and shared views (Prompt 11). Claude can actually verify that forms render custom fields correctly by loading the page.

---

## MCP Configuration File

Create `.mcp.json` in your project root with all servers configured:

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"]
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${DATABASE_URL}"
      }
    },
    "next-devtools": {
      "command": "npx",
      "args": ["-y", "next-devtools-mcp@latest"]
    }
  }
}
```

Add GitHub and Playwright as needed. Keep total active servers to 5-6 max — each one is a subprocess.

---

## Claude Code Settings

### Recommended `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Read",
      "Write",
      "Edit",
      "Bash(pnpm *)",
      "Bash(npx drizzle-kit *)",
      "Bash(npx tsx *)",
      "Bash(git *)",
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(grep *)",
      "Bash(find *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)"
    ],
    "deny": [
      "Bash(rm -rf /)*",
      "Bash(sudo *)"
    ]
  }
}
```

This pre-approves common safe operations so Claude doesn't prompt you for every file read or pnpm command.

---

## Custom Commands

Create these in `.claude/commands/` for common OluHome workflows:

### `.claude/commands/new-feature.md`
```markdown
Start a new feature branch and implementation. Create a git branch named `feat/$ARGUMENTS`, then implement the feature described. Follow the architecture in the CLAUDE.md and reference the architecture doc at `docs/oluhome-architecture.md` for data model and patterns.
```

### `.claude/commands/db-check.md`
```markdown
Verify the current database state. Use the Postgres MCP to:
1. List all tables and their row counts
2. Check that plan_limits is seeded correctly
3. Verify the admin user exists
4. Show the most recent migration applied
Report any issues found.
```

### `.claude/commands/lint-and-fix.md`
```markdown
Run `pnpm lint` and `pnpm build`. Fix any TypeScript errors, ESLint violations, or build failures. Do not change functionality — only fix type errors and lint issues. After fixes, run both commands again to confirm clean output.
```

---

## Workflow Tips

### Session Management

Each build prompt from the architecture doc should be its own Claude Code session. At the start of each session:

1. Claude reads CLAUDE.md automatically
2. Reference the specific prompt: "Implement Prompt 3 from docs/oluhome-architecture.md"
3. Claude reads the prompt, reads existing code, and builds

Between sessions, use `/clear` to reset context. Don't let sessions accumulate — context degradation is the primary failure mode.

### Git Workflow

```
main (protected)
  └── feat/prompt-0-scaffolding
  └── feat/prompt-1-schema
  └── feat/prompt-2-auth
  └── feat/prompt-3-layout
  ...
```

Each prompt gets its own branch. Review the diff before merging to main. This gives you rollback points if something goes wrong.

### Verification Pattern

After each prompt implementation, verify before moving on:

1. `pnpm build` — catches type errors
2. `pnpm lint` — catches style issues
3. Manual smoke test — visit the relevant pages in the browser
4. `pnpm drizzle-kit studio` — verify database state if schema changed

### When Things Go Wrong

- **Type errors cascading:** Don't ask Claude to "fix all errors." Instead, identify the root cause and fix that. Usually a schema mismatch or import issue.
- **Context overflow mid-prompt:** Use `/compact` with instructions: "Focus on the current file changes and database schema." Or split the prompt into two sessions.
- **Claude forgets the aesthetic:** Paste the Styling section from CLAUDE.md as a reminder. Or reference a completed page: "Match the styling of src/app/(dashboard)/page.tsx."
