# Fund Plan Thrive 💰

A speech-first AI personal finance and goal management web application built as a personal project to gain experience utilizing Google Antigravity, LLMs Claude Opus 4.5 Thinking and Gemini 3 Pro. 

## Features

- **Speech-First AI Advisor** – Talk to your financial advisor naturally using voice input
- **Intelligent Goal Tracking** – Create and track life goals with AI-generated action steps
- **Resource Curation** – AI curated resources for each goal step
- **Dynamic Dashboard** – Visualize your net worth over time and interactively manage your life goals

## Architecture

For a detailed overview of the system architecture, data flows, and technical decisions, see the **[Architecture Design Document](docs/architecture_design.md)**.

### Core Services

| Service | Purpose |
|---------|---------|
| **Speech Processing** | Handles audio input/output, transcription via OpenAI Whisper |
| **AI Advisor** | Orchestrates conversations, manages context, executes tool calls via OpenAI 4o|
| **Financial Data** | CRUD operations for assets, debts, goals with strict validation |
| **Resource Curation** | Two-LLM pipeline (OpenAI 4o-mini) for curating goal-step resources |

## Tech Stack 

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4 
- **Backend:** Next.js API Routes, Vercel AI SDK 5
- **Database:** PostgreSQL with Drizzle ORM
- **AI/LLM:** OpenAI GPT-4o, OpenAI GPT-4o-mini, OpenAI Whisper (STT)
- **Search:** Brave Search API (for resource curation)
- **Charts:** Recharts

## Prerequisites

- Node.js 18+ 
- PostgreSQL database
- API Keys:
  - OpenAI API Key
  - Brave Search API Key

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env.local` file with the following variables:

```env
OPENAI_API_KEY=your_openai_api_key
BRAVE_API_KEY=your_brave_api_key
DATABASE_URL=postgresql://user:password@localhost:5432/fundplanthrive
```

### 3. Set Up Database

```bash
npx drizzle-kit push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
fund-plan-thrive/
├── docs/                 # Documentation
│   └── architecture_design.md
├── drizzle/              # Database migrations
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and configurations
│   └── services/         # Business logic services
├── public/               # Static assets
└── storage/              # Audio file storage 
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Security

- **API Keys**: Never commit API keys to version control. Use `.env.local` for local development and secure environment variables in production.
- **Database**: Use connection strings with SSL enabled in production environments.
- **Audio Files**: Uploaded audio files are stored locally in `/storage` and should be secured appropriately in production.

## License

This project is licensed under the [PolyForm Noncommercial License 1.0.0](LICENSE).

**TL;DR**: You may view, use, and modify this code for personal, educational, or non-commercial purposes. Commercial use requires written permission from the author.

For third-party dependency licenses, see [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md).
