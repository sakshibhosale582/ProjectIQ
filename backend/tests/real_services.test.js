// Tests that import the REAL production modules (no re-implemented logic).
const { describe, it } = require('node:test');
const assert = require('node:assert');
const AdmZip = require('adm-zip');
const fs = require('fs');
const os = require('os');
const path = require('path');

const scanner = require('../services/scanner');
const { readArchive, validateEntryName, hasTraversalSegment, ZipValidationError } = require('../services/zipReader');
const quiz = require('../services/quiz');
const { EMAIL_REGEX, normalizeEmail } = require('../controllers/authController');

const fixture = {
  'app/package.json': JSON.stringify({ dependencies: { express: '^4', mongoose: '^8', react: '^18' } }),
  'app/server.js': "const express = require('express');\nconst app = express();\napp.use('/api/users', require('./routes/users'));\napp.listen(3000);\n",
  'app/routes/users.js': "const router = require('express').Router();\nconst { list } = require('../controllers/userController');\nrouter.get('/', list);\nrouter.post('/new', list);\nmodule.exports = router;\n",
  'app/controllers/userController.js': "const User = require('../models/User');\nexports.list = async (req, res) => { try { res.json(await User.find()); } catch (e) {} };\nconsole.log('a');\nconsole.log('b');\n",
  'app/models/User.js': "const mongoose = require('mongoose');\nmodule.exports = mongoose.model('User', new mongoose.Schema({ name: String }));\n",
  'app/middleware/auth.js': "module.exports = (req, res, next) => next();\n",
  'app/src/App.jsx': "import React from 'react';\nexport default function App(){ fetch('/api/users'); return <div/>; }\n",
  'app/README.md': '# readme'
};

const paths = Object.keys(fixture);
const analysis = scanner.analyzeProject(fixture, paths, { secretFiles: ['app/.env'] });

describe('scanner.analyzeProject (real module)', () => {
  it('resolves relative imports to real files only', () => {
    const edges = analysis.dependencyGraph.map(e => `${e.from}>${e.to}`);
    assert.ok(edges.includes('app/routes/users.js>app/controllers/userController.js'));
    assert.ok(edges.includes('app/controllers/userController.js>app/models/User.js'));
    assert.ok(analysis.dependencyGraph.every(e => paths.includes(e.to)), 'no edge points at a non-existent file');
  });

  it('tags every module with a category and real files', () => {
    assert.ok(analysis.modules.length > 0);
    for (const m of analysis.modules) {
      assert.ok(m.category, `module ${m.name} has a category`);
      assert.ok(m.files.length > 0);
    }
    const cats = analysis.modules.map(m => m.category);
    for (const c of ['controllers', 'models', 'routes', 'middleware', 'ui']) assert.ok(cats.includes(c), c);
  });

  it('derives architecture from real edges (not hardcoded)', () => {
    const arch = analysis.architecture;
    assert.match(arch.type, /Full-stack/);
    assert.ok(arch.edges.some(e => e.from === 'controllers' && e.to === 'models'));
    assert.ok(arch.edges.some(e => e.kind === 'http'), 'UI fetch -> API edge');
    assert.ok(arch.edges.some(e => e.to === 'database' && e.kind === 'persists'));
    assert.ok(!arch.layers.some(l => l.key === 'services'), 'does not invent a services layer');
  });

  it('applies mount prefixes to endpoints', () => {
    const e = analysis.endpointRoutes.map(r => `${r.method} ${r.path}`);
    assert.ok(e.includes('GET /api/users'));
    assert.ok(e.includes('POST /api/users/new'));
  });

  it('reports secret files without reading them, and flags empty catch', () => {
    assert.ok(analysis.securityFindings.some(f => f.title.includes('Secret / credential file') && f.filePath === 'app/.env'));
    assert.ok(analysis.codeIssues.some(i => i.issueType === 'Empty Catch Block' && i.filePath.endsWith('userController.js')));
  });

  it('does not cap findings at 15/20', () => {
    const many = {};
    for (let i = 0; i < 60; i++) many[`src/f${i}.js`] = `console.log(${i});\ntry { x(); } catch (e) {}\n`;
    const r = scanner.analyzeProject(many, Object.keys(many));
    assert.ok(r.codeIssues.length > 100, `got ${r.codeIssues.length}`);
    assert.strictEqual(r.codeIssuesTotal, r.codeIssues.length);
  });

  it('buildTree keeps all top-level entries', () => {
    const tree = scanner.buildTree(['a.js', 'src/b.js']);
    assert.strictEqual(tree.synthetic, true);
    assert.strictEqual(tree.children.length, 2);
  });

  it('isSecretFile', () => {
    assert.ok(scanner.isSecretFile('x/.env'));
    assert.ok(scanner.isSecretFile('x/.env.production'));
    assert.ok(!scanner.isSecretFile('x/.env.example'));
    assert.ok(scanner.isSecretFile('keys/server.pem'));
    assert.ok(!scanner.isSecretFile('src/tokenUtils.js'));
  });
});

describe('zipReader (real module)', () => {
  it('rejects traversal but allows file names containing two dots', () => {
    assert.strictEqual(hasTraversalSegment('a..b.js'), false);
    assert.strictEqual(hasTraversalSegment('../x'), true);
    assert.strictEqual(hasTraversalSegment('a\\..\\b'), true);
    assert.throws(() => validateEntryName('../../etc/passwd'), ZipValidationError);
    assert.throws(() => validateEntryName('C:\\Windows\\win.ini'), ZipValidationError);
    assert.throws(() => validateEntryName('/etc/passwd'), ZipValidationError);
    assert.doesNotThrow(() => validateEntryName('src/notes..v2.js'));
  });

  it('reads all files, reports secrets and skips ignored dirs', () => {
    const zip = new AdmZip();
    zip.addFile('p/index.js', Buffer.from('console.log(1)'));
    zip.addFile('p/.env', Buffer.from('KEY=secret-value'));
    zip.addFile('p/node_modules/x/index.js', Buffer.from('x'));
    zip.addFile('p/img.png', Buffer.from([0, 1, 2]));
    const file = path.join(os.tmpdir(), `piq-${Date.now()}.zip`);
    fs.writeFileSync(file, zip.toBuffer());
    try {
      const r = readArchive(file);
      assert.deepStrictEqual(r.allPaths, ['p/index.js']);
      assert.deepStrictEqual(r.secretPaths, ['p/.env']);
      assert.ok(!Object.values(r.fileMap).some(c => c.includes('secret-value')));
    } finally { fs.unlinkSync(file); }
  });

  it('rejects an archive with a traversal entry', () => {
    const zip = new AdmZip();
    zip.addFile('ok.js', Buffer.from('1'));
    zip.addFile('evil.js', Buffer.from('2'));
    zip.getEntries().find(e => e.entryName === 'evil.js').entryName = '../evil.js'; // adm-zip sanitises names in addFile()
    const file = path.join(os.tmpdir(), `piq-evil-${Date.now()}.zip`);
    fs.writeFileSync(file, zip.toBuffer());
    try { assert.throws(() => readArchive(file), ZipValidationError); } finally { fs.unlinkSync(file); }
  });
});

describe('quiz service (real module)', () => {
  const longController = [
    "const express = require('express');",
    "const router = express.Router();",
    "const User = require('../models/User');",
    "router.get('/profile', async (req, res) => {",
    "  try {",
    "    const user = await User.findOne({ _id: req.user.id });",
    "    if (!user) return res.status(404).json({ message: 'missing' });",
    "    res.json(user);",
    "  } catch (err) {",
    "    res.status(500).json({ message: err.message });",
    "  }",
    "});",
    "router.post('/login', async (req, res) => { res.json({}); });",
    "module.exports = router;"
  ].join('\n');
  const files = [
    ...Object.entries(fixture).map(([p, content]) => ({ path: p, content, importance: 10 })),
    { path: 'app/routes/profile.js', content: longController, importance: 50 },
    { path: 'app/routes/other.js', content: longController.replace('/profile', '/me'), importance: 40 }
  ];
  const project = { name: 'T', techStack: ['Express'], endpointRoutes: analysis.endpointRoutes };

  it('builds code-grounded static questions with file + line info', async () => {
    const built = await quiz.buildQuizQuestions({ project, files, difficulty: 'Easy', count: 5, useAI: false });
    assert.ok(built.questions.length > 0);
    for (const q of built.questions) {
      assert.ok(q.file && q.startLine && q.code);
      assert.strictEqual(q.options.length, 4);
      assert.strictEqual(new Set(q.options).size, 4);
      assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    }
  });

  it('public questions never expose the answer key', async () => {
    const built = await quiz.buildQuizQuestions({ project, files, difficulty: 'Easy', count: 5, useAI: false });
    const json = JSON.stringify(built.questions.map(quiz.toPublicQuestion));
    assert.ok(!/correct|explanation/i.test(json));
  });

  it('grades on the server and ignores invalid answers', () => {
    const qs = [
      { qid: 'q1', question: 'a', options: ['1', '2', '3', '4'], correctIndex: 2, explanation: 'x', file: 'f', startLine: 1, endLine: 2, code: '' },
      { qid: 'q2', question: 'b', options: ['1', '2', '3', '4'], correctIndex: 0, explanation: 'y', file: 'f', startLine: 3, endLine: 4, code: '' }
    ];
    assert.strictEqual(quiz.gradeQuiz(qs, [2, 0]).score, 2);
    assert.strictEqual(quiz.gradeQuiz(qs, [2, 9]).score, 1);
    assert.strictEqual(quiz.gradeQuiz(qs, ['2', null]).score, 0);
    assert.strictEqual(quiz.gradeQuiz(qs, undefined).score, 0);
  });

  it('shuffling options keeps the correct answer correct', () => {
    for (let i = 0; i < 50; i++) {
      const q = quiz.shuffleOptions({ options: ['A', 'B', 'C', 'D'], correctIndex: 1 });
      assert.strictEqual(q.options[q.correctIndex], 'B');
    }
  });
});

describe('auth helpers (real module)', () => {
  it('accepts modern TLDs and rejects malformed emails', () => {
    for (const ok of ['a@b.tech', 'x.y@z.info', 'me@site.online', 'a@b.co.in']) assert.ok(EMAIL_REGEX.test(ok), ok);
    for (const bad of ['a@b', 'a b@c.com', '@x.com', 'a@.com']) assert.ok(!EMAIL_REGEX.test(bad), bad);
    assert.strictEqual(normalizeEmail('  Dev@Example.COM '), 'dev@example.com');
    assert.strictEqual(normalizeEmail({ $ne: null }), '');
  });
});

describe('rag keyword search (real module)', () => {
  const { keywordSearch, tokenize, classifyEmbedError } = require('../services/rag');
  const chunks = [
    { filePath: 'src/controllers/authController.js', content: 'const jwt = require("jsonwebtoken");\nfunction loginUser(req,res){ const token = jwt.sign({id:user.id}, process.env.JWT_SECRET); }', startLine: 1, endLine: 2 },
    { filePath: 'src/models/Project.js', content: 'const ProjectSchema = new mongoose.Schema({ name: String, techStack: [String] });', startLine: 1, endLine: 1 },
    { filePath: 'src/pages/Dashboard.jsx', content: 'export default function Dashboard(){ return <div>readiness chart</div>; }', startLine: 1, endLine: 1 }
  ];

  it('finds the relevant chunk for a natural-language question', () => {
    assert.strictEqual(keywordSearch(chunks, 'how does login and jwt token work?', 2)[0].filePath, 'src/controllers/authController.js');
    assert.strictEqual(keywordSearch(chunks, 'what is the project schema?', 2)[0].filePath, 'src/models/Project.js');
  });

  it('matches camelCase names and file paths', () => {
    assert.ok(tokenize('authController').includes('auth'));
    assert.strictEqual(keywordSearch(chunks, 'dashboard', 1)[0].filePath, 'src/pages/Dashboard.jsx');
  });

  it('does not crash on empty input', () => {
    assert.strictEqual(keywordSearch([], 'x', 3).length, 0);
    assert.ok(Array.isArray(keywordSearch(chunks, '???', 3)));
  });

  it('classifies Gemini errors', () => {
    assert.strictEqual(classifyEmbedError(new Error('[429 Too Many Requests] You exceeded your current quota')), 'quota');
    assert.strictEqual(classifyEmbedError(new Error('API key not valid. Please pass a valid API key.')), 'auth');
    assert.strictEqual(classifyEmbedError(new Error('fetch failed')), 'other');
  });
});
