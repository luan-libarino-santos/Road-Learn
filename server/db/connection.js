import Database from "better-sqlite3";
import { mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DB_PATH = join(__dirname, "..", "..", "data", "road-learn.db");
const SCHEMA_PATH = join(__dirname, "schema.sql");

let db = null;

function identidadePadraoJson() {
  return JSON.stringify({
    nomeExibicao: "",
    icone: "iniciais",
    cor: "#a8b4c4",
  });
}

function temaPadraoJson() {
  return JSON.stringify({
    preset: "midnight",
    custom: {
      accent: null,
      bgApp: null,
      bgElevated: null,
      bgSurface: null,
      radius: null,
      backgroundMode: "solid",
      bgGradientTo: null,
    },
  });
}

export function getDb() {
  if (db) return db;

  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  const schema = readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);

  const perfil = db.prepare("SELECT id FROM perfil WHERE id = 1").get();
  if (!perfil) {
    db.prepare(
      `INSERT INTO perfil (id, xp, atualizado_em, identidade_json, tema_json)
       VALUES (1, 0, ?, ?, ?)`
    ).run(new Date().toISOString(), identidadePadraoJson(), temaPadraoJson());
  }

  return db;
}

export function initDb() {
  return getDb();
}

export function withTransaction(fn) {
  const database = getDb();
  const run = database.transaction(fn);
  return run();
}
