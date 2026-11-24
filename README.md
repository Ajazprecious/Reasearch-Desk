# ResearchDesk

ResearchDesk is a postgraduate workspace for students, supervisors, and administrators. The Cloudflare deployment uses a static Pages frontend, a Workers API/server-functions backend, D1 for application data, and R2 for uploaded files.

## Run locally

Use Node.js 22.13 or newer.

```sh
npm install
Copy-Item .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

Open the Vite URL shown in the terminal. Wrangler runs the Worker and local D1/R2 bindings during development. Put local secrets such as `SESSION_SECRET` and `GEMINI_API_KEY` in the ignored `.dev.vars` file. Do not commit it.

## Demo accounts

When `SEED_DEMO_DATA=true`, the Worker creates these accounts on first use. All use the password `ResearchDesk123!`:

- Student: `amara.nwosu@example.edu`
- Supervisor: `amina.yusuf@example.edu`
- Administrator: `admin@example.edu`

The demo accounts are shared by every visitor. The admin account can change shared test data, so enable demo seeding only for disposable feature testing; never put real student records in this deployment. Set `SEED_DEMO_DATA=false` to prevent demo accounts from signing in.

## Deploy to Cloudflare

The Worker and Pages site are separate deployments. The D1 binding ID and R2 bucket name are configured in `wrangler.jsonc`; create the resources before deploying.

1. Install dependencies and create the D1 database and R2 bucket:

   ```sh
   npm install
   npm run db:create
   npm run r2:create
   ```

   Copy the D1 database ID printed by Wrangler into `wrangler.jsonc` in place of the all-zero placeholder.

2. Set Worker secrets and deployment variables. Create a long random `SESSION_SECRET` of at least 32 characters and set it with `npx wrangler secret put SESSION_SECRET`. If AI features are needed, set `GEMINI_API_KEY` with `npx wrangler secret put GEMINI_API_KEY`. Keep `SEED_DEMO_DATA=true` for the public demo accounts. Set `ALLOWED_ORIGINS` to the exact Pages origin(s), comma-separated, in `wrangler.jsonc` or the Worker settings.

3. Apply the D1 schema and deploy the API/server-functions Worker:

   ```sh
   npm run db:migrate:remote
   npm run deploy:worker
   ```

   Deploy through this script rather than running `wrangler deploy` directly: the Vite build generates the Worker bundle and its Wrangler config in `dist/server`.

4. Set the Pages build variable `VITE_API_BASE_URL` to the deployed Worker URL (for example, `https://researchdesk-api.<your-account>.workers.dev`). Build and deploy the static frontend:

   ```sh
   npm run build:pages
   npx wrangler pages deploy dist/client --project-name=researchdesk
   ```

5. Add the final Pages URL to both the Worker’s `ALLOWED_ORIGINS` and the Pages build variable `VITE_ALLOWED_ORIGINS`, then redeploy both projects. These origin allowlists are used for CORS and server-function CSRF checks.

For CI or Cloudflare Pages Git builds, use `npm run build:pages` and publish `dist/client`. Configure `VITE_API_BASE_URL` and `VITE_ALLOWED_ORIGINS` in the Pages project’s build environment. The Worker still needs its D1 and R2 bindings, `SESSION_SECRET`, `ALLOWED_ORIGINS`, and (if enabled) `GEMINI_API_KEY`.

## Data, uploads, and AI

- D1 stores users and the 15 workspace entities. Apply schema changes with `npm run db:migrate:remote`.
- R2 stores uploaded files. Downloads use short-lived signed links; do not make the bucket public.
- Gemini 2.5 Flash provides supervisor matching, student writing guidance, supervisor review suggestions, and administrator analytics insights. AI calls are on demand. Matching and academic decisions remain human-controlled.
- Set `GEMINI_API_KEY` only as a Worker secret. The relevant research or writing context is sent to Google only when a user requests an AI action.
- Email delivery, OTP verification, password-reset email, and institutional OAuth are not configured. Administrator registration remains disabled unless an `ADMIN_INVITATION_CODE` is set.
- New supervisor accounts remain unable to sign in until an administrator approves them from **Admin → Users**.

## Validation

```sh
npm test
npm run build
```

The test suite includes the legacy local API behavior and persistence tests. The production deployment path is the Cloudflare Worker and Pages setup above.
