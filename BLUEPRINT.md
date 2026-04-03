# 🚀 PIXEL OFFICE — MASTER BLUEPRINT (AI Company OS)
*Last Updated: April 3, 2026 (21:30 UTC)*

Pixel Office ek browser-based, AI-native **Company Operating System** hai. Yeh pixel-art style mein ek multi-floor office ko simulate karta hai jahan har agent ek **AI Brain** (LLM) se chal raha hai.

---

## 🛠️ 1. ARCHITECTURE & ENGINE
- **Renderer:** HTML5 Canvas (60 FPS, Pixel Art)
- **Style:** Retro, Dark Theme, Monospace (No rounded corners, No gradients)
- **Data:** Persistent `localStorage` (sab kuch refresh ke baad survive karta hai)
- **AI Backend:** OpenAI-compatible `/chat/completions` (Supports 6+ providers)
- **GitHub Sync:** 3-tier repository system (Ref, Latest, Standalone)

---

## 🏢 2. CORE OFFICE FEATURES (The Foundation)
- **Multi-Floor System:** 4 unique office floors (JSON layout based).
- **Floor Switcher:** UI dropdown to navigate between floors instantly.
- **Office Clock:** Configurable time speed for day/night shift management.
- **Events System:** 5 types of auto-triggered events (e.g., Hackathon, Power Outage, Team Lunch).
- **Game Loop:** 60s tick engine — revenue/payroll calculation and auto-status updates.
- **Budgeting:** Department-wise budget caps with visual progress bars.

---

## 🧑‍💼 3. HR & AGENT MANAGEMENT (The People)
- **Agent Roles (12):** CEO, CTO, Manager, Developer, DevOps, Designer, QA, HR, Marketing, Sales, Analyst, Intern.
- **Hire/Fire System:** Hire based on country, currency, salary. Fire history logged.
- **Agent Status:** AI-driven lifecycle (Working → Meeting → Break → Idle).
- **Salaries:** Multi-currency support (USD, INR, GBP, EUR, JPY, RUB) with live FX rates.
- **Schedule:** Per-agent working hours and global office shifts.
- **Promote/Demote:** Level-based hierarchy within agent roles.

---

## 🧠 4. AI BRAIN & INTERACTION (The Intelligence)
- **Config:** Each agent has their own `aiConfig` (Provider, URL, API Key, Model).
- **Agent Chat:** Dedicated chat interface per-agent to talk to them directly.
- **Context-Aware Chat:** System prompt automatically injects agent's memory, skills, XP, badges, and recent tasks.
- **AI Tasks:** Agents complete tasks by calling the LLM API and outputting professional results.
- **Persistence:** Chat history and task output files are stored per agent in private folders.

---

## 🧠 5. AGENT MEMORY SYSTEM (The Brain)
- **Memory Store:** Each agent saves last 20 completed tasks (title, type, output, date).
- **Skill Growth:** XP system per task type (Code, Research, Design, etc.) — +1 XP per task.
- **Leveling:** Total XP / 5 + 1 = Agent Level.
- **21 Badges:** 3 tiers per skill category (Jr Dev → Sr Dev → Tech Lead, etc.)
- **Memory Viewer:** Full UI with Skills & XP tab + Memory Log tab.
- **CEO Memory Brief:** CEO AI receives full team brief (skills, XP, recent work) before task assignment.

---

## 🤖 6. AUTONOMOUS FLOWS (The Autopilot)
- **Task Execution:** ▶ Run button triggers browser-based AI call.
- **Scrum Run:** Multi-agent AI call → CEO aggregates standups → Logs saved.
- **Auto-Routing:** File/Task sent to CEO → AI reads it → Auto-assigns to the relevant agent → Forwarded.
- **Autopilot Mode (NEW):**
  - CEO sets Company Goal (title + description)
  - "🤖 Autopilot Tasks" → CEO AI generates tasks with smart agent matching
  - "🟢 Auto-Run" ON → Every 30s, TO DO tasks auto-execute via agent AI
  - Task complete → Agent memory updated + CEO Inbox notification
  - "⏸️ Pause/Resume" toggle for full control

---

## 👑 7. CEO HIERARCHY SYSTEM (The OS)
The heart of the "Company OS" — a 7-tab central dashboard:

1. **📋 Task Board:** Kanban board (TO DO/RUNNING/DONE/FAILED), AI task execution, Autopilot controls.
2. **📁 Output Folders:** File browser for agent task results (preview + download).
3. **🧑‍💼 AI Scrum Board:** Automated standup meetings + CEO summary + history.
4. **📈 Analytics:** KPI monitor (Agents hired, Balance, Revenue/day, Performance bars).
5. **👥 Team:** Full agent roster with LVL/XP badges, memory indicator, chat/task buttons.
6. **🗂️ Org Chart:** Visual hierarchy with gold CEO, role colors, AI badges, vacant slots.
7. **👑 CEO Inbox:** Central communication hub — Tasks/Files/Messages, AI responses, auto-forward.

---

## ⚙️ 8. CONFIGURATION & DESIGN RULES (The Constraints)
- **Colors (Palette):**
    - Names/Headers: Cyan (#66ddff)
    - Numbers/Badges: Yellow (#ffdd44)
    - Positive/Green: (#00ff88)
    - Titles: Light blue (#aaddff)
    - NO WHITE (#ffffff) ALLOWED.
- **UI:** No rounded corners, no gradients, pixel-perfect borders.
- **Font:** Monospace, sizes 16-22px (responsive to importance).

---

## 🚀 CURRENT CAPABILITIES (A to Z)
1. **Can I hire?** Yes, full HR system with 12 roles, 7 countries, 6 currencies.
2. **Can agents talk?** Yes, per-agent AI chat with context-aware memory injection.
3. **Can agents work?** Yes, AI-powered task execution with output files.
4. **Can CEO manage?** Yes, Inbox + Routing + Scrum summaries + AI responses.
5. **Can I see hierarchy?** Yes, visual Org Chart with collapse/expand.
6. **Does data save?** Yes, 15+ localStorage keys for full persistence.
7. **Is it deployed?** Yes, static live site at http://69.62.83.21:8766/
8. **Is it flexible?** Yes, 6+ AI providers supported (LiteLLM, OpenAI, Groq, etc.)
9. **Can agents learn?** Yes, memory + XP + badges system.
10. **Can I automate?** Yes, Autopilot Mode — set goal, generate tasks, auto-run.
11. **Can CEO assign smart?** Yes, CEO sees team skills/memory and assigns accordingly.

---

## 📊 PROJECT STATS
- **Components:** 14 React components
- **Commits:** 60+
- **localStorage Keys:** 15+
- **AI Providers:** 6
- **Dashboard Tabs:** 7
- **Office Floors:** 4
- **Agent Roles:** 12
- **Skill Badges:** 21 across 7 categories
- **Completed Phases:** 7 (all done!)

---

## ✅ COMPLETED PHASES
- [x] Phase 1: Base System (VS Code-free standalone)
- [x] Phase 2: HR & Agent Management
- [x] Phase 3: Office Features (Multi-floor, Schedule, Events, Budget)
- [x] Phase 4: AI Brain System (Providers, Chat, Context)
- [x] Phase 5: CEO Hierarchy (Org Chart, Inbox, Task Execute, Scrum, Routing)
- [x] Phase 6: Autopilot Mode (Goal → Tasks → Auto-Run → Feedback)
- [x] Phase 7: Agent Memory System (Memory Store, Skills, Context Chat, Viewer, CEO Brief)

---

*This blueprint represents the current operational state of Pixel Office as of April 3, 2026.*
