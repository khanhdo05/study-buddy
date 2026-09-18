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

The app currently opens a sample BIO 101 course with student and professor demo views.

- **Overview:** course focus, practice summary, and concept status.
- **Study:** prepared course explanations and a review sheet; no live AI calls.
- **Practice:** multiple-choice questions with feedback. Missed concepts get priority, and two question variants alternate per concept.
- **Progress:** concept-level results saved in this browser using localStorage.
- **Course settings:** switch the role selector to Professor to try the guided-help setting, then switch back to Student to see its effect in Study.
- **Focus mode:** reduces secondary content.

To try persistent progress, answer a practice question incorrectly, refresh the page, and select **Review weak concepts** on the overview. The next session uses the other sample question for that concept.

This is a frontend prototype. The role selector is not authentication, material references are sample metadata, and chat responses are scripted. Progress is device-local and is not synced across accounts or browsers. Course policy settings and chat history last only for the current session. Backend authorization, uploads, retrieval, LLM calls, and database persistence remain to be implemented.

### Source layout

```text
src/
├── App.tsx               # Workspace, navigation, overview, settings, progress
├── App.css               # Responsive interface styles
├── index.css             # Global styles and theme
├── features/
│   ├── Practice.tsx      # Quiz interaction and feedback
│   └── Study.tsx         # Scripted study chat
└── lib/
    └── demo.ts           # Concepts, question bank, review selection
```
