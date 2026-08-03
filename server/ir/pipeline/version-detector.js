/**
 * Extrai versões de tecnologias do texto da tarefa.
 * @param {string} rawText
 * @returns {Record<string, string>}
 */
export function detectVersions(rawText) {
  const versions = {};
  const patterns = [
    /\b(laravel|php|python|node(?:\.?js)?|codeigniter|ci4?)\s*(?:v(?:ersion)?\.?\s*)?(\d+(?:\.\d+)?)\b/gi,
    /\b(html5?)\b/gi,
  ];

  for (const match of rawText.matchAll(patterns[0])) {
    let tech = match[1].toLowerCase().replace(/\./g, "");
    if (tech === "nodejs" || tech === "nodejs") tech = "node";
    if (tech === "ci4" || tech === "ci") tech = "codeigniter";
    versions[tech] = match[2];
  }

  if (/\bhtml5\b/i.test(rawText)) {
    versions.html = "5";
  }

  return versions;
}

/**
 * Extrai versão mencionada em um resultado (título + snippet).
 * @param {string} text
 * @returns {Record<string, string>}
 */
export function extractVersionsFromResult(text) {
  return detectVersions(text);
}

/**
 * @param {Record<string, string>} taskVersions
 * @param {Record<string, string>} resultVersions
 * @returns {boolean}
 */
export function hasVersionMismatch(taskVersions, resultVersions) {
  for (const [tech, taskVer] of Object.entries(taskVersions)) {
    const resultVer = resultVersions[tech];
    if (!resultVer) continue;
    const taskMajor = taskVer.split(".")[0];
    const resultMajor = resultVer.split(".")[0];
    if (taskMajor !== resultMajor) return true;
  }
  return false;
}
