# 🚀 AI Agent Handover & Architecture Guide — SciComm Spark

> **Important Information for Future AI Agents & Developers**  
> This document details the exact architecture, data model, feature specifications, business rules, and UI conventions established for **SciComm Spark Competition System**.

---

## 📌 1. Project Overview & Environment
- **Platform Name**: SciComm Spark Competition Platform
- **Tech Stack**: React 18, Vite 8, Lucide React Icons, Vanilla CSS Design System (`src/scicommspark.css`).
- **Live Site URL**: `https://scicomm-superbugs.github.io/AIU-Science-Comm-Spark/`
- **Deployment Script**: `deployment.bat` (Run via `cmd.exe /c "deployment.bat"` to build Vite assets, stage/commit `main`, and push to `gh-pages`).

---

## 🎯 2. Core Competition Structure & Tracks

The competition consists of **two distinct competition tracks**:
1. **Track 1: Pop Science Videos (`pop_science`)**
   - **Stage 1**: Short Pop Video (Reels / TikTok Video, max 90s)
   - **Stage 2**: Long Pop Video (YouTube SciComm Video, max 3 mins)
   - **Stage 3**: Live Stage Show (Interactive Live Presentation on stage)

2. **Track 2: Science Journalism (`science_journalism`)**
   - **Stage 1**: Short News Article (Simplified Science News Article)
   - **Stage 2**: Article Publication (Feature Science Journalism Article)
   - **Stage 3**: Live Stage Show (Live Media Interview / Presentation)

### 🚨 Strict Track Isolation Rule
- **Competitors** registered in Track 1 MUST see ONLY Track 1 stages, timelines, and deliverables.
- **Competitors** registered in Track 2 MUST see ONLY Track 2 stages, timelines, and deliverables.
- Track isolation is handled dynamically based on `user.registeredTrack` / `meDoc.registeredTrack`.

---

## 👥 3. Participation Modes (`team` vs `individual`)

Competitors participate either as part of a **Team** (up to 3 members) or as an **Individual**:

### A. Team Competitors (`participationMode === 'team'`)
- Sidebar menu item label: **"Our Team & Leaderboard"**
- Team Creation Form in `FTOurTeam.jsx`:
  - Asks ONLY for **Team Name**.
  - **No Competition Track selector is present** because the team automatically inherits the creator's registered track (`pop_science` or `science_journalism`).
  - Generates a unique 3-digit invite code (e.g. `T-101`).

### B. Individual Competitors (`participationMode === 'individual'`)
- Sidebar menu item label: **"Leaderboard & Progress"**
- `FTOurTeam.jsx` hides team setup cards and displays solo progress analytics and standings.

---

## 👑 4. Admin "View As" Impersonation System

Admin users can preview the app from the exact perspective of any competitor or judge role without logging out.

### Impersonation Dropdown Options in Top Navbar (`FTLayout.jsx`):
1. `🎙️ Competitor (Pop Science Track) (team)` (`student_pop_team` / `student_pop`)
2. `🎙️ Competitor (Pop Science Track) (individual)` (`student_pop_ind`)
3. `📰 Competitor (Science Journalism Track) (team)` (`student_jour_team` / `student_jour`)
4. `📰 Competitor (Science Journalism Track) (individual)` (`student_jour_ind`)
5. `🎓 Judge (Academic)` (`judge_academic`)
6. `🎙️ Judge (SciComm)` (`judge_scicomm`)
7. `👑 Back to Admin` (`normal`)

### ⚡ Reactivity Rule (Zero Page Refresh)
- State is managed via `useAuth()` (`isImpersonating`, `viewAsMode`, `registeredTrack`, `participationMode`).
- `FTLayout.jsx` includes `user?.participationMode` and `user?.viewAsMode` in the `useMemo` dependency array for `navItems`.
- Toggling the dropdown immediately updates sidebar links, route permissions, and page views **without requiring a browser refresh**.

---

## ⏰ 5. Submission Windows & Modals (`FTMyCompetition.jsx`)

- Each stage deliverable has a **Submission Start Date** and **Submission End Date** (Submission Window).
- If the current time is outside the submission window (before start date or after end date):
  - Submissions are locked and the submit button displays window status.
- Clicking **Submit Submission** opens a dedicated modal/popup for **only that specific deliverable**.

---

## 🏆 6. Naming & Typography Conventions
- **Leaderboard Headings**: Always use **"Competition Leaderboard"** and **"Competition Rankings & Leaderboard"**. The legacy "Master" prefix has been completely removed from public UI titles.
- **Terminology**: Always use **"Competitor"** in user-facing labels (avoid generic "Student" terminology in competition contexts).

---

## 📁 7. File Map & Key Locations

| File Path | Description |
| :--- | :--- |
| `src/context/AuthContext.jsx` | Auth provider & Admin `viewAsMode` impersonation logic. |
| `src/FTLayout.jsx` | App shell layout, top navbar (`View As:` selector), fixed sidebar. |
| `src/FTDashboard.jsx` | Chronological competition roadmap timeline & track overview. |
| `src/FTMyCompetition.jsx` | Deliverables submission workspace & window validation. |
| `src/FTOurTeam.jsx` | Team management & Competition Leaderboard. |
| `src/ftConstants.js` | Track definitions, stage defaults, role definitions, helper functions. |
| `src/scicommspark.css` | Global design system CSS styles. |
| `deployment.bat` | Production build & GitHub Pages deployment script. |

---

*Handover guide compiled for AI Agents & Developers. Keep this documentation updated whenever structural or business logic changes occur.*
