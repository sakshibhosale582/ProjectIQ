'use strict';
/**
 * AI narration layer. The static scanner (services/scanner.js) decides WHAT exists in the
 * repository; this layer only explains it. It never produces scores, module lists or file
 * paths - those always come from the scanner. If AI is unavailable the upload still succeeds
 * with a static description (analysis.mode = 'static').
 */
const { generateJSONContentWithFallback } = require('../utils/aiService');
const { isTestFile, baseName } = require('./scanner');

const MAX_MODULE_PROMPTS = 8;
const MODULE_FILE_SAMPLE = 3;
const SNIPPET_CHARS = 1800;

const runPool = async (items, limit, worker) => {
  const results = new Array(items.length);
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
};

const headLines = (text, n) => (text || '').split('\n').slice(0, n).join('\n');

const staticDescription = (analysis) => {
  const a = analysis.architecture;
  return `${a.type}. ${analysis.techStack.slice(0, 6).join(', ')}. ` +
    `${analysis.sourceFiles} source files, ${analysis.linesOfCode.toLocaleString('en-US')} lines of code, ` +
    `${analysis.apiEndpointsCount} API endpoint(s), ${analysis.modules.length} module group(s).`;
};

const pickImportantFiles = (analysis, fileMap, count = 6) => {
  const picks = [];
  for (const f of analysis.rankedFiles) {
    if (picks.length >= count) break;
    if (isTestFile(f.path) || baseName(f.path).toLowerCase() === 'package.json') continue;
    picks.push(f.path);
  }
  return picks.map(p => ({ path: p, code: headLines(fileMap[p], 60) }));
};

const summarizeModule = async (mod, analysis, fileMap) => {
  const ranked = analysis.rankedFiles.filter(f => mod.files.includes(f.path)).slice(0, MODULE_FILE_SAMPLE);
  const sample = ranked.map(f => `--- FILE: ${f.path} (${f.lines} lines) ---\n${(fileMap[f.path] || '').slice(0, SNIPPET_CHARS)}`).join('\n\n');
  const prompt = `
You are explaining one module of a student's software project for interview preparation.
Use ONLY the facts and code below. Do not invent files, libraries, features or endpoints.

MODULE: ${mod.name} (category: ${mod.category})
FILES (${mod.files.length}): ${mod.files.slice(0, 30).join(', ')}
IMPORTS BETWEEN MODULES (observed): ${mod.connections.join(' | ')}
EXTERNAL PACKAGES USED: ${(mod.dependencies || []).join(', ') || 'none detected'}

SAMPLE CODE:
${sample || '(no readable source for this module)'}

Return pure JSON (no markdown):
{ "explanation": "3-4 sentence student-friendly explanation of what this module does in THIS project and how it works",
  "classesOrComponents": ["up to 8 real function/class/component names that appear in the code above"] }`;
  const { data } = await generateJSONContentWithFallback(prompt);
  return {
    explanation: typeof data.explanation === 'string' ? data.explanation : '',
    classesOrComponents: Array.isArray(data.classesOrComponents) ? data.classesOrComponents.filter(x => typeof x === 'string').slice(0, 8) : []
  };
};

/**
 * @returns {{name, description, importantFiles, moduleSummaries, mode, warnings}}
 */
const explainRepository = async ({ analysis, fileMap, fallbackName }) => {
  const warnings = [];
  const important = pickImportantFiles(analysis, fileMap);
  const base = {
    name: fallbackName,
    description: staticDescription(analysis),
    importantFiles: important.map(f => ({
      name: f.path, purpose: 'Key source file',
      explanation: `Ranked as one of the most important files by size, role and how many other files import it.`,
      code: f.code
    })),
    moduleSummaries: {},
    mode: 'static',
    warnings
  };

  if (!process.env.GEMINI_API_KEY) {
    warnings.push('GEMINI_API_KEY is not configured: showing static analysis only (no AI explanations).');
    return base;
  }

  try {
    // MAP: module-wise summaries (each module sees its own most important files)
    const modules = [...analysis.modules].sort((a, b) => b.files.length - a.files.length).slice(0, MAX_MODULE_PROMPTS);
    const summaries = await runPool(modules, 3, async (mod) => {
      try { return await summarizeModule(mod, analysis, fileMap); }
      catch (e) { warnings.push(`AI summary skipped for module "${mod.name}": ${e.message}`); return null; }
    });
    modules.forEach((m, i) => { if (summaries[i] && summaries[i].explanation) base.moduleSummaries[m.name] = summaries[i]; });

    // REDUCE: final description from complete-repository facts + module summaries
    const readme = Object.keys(fileMap).find(k => /^readme(\.md|\.txt)?$/i.test(baseName(k)));
    const moduleLines = analysis.modules.map(m => `- ${m.name} [${m.category}]: ${m.files.length} files. ${(base.moduleSummaries[m.name] || {}).explanation || m.purpose}`).join('\n');
    const prompt = `
You are a Lead Software Architect. A static analyzer scanned the COMPLETE repository (not a sample) and extracted facts.
Use ONLY this information. Do not invent files, APIs, libraries, databases or features. Do NOT output any numeric scores.

FACTS
- Files: ${analysis.totalFiles} total, ${analysis.sourceFiles} source files, ${analysis.linesOfCode} lines of code
- Languages (file counts): ${JSON.stringify(analysis.languageDistribution)}
- Tech: ${analysis.techStack.join(', ')}
- Architecture: ${analysis.architecture.summary}
- Endpoints (${analysis.apiEndpointsCount}): ${analysis.endpointRoutes.slice(0, 25).map(e => `${e.method} ${e.path}`).join(', ')}
- Database: ${JSON.stringify(analysis.databaseInfo)}
- Key dependencies: ${analysis.dependencies.slice(0, 40).join(', ')}

MODULES
${moduleLines}

README (start): ${readme ? fileMap[readme].slice(0, 1500) : '(no README)'}

IMPORTANT FILES (real code, start of file):
${important.map(f => `--- ${f.path} ---\n${f.code.slice(0, 1500)}`).join('\n\n')}

Return pure JSON (no markdown):
{ "name": "clean project name",
  "description": "2-3 sentences: what the project is and does, based only on the facts",
  "importantFiles": [ { "name": "<one of the file paths above, exactly>", "purpose": "1-5 words", "explanation": "a paragraph on what this file does in the architecture" } ] }`;
    const { data } = await generateJSONContentWithFallback(prompt);

    if (typeof data.name === 'string' && data.name.trim()) base.name = data.name.trim().slice(0, 80);
    if (typeof data.description === 'string' && data.description.trim()) base.description = data.description.trim();
    if (Array.isArray(data.importantFiles)) {
      const byPath = Object.fromEntries(important.map(f => [f.path, f]));
      const merged = data.importantFiles
        .filter(f => f && byPath[f.name]) // AI may not invent paths
        .map(f => ({ name: f.name, purpose: String(f.purpose || 'Key source file').slice(0, 60), explanation: String(f.explanation || ''), code: byPath[f.name].code }))
        .filter(f => f.explanation);
      if (merged.length) base.importantFiles = merged;
    }
    base.mode = 'ai';
  } catch (err) {
    warnings.push(`AI narration failed (${err.message}). Showing static analysis only.`);
  }
  return base;
};

module.exports = { explainRepository, pickImportantFiles, staticDescription };
