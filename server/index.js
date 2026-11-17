import { createApp } from "./app.js";
import { createStore } from "./data.js";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const port = Number(process.env.PORT) || 4000;
const host = process.env.HOST || "127.0.0.1";
const databasePath = process.env.DATABASE_PATH || resolve(dirname(fileURLToPath(import.meta.url)), "../data/researchdesk.sqlite");
createApp(createStore(databasePath)).listen(port, host, () => {
  console.log(`Postgraduate Workspace API listening on http://${host}:${port}`);
});
