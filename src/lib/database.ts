import Database from "@tauri-apps/plugin-sql";

export type CommandPreset = {
  id: number;
  name: string;
  category: string;
  command: string;
  description: string;
};

export type WorkspaceHistoryRecord = {
  id: number;
  toolId: string;
  sourceType: "manual" | "auto";
  title: string;
  inputValue: string;
  outputValue: string;
  snapshotJson: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceHistoryRecordInput = Omit<WorkspaceHistoryRecord, "id">;

export type DatabaseAdapter = Pick<Database, "execute" | "select">;
export type DatabaseLoader = (databaseUrl: string) => Promise<DatabaseAdapter>;

type DatabaseApi = {
  initializeDatabase: () => Promise<void>;
  loadCommandPresets: () => Promise<CommandPreset[]>;
  insertWorkspaceHistoryRecord: (input: WorkspaceHistoryRecordInput) => Promise<void>;
  loadWorkspaceHistoryRecords: () => Promise<WorkspaceHistoryRecord[]>;
  trimWorkspaceHistory: (sourceType: WorkspaceHistoryRecord["sourceType"], keepCount: number) => Promise<void>;
};

type DatabaseApiOptions = {
  databaseUrl?: string;
  loadDatabase?: DatabaseLoader;
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

export function createDatabaseApi(options: DatabaseApiOptions = {}): DatabaseApi {
  const loadDatabase = options.loadDatabase ?? ((databaseUrl) => Database.load(databaseUrl));
  const databaseUrl = options.databaseUrl ?? DATABASE_URL;
  let databasePromise: Promise<DatabaseAdapter> | undefined;

  async function getDatabase(): Promise<DatabaseAdapter> {
    if (!databasePromise) {
      databasePromise = loadDatabase(databaseUrl);
    }

    return databasePromise;
  }

  return {
    async initializeDatabase(): Promise<void> {
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

      await db.execute(`
        CREATE TABLE IF NOT EXISTS workspace_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tool_id TEXT NOT NULL,
          source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'auto')),
          title TEXT NOT NULL,
          input_value TEXT NOT NULL,
          output_value TEXT NOT NULL,
          snapshot_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      for (const preset of SEED_PRESETS) {
        await db.execute(
          `INSERT OR IGNORE INTO command_presets (name, category, command, description)
           VALUES ($1, $2, $3, $4)`,
          [preset.name, preset.category, preset.command, preset.description],
        );
      }
    },

    async loadCommandPresets(): Promise<CommandPreset[]> {
      const db = await getDatabase();
      return db.select<CommandPreset[]>(
        `SELECT id, name, category, command, description
         FROM command_presets
         ORDER BY category, name`,
      );
    },

    async insertWorkspaceHistoryRecord(input: WorkspaceHistoryRecordInput): Promise<void> {
      const db = await getDatabase();

      await db.execute(
        `INSERT INTO workspace_history (
           tool_id, source_type, title, input_value, output_value, snapshot_json, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          input.toolId,
          input.sourceType,
          input.title,
          input.inputValue,
          input.outputValue,
          input.snapshotJson,
          input.createdAt,
          input.updatedAt,
        ],
      );
    },

    async loadWorkspaceHistoryRecords(): Promise<WorkspaceHistoryRecord[]> {
      const db = await getDatabase();

      return db.select<WorkspaceHistoryRecord[]>(
        `SELECT
           id,
           tool_id AS toolId,
           source_type AS sourceType,
           title,
           input_value AS inputValue,
           output_value AS outputValue,
           snapshot_json AS snapshotJson,
           created_at AS createdAt,
           updated_at AS updatedAt
         FROM workspace_history
         ORDER BY datetime(created_at) DESC, id DESC`,
      );
    },

    async trimWorkspaceHistory(sourceType: WorkspaceHistoryRecord["sourceType"], keepCount: number): Promise<void> {
      const db = await getDatabase();
      const safeKeepCount = Math.max(0, keepCount);

      await db.execute(
        `DELETE FROM workspace_history
         WHERE source_type = $1
           AND id IN (
             SELECT id
             FROM workspace_history
             WHERE source_type = $1
             ORDER BY datetime(created_at) DESC, id DESC
             LIMIT -1 OFFSET $2
           )`,
        [sourceType, safeKeepCount],
      );
    },
  };
}

const databaseApi = createDatabaseApi();

export const initializeDatabase = databaseApi.initializeDatabase;
export const loadCommandPresets = databaseApi.loadCommandPresets;
export const insertWorkspaceHistoryRecord = databaseApi.insertWorkspaceHistoryRecord;
export const loadWorkspaceHistoryRecords = databaseApi.loadWorkspaceHistoryRecords;
export const trimWorkspaceHistory = databaseApi.trimWorkspaceHistory;

export { DATABASE_URL };
