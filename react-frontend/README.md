# Study Buddy Frontend

The Study Buddy frontend uses React, TypeScript, and Vite.

## Prerequisites

Install Node.js and npm, then check that both are available:

```bash
node --version
npm --version
```

## First-time setup

From the repository root (`study-buddy/`), run:

```bash
cd react-frontend
npm ci
npm run dev
```

`npm ci` installs the dependencies recorded in `package-lock.json` for a consistent team setup.

Open the local URL printed in the terminal. Keep the terminal running while developing. Saved source changes update the app automatically. Press **Ctrl+C** to stop the server.

## Daily development

From the repository root:

```bash
cd react-frontend
npm run dev
```

You do not need to reinstall dependencies every time you start the app. Run `npm ci` again after pulling changes to `package.json` or `package-lock.json`.

To add a dependency, use `npm install <package-name>` and commit both `package.json` and `package-lock.json`. Do not commit `node_modules/`.

## Available commands

Run these commands inside `react-frontend/`:

| Command | Purpose |
| --- | --- |
| `npm ci` | Install dependencies from the committed lockfile. |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Check TypeScript and generate a production build in `dist/`. |
| `npm run lint` | Check code against the ESLint rules. |
| `npm test` | Check course-role navigation and restricted-view behavior. |
| `npm run preview` | Preview the production build locally. Run the build first. |

## Check your changes

Before opening a pull request, run:

```bash
npm run lint
npm run build
```

To preview the production build:

```bash
npm run build
npm run preview
```

Open the URL printed by the preview server. This is a local preview, not a production deployment.

## Frontend prototype

The app opens a sign-in screen. Choose **Explore the demo without signing in** to open the sample BIO 101 course with student and professor demo views.

- **Overview:** course focus, practice summary, and concept status.
- **Study:** prepared course explanations and a review sheet; no live AI calls.
- **Practice:** multiple-choice questions with feedback. Missed concepts get priority, and two question variants alternate per concept.
- **Progress:** concept-level results saved in this browser using localStorage.
- **Course settings:** switch the role selector to Professor to try the guided-help setting, then switch back to Student to see its effect in Study.
- **Focus mode:** reduces secondary content.

To try persistent progress, answer a practice question incorrectly, refresh the page, and select **Review weak concepts** on the overview. The next session uses the other sample question for that concept.

The sample course is a frontend prototype. Its role selector is not authentication, material references are sample metadata, and chat responses are scripted. Progress is device-local and is not synced across accounts or browsers. Course policy settings and chat history last only for the current session. Backend authorization, uploads, retrieval, LLM calls, and database persistence remain to be implemented.

### Source layout

```text
src/
├── main.tsx                  # Entry point and shared style imports
├── app/
│   ├── AppRouter.tsx          # Session gate: authentication, courses, or demo
│   ├── AppRouter.css         # Loading, errors, and demo-return banner
│   └── DemoWorkspace.tsx     # Sample-course layout and navigation
├── features/
│   ├── auth/                 # Sign-in, sign-up, password recovery, auth styles
│   ├── courses/              # Course list, workspace, API calls, invitations, navigation
│   ├── materials/            # Syllabus upload and extraction interface
│   ├── practice/             # Quiz interaction and feedback
│   ├── progress/             # Concept progress display
│   └── study/                # Scripted study chat
├── components/               # Shared brand, empty states, sign-out control
├── styles/
│   ├── forms.css             # Shared form controls and feedback
│   └── workspace.css         # Shared UI and responsive workspace styles
├── index.css                 # Global styles and theme
└── lib/
    ├── demo.ts               # Sample concepts and quiz selection
    ├── syllabus.ts           # Shared syllabus parsing, types, and local storage
    └── supabase.ts           # Supabase client and account types
```

Keep feature-specific components and styles in their feature folder. `app/` composes screens and owns application navigation; `lib/` contains non-UI helpers shared across features. Add `components/` when extracting UI reused across features, rather than putting course screens inside authentication.

`AppRouter` selects screens from session state; it does not currently implement URL-based routing. Shared workspace styles are imported once by `main.tsx`, so authentication and courses do not depend on importing the demo for their appearance.

## Supabase accounts and courses

The app now supports email/password sign-up, email confirmation, sign-in, password reset, restored sessions, and sign-out. Professors can create courses and generate invitation codes; students can join and load their enrolled courses. These records persist in Supabase.

Before signing up:

1. Follow [the Supabase setup guide](../supabase/README.md) to apply the database migration and configure Auth redirect URLs.
2. Copy `.env.example` to `.env.local` and enter your project URL and publishable key. `.env.local` is ignored by Git. Never add a secret or service-role key.
3. Restart `npm run dev`.

Without configuration, account forms are disabled and the sample course remains available. Creating or joining a course opens its workspace. Selecting a course also opens it, and the course/view URL survives refresh and browser Back. Real courses start empty; they do not substitute sample Biology content or import local demo progress.

Authentication screens live in `src/features/auth/`, course screens in `src/features/courses/`, and the session gate in `src/app/AppRouter.tsx`; the shared Supabase client and account types live in `src/lib/supabase.ts`. Database migrations and permission tests live in `../supabase/`.

### Real course workspace

- `features/courses/api.ts` owns Supabase course queries and mutations.
- `features/courses/workspace.ts` defines navigation IDs, labels, role rules, and empty-state copy once.
- `features/courses/useCourseLocation.ts` keeps course/view selection in the URL.
- `features/courses/CourseWorkspace.tsx` renders the selected course and authenticated profile.
- `features/courses/CourseInvitation.tsx` owns the invitation flow.

Course ownership controls owner-only navigation; the database's RLS and invitation RPC still enforce access. A course is opened only after it appears in the authenticated user's RLS-filtered course list. Missing or inaccessible IDs show an unavailable screen; students cannot reach settings by changing the view parameter.

Owner workflow: create/open a course → **Course settings** → generate a student invitation. Student workflow: join with that code → open the same course workspace. Materials, Study, Practice, and Progress currently display honest empty states until those backend features are connected. The sample course remains an explicit, separate demo.

`npm test` checks frontend role/navigation behavior; it does not replace database permission tests or hosted end-to-end account verification.
