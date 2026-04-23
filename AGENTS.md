# AGENTS.md

## 1. Project Overview
- NexGEN Flo mobile app built with Expo and React Native.
- Primary product goals: reliable patient intake, clear navigation, and a calm Janet voice experience.
- Treat Janet voice intake and typed intake as shared workflow surfaces, not separate products.
- Optimize for safe, incremental improvements. Do not broaden scope unless required.

## 2. Setup / Run Commands
- Install: `npm install`
- Start dev server: `npm run start`
- iOS: `npm run ios`
- Android: `npm run android`
- Web: `npm run web`
- Lint: `npm run lint`

## 3. Architecture Rules
- Preserve the current app structure and patterns.
- Prefer changes inside existing `src/` modules, screens, services, and navigation.
- Treat `App.tsx` + `src/navigation/AppNavigator.tsx` as the active app entry/navigation path unless the repo clearly changes.
- Reuse existing intake state, Janet handoff logic, and service-layer helpers before adding new abstractions.
- Avoid refactors, file moves, or routing rewrites unless they are necessary to fix a concrete problem.
- Do not introduce new dependencies unless there is no reasonable in-repo solution.

## 4. Janet Voice Assistant Rules
- Janet must stay focused on intake completion, confirmation, and safe handoff into structured fields.
- Keep Janet prompts short, plain, and calming.
- Preserve turn order, confirmation steps, fallback behavior, and resume capability.
- Voice and typed intake must remain in sync on the same draft/state model.
- Do not make Janet more verbose, playful, or visually noisy.
- Any Janet change must protect recognition failure paths, manual correction paths, and yes/no confirmation flows.

## 5. UI/UX Rules
- Keep UI clean, minimal, calm, and easy to scan.
- Favor clear hierarchy, generous spacing, and plain language over clever visuals.
- Keep navigation obvious. Do not add extra steps, hidden actions, or modal detours without a clear need.
- Reduce cognitive load during intake: one primary action per view, limited competing emphasis.
- Preserve accessibility, readable contrast, and touch targets.
- Avoid flashy animation, crowded layouts, or decorative components that distract from check-in.

## 6. Coding Standards
- Make the smallest safe change that solves the task.
- Follow existing TypeScript, React Native, and styling conventions in the touched files.
- Prefer explicit, readable code over abstraction-heavy patterns.
- Keep business logic in existing service/state layers when possible, not scattered across UI.
- Add comments only when a non-obvious decision needs explanation.
- Do not add dead code, placeholder TODOs, or speculative helpers.

## 7. Safety Constraints
- Never expose, log, copy, or leak PHI or other sensitive patient data.
- Avoid test data or debug output that looks like real patient information.
- Do not break intake completion, resume flows, portal flows, or Janet handoff behavior.
- Preserve validation, confirmation, and review steps that protect data quality.
- If a change could affect patient safety, data capture, or navigation reliability, choose the safer narrower implementation.

## 8. Task Guidelines
- Prefer small, reversible, low-risk edits.
- Keep changes scoped to the requested outcome.
- Verify the specific flow you touched without broad unrelated cleanup.
- Do not mix feature work with opportunistic refactors.
- If a task suggests architectural churn, dependency additions, or flow rewrites, stop and reduce it to the smallest safe version first.
