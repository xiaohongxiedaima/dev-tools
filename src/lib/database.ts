import Database from "@tauri-apps/plugin-sql";

export type CommandPreset = {
  id: number;
  name: string;
  category: string;
  command: string;
  description: string;
};

const DATABASE_URL = "sqlite:dev-tools.db";

const SEED_PRESETS = [
  {
    name: "API health check",
    category: "HTTP",
    command: "curl --fail --silent http://localhost:8080/health",
    description: "Quickly confirm the local backend is up before a dev session.",
  },
  {
    name: "Tail service log",
    category: "Logs",
    command: "tail -f ./logs/app.log",
    description: "Follow the main service log while testing requests or jobs.",
  },
  {
    name: "Open SQLite shell",
    category: "Database",
    command: "sqlite3 ./data/dev.db",
    description: "Jump into a local SQLite database for ad-hoc inspection.",
  },
] as const;

let databasePromise: Promise<Database> | undefined;

async function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = Database.load(DATABASE_URL);
  }

  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  const db = await getDatabase();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS command_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      command TEXT NOT NULL,
      description TEXT NOT NULL
    )
  `);

  for (const preset of SEED_PRESETS) {
    await db.execute(
      `INSERT OR IGNORE INTO command_presets (name, category, command, description)
       VALUES ($1, $2, $3, $4)`,
      [preset.name, preset.category, preset.command, preset.description],
    );
  }
}

export async function loadCommandPresets(): Promise<CommandPreset[]> {
  const db = await getDatabase();
  return db.select<CommandPreset[]>(
    `SELECT id, name, category, command, description
     FROM command_presets
     ORDER BY category, name`,
  );
}

export { DATABASE_URL };
