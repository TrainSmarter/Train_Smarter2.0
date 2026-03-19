# Agent Usage Rules (MANDATORY)

## Core Principle
**Delegate to specialized agents instead of doing everything in the main conversation.**
Agents have focused tools and context — they produce better results and keep the main conversation clean.

## When to use which Agent

### Frontend Developer Agent
**MUST use when:**
- Building or modifying React components, pages, or layouts
- Working with shadcn/ui components, Tailwind styling
- Implementing forms, modals, tables, or any UI element
- Fixing frontend bugs (layout, styling, client-side logic)

### Backend Developer Agent
**MUST use when:**
- Creating or modifying Supabase tables, RLS policies, migrations
- Building or fixing API routes (`src/app/api/`)
- Writing Edge Functions (`supabase/functions/`)
- Database schema changes or seed data

### QA Engineer Agent
**MUST use when:**
- A feature implementation is complete — always run QA before marking as done
- User asks to test, verify, or check something
- Writing or fixing E2E tests, integration tests
- Security audit needed (RLS policies, auth flows, input validation)

### Explore Agent
**MUST use when:**
- Searching the codebase for patterns, usages, or dependencies
- Understanding how an existing feature works before modifying it
- Finding all files affected by a change (e.g. "where is X used?")
- Research tasks that need more than 2-3 Grep/Glob calls

### Plan Agent
**MUST use when:**
- A feature requires changes across 3+ files
- User asks "how should we build X" or "what's the approach"
- Architectural decisions are needed before implementation
- Estimating impact or scope of a change

## Parallel Execution (MANDATORY when possible)
- If frontend and backend work are independent → launch both agents simultaneously
- If QA can start while another agent finishes unrelated work → launch in background
- Explore agents for different questions → always run in parallel

## Anti-Patterns (NEVER do these)
- Writing 50+ lines of UI code in the main conversation instead of using Frontend Developer
- Writing migrations or RLS policies in the main conversation instead of using Backend Developer
- Skipping QA after completing a feature
- Running 5+ Grep/Glob searches manually instead of using Explore agent
- Planning a complex feature in your head instead of using Plan agent
