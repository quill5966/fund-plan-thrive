# AI Context: Fund Plan Thrive

> **Purpose**: This file helps LLMs quickly understand the codebase. Read this first before exploring code.

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
│   │   └── layout.tsx          # Root layout with Sidebar
│   │
│   ├── components/
│   │   ├── chat/               # VoiceChat component (audio recording + chat UI)
│   │   ├── dashboard/          # Dashboard-specific components
│   │   ├── goals/              # Goal cards and management UI
│   │   ├── ui/                 # Reusable UI primitives (Input, Card, Button, etc.)
│   │   ├── MetricCard.tsx      # Chart component with Recharts
│   │   ├── Navbar.tsx          # Top navigation
│   │   └── Sidebar.tsx         # Left navigation sidebar
│   │
│   ├── db/
│   │   ├── schema.ts           # Drizzle schema definitions (ALL TABLES)
│   │   └── index.ts            # DB connection export
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
| `goal_resources` | Curated resources per step | `stepId`, `title`, `url`, `publisher`, `credibilityScore` |

**Asset/Debt Types**: `checking`, `savings`, `investment`, `credit_card`, `loan`, `mortgage`

---

## Core Services

### 1. Advisor Service (`src/services/advisor/index.ts`)
The "brain" - orchestrates LLM interactions and tool calling.

**Key Function**: `processTranscription(userId, text) → AdvisorResult`

**Tools Exposed to LLM**:
- `update_asset` - Create/update asset with type, name, amount, effectiveDate
- `update_debt` - Create/update debt with same structure
- `close_account` - Mark asset/debt as inactive
- `create_goal` - Create goal with steps (marks `isUserDefined` for user-mentioned steps)
- `update_goal` - Update progress, status, add new steps

**Flow**: Transcription → System prompt with current financial context → LLM generates tool calls → Execute tools → Return response

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
| `/api/goals` | GET | Fetch all goals for current user |
| `/api/session` | DELETE | Clear user session cookie |

---

## Key Patterns

### Session Management
- User ID stored in HTTP-only cookie (`userId`)
- Session checked on page load via `/api/conversation`
- No auth library currently (simplified for prototype)

### Data Flow: Audio to Response
```
VoiceChat (record) → /api/process-audio → speechService.transcribe 
    → advisorService.processTranscription → LLM with tools 
    → financeService (tool execution) → response → UI
```

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
- Files have `// TODO: AUTH_REFACTOR` comments for future auth migration

---

## Environment Variables

```env
OPENAI_API_KEY=       # Required - GPT-4o, Whisper
BRAVE_API_KEY=        # Required - Resource curation search
DATABASE_URL=         # PostgreSQL connection string
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
3. Update `src/components/Sidebar.tsx` for navigation

---

## Gotchas & Notes

1. **No formal auth** - Uses simple cookie-based user ID; no login/signup
2. **Brave API rate limit** - Free tier is 1 req/sec; resource curation runs sequentially
3. **Audio stored locally** - `/storage` folder, git-ignored
4. **Forward-fill charts** - Dashboard densifies sparse historical data to monthly intervals
5. **Conversational dedup** - AI asks clarifying questions for potential duplicate accounts

---

## Related Documentation

- **[Architecture Design](docs/architecture_design.md)** - Detailed system design, diagrams, rationale
- **[README](README.md)** - Setup instructions, features overview
