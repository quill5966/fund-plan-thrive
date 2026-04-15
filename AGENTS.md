# AI Context: Fund Plan Thrive

> **Purpose**: This file helps LLMs quickly understand the codebase. Read this first before exploring code. Do not read the entire codebase unless explicitly asked to do so or is required to complete the prompt task. 

## Project Overview

A **speech-first AI personal finance web app** that lets users talk to an AI advisor to track assets, debts, and life goals. Built with Next.js 16, React 19, PostgreSQL, and OpenAI.

**Core Flow**: User speaks → Whisper transcribes → LLM extracts intent → Tool calls update DB → Response displayed

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL + Drizzle ORM |
| AI/LLM | OpenAI GPT-4o, GPT-4o-mini, Whisper |
| AI SDK | Vercel AI SDK 5 |
| Search | Brave Search API (resource curation) |
| Charts | Recharts |

---

## Directory Structure

```
fund-plan-thrive/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API routes
│   │   │   ├── advisor/        # POST - Process transcribed text through LLM
│   │   │   ├── chat/           # POST - Save chat messages
│   │   │   ├── conversation/   # GET - Load existing conversation
│   │   │   ├── goals/          # GET - Fetch user goals
│   │   │   ├── process-audio/  # POST - Upload audio → Whisper transcription
│   │   │   └── session/        # DELETE - Clear user session
│   │   ├── dashboard/          # Financial dashboard page
│   │   ├── goals/              # Goals management page
│   │   ├── page.tsx            # Home/Chat page (entry point)
│   │   └── layout.tsx          # Root layout: DM Sans + JetBrains Mono fonts, dark bg, ClientLayout wrapper
│   │
│   ├── components/
│   │   ├── advisor/            # AI Advisor slide-over panel
│   │   │   ├── AdvisorContext.tsx  # React context: isOpen, open(), close(), toggle()
│   │   │   ├── AdvisorPanel.tsx    # 380px fixed right slide-over with chat + nudges
│   │   │   └── NudgeCard.tsx       # Proactive suggestion card (hardcoded placeholder)
│   │   ├── chat/               # VoiceChat component (audio recording + chat UI)
│   │   ├── dashboard/          # SummaryCards (net worth, assets, debts breakdown)
│   │   ├── goals/              # Goals page components
│   │   │   ├── GoalCard.tsx        # Legacy card (kept but superseded by new layout)
│   │   │   ├── GoalDetail.tsx      # Right-panel detail view for selected goal
│   │   │   ├── GoalSidebar.tsx     # 220px left sidebar: goal list + progress bars
│   │   │   ├── StepCard.tsx        # Expandable step card (status, tasks, resources)
│   │   │   ├── StepDot.tsx         # Timeline dot indicator (done/active/pending)
│   │   │   └── StepTimeline.tsx    # Vertical step timeline with connecting lines
│   │   ├── navigation/         # Bottom tab bar (replaces Sidebar)
│   │   │   ├── BottomTabBar.tsx    # Fixed bottom bar: Dashboard / Goals / Advisor tabs
│   │   │   └── TabItem.tsx         # Individual tab button with icon, label, badge
│   │   ├── ui/                 # Reusable UI primitives
│   │   │   ├── Button.tsx, Card.tsx, Input.tsx
│   │   │   ├── StatusBadge.tsx     # done/active/pending pill badge
│   │   │   └── ProgressBar.tsx     # Reusable progress bar
│   │   ├── ClientLayout.tsx    # Client wrapper: AdvisorProvider + BottomTabBar
│   │   └── MetricCard.tsx      # Net Worth Trend chart (Recharts, dark theme)
│   │
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema definitions (ALL TABLES)
│   │   └── index.ts            # DB connection export
│   │
│   ├── lib/
│   │   ├── session.ts            # Iron-session config + helpers
│   │   └── validation.ts         # Input + tool call parameter validation
│   │
│   ├── services/               # Business logic layer
│   │   ├── advisor/            # AI Advisor - LLM orchestration + tool calling
│   │   ├── finance/            # CRUD for assets, debts, goals (deterministic)
│   │   ├── resources/          # Resource curation pipeline
│   │   ├── speech/             # Audio storage + Whisper transcription
│   │   └── user/               # User management
│   │
│   └── hooks/                  # Custom React hooks
│
├── docs/
│   └── architecture_design.md  # Detailed architecture documentation
│
├── drizzle/                    # Database migrations
└── storage/                    # Audio file storage (git-ignored)
```

---

## Database Schema (Drizzle ORM)

All tables defined in `src/db/schema.ts`:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | `id`, `name`, `createdAt` |
| `assets` | Current asset records | `userId`, `type`, `name`, `value`, `effectiveDate`, `isActive` |
| `assets_history` | Asset value time series | `assetId`, `value`, `effectiveDate` |
| `debts` | Current debt records | `userId`, `type`, `name`, `value`, `effectiveDate`, `isActive` |
| `debts_history` | Debt value time series | `debtId`, `value`, `effectiveDate` |
| `conversations` | Chat sessions | `userId`, `status`, `summary` |
| `messages` | Individual chat messages | `conversationId`, `role`, `content` |
| `goals` | Financial/life goals | `userId`, `title`, `description`, `targetAmount`, `status` |
| `goal_steps` | Actionable steps per goal | `goalId`, `description`, `order`, `isCompleted`, `isUserDefined` |
| `goal_step_tasks` | User-created task items per step | `stepId`, `description`, `isCompleted`, `order` |
| `goal_resources` | Curated resources per step | `stepId`, `title`, `url`, `publisher`, `credibilityScore` |

**Asset/Debt Types**: `checking`, `savings`, `investment`, `credit_card`, `loan`, `mortgage`

---

## Core Services

### 1. Chat Route (`src/app/api/chat/route.ts`)
The "brain" — streaming LLM endpoint for the advisor panel and home page chat. Handles text and audio input, tool calling, and conversation persistence.

**Key Flow**: User message → Whisper transcription (if audio) → Load conversation history + financial context → `streamText` with tools → Stream response to client

**Tools Exposed to LLM**:
- `update_asset` - Create/update asset with type, name, amount, effectiveDate
- `update_debt` - Create/update debt with same structure
- `create_goal` - Create goal with steps (marks `isUserDefined` for user-mentioned steps)
- `update_goal` - Update goal progress (currentAmount) or status only
- `add_goal_step` - Add a step to an existing goal (with `isUserDefined` attribution)
- `update_goal_step` - Update an existing step's description
- `delete_goal_step` - Delete a step and cascade-remove its tasks + resources

### 2. Finance Service (`src/services/finance/index.ts`)
Deterministic CRUD operations - the "ledger".

**Key Functions**:
- `upsertAsset/upsertDebt` - Create or update with smart matching
- `mergeAsset/mergeDebt` - Handle account name clarifications
- `getFinancialSummary(userId)` - Current totals (assets, debts, net worth)
- `getFinancialHistory(userId)` - Time series for charts
- `createGoal/updateGoal/getGoals` - Goal management

**Pattern**: Uses in-memory locks (`runSerialized`) to prevent race conditions on parallel upserts.

### 3. Resource Curation Service (`src/services/resources/`)
Two-LLM pipeline for curating goal step resources.

**Pipeline**:
1. `extractIntentSpec` - LLM extracts search intent from step description
2. `searchCandidates` - Brave API search with recency filter
3. `filterCandidates` - Remove spam, duplicates, blocked domains
4. `curateResources` - LLM selects 5-8 quality resources with diversity rules

**Files**: `pipeline.ts` (main), `intent.ts`, `brave.ts`, `filter.ts`, `curate.ts`, `prompts.ts`

### 4. Speech Service (`src/services/speech/`)
- `transcribe.ts` - OpenAI Whisper API integration
- `storage.ts` - Audio file storage to `/storage`

---

## API Routes

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/process-audio` | POST | Upload audio file → Whisper → Advisor → Response |
| `/api/advisor` | POST | Direct text input to advisor (alternative to audio) |
| `/api/chat` | POST | Save message to conversation history |
| `/api/conversation` | GET | Load existing session + conversation history |
| `/api/init-conversation` | POST | Initialize conversation for new/returning users |
| `/api/goals` | GET | Fetch all goals for current user (includes tasks nested under each step) |
| `/api/goals/[goalId]/steps` | POST | Create a new step for a goal |
| `/api/goals/[goalId]/steps/[stepId]` | PUT, DELETE | Update step description / delete step + children |
| `/api/goals/[goalId]/steps/[stepId]/tasks` | GET, POST | List tasks for a step / create a new task |
| `/api/goals/[goalId]/steps/[stepId]/tasks/[taskId]` | PUT, DELETE | Update task fields (description + isCompleted) / delete task |
| `/api/session` | DELETE | Clear iron-session (logout) |
| `/api/auth/login` | POST | Validate passphrase, create authenticated session |
| `/api/auth/check` | GET | Return current authentication status |

---

## Key Patterns

### Session Management
- Passphrase gate on first visit — validates against `APP_PASSPHRASE` env var
- Session managed by `iron-session` (signed + encrypted cookies)
- Session config centralized in `src/lib/session.ts`
- All API routes and server pages read `userId` from session — never from the client
- Session contains: `isAuthenticated`, `userId`, `userName`
- `userId` is set during the `/api/init-conversation` step after name entry

### Data Flow: Audio to Response
```
VoiceChat (record) → /api/chat (session check) → speechService.transcribe 
    → LLM with tools → financeService (tool execution) → response → UI
```

### Input & Tool Call Guardrails
- Text input capped at 2,000 characters (`src/lib/validation.ts`)
- Tool `execute()` functions validate parameters before any DB write:
  - `amount`: ≥ 0 and ≤ $50M
  - `name`: ≤ 100 chars, alphanumeric + basic punctuation
  - `effectiveDate`: must parse to a valid date within ±30 years
- System prompts include anti-injection instructions
- These are deterministic code guards — no secondary LLM classifier

### Historical Data Tracking
- `effectiveDate` = when the balance was true (user-reported date)
- `updatedDate` = when the system recorded it
- History tables allow net worth charts over time

### Goal Step Attribution
- `isUserDefined: true` = step explicitly mentioned in user's speech
- `isUserDefined: false` = AI-generated suggestion
- UI can visually differentiate these

### New User Welcome Message
- On "Start Consultation", `page.tsx` passes `isNewUser` prop to VoiceChat
- VoiceChat calls `/api/init-conversation` which checks if user exists in DB:
  - **New user**: Creates conversation + AI welcome message
  - **Returning user**: Returns existing conversation history
- The init-conversation step also stores `userId` and `userName` in the iron-session

---

## Environment Variables

```env
OPENAI_API_KEY=       # Required - GPT-4o, Whisper
BRAVE_API_KEY=        # Required - Resource curation search
DATABASE_URL=         # PostgreSQL connection string
APP_PASSPHRASE=       # Required - Passphrase to unlock the app
SESSION_PASSWORD=     # Required - 32+ char static key for iron-session encryption
```

---

## Common Tasks

### Add a New Asset/Debt Type
1. Update enum in `src/services/advisor/index.ts` (`updateAssetSchema`/`updateDebtSchema`)
2. Update system prompt if needed for LLM awareness

### Add a New Tool for LLM
1. Define Zod schema in `advisorService`
2. Add tool to `tools` object in `generateText` call
3. Export tool result in `actionsPerformed` array

### Modify Dashboard Charts
- Edit `src/components/MetricCard.tsx`
- Data fetched via `financeService.getFinancialHistory()`

### Add New Page
1. Create folder in `src/app/[pagename]/`
2. Add `page.tsx` for the route
3. Add a tab to `src/components/navigation/BottomTabBar.tsx` if it needs top-level navigation

---

## Gotchas & Notes

1. **Passphrase-gated access** - Uses iron-session with APP_PASSPHRASE; swap for NextAuth.js OAuth for multi-user
2. **Tool call validation** - All LLM tool calls pass through deterministic validation before DB writes (`src/lib/validation.ts`)
3. **Brave API rate limit** - Free tier is 1 req/sec; resource curation runs sequentially
4. **Audio stored locally** - `/storage` folder, git-ignored
5. **Forward-fill charts** - Dashboard densifies sparse historical data to monthly intervals
6. **Conversational dedup** - AI asks clarifying questions for potential duplicate accounts
7. **Dark theme** - All color values come from CSS custom properties defined in `globals.css` (`--bg`, `--bg-card`, `--accent`, etc.). Use `var(--*)` in inline styles or Tailwind arbitrary values; avoid hardcoded hex colors in components
8. **Advisor panel state** - Managed by `AdvisorContext`. Any component can call `useAdvisor()` to open/close the panel. The panel is rendered once in `ClientLayout`, not per-page
9. **Goals page layout** - Uses a sidebar+detail pattern (`GoalSidebar` + `GoalDetail`). Step status is derived client-side from `isCompleted`: first incomplete step = "active", rest = "pending". No `is_concurrent` DB column exists yet — all steps render sequentially
10. **Step tasks** - `goal_step_tasks` table stores user-created tasks per step (FK → `goal_steps.id`). `StepCard` manages task state locally after initial load — tasks are nested inside each step in the `getGoals` response. All CRUD is live: add (inline input), edit (click description), checkbox toggle (optimistic update), delete (confirmation modal). Progress bar always visible — updates dynamically as tasks are added or toggled. AI-created tasks are not yet implemented; all tasks are user-created. `PUT /tasks/[taskId]` is idempotent — always sends `{ description, isCompleted }` as full state; the route calls `toggleStepTask` or `updateStepTask` internally based on what changed

---

## Related Documentation

- **[Architecture Design](docs/architecture_design.md)** - Detailed system design, diagrams, rationale
- **[README](README.md)** - Setup instructions, features overview
