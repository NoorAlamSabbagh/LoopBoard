# LoopBoard — Agent Instructions & Project Context

> **To all AI Coding Assistants & Agents:**
> This repository is **LoopBoard**, a personal ATS, interview question intelligence bank, company targeting engine, preparation tracker, and career analytics portal for software engineers.
>
> **Do not ask the user to explain the project flow or architecture.** All context, closed feedback loops, domain models, algorithms, and development standards are defined below and in [PROJECT_HISTORY_AND_FLOW.md](file:///d:/AlamProgrammingPractice/Personal%20Project/LoopBoard/PROJECT_HISTORY_AND_FLOW.md).

---

## 1. Core Purpose & The Feedback Loop

LoopBoard is **NOT** a simple CRUD application or basic job tracker spreadsheet. It is built around a closed continuous-learning feedback loop:

$$\text{Company} \longrightarrow \text{Job} \longrightarrow \text{Application} \longrightarrow \text{Interview} \longrightarrow \text{Questions} \longrightarrow \text{Performance} \longrightarrow \text{Weak Areas} \longrightarrow \text{Prep} \longrightarrow \text{Skill Scores} \longrightarrow \text{Next Target}$$

### How It Operates:
1. **Targeting**: The user organizes companies into Tiers (1, 2, 3) with an algorithmic **Company Target Score** (0-100%) computed from skill match, experience match, interview readiness, and company interest.
2. **ATS Pipeline**: Interactive Kanban board tracks jobs through `Saved` $\rightarrow$ `Applied` $\rightarrow$ `Screening` $\rightarrow$ `Interview Scheduled` $\rightarrow$ `Interviewing` $\rightarrow$ `Offer` / `Rejected`.
3. **Interviews**: Multiple rounds (Technical, Coding, System Design, Behavioral, Managerial, HR) are scheduled and logged.
4. **Questions Bank**: Every question asked during interviews is stored and canonicalized. Occurrences track how many companies ask the same question (e.g. "Explain Event Loop" asked by 7 companies).
5. **Performance Evaluation**: After an interview, the user records their technical/communication scores and which questions they answered or missed.
6. **Weak Area Engine**: The system identifies weak topics (blended score $< 55\%$, low confidence $\le 2$).
7. **Preparation & Stacks**: Users study through Markdown notes (in `prep-notes/` or web hub) and generated study plans.
8. **Skill Blending**: Skill proficiency dynamically recalibrates:
   $$\text{Blended Skill} = 40\% \text{ Self Score} + 35\% \text{ Question Mastery} + 25\% \text{ Interview Performance}$$
   This automatically updates the readiness and target score for all upcoming companies!

---

## 2. Technical Stack

- **Client**: React 19, TypeScript, Vite, Tailwind CSS, Zustand, React Router v7, Recharts, Lucide Icons.
- **Server**: Node.js 20+, Express, TypeScript (`tsx`), Zod validators, Multer for resume uploads.
- **Data & Cache**: MongoDB (Mongoose models in `server/src/models/`), Redis with in-memory fallback in development.
- **Auth**: JWT Access Token (15 min in memory/Zustand) + Refresh Token (7-day `httpOnly` cookie at `/api/auth/refresh`).
- **Prep Content**: Preloaded markdown topic notes in `prep-notes/` across 9 software stacks.

---

## 3. Key Scoring Formulas & Constants

Refer to `server/src/constants/scores.ts` and `server/src/services/targetingService.ts`:

- **Target Score Weights**:
  - `skillMatch`: 35%
  - `experienceMatch`: 20%
  - `interviewReadiness`: 25%
  - `companyInterest`: 20%
- **Skill Blend Weights**:
  - `self`: 40%
  - `questionMastery`: 35%
  - `interviewPerformance`: 25%
- **Question Mastery Scale**:
  - `not_studied`: 0 | `studying`: 30 | `weak`: 40 | `good`: 75 | `mastered`: 100
  - Mastery per question: $(\text{StatusScore} + \text{Confidence} \times 20) / 2$
- **Weak Topic Threshold**:
  - Blended score $< 55$ or confidence $\le 2$.

---

## 4. Architectural Rules & Code Conventions

1. **Service Layer**: Keep business logic in `server/src/services/` (e.g., `targetingService.ts`, `prepSkillService.ts`, `dashboardService.ts`). Controllers only parse inputs, call services, and return responses.
2. **API Input Validation**: Every endpoint must have a Zod schema in `server/src/validators/` hooked into the `validate` middleware.
3. **Response Schema**:
   ```json
   { "success": true, "data": { ... }, "message": "Optional success message" }
   { "success": false, "message": "Error description", "error": { ... } }
   ```
4. **Data Isolation**: All user resources in MongoDB are strictly scoped by `userId`.
5. **No AI/LLM Hallucinations on Domain**: Always preserve the feedback loop. Any feature touching questions, interviews, or study topics must keep the skill-score recalculation intact.
6. **Detailed Reference**: For complete database diagrams, module flows, and API specifications, consult [PROJECT_HISTORY_AND_FLOW.md](file:///d:/AlamProgrammingPractice/Personal%20Project/LoopBoard/PROJECT_HISTORY_AND_FLOW.md).
