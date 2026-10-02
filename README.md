# Rolecall — Job application tracker

A small React + TypeScript web app for keeping job applications and their next steps in one place.

## Run it locally

You need Node.js and npm installed. From this folder, run:

```sh
npm install
npm run dev
```

Vite prints a local URL (usually `http://localhost:5173`). Open it in your browser. To make a production build, run `npm run build`.

## What the first version does

- Add a role with its company, location, date, status, posting link, notes, and next step.
- Filter by status or search company, role, and location.
- Change a status from the table and delete an application.
- Save the list in this browser with `localStorage`.

## How the pieces fit together

- `src/main.tsx` starts React and loads the stylesheet.
- `src/App.tsx` defines the application data shape, screen, form, filters, and browser storage.
- `src/styles.css` contains the responsive page and component styles.
- `index.html` is the single page Vite serves; React mounts into its `#root` element.

Data currently stays in the browser profile where it was entered. A later version can replace the small storage boundary in `App.tsx` with a backend API and account-based storage.
