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
