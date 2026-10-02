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
- Save the list in this device's browser database with IndexedDB.

## How the pieces fit together

- `src/main.tsx` starts React and loads the stylesheet.
- `src/App.tsx` defines the screen, form, and filters.
- `src/storage.ts` opens the on-device IndexedDB database and reads and writes application records.
- `src/types.ts` defines the application and status types shared by the UI and storage layer.
- `src/styles.css` contains the responsive page and component styles.
- `index.html` is the single page Vite serves; React mounts into its `#root` element.

Data currently stays in the browser profile where it was entered. On first launch after this update, existing `localStorage` records are copied into IndexedDB and then the old copy is removed. This local database does not sync between devices. A hosted database and user accounts are a separate next step.
