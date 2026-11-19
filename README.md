# ResearchDesk

ResearchDesk is a single local application for postgraduate students, supervisors, and administrators. It keeps the Research Gate interface and role-specific workflows, backed by a local Express API and SQLite.

## Run locally

Use Node.js 22.13 or newer (the server uses the built-in `node:sqlite` module).

```sh
npm install
npm start
```

Open `http://localhost:5173`. Vite serves the TanStack Start app and proxies `/api` and `/uploads` to the Express API on port 4000. The database is created at `data/researchdesk.sqlite`; set `DATABASE_PATH` to use another file. Uploaded files are stored under `data/uploads` (or `UPLOADS_PATH`).

Seeded demo accounts use the password `ResearchDesk123!`:

- Student: `amara.nwosu@example.edu`
- Supervisor: `amina.yusuf@example.edu`
- Administrator: `admin@example.edu`

New students and supervisors can register with their institutional profile and a local email/password account. Supervisor accounts are marked pending institutional verification. Administrator registration requires an institution-issued code configured as `ADMIN_INVITATION_CODE`; without it, administrator self-registration is disabled. Session and internal API keys are randomly generated under the ignored `data` directory on first run; set `SESSION_SECRET` and `LOCAL_API_SERVICE_KEY` to private deployment values before exposing an installation to a network.

## Local services and integrations

- Email delivery, OTP verification, password-reset email, and Google/institutional OAuth require provider credentials and are not implemented. Registration and email/password sign-in work locally; the unavailable integrations are surfaced in the UI.
- Gemini 3.8 Flash powers supervisor matching, the student writing assistant, supervisor draft-review suggestions, and on-demand administrator analytics. Set `GEMINI_API_KEY` in the API server's environment and restart the server; the key is never sent to the browser. For PowerShell, set `$env:GEMINI_API_KEY` before starting `npm.cmd start`.
- Gemini calls are made only when a user requests an AI action. Matching sends research details and anonymized supervisor expertise; the student and supervisor assistants send the relevant writing/review context; analytics sends aggregate counts. Google processes that context for the request. Match eligibility, capacity rules, supervisor assignment, and final academic decisions remain local and human-controlled.
- Data for the 15 workspace entities (users, research/supervisor profiles, assignments, milestones, drafts, feedback, notifications, matching configuration/history, recommendations, writing documents, defences, tickets, and ticket updates) is persisted in SQLite. The earlier workflow API state is retained in the same database.
- This is a local prototype, not a production identity or file-hosting service.

## Validation

```sh
npm test
npm run build
```

`npm test` runs the Express workflow and persistence tests. The main API also exposes `GET /api/health`, local authentication at `/api/auth/*`, and authenticated entity operations at `/api/entities/:entity`.

To smoke-test the production bundle locally after building, run `npm run start:preview`; it starts the API with Vite's production preview.
