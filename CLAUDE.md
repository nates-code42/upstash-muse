# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Upstash Muse is a React-based RAG (Retrieval-Augmented Generation) chatbot application that combines Upstash Search for vector/semantic search with OpenAI's LLM for generating responses. The application features multi-chatbot management with configurable search indexes, prompts, and AI models.

**Tech Stack:**
- Vite + React 18 + TypeScript
- shadcn/ui components + Tailwind CSS
- Upstash Search SDK (@upstash/search) for semantic search
- Upstash Redis for configuration persistence
- OpenAI API for LLM responses
- TanStack Query for data fetching
- React Router for navigation

## Development Commands

```bash
# Install dependencies
npm install

# Start development server (runs on port 8080)
npm run dev

# Build for production
npm run build

# Build in development mode
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Core Data Flow (Two-Stage Search)

1. **User submits query** → SearchInterface component
2. **Primary search** → Upstash Search index (configured per chatbot)
3. **AI evaluation** → Determines if primary results are sufficient
4. **Conditional secondary search** → If needed, queries secondary index
5. **Result deduplication** → Merges and sorts by relevance score
6. **OpenAI response generation** → Uses appropriate system prompt
7. **Response display** → With cited sources in sidebar

### Key Components

**`SearchInterface.tsx`** (Main Component - 1500+ lines)
- Manages entire chat interface and search flow
- Handles Redis integration for config/state persistence
- Implements two-stage search with AI evaluation
- Supports multiple data structures (CBM Products1 vs CBM Wiki)
- Key functions:
  - `handleSearch()`: Main search orchestration
  - `evaluateSearchResults()`: AI-based result sufficiency check
  - `deduplicateResults()`: Merge primary + secondary results
  - `redisGet()/redisSet()`: Direct Redis REST API calls

**`ChatbotManager.tsx`**
- CRUD operations for chatbot profiles
- Each chatbot has its own: search indexes, model, temperature, max results, system prompt
- Supports optional secondary search index with evaluation prompts

**`PromptLibrary.tsx`**
- Manages reusable system prompts
- Prompts are assigned to chatbots (many-to-one relationship)

**`ChatbotSelector.tsx`**
- Dropdown for switching between active chatbots
- Switching clears conversation history

**`ApiKeyManager.tsx`**
- UI for managing API credentials (Upstash, OpenAI)

### Data Persistence Strategy

All configuration is stored in **Upstash Redis** using REST API (not SDK):
- `global-config`: API keys (upstashUrl, upstashToken, openaiApiKey)
- `chatbot-profiles`: Array of chatbot configurations
- `active-chatbot-id`: Currently selected chatbot
- `system-prompts`: Array of reusable prompt templates
- `active-prompt-id`: Legacy field (now derived from active chatbot)

**Important**: The app uses Redis REST API directly via `fetch()` because it runs in the browser. Redis credentials are hardcoded in `SearchInterface.tsx` lines 86-89.

### Type Definitions

Located in `src/types/chatbot.ts`:
- `ChatbotProfile`: Full chatbot configuration
- `GlobalConfig`: API keys only (not chatbot-specific settings)
- `SystemPrompt`: Defined in `PromptLibrary.tsx`

### Search Result Data Structures

The app handles two different data structures from Upstash Search:

**CBM Products1 Structure:**
```typescript
{
  content: { Name, Description, URL, ... },
  metadata: { "Product URL", ... }
}
```

**CBM Wiki Structure:**
```typescript
{
  content: { title, content_chunk_1, ... },
  metadata: { link, content_chunk_2, content_chunk_3, ... }
}
```

The code detects structure by checking for `content_chunk_*` fields and assembles chunks appropriately.

## Common Development Patterns

### Adding a New Chatbot Configuration Field

1. Update `ChatbotProfile` interface in `src/types/chatbot.ts`
2. Add field to `formData` state in `ChatbotManager.tsx`
3. Add UI input in the form section (lines 489-662)
4. Update `createChatbot()` and `updateChatbot()` functions
5. Update `resetForm()` to include default value

### Modifying Search Behavior

Search logic is in `SearchInterface.tsx` `handleSearch()` function (lines 756-1130):
- Primary search: lines 821-858
- AI evaluation: lines 867-873
- Secondary search: lines 876-906
- OpenAI response: lines 1059-1080

### Redis Data Migration

When changing data structures, implement migration in `SearchInterface.tsx`:
- See `migrateOldConfig()` (lines 493-566) for reference
- Check for old keys in `loadConfigFromRedis()` (lines 410-490)
- Always migrate data, never delete old keys immediately

## Important Notes

- **Redis credentials are hardcoded** in `SearchInterface.tsx` for browser REST API access
- **Supabase is integrated** but not actively used in search flow (client setup in `src/integrations/supabase/`)
- **Path alias**: `@/` maps to `src/` (configured in `vite.config.ts`)
- **Component library**: Uses shadcn/ui components in `src/components/ui/`
- **Smart parsing**: Redis data may be double-encoded JSON; use `smartParse()` helper (lines 117-137 in SearchInterface)
- **Two-stage search is optional**: Only triggers if `secondarySearchIndex` is configured on chatbot
- **Temperature parameter**: May not be supported on newer models (o3, o4, gpt-5); code handles this gracefully

## Testing Approach

No formal test suite exists. Manual testing workflow:
1. Ensure API keys are configured in Settings
2. Create a chatbot in Chatbot Manager
3. Test queries with both primary-only and two-stage search configurations
4. Verify sources appear correctly in sidebar
5. Check that chatbot switching clears conversation history
6. Test prompt library CRUD operations

## Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── SearchInterface.tsx    # Main chat UI and logic
│   ├── ChatbotManager.tsx     # Chatbot CRUD
│   ├── ChatbotSelector.tsx    # Active chatbot switcher
│   ├── PromptLibrary.tsx      # Prompt management
│   ├── ApiKeyManager.tsx      # API key management
│   └── ErrorBoundary.tsx      # Error handling
├── pages/
│   ├── Index.tsx              # Main page (renders SearchInterface)
│   ├── DocsPage.tsx           # Documentation page
│   └── NotFound.tsx           # 404 page
├── integrations/
│   └── supabase/              # Supabase client (not actively used)
├── types/
│   └── chatbot.ts             # TypeScript interfaces
├── hooks/                     # Custom React hooks
├── lib/                       # Utility functions
├── App.tsx                    # React Router setup
└── main.tsx                   # Entry point
```

## Configuration Files

- `vite.config.ts`: Vite configuration (port 8080, path aliases)
- `tailwind.config.ts`: Tailwind CSS configuration
- `components.json`: shadcn/ui configuration
- `tsconfig.json`: TypeScript compiler options
- `eslint.config.js`: ESLint rules (note: unused vars disabled)
