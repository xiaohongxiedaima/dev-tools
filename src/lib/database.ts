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
  tool_id: string;
  source_type: "manual" | "auto";
  title: string;
  input_value: string;
  output_value: string;
  snapshot_json: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceHistoryRecordInput = Omit<WorkspaceHistoryRecord, "id" | "updated_at"> & {
  updated_at?: string;
};
export type WorkspaceHistoryRecordInputCamelCase = {
  toolId: string;
  sourceType: WorkspaceHistoryRecord["source_type"];
  title: string;
  inputValue: string;
  outputValue: string;
  snapshotJson: string;
  createdAt: string;
  updatedAt?: string;
};

export type DatabaseAdapter = Pick<Database, "execute" | "select">;
export type DatabaseLoader = (databaseUrl: string) => Promise<DatabaseAdapter>;

type DatabaseApi = {
  initializeDatabase: () => Promise<void>;
  loadCommandPresets: () => Promise<CommandPreset[]>;
  insertWorkspaceHistoryRecord: (
    input: WorkspaceHistoryRecordInput | WorkspaceHistoryRecordInputCamelCase,
  ) => Promise<void>;
  loadWorkspaceHistoryRecords: () => Promise<WorkspaceHistoryRecord[]>;
  trimWorkspaceHistory: (sourceType: WorkspaceHistoryRecord["source_type"], keepCount: number) => Promise<void>;
  touchWorkspaceHistoryRecord: (id: number, timestamp: string) => Promise<void>;
  deleteWorkspaceHistoryRecord: (id: number) => Promise<void>;
  clearWorkspaceHistory: (sourceType: WorkspaceHistoryRecord["source_type"], toolId: string) => Promise<void>;
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

function normalizeWorkspaceHistoryRecordInput(
  input: WorkspaceHistoryRecordInput | WorkspaceHistoryRecordInputCamelCase,
): Omit<WorkspaceHistoryRecord, "id"> {
  if ("tool_id" in input) {
    const created_at = input.created_at;
    return {
      tool_id: input.tool_id,
      source_type: input.source_type,
      title: input.title,
      input_value: input.input_value,
      output_value: input.output_value,
      snapshot_json: input.snapshot_json,
      created_at,
      updated_at: input.updated_at ?? created_at,
    };
  }

  const created_at = input.createdAt;
  return {
    tool_id: input.toolId,
    source_type: input.sourceType,
    title: input.title,
    input_value: input.inputValue,
    output_value: input.outputValue,
    snapshot_json: input.snapshotJson,
    created_at,
    updated_at: input.updatedAt ?? created_at,
  };
}

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

    async insertWorkspaceHistoryRecord(
      input: WorkspaceHistoryRecordInput | WorkspaceHistoryRecordInputCamelCase,
    ): Promise<void> {
      const db = await getDatabase();
      const record = normalizeWorkspaceHistoryRecordInput(input);

      await db.execute(
        `INSERT INTO workspace_history (
           tool_id, source_type, title, input_value, output_value, snapshot_json, created_at, updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          record.tool_id,
          record.source_type,
          record.title,
          record.input_value,
          record.output_value,
          record.snapshot_json,
          record.created_at,
          record.updated_at,
        ],
      );
    },

    async loadWorkspaceHistoryRecords(): Promise<WorkspaceHistoryRecord[]> {
      const db = await getDatabase();

      return db.select<WorkspaceHistoryRecord[]>(
        `SELECT
           id,
          tool_id,
          source_type,
           title,
          input_value,
          output_value,
          snapshot_json,
          created_at,
          updated_at
         FROM workspace_history
         ORDER BY datetime(created_at) DESC, id DESC`,
      );
    },

    async trimWorkspaceHistory(sourceType: WorkspaceHistoryRecord["source_type"], keepCount: number): Promise<void> {
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

    async touchWorkspaceHistoryRecord(id: number, timestamp: string): Promise<void> {
      const db = await getDatabase();
      await db.execute(
        `UPDATE workspace_history
         SET created_at = $1, updated_at = $1
         WHERE id = $2`,
        [timestamp, id],
      );
    },

    async deleteWorkspaceHistoryRecord(id: number): Promise<void> {
      const db = await getDatabase();
      await db.execute(`DELETE FROM workspace_history WHERE id = $1`, [id]);
    },

    async clearWorkspaceHistory(sourceType: WorkspaceHistoryRecord["source_type"], toolId: string): Promise<void> {
      const db = await getDatabase();
      await db.execute(
        `DELETE FROM workspace_history
         WHERE source_type = $1 AND tool_id = $2`,
        [sourceType, toolId],
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
export const touchWorkspaceHistoryRecord = databaseApi.touchWorkspaceHistoryRecord;
export const deleteWorkspaceHistoryRecord = databaseApi.deleteWorkspaceHistoryRecord;
export const clearWorkspaceHistory = databaseApi.clearWorkspaceHistory;

export { DATABASE_URL };
