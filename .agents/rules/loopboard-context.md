# LoopBoard Rules & Project Memory

This rule provides persistent memory and behavioral guidelines for working with the **LoopBoard** project.

## Core Rule: Never Ask For Flow Re-explanation
The complete project context and flow is permanently maintained in the workspace. Read [PROJECT_HISTORY_AND_FLOW.md](file:///d:/AlamProgrammingPractice/Personal%20Project/LoopBoard/PROJECT_HISTORY_AND_FLOW.md) and [AGENTS.md](file:///d:/AlamProgrammingPractice/Personal%20Project/LoopBoard/AGENTS.md) whenever starting work.

## LoopBoard Product Summary
- **Type**: Personal ATS + Interview Intelligence + Target Company Scoring + Prep Tracker.
- **The Core Loop**: `Company → Job → Application → Interview → Questions → Performance → Weak Areas → Prep → Skill Scores → Next Target`.
- **Backend**: Express + TypeScript + MongoDB (Mongoose) + Zod + JWT httpOnly cookie.
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Zustand + React Router v7 + Recharts.
- **Scoring Formulas**:
  - Target Score = 35% Skill Match + 20% Experience Match + 25% Interview Readiness + 20% Company Interest.
  - Blended Skill Score = 40% Self-rating + 35% Question Mastery + 25% Interview Performance.
- **Prep Stacks**: Markdown study files located in `prep-notes/` synced to the database.

## Architecture Guidelines
- Place business logic in `server/src/services/`.
- Validate all incoming request data with Zod in `server/src/validators/`.
- Maintain standard `{ success, data, message }` JSON responses.
- Scope all models by `userId`.
