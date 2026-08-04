import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LOGS_DIR = join(__dirname, "..", "..", "logs", "ia");

function carimboArquivo(data = new Date()) {
  const y = data.getFullYear();
  const m = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  const h = String(data.getHours()).padStart(2, "0");
  const min = String(data.getMinutes()).padStart(2, "0");
  const s = String(data.getSeconds()).padStart(2, "0");
  const ms = String(data.getMilliseconds()).padStart(3, "0");
  return `${y}-${m}-${d}_${h}-${min}-${s}-${ms}`;
}

function slug(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "sem-rotulo";
}

/**
 * Persiste prompt + resposta da IA em um JSON indentado por chave:
 * logs/ia/YYYY-MM-DD_HH-mm-ss-ms_tipo_rotulo.json
 * (pasta `logs/` já está no .gitignore).
 *
 * @param {object} entrada
 * @param {"projeto-final"|"projeto-integrado"} entrada.tipo
 * @param {string} entrada.rotulo
 * @param {string} entrada.prompt
 * @param {string} [entrada.resposta]
 * @param {object} [entrada.dados]
 * @param {string} [entrada.modelo]
 * @param {boolean} [entrada.ok]
 * @param {string} [entrada.erro]
 * @param {object[]} [entrada.tentativas]
 * @param {object} [entrada.meta]
 */
export async function registrarLogIa(entrada) {
  try {
    await mkdir(LOGS_DIR, { recursive: true });
    const agora = new Date();
    const registro = {
      em: agora.toISOString(),
      tipo: entrada.tipo || "desconhecido",
      rotulo: entrada.rotulo || "",
      modelo: entrada.modelo || null,
      ok: Boolean(entrada.ok),
      prompt: entrada.prompt ?? "",
      resposta: entrada.resposta ?? null,
      dados: entrada.dados ?? null,
      erro: entrada.erro || null,
      tentativas: entrada.tentativas ?? null,
      meta: entrada.meta ?? null,
    };

    const nome = `${carimboArquivo(agora)}_${slug(registro.tipo)}_${slug(registro.rotulo)}.json`;
    const arquivo = join(LOGS_DIR, nome);
    await writeFile(arquivo, `${JSON.stringify(registro, null, 2)}\n`, "utf-8");
  } catch (erro) {
    console.error("[log-ia] falha ao gravar log:", erro?.message || erro);
  }
}
