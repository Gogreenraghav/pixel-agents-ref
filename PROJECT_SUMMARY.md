# 📋 PIXEL OFFICE — A to Z Project Summary
## Poora Kaam: Shuru Se Aakhir Tak — Updated: April 3, 2026

---

## 🏁 PROJECT KA NAAM
**Pixel Office** (previously "Pixel Agents") — Browser-based AI Company Management OS
**Live URL:** http://69.62.83.21:8766/index.html
**GitHub Account:** Gogreenraghav

---

## 📦 TEENO REPOSITORIES

| Repo | Branch | Purpose |
|------|--------|---------|
| `pixel-agents-standalone` | `master` | Production deploy (static site) |
| `pixel-agents-latest` | `main` | Latest backup |
| `pixel-agents-ref` | `main` | Live working source |

---

## 📅 PHASE 1 — BASE SYSTEM (Pixel Agents Foundation)

### Kya tha pehle:
- VS Code Extension tha (sirf VS Code ke andar chalta tha)
- Canvas-based pixel art office
- Agents apne desks pe baithte the, animate hote the
- Basic sprite system tha

### Kya kiya:
- **VS Code dependency hatai** — Pure browser-compatible bana diya
- **Standalone deploy** kiya http://69.62.83.21:8766 pe
- **Python NoCacheHandler server** set kiya (port 8766)
- **Retro pixel-art UI** — dark theme, monospace fonts, pixel borders
- **60 FPS canvas renderer** maintain kiya

---

## 📅 PHASE 2 — HR SYSTEM & AGENT MANAGEMENT

### Features built:

#### 🧑‍💼 HireDialog (Hire New Agent)
- 2 tabs: **📝 Profile** + **🤖 AI Brain**
- Profile tab: Name, Role, Department, Country (7 countries), Currency (6 types), Salary
- AI Brain tab: Provider select, Base URL, API Key, Model name
- Auto FX conversion (e.g., INR → USD)
- 7 Countries: USA, India, UK, Germany, Japan, Russia, Remote
- 6 Currencies: USD, INR, GBP, EUR, JPY, RUB

#### 👤 Agent Properties
- `id, name, role, dept, status, salary, currency, country`
- `performance, level, tasksCompleted, aiConfig`
- Status rotation: Working → In Meeting → On Break → Idle
- Promote/Demote (level up/down)

#### 💼 Roles & Salaries (per month USD)
| Role | Salary |
|------|--------|
| CEO | $12,000 |
| CTO | $10,000 |
| Manager | $6,000 |
| Developer | $5,000 |
| DevOps | $5,500 |
| Designer | $4,500 |
| QA | $4,000 |
| HR | $4,000 |
| Marketing | $4,500 |
| Sales | $4,000 |
| Analyst | $4,500 |
| Intern | $1,500 |

#### 📊 StatsDashboard (6 Tabs)
1. **Overview** — Total agents, payroll, revenue, performance avg
2. **Payroll** — Per-agent salary breakdown in own currency
3. **Rankings** — Top performers list
4. **Events** — Office event history
5. **FX** — Live editable exchange rates (localStorage backed)
6. **LOG** — Full hire/fire history with date, role, salary, country

---

## 📅 PHASE 3 — OFFICE FEATURES

### 🏢 Multi-Floor System
- 4 floors with JSON layouts
- Floor selector UI
- Each floor has its own desk layout

### 📅 Work Schedule System (`SchedulePanel.tsx`)
- 3 tabs: Global / Per-Agent / Clock
- Office clock with configurable speed
- Day timeline (shift start/end)
- Agent-specific schedule overrides
- Auto-pause when events running

### 🎉 Office Events System (`OfficeEvents.tsx`)
- 5 event types: Fire Drill, Team Lunch, All Hands, Power Outage, Hackathon
- Auto-trigger toggle
- Manual event type selector
- EventBanner display

### 💰 Company Balance & Game Loop
- Starting balance: **$50,000**
- 60-second tick
- Revenue = Working agents × (250 + perf×2), Meeting × 150, else × 50
- Payroll deducted = salary_in_USD / 30 per tick
- Balance HUD top-right corner of canvas

### 🏦 Department Budget Caps
- Per-department budget setting
- Progress bar visualization
- Over-budget warning

### 📂 Data Persistence (localStorage)
All data survives page refresh via localStorage:
- `pixeloffice_agents` — All hired agents
- `pixeloffice_hire_history` — Hire/fire log
- `pixeloffice_floor` — Current floor
- `pixeloffice_auto_events` — Auto events toggle
- `pixeloffice_fx_rates` — FX exchange rates
- `pixeloffice_balance` — Company balance
- `pixeloffice_dept_budgets` — Dept budgets
- `pixeloffice_schedule` — Global schedule
- `pixeloffice_agent_schedules` — Per-agent schedules

### 🔄 Agent Respawn on Refresh
- On page refresh, pixel characters automatically re-spawn
- Uses `pixelCharId` (numeric) for canvas dispatch

---

## 📅 PHASE 4 — AI BRAIN SYSTEM

### 🤖 AI Provider Support
| Provider | URL |
|----------|-----|
| LiteLLM | http://69.62.83.21:5050 |
| OpenAI | https://api.openai.com/v1 |
| Groq | https://api.groq.com/openai/v1 |
| Ollama | http://localhost:11434/v1 |
| OpenRouter | https://openrouter.ai/api/v1 |
| Custom | User-defined |

- All use OpenAI-compatible `/chat/completions` endpoint
- API Key + Model configurable per agent
- `aiConfig?: { provider, baseUrl, apiKey, model, connected }` on each agent

### 💬 Agent Chat Panel (`AgentChatPanel.tsx`)
- Right-side panel, opens per agent
- Real AI calls using agent's own aiConfig
- Chat history per agent in localStorage (`pixeloffice_chat_<agentId>`)
- "💬 Chat with Agent" button in Agent Detail Panel
- 🤖 AI badge shows on agents with AI configured
- **NEW: Context-aware — injects agent's memory + skills into system prompt**

---

## 📅 PHASE 5 — CEO HIERARCHY SYSTEM (5 Chunks)

### Chunk 1 — 🗂️ Org Chart (`OrgChart.tsx`)
- Visual tree: CEO at top (gold border + 👑 crown + glow)
- Full hierarchy: CEO → CTO/Manager/HR → Developer/DevOps/QA/Designer/Analyst/Sales/Marketing/Intern
- Lines connecting parent to child nodes
- Status badge per node (Working/In Meeting/On Break/Idle)
- 🤖 AI badge if AI configured
- Dashed "Vacant" box for unhired roles
- Click to collapse/expand subtrees
- Warning shown if no CEO hired

**Hierarchy Map:**
- CEO → [CTO, Manager, HR]
- CTO → [Developer, DevOps, QA]
- Manager → [Designer, Analyst, Sales, Marketing]
- HR → [Intern]

### Chunk 2 — 👑 CEO Inbox (`CEOInbox.tsx`)
- Two-panel layout: sidebar message list + main view panel
- Send Task / Message / File to CEO (attach .txt/.md/.pdf/.csv)
- Unread badge (red counter)
- CEO AI response via API (`👑 Ask CEO to respond (AI)` button)
- Forward to any agent — creates new message CEO → Agent
- localStorage key: `pixeloffice_ceo_inbox`

### Chunk 3 — ▶ Task AI Execute
- Task Board: 4 columns (TO DO / RUNNING / DONE / FAILED)
- **▶ Run (AI)** button per task card
- Calls agent's AI config → real API → saves output
- **🔄 Retry** button on failed tasks
- **🗑 Delete** button per task
- Output shown inline with word-wrap
- localStorage keys: `pixeloffice_tasks`, `pixeloffice_outputs_<agentId>`

### Chunk 4 — 🧑‍💼 AI Scrum Auto-Run
- **▶ Run Scrum (AI)** button
- Each agent gives standup via AI: Yesterday / Today / Blockers
- CEO summarizes all standups → action items
- Past scrum logs saved (up to 10), dropdown to view history
- localStorage key: `pixeloffice_scrum_logs`
- Agents without AI get placeholder standup

### Chunk 5 — 🤖 File → CEO Auto-Route
- Upload file/task to CEO inbox
- CEO AI reads it, decides which agent should handle it
- Auto-creates forwarded task message to that agent
- "Auto-route via CEO AI" toggle in compose
- "⏳ CEO routing task..." indicator while processing
- JSON decision format: `{acknowledgment, assignTo, instruction}`

---

## 📅 PHASE 6 — AUTOPILOT MODE (5 Chunks) ✅

### Overview
CEO sets a company goal → AI auto-generates tasks → assigns to right agents → auto-executes → CEO gets notified.

### 🎯 Chunk 1 — Goal Definition UI
- "🎯 Set Goal" button in Task Board
- Modal: Goal title + description
- Saves to `pixeloffice_company_goal` localStorage
- Active goal banner shown below header

### 🤖 Chunk 2 — AI Goal-to-Tasks Generator
- "🤖 Autopilot Tasks" button
- CEO AI called with goal + all agents list
- Parses JSON → creates tasks with titles, types, agent assignments
- Tasks auto-added to TO DO column

### 🔄 Chunk 3 — Auto-Run Loop
- "🟢 ON / 🔴 OFF Auto-Run" toggle button
- Every 30 seconds: finds TO DO tasks → auto-runs via AI
- Tasks move: TO DO → RUNNING → DONE/FAILED
- Agent memory + skills auto-saved after each task

### 📬 Chunk 4 — Execution & Feedback Loop
- Task complete hone par CEO Inbox mein notification
- Subject: "Task Auto-Completed: [task name]"
- Body: agent name + output preview (100 chars)
- localStorage key: `pixeloffice_ceo_inbox`

### ⏸️ Chunk 5 — Pause/Resume
- "⏸️ PAUSED / ▶️ RUNNING" toggle when Auto-Run is ON
- CEO can pause/resume at any time
- Full end-to-end autonomous operation

---

## 📅 PHASE 7 — AGENT MEMORY SYSTEM (5 Chunks) ✅

### Overview
Har agent ka apna "brain" — pichle kaam yaad rakhta hai, skills grow hote hain, context-aware responses deta hai.

### 🧠 Chunk 1 — Memory Store
- `pixeloffice_memory_<agentId>` localStorage
- Last 20 task entries saved: taskId, title, type, output, date
- Auto-saved on every task completion

### ⚡ Chunk 2 — Skill Growth System
- **XP System:** Har task complete = +1 XP for that task type
- **Level:** Total XP / 5 + 1
- **21 Badges** across 7 skill categories:
  - Code: 🥉 Jr Dev → 🥈 Sr Dev → 🥇 Tech Lead
  - Research: 🔍 Analyst → 📊 Researcher → 🧠 Expert
  - Design: 🎨 Jr Designer → ✏️ Designer → 🏆 Art Director
  - Draft: 📝 Copywriter → ✍️ Writer → 📖 Content Lead
  - Analysis: 📈 Analyst → 📉 Strategist → 💡 Insight Lead
  - Sales Script: 📞 SDR → 💼 AE → 🏅 Sales Lead
  - Review: 👁️ Reviewer → ✅ QA Lead → 🎯 QA Master
- **Team tab UI:** LVL badge, XP progress bar, top skill, earned badges

### 💬 Chunk 3 — Context-Aware Chat
- Agent chat header shows: ⚡ LVL X · Y XP · 🧠 Z memories
- System prompt injects: level, total XP, top 3 skills, badges, last 5 completed tasks
- Agent responds with context of past work

### 🧠 Chunk 4 — Memory Viewer (`AgentMemoryViewer.tsx`)
- "🧠 View Memory & Skills" button in Agent Detail Panel
- Full modal with 2 tabs:
  - **🎯 Skills & XP:** Level progress bar, 7 skill bars (color-coded), earned badges
  - **🧠 Memory Log:** Last 20 tasks with output preview, click to expand full output

### 👑 Chunk 5 — CEO Memory Brief
- CEO AI prompt includes full team brief:
  - Each agent: name, role, level, total XP, top 3 skills, recent 3 tasks
  - CEO assigns tasks only to agents with AI configured
  - Smart matching: skill type → right agent

---

## 🖥️ DASHBOARD TABS (CompanyDashboard.tsx)
All 7 tabs in the Company Dashboard:

| Tab | Icon | Feature |
|-----|------|---------|
| Task Board | 📋 | AI task execution, kanban, Autopilot, Goal setting |
| Output Folders | 📁 | Per-agent output files, preview + download |
| Scrum | 🧑‍💼 | AI daily standup, CEO summary |
| Analytics | 📈 | KPI cards, performance bars, dept distribution |
| Team | 👥 | Agent cards, LVL/XP badges, memory indicator |
| Org Chart | 🗂️ | Visual hierarchy tree |
| CEO Inbox | 👑 | Messages, file routing, AI responses, auto-forward |

---

## 🎨 DESIGN RULES (Always Followed)
- **No white text** (#ffffff) — NEVER
- **Cyan** (#66ddff) for names, headers
- **Yellow** (#ffdd44, #ffcc00) for numbers, badges
- **Green** (#00ff88, #33ffaa) for positive values
- **Light blue** (#aaddff) for titles
- **Dim gray** (#8899aa) for labels
- Pixel art style: no rounded corners, no gradients
- Monospace font everywhere
- Min font size: 16px, important text: 20-22px bold

---

## 🔧 TECHNICAL STACK
- **React + TypeScript** (Vite build)
- **HTML5 Canvas** (pixel art renderer)
- **localStorage** (all persistence)
- **OpenAI-compatible API** (AI calls)
- **Python HTTP server** (port 8766, no-cache headers)

---

## 📁 KEY FILES
| File | Purpose |
|------|---------|
| `App.tsx` | Main app, agent state, AIConfig, chat/dashboard/memory wiring |
| `components/BottomToolbar.tsx` | Hire dialog, dashboard button, schedule button |
| `components/CompanyDashboard.tsx` | Full company OS (7 tabs) + Memory/Skill system + Autopilot |
| `components/OrgChart.tsx` | Visual hierarchy tree |
| `components/CEOInbox.tsx` | CEO inbox with AI routing |
| `components/AgentChatPanel.tsx` | Per-agent AI chat with memory context |
| `components/AgentMemoryViewer.tsx` | Full memory & skills UI (2 tabs) |
| `components/SchedulePanel.tsx` | Work schedule (3 tabs) |
| `components/StatsDashboard.tsx` | Stats (6 tabs), FX, budget |
| `components/OfficeEvents.tsx` | Office events hook |

---

## 📊 PROJECT STATS
- **Total Components:** 14 React components
- **Total Commits:** 60+ commits
- **localStorage Keys:** 15+ keys
- **AI Providers Supported:** 6
- **Dashboard Tabs:** 7
- **Office Floors:** 4
- **Agent Roles:** 12
- **Countries Supported:** 7
- **Currencies:** 6
- **Skill Badges:** 21 across 7 categories
- **Autopilot Chunks:** 5
- **Memory System Chunks:** 5
- **CEO Hierarchy Chunks:** 5

---

## 📂 localStorage Keys Complete List
| Key | Purpose |
|-----|---------|
| `pixeloffice_agents` | All hired agents |
| `pixeloffice_hire_history` | Hire/fire log |
| `pixeloffice_floor` | Current floor |
| `pixeloffice_auto_events` | Auto events toggle |
| `pixeloffice_fx_rates` | FX exchange rates |
| `pixeloffice_balance` | Company balance |
| `pixeloffice_dept_budgets` | Dept budgets |
| `pixeloffice_schedule` | Global schedule |
| `pixeloffice_agent_schedules` | Per-agent schedules |
| `pixeloffice_chat_<agentId>` | Per-agent chat history |
| `pixeloffice_ceo_inbox` | CEO inbox messages |
| `pixeloffice_tasks` | Task board tasks |
| `pixeloffice_outputs_<agentId>` | Per-agent task outputs |
| `pixeloffice_scrum_logs` | Scrum standup history |
| `pixeloffice_company_goal` | Current company goal |
| `pixeloffice_memory_<agentId>` | Per-agent task memory |
| `pixeloffice_skills_<agentId>` | Per-agent XP/badges |

---

## ✅ COMPLETED FEATURES (as of April 3, 2026)

### Phase 1 ✅
- [x] VS Code-free standalone deployment
- [x] Retro pixel-art UI
- [x] 60 FPS canvas renderer

### Phase 2 ✅
- [x] HireDialog with Profile + AI Brain tabs
- [x] 12 agent roles with salaries
- [x] 7 countries, 6 currencies
- [x] StatsDashboard 6 tabs
- [x] Promote/Demote system
- [x] FX conversion

### Phase 3 ✅
- [x] Multi-floor system (4 floors)
- [x] Work Schedule (Global/Per-Agent/Clock)
- [x] Office Events (5 types)
- [x] Company Balance + Game Loop
- [x] Department Budget Caps
- [x] Data persistence (localStorage)
- [x] Agent respawn on refresh

### Phase 4 ✅
- [x] 6 AI Providers (LiteLLM, OpenAI, Groq, Ollama, OpenRouter, Custom)
- [x] Agent Chat Panel with history
- [x] Context-aware AI responses

### Phase 5 ✅
- [x] Org Chart (visual hierarchy)
- [x] CEO Inbox (messages + file routing)
- [x] Task AI Execute + Output Folders
- [x] AI Scrum Auto-Run
- [x] File → CEO Auto-Route

### Phase 6 ✅ (Autopilot Mode)
- [x] Goal Definition UI
- [x] AI Goal-to-Tasks Generator
- [x] Auto-Run Loop (30s interval)
- [x] Execution + CEO Feedback
- [x] Pause/Resume toggle

### Phase 7 ✅ (Agent Memory System)
- [x] Memory Store (last 20 tasks)
- [x] Skill Growth (XP + 21 badges + levels)
- [x] Context-Aware Chat (memory injected in prompts)
- [x] Memory Viewer (Skills & Memory tabs)
- [x] CEO Memory Brief (smart task assignment)

---

## 🚀 NEXT POSSIBLE FEATURES

### Option A — 📊 Finance 2.0
P&L dashboard, expense tracking, invoice system, monthly reports — poori company ka paisa ka hisaab

### Option B — 💬 Agent Group Chat
Saare agents ek saath chat kar sakein, CEO broadcast kar sake, @mention system — real Slack jaisa

### Option C — 🎮 Game Mechanics 2.0
Company levels (Startup → Unicorn), achievements, leaderboard, office upgrade system — game feel badao

### Option D — 📱 Mobile Dashboard
Responsive layout, touch controls — phone pe bhi kaam kare

---

## ✅ CURRENT STATUS (April 3, 2026 — 21:30 UTC)
- **All 3 GitHub repos:** ✅ Synced and up-to-date
- **Live site:** ✅ http://69.62.83.21:8766/index.html
- **All 7 Phases:** ✅ Complete and deployed
- **Build:** ✅ Clean (no TypeScript errors)
- **Autopilot Mode:** ✅ LIVE
- **Agent Memory System:** ✅ LIVE

---

*File last updated: April 3, 2026 (21:30 UTC)*
*Project: Pixel Office / AI Company OS*
*Developer: OpenClaw AI + Arjun Singh*
