'use strict';
/**
 * ProjectIQ repository scanner.
 *
 * Pure (no network / DB) static analysis of an uploaded project. Every number and
 * every module/architecture fact produced here is derived from the real files in the
 * uploaded archive. AI is only used afterwards (services/aiAnalysis.js) to *explain*
 * what this scanner found.
 */
const path = require('path');

const IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', '.git', 'venv', '.venv', '__pycache__', '.next',
  'out', 'target', 'coverage', '.idea', '.vscode', 'vendor', '.cache', '.gradle'
]);

const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'ico', 'webp', 'pdf', 'zip', 'tar', 'gz', 'rar',
  'mp4', 'mov', 'avi', 'mkv', 'mp3', 'wav', 'exe', 'dll', 'so', 'bin', 'dmg', 'class',
  'jar', 'war', 'db', 'sqlite', 'log', 'woff', 'woff2', 'ttf', 'eot', 'map', 'lock'
]);

const LANGUAGE_BY_EXT = {
  js: 'JavaScript', mjs: 'JavaScript', cjs: 'JavaScript', jsx: 'React JSX',
  ts: 'TypeScript', tsx: 'React TSX', py: 'Python', go: 'Go', java: 'Java', kt: 'Kotlin',
  php: 'PHP', cs: 'C#', rs: 'Rust', rb: 'Ruby', swift: 'Swift', dart: 'Dart',
  cpp: 'C++', cc: 'C++', c: 'C', h: 'C/C++ Header', html: 'HTML', css: 'CSS', sql: 'SQL',
  vue: 'Vue', svelte: 'Svelte'
};

const MANIFESTS = ['package.json', 'requirements.txt', 'pom.xml', 'cargo.toml', 'composer.json', 'go.mod'];

const SEVERITY_RANK = { High: 0, Medium: 1, Low: 2 };

const segments = (p) => p.split('/').filter(Boolean);
const baseName = (p) => segments(p).pop() || '';
const extOf = (p) => {
  const b = baseName(p);
  return b.includes('.') ? b.split('.').pop().toLowerCase() : '';
};

/** Files that must never be read or sent to an AI (but their *presence* is reported). */
const isSecretFile = (p) => {
  const b = baseName(p).toLowerCase();
  if (/^\.env(\..+)?$/.test(b) || b === 'config.env') {
    return !/(example|sample|template|dist)$/.test(b);
  }
  if (/\.(pem|key|crt|cer|pfx|p12)$/.test(b)) return true;
  if (['id_rsa', 'id_dsa', 'id_ed25519', '.passwd', 'credentials.json', 'secrets.json', 'secrets.yml', 'secrets.yaml'].includes(b)) return true;
  return false;
};

const isIgnoredPath = (p) => segments(p).slice(0, -1).some(s => IGNORED_DIRS.has(s.toLowerCase()));

/** Kept for backward compatibility with the old route code. */
const isSensitiveOrBinary = (p) => {
  if (isSecretFile(p)) return true;
  if (isIgnoredPath(p)) return true;
  return BINARY_EXTENSIONS.has(extOf(p));
};

/** Files whose text we read and analyse. */
const isReadableSource = (p) => {
  if (isSensitiveOrBinary(p)) return false;
  const b = baseName(p).toLowerCase();
  if (b.endsWith('.min.js') || b === 'package-lock.json' || b === 'yarn.lock' || b === 'pnpm-lock.yaml') return false;
  if (MANIFESTS.includes(b)) return true;
  if (/^readme(\.md|\.txt)?$/.test(b)) return true;
  return Boolean(LANGUAGE_BY_EXT[extOf(p)]);
};

const isTestFile = (p) => /(\.test\.|\.spec\.|__tests__|\/tests?\/|\/__mocks__\/)/i.test(p);


// ---- Moved verbatim from routes/projects.js (existing, working detectors) ----
const getFilePriority = (fileName) => {
  const name = fileName.toLowerCase();
  
  if (name.endsWith('package.json') || name.endsWith('requirements.txt') || name.endsWith('pom.xml') || name.endsWith('cargo.toml')) {
    return 100;
  }
  if (name.includes('readme.md') || name.includes('readme.txt')) {
    return 90;
  }
  const entryNames = ['app.js', 'server.js', 'index.js', 'main.py', 'index.ts', 'main.go', 'index.jsx', 'index.tsx'];
  if (entryNames.some(e => name.endsWith(e))) {
    return 80;
  }
  if (name.includes('/routes/') || name.includes('/routing/') || name.includes('route')) {
    return 70;
  }
  if (name.includes('/controllers/') || name.includes('controller')) {
    return 60;
  }
  if (name.includes('/services/') || name.includes('service')) {
    return 50;
  }
  if (name.includes('/models/') || name.includes('model') || name.includes('/schema/') || name.includes('schema')) {
    return 40;
  }
  if (name.includes('/middleware/') || name.includes('middleware')) {
    return 30;
  }
  if (name.includes('/config/') || name.includes('config') || name.endsWith('.env.example')) {
    return 20;
  }
  return 10;
};

const buildTree = (paths) => {
  const root = { name: '(root)', type: 'directory', synthetic: true, children: [] };
  paths.forEach(p => {
    const parts = p.split('/').filter(x => x);
    let current = root;
    parts.forEach((part, i) => {
      const isFile = i === parts.length - 1 && !p.endsWith('/');
      let existing = current.children.find(c => c.name === part);
      if (!existing) {
        existing = { name: part, type: isFile ? 'file' : 'directory' };
        if (!isFile) existing.children = [];
        current.children.push(existing);
      }
      current = existing;
    });
  });
  // A single wrapper folder becomes the root; several top-level entries keep a synthetic root so nothing is dropped
  return root.children.length === 1 ? root.children[0] : root;
};

const createChunks = (content, filePath) => {
  const lines = content.split('\n');
  const chunks = [];
  const chunkSize = 40;
  const overlap = 10;
  
  for (let i = 0; i < lines.length; i += (chunkSize - overlap)) {
    const chunkLines = lines.slice(i, i + chunkSize);
    chunks.push(chunkLines.join('\n'));
    if (i + chunkSize >= lines.length) break;
  }
  return chunks;
};

const cosineSimilarity = (vecA, vecB) => {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};

const detectSecurityFindings = (fileContentsMap = {}, endpointRoutes = [], dependencies = []) => {
  const findings = [];

  // 1. Hardcoded Secrets Check (API keys, JWT secrets, passwords, URIs)
  const secretRegex = /(api_key|jwt_secret|password|client_secret|client_id|private_key|token|mongo_uri|secret_key)\s*[:=]\s*['"`]([a-zA-Z0-9_\-\.\:\/@]{8,})['"`]/i;

  // 2. Sensitive Data Exposure in console logs or stdout
  const sensitiveLogRegex = /console\.(log|info|warn|error)\s*\([^)]*(password|token|secret|credential|auth_header|jwt)[^)]*\)/i;
  const sensitivePrintRegex = /print\s*\([^)]*(password|token|secret|credential|api_key)[^)]*\)/i;

  // 3. Unsafe Configuration (Wildcard CORS, debug flags, SSL disabled)
  const corsWildcardRegex = /cors\s*\(\s*\{\s*origin\s*:\s*['"`]\*['"`]/i;
  const debugActiveRegex = /(DEBUG\s*=\s*True|app\.run\s*\([^)]*debug\s*=\s*True)/;
  const sslDisabledRegex = /rejectUnauthorized\s*:\s*false/i;

  // 4. Insecure Auth: Plain-text password comparison
  const plainPasswordCheckRegex = /if\s*\([^)]*password\s*===/i;

  Object.keys(fileContentsMap).forEach(filePath => {
    if (isTestFile(filePath)) return;
    const content = fileContentsMap[filePath] || '';
    const lines = content.split('\n');

    lines.forEach((lineText, idx) => {
      const lineNum = idx + 1;
      // ignore string literals so that `console.log('Token expired')` is not reported
      const codeOnly = lineText.replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');

      // Category: Hardcoded Secrets
      if (secretRegex.test(lineText)) {
        // Exclude test mocks and example placeholder comments
        const isTest = filePath.toLowerCase().includes('.test.') || filePath.toLowerCase().includes('.spec.');
        const isPlaceholder = lineText.includes('your-secret') || lineText.includes('example') || lineText.includes('placeholder');
        if (!isTest && !isPlaceholder) {
          findings.push({
            title: 'Hardcoded Secret / Credential',
            category: 'Hardcoded Secrets',
            severity: 'High',
            filePath,
            line: lineNum,
            codeSnippet: lineText.trim().slice(0, 100),
            explanation: `Potential plain-text secret or credential parameter assigned directly in source code.`,
            remediation: `Store secrets in environment variables (.env) and access via process.env instead of hardcoding.`
          });
        }
      }

      // Category: Sensitive Data Exposure
      if (sensitiveLogRegex.test(codeOnly) || sensitivePrintRegex.test(codeOnly)) {
        findings.push({
          title: 'Sensitive Credential Logged to Output',
          category: 'Sensitive Data Exposure',
          severity: 'Medium',
          filePath,
          line: lineNum,
          codeSnippet: lineText.trim().slice(0, 100),
          explanation: `Logging sensitive authentication tokens or passwords into console logs can expose credentials in persistent server logs.`,
          remediation: `Remove or sanitize logging of credentials, authorization tokens, and user secrets.`
        });
      }

      // Category: Unsafe Configuration
      if (corsWildcardRegex.test(lineText)) {
        findings.push({
          title: 'Wildcard CORS Origin Configured',
          category: 'Unsafe Configuration',
          severity: 'Medium',
          filePath,
          line: lineNum,
          codeSnippet: lineText.trim().slice(0, 100),
          explanation: `CORS configuration uses a wildcard ('*') which allows any third-party domain to make requests to your API.`,
          remediation: `Specify explicit allowed origins or use environment variables to configure authorized domains.`
        });
      }

      if (debugActiveRegex.test(lineText)) {
        findings.push({
          title: 'Debug Mode Enabled in Runtime Configuration',
          category: 'Unsafe Configuration',
          severity: 'Medium',
          filePath,
          line: lineNum,
          codeSnippet: lineText.trim().slice(0, 100),
          explanation: `Debug mode exposes interactive debuggers, stack traces, and internal server paths to end users if deployed.`,
          remediation: `Disable debug mode in production or load the debug setting from environment variables.`
        });
      }

      if (sslDisabledRegex.test(lineText)) {
        findings.push({
          title: 'SSL / TLS Certificate Validation Disabled',
          category: 'Unsafe Configuration',
          severity: 'High',
          filePath,
          line: lineNum,
          codeSnippet: lineText.trim().slice(0, 100),
          explanation: `rejectUnauthorized is set to false, which bypasses SSL certificate verification and makes requests vulnerable to MITM attacks.`,
          remediation: `Ensure SSL certificate validation is enforced by setting rejectUnauthorized to true.`
        });
      }

      // Category: Authentication / Authorization
      if (plainPasswordCheckRegex.test(lineText)) {
        findings.push({
          title: 'Insecure Plain-Text Password Comparison',
          category: 'Authentication / Authorization',
          severity: 'High',
          filePath,
          line: lineNum,
          codeSnippet: lineText.trim().slice(0, 100),
          explanation: `Comparing passwords using equality operators (===) indicates plain-text storage and lack of cryptographically secure hash comparison.`,
          remediation: `Hash passwords with bcrypt/argon2 and compare using secure timing-safe functions like bcrypt.compare().`
        });
      }
    });
  });

  // Category: Dependency Risks
  const pkgFile = Object.keys(fileContentsMap).find(k => k.endsWith('package.json'));
  if (pkgFile) {
    try {
      const pkg = JSON.parse(fileContentsMap[pkgFile]);
      const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
      Object.entries(allDeps).forEach(([depName, ver]) => {
        if (ver === '*' || ver === 'latest') {
          findings.push({
            title: `Unpinned Dependency Version: ${depName}`,
            category: 'Dependency Risks',
            severity: 'Low',
            filePath: pkgFile,
            line: 1,
            codeSnippet: `"${depName}": "${ver}"`,
            explanation: `Using wildcard or 'latest' dependency version introduces instability and risk from unvetted upstream updates.`,
            remediation: `Specify explicit semver ranges or pin to a known stable release.`
          });
        }
      });
    } catch (e) {}
  }

  return findings;
};

const detectProjectModules = (fileContentsMap = {}, filePaths = [], dependencyGraph = [], techStack = [], globalDependencies = []) => {
  const detectedModules = [];
  const processedFiles = new Set();

  // Helper to extract classes/components and primary functions from file contents
  const extractClassesAndExports = (filesList) => {
    const symbols = new Set();
    filesList.forEach(fp => {
      const code = fileContentsMap[fp] || '';
      if (!code) return;
      // Class declarations
      const classRegex = /class\s+([A-Z][a-zA-Z0-9_]+)/g;
      let m;
      while ((m = classRegex.exec(code)) !== null) {
        symbols.add(m[1]);
      }
      // React components / functions
      const compRegex = /(?:export\s+(?:default\s+)?(?:function|const)\s+([A-Z][a-zA-Z0-9_]+))/g;
      while ((m = compRegex.exec(code)) !== null) {
        symbols.add(m[1]);
      }
      // Regular exported functions / routers
      const fnRegex = /(?:exports\.([a-zA-Z0-9_]+)\s*=|const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s*)?\()/g;
      while ((m = fnRegex.exec(code)) !== null) {
        const fnName = m[1] || m[2];
        if (fnName && !['req', 'res', 'next', 'error', 'err', 'require', 'router'].includes(fnName)) {
          symbols.add(fnName);
        }
      }
    });
    return Array.from(symbols).slice(0, 8);
  };

  // Helper to find specific package dependencies used by a set of files
  const extractFileDependencies = (filesList) => {
    const deps = new Set();
    filesList.forEach(fp => {
      const code = fileContentsMap[fp] || '';
      if (!code) return;
      globalDependencies.forEach(dep => {
        if (code.includes(`'${dep}'`) || code.includes(`"${dep}"`) || code.includes(`from '${dep}'`) || code.includes(`require('${dep}')`)) {
          deps.add(dep);
        }
      });
    });
    return Array.from(deps);
  };

  // Architectural category definitions
  const categories = [
    {
      key: 'controllers',
      name: 'API Controllers & Request Handlers',
      match: (p) => /controller/i.test(p) || (/\/handlers?\//i.test(p) && !/\/middleware/i.test(p)),
      purpose: 'Processes incoming HTTP requests, performs input parameter validation, orchestrates domain logic, and serializes response payloads.',
      techs: techStack.filter(t => ['Express', 'Node.js', 'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Laravel', 'Go', 'PHP'].includes(t)),
      defaultConnections: ['Called by API Routing module to handle endpoint requests', 'Queries Data Models to fetch and persist data', 'Uses Middleware for authentication and validation'],
      explanation: 'In a technical interview, describe this as the controller/handler layer in MVC or layered architectures. It keeps HTTP-specific logic (status codes, headers, body parsing) isolated from persistence and UI logic.'
    },
    {
      key: 'models',
      name: 'Data Models & Persistence Layer',
      match: (p) => /models?\//i.test(p) || /schemas?\//i.test(p) || /entities?\//i.test(p) || /_model\./i.test(p),
      purpose: 'Encapsulates database schemas, document definitions, validation rules, indexing structures, and relational entity mappings.',
      techs: techStack.filter(t => ['MongoDB', 'Mongoose', 'PostgreSQL', 'MySQL', 'Prisma', 'Sequelize', 'SQL', 'Hibernate'].includes(t)),
      defaultConnections: ['Queried by API Controllers and Service layers', 'Communicates with database engine for CRUD transactions', 'Enforces schema validation rules on data entry'],
      explanation: 'In interviews, explain this as the single source of truth for your application entities. It guarantees type safety, data integrity, and separates database querying from presentation logic.'
    },
    {
      key: 'routes',
      name: 'Routing & Endpoint Dispatchers',
      match: (p) => /routes?\//i.test(p) || /routing\//i.test(p) || /urls\.py/i.test(p) || /router\./i.test(p),
      purpose: 'Registers REST endpoints and URI patterns, mapping incoming HTTP methods (GET, POST, PUT, DELETE) to specific controller actions.',
      techs: techStack.filter(t => ['Express', 'Django', 'FastAPI', 'Flask', 'Spring Boot', 'Laravel', 'Go'].includes(t)),
      defaultConnections: ['Receives incoming client HTTP traffic', 'Attaches Middleware security guards (JWT, CORS, rate limits)', 'Dispatches validated requests to API Controllers'],
      explanation: 'This module defines the external API contract. Interviewers often ask how routes are structured, versioned, and secured against unauthorized access.'
    },
    {
      key: 'middleware',
      name: 'Middleware & Security Guards',
      match: (p) => /middlewares?\//i.test(p) || /auth\//i.test(p) || /guards?\//i.test(p) || /interceptors?\//i.test(p),
      purpose: 'Intercepts HTTP traffic to enforce JWT authentication, authorization policies, CORS configuration, and centralized error handling.',
      techs: techStack.filter(t => ['JWT', 'Express', 'Node.js', 'Python', 'Spring Boot'].includes(t)),
      defaultConnections: ['Intercepts requests across API Routing endpoints', 'Decodes and verifies user identity tokens (JWT)', 'Catches unhandled errors and formats centralized error responses'],
      explanation: 'Acts as a pipeline filter. Explain to interviewers how this module prevents unauthorized access and stops invalid requests before they reach core business logic.'
    },
    {
      key: 'services',
      name: 'Domain Services & Business Logic',
      match: (p) => /services?\//i.test(p) || /managers?\//i.test(p) || /usecases?\//i.test(p) || /core\//i.test(p),
      purpose: 'Implements core business rules, algorithms, third-party API integrations, and complex transactional workflows.',
      techs: techStack,
      defaultConnections: ['Invoked by API Controllers to execute business operations', 'Queries Data Models for atomic persistence', 'Interacts with external APIs and services'],
      explanation: 'This layer implements pure business rules. Decoupling it from controllers ensures high testability, reuse across multiple endpoints, and clean separation of concerns.'
    },
    {
      key: 'ui',
      name: 'Client Presentation & UI Views',
      match: (p) => /\.(jsx|tsx|vue|svelte)$/i.test(p) || /components?\//i.test(p) || /pages?\//i.test(p) || /views?\//i.test(p) || /screens?\//i.test(p),
      purpose: 'Renders reactive user interfaces, manages component lifecycle and state, captures user interactions, and coordinates API queries.',
      techs: techStack.filter(t => ['React', 'React JSX', 'React TSX', 'Vue', 'Angular', 'Svelte', 'HTML', 'CSS', 'Next.js'].includes(t)),
      defaultConnections: ['Sends asynchronous HTTP requests to backend API Routes', 'Consumes JSON payloads and updates reactive component state', 'Renders interactive user views and form controls'],
      explanation: 'Explain this as the frontend presentation layer. It manages unidirectional data flow, handles user interactions, and consumes backend REST endpoints.'
    },
    {
      key: 'utils',
      name: 'Shared Utilities & Helper Libraries',
      match: (p) => /utils?\//i.test(p) || /helpers?\//i.test(p) || /lib\//i.test(p) || /common\//i.test(p),
      purpose: 'Provides reusable helper routines, string manipulation tools, cryptographic helpers, logging, and mathematical utilities.',
      techs: techStack,
      defaultConnections: ['Imported by Controllers, Middleware, and Services for shared functionality', 'Provides standardized formatting, logging, and token generation'],
      explanation: 'Shared utility modules prevent code duplication (DRY principle). They encapsulate stateless, pure functions that are easily unit-tested.'
    },
    {
      key: 'config',
      name: 'Configuration & Build Setup',
      match: (p) => /config/i.test(p) || /settings\.py/i.test(p) || /vite\.config/i.test(p) || /webpack/i.test(p) || /package\.json/i.test(p),
      purpose: 'Initializes environment variables, database connections, server ports, build bundlers, and package dependencies.',
      techs: techStack,
      defaultConnections: ['Loaded during Application Bootstrap', 'Supplies connection strings and environment keys to Database and Security modules'],
      explanation: 'Centralizing configurations ensures 12-factor application compliance by keeping credentials and environment-specific settings out of source code.'
    },
    {
      key: 'bootstrap',
      name: 'Application Entry & Bootstrap',
      match: (p) => /(server|app|index|main)\.(js|ts|py|go|java)$/i.test(p),
      purpose: 'Serves as the root entry point: bootstraps runtime configurations, registers routes and middlewares, and binds network socket listeners.',
      techs: techStack,
      defaultConnections: ['Initializes and launches the runtime server', 'Mounts API Routing Dispatchers and Middleware guards', 'Establishes database connection pools'],
      explanation: 'The initial bootstrap file executed by the runtime. Explain how it orchestrates dependency injection, middleware registration, and server port binding.'
    }
  ];

  // Group files into categories
  const fileToModuleMap = {};

  categories.forEach(cat => {
    const matchedFiles = filePaths.filter(p => cat.match(p) && !processedFiles.has(p));
    if (matchedFiles.length > 0) {
      matchedFiles.forEach(f => {
        processedFiles.add(f);
        fileToModuleMap[f] = cat.name;
        fileToModuleMap[f.split('/').pop()] = cat.name;
      });

      const classesOrComponents = extractClassesAndExports(matchedFiles);
      const moduleDeps = extractFileDependencies(matchedFiles);

      detectedModules.push({
        name: cat.name,
        category: cat.key,
        type: cat.key,
        purpose: cat.purpose,
        techs: cat.techs.length > 0 ? cat.techs : techStack.slice(0, 3),
        files: matchedFiles,
        dependencies: moduleDeps.length > 0 ? moduleDeps : globalDependencies.slice(0, 4),
        connections: cat.defaultConnections,
        explanation: cat.explanation,
        classesOrComponents
      });
    }
  });

  // Check remaining files - if any folder has 2+ remaining files, create a domain module
  const remainingFiles = filePaths.filter(p => !processedFiles.has(p));
  const folderBuckets = {};
  remainingFiles.forEach(p => {
    const parts = p.split('/');
    if (parts.length > 1) {
      const dirs = parts.slice(0, -1);
      const wrappers = ['src', 'backend', 'server', 'client', 'frontend', 'app', 'api', 'packages'];
      const folder = dirs.length > 1 && wrappers.includes(dirs[0].toLowerCase()) ? dirs[1] : dirs[dirs.length - 1];
      if (!['node_modules', 'dist', 'build', '.git'].includes(folder.toLowerCase())) {
        folderBuckets[folder] = folderBuckets[folder] || [];
        folderBuckets[folder].push(p);
      }
    }
  });

  Object.keys(folderBuckets).forEach(folder => {
    const files = folderBuckets[folder];
    if (files.length >= 2) {
      files.forEach(f => processedFiles.add(f));
      const formattedName = folder.charAt(0).toUpperCase() + folder.slice(1) + (['src','backend','server','client','frontend','app','api','packages'].includes(folder.toLowerCase()) ? ' (root files)' : ' Module');
      detectedModules.push({
        name: formattedName,
        category: folder.toLowerCase(),
        type: folder.toLowerCase(),
        purpose: `Encapsulates ${folder}-related features and functional routines across ${files.length} project files.`,
        techs: techStack.slice(0, 3),
        files,
        dependencies: extractFileDependencies(files),
        connections: [`Interacts with core application modules across ${folder} directory`],
        explanation: `This domain module organizes feature-specific logic within the ${folder} directory, grouping related functions and components together.`,
        classesOrComponents: extractClassesAndExports(files)
      });
    }
  });

  // If still empty or 0 modules found, fallback to entry files grouping
  if (detectedModules.length === 0) {
    const allFiles = filePaths.slice(0, 10);
    detectedModules.push({
      name: 'Core Application Module',
      purpose: `Orchestrates main project logic across ${filePaths.length} scanned repository files.`,
      techs: techStack,
      files: allFiles,
      dependencies: globalDependencies.slice(0, 5),
      connections: ['Manages primary project execution flow and script imports'],
      explanation: 'The primary functional module containing the application entry files and source scripts.',
      classesOrComponents: extractClassesAndExports(allFiles)
    });
  }

  // Enrich connections using dependencyGraph
  detectedModules.forEach(mod => {
    const dynamicConn = [];
    mod.files.forEach(file => {
      const baseName = file.split('/').pop();
      dependencyGraph.forEach(edge => {
        if (edge.from === file || edge.from.endsWith(baseName)) {
          const targetBase = edge.to.split('/').pop();
          const targetModName = fileToModuleMap[edge.to] || fileToModuleMap[targetBase];
          if (targetModName && targetModName !== mod.name) {
            dynamicConn.push(`Imports from ${targetModName} (${targetBase})`);
          }
        }
      });
    });
    if (dynamicConn.length > 0) {
      mod.connections = [...new Set([...dynamicConn, ...mod.connections])].slice(0, 4);
    }
  });

  return detectedModules;
};


// ---------------------------------------------------------------------------
// Import resolution (only edges to files that really exist in the archive)
// ---------------------------------------------------------------------------
const JS_EXT = new Set(['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs', 'vue', 'svelte']);
const JS_RESOLVE_EXT = ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.vue', '.svelte'];

const resolveJsImport = (from, spec, pathSet) => {
  if (!spec.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  if (pathSet.has(base)) return base;
  for (const e of JS_RESOLVE_EXT) if (pathSet.has(base + e)) return base + e;
  for (const e of JS_RESOLVE_EXT) if (pathSet.has(`${base}/index${e}`)) return `${base}/index${e}`;
  return null;
};

const resolvePyImport = (from, dots, mod, pathSet) => {
  const rel = mod ? mod.replace(/\./g, '/') : '';
  const bases = [];
  if (dots) {
    let dir = path.posix.dirname(from);
    for (let i = 1; i < dots.length; i++) dir = path.posix.dirname(dir);
    bases.push(path.posix.normalize(path.posix.join(dir, rel)));
  } else {
    bases.push(rel, path.posix.normalize(path.posix.join(path.posix.dirname(from), rel)));
  }
  for (const b of bases) {
    if (!b || b === '.') continue;
    if (pathSet.has(`${b}.py`)) return `${b}.py`;
    if (pathSet.has(`${b}/__init__.py`)) return `${b}/__init__.py`;
  }
  return null;
};

const externalPackageName = (spec) => {
  if (!spec || spec.startsWith('.') || spec.startsWith('/')) return null;
  if (spec.startsWith('node:')) return null;
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
};

const lineOf = (content, index) => content.slice(0, index).split('\n').length;

const LIB_LABELS = {
  '@google/generative-ai': 'Google Gemini API', '@google/genai': 'Google Gemini API',
  openai: 'OpenAI API', '@anthropic-ai/sdk': 'Anthropic API', stripe: 'Stripe',
  nodemailer: 'Email (SMTP)', 'aws-sdk': 'AWS', firebase: 'Firebase',
  'firebase-admin': 'Firebase', redis: 'Redis', ioredis: 'Redis', 'socket.io': 'WebSocket',
  'socket.io-client': 'WebSocket'
};
const DB_LIBS = {
  mongoose: 'MongoDB', mongodb: 'MongoDB', pymongo: 'MongoDB', pg: 'PostgreSQL',
  postgres: 'PostgreSQL', psycopg2: 'PostgreSQL', mysql: 'MySQL', mysql2: 'MySQL',
  sqlite3: 'SQLite', 'better-sqlite3': 'SQLite', sequelize: 'SQL (Sequelize)',
  typeorm: 'SQL (TypeORM)', '@prisma/client': 'Prisma', sqlalchemy: 'SQL (SQLAlchemy)'
};
const TECH_BY_DEP = {
  react: 'React', vue: 'Vue', '@angular/core': 'Angular', svelte: 'Svelte', next: 'Next.js',
  express: 'Express', fastify: 'Fastify', '@nestjs/core': 'NestJS', koa: 'Koa',
  mongoose: 'Mongoose', jsonwebtoken: 'JWT', vite: 'Vite', tailwindcss: 'Tailwind CSS',
  '@prisma/client': 'Prisma', sequelize: 'Sequelize', typeorm: 'TypeORM',
  'react-router-dom': 'React Router', 'socket.io': 'Socket.IO', bcryptjs: 'bcrypt',
  bcrypt: 'bcrypt', axios: 'Axios', django: 'Django', flask: 'Flask', fastapi: 'FastAPI',
  pymongo: 'MongoDB', sqlalchemy: 'SQLAlchemy'
};

// ---------------------------------------------------------------------------
// Manifest parsing (all manifests, so monorepos with frontend + backend work)
// ---------------------------------------------------------------------------
const parseManifests = (fileMap) => {
  const deps = new Set();
  const techs = new Set();
  const manifestFiles = [];
  let hasNodeBackend = false;

  Object.keys(fileMap).forEach((p) => {
    const b = baseName(p).toLowerCase();
    const content = fileMap[p] || '';
    if (b === 'package.json') {
      manifestFiles.push(p);
      try {
        const pkg = JSON.parse(content);
        const all = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
        Object.keys(all).forEach(d => {
          deps.add(d);
          if (TECH_BY_DEP[d]) techs.add(TECH_BY_DEP[d]);
        });
        if (all.express || all.fastify || all.koa || all['@nestjs/core']) hasNodeBackend = true;
      } catch (e) { /* malformed package.json: skip */ }
    } else if (b === 'requirements.txt') {
      manifestFiles.push(p);
      content.split('\n').forEach(l => {
        const name = l.split(/[=<>~!\[;]/)[0].trim().toLowerCase();
        if (!name || name.startsWith('#') || name.startsWith('-')) return;
        deps.add(name);
        if (TECH_BY_DEP[name]) techs.add(TECH_BY_DEP[name]);
        if (name.includes('sql')) techs.add('SQL Database');
      });
      techs.add('Python');
    } else if (b === 'pom.xml') {
      manifestFiles.push(p);
      techs.add('Java');
      const re = /<artifactId>([a-zA-Z0-9_\-]+)<\/artifactId>/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        deps.add(m[1]);
        if (m[1].includes('spring-boot')) techs.add('Spring Boot');
        if (m[1].includes('hibernate') || m[1].includes('jpa')) techs.add('JPA/Hibernate');
      }
    } else if (b === 'cargo.toml') {
      manifestFiles.push(p);
      techs.add('Rust');
      let inDeps = false;
      content.split('\n').forEach(l => {
        const t = l.trim();
        if (t.startsWith('[dependencies]')) inDeps = true;
        else if (t.startsWith('[')) inDeps = false;
        else if (inDeps && t.includes('=')) deps.add(t.split('=')[0].trim());
      });
    } else if (b === 'composer.json') {
      manifestFiles.push(p);
      techs.add('PHP');
      try {
        const c = JSON.parse(content);
        Object.keys({ ...(c.require || {}), ...(c['require-dev'] || {}) }).forEach(d => deps.add(d));
        if ((c.require || {})['laravel/framework']) techs.add('Laravel');
      } catch (e) { /* skip */ }
    } else if (b === 'go.mod') {
      manifestFiles.push(p);
      techs.add('Go');
      content.split('\n').forEach(l => {
        const t = l.trim();
        const m = /^(?:require\s+)?([a-z0-9.\-]+\.[a-z]{2,}\/[^\s]+)\s+v/i.exec(t);
        if (m) deps.add(m[1]);
      });
    }
  });
  return { dependencies: [...deps], techs: [...techs], manifestFiles, hasNodeBackend };
};

// ---------------------------------------------------------------------------
// Extra security rules (on top of detectSecurityFindings)
// ---------------------------------------------------------------------------
const detectExtraSecurityFindings = (fileMap, allPaths, dependencies, endpointCount) => {
  const out = [];
  const push = (f) => out.push({ codeSnippet: '', ...f });

  // Secret-bearing files that were shipped inside the archive (content is never read)
  allPaths.filter(isSecretFile).forEach((p) => {
    push({
      title: 'Secret / credential file included in the project archive',
      category: 'Hardcoded Secrets', severity: 'High', filePath: p, line: 1,
      codeSnippet: '(file content intentionally not read)',
      explanation: 'This file normally holds API keys, passwords or private keys. Shipping it inside a repository or ZIP exposes those secrets to anyone who receives the archive.',
      remediation: 'Remove the file from the repository, add it to .gitignore, commit only a placeholder .env.example, and rotate every secret that was in it.'
    });
  });

  const gitignoreKey = Object.keys(fileMap).find(k => baseName(k) === '.gitignore');
  if (gitignoreKey && !/^\s*\.env/m.test(fileMap[gitignoreKey])) {
    push({
      title: '.gitignore does not exclude .env files',
      category: 'Unsafe Configuration', severity: 'Medium', filePath: gitignoreKey, line: 1,
      explanation: 'Environment files usually contain secrets. Without an ignore rule they are easily committed by accident.',
      remediation: 'Add ".env" and ".env.*" (except .env.example) to .gitignore.'
    });
  }

  const rules = [
    { re: /(^|[^\w.$])eval\s*\(/, title: 'Use of eval()', category: 'Injection / XSS', severity: 'High',
      explanation: 'eval() executes arbitrary strings as code; any user-influenced input becomes remote code execution.',
      remediation: 'Replace eval() with JSON.parse, a lookup table, or explicit logic.', langs: JS_EXT },
    { re: /new\s+Function\s*\(/, title: 'Dynamic code execution via new Function()', category: 'Injection / XSS', severity: 'High',
      explanation: 'new Function() compiles strings to code and has the same risks as eval().',
      remediation: 'Avoid dynamic code generation.', langs: JS_EXT },
    { re: /dangerouslySetInnerHTML/, title: 'dangerouslySetInnerHTML used', category: 'Injection / XSS', severity: 'Medium',
      explanation: 'Injecting raw HTML into the DOM allows XSS if the content is not strictly sanitised (for example AI or user generated text).',
      remediation: 'Render text/Markdown with a safe renderer (e.g. react-markdown) or sanitise with DOMPurify.', langs: JS_EXT },
    { re: /\.innerHTML\s*=/, title: 'Direct innerHTML assignment', category: 'Injection / XSS', severity: 'Medium',
      explanation: 'Assigning to innerHTML with untrusted data enables DOM XSS.',
      remediation: 'Use textContent or a sanitiser.', langs: JS_EXT },
    { re: /createHash\(\s*['"`](md5|sha1)['"`]\s*\)/i, title: 'Weak hash algorithm (MD5/SHA-1)', category: 'Weak Cryptography', severity: 'Medium',
      explanation: 'MD5 and SHA-1 are broken for security purposes and must not be used for passwords or integrity checks.',
      remediation: 'Use bcrypt/argon2 for passwords and SHA-256 or stronger for integrity.', langs: JS_EXT },
    { re: /\b(query|execute|raw)\s*\(\s*(['"])[^'"\n]*\b(select|insert|update|delete)\b[^'"\n]*\2\s*\+/i,
      title: 'SQL built by string concatenation', category: 'Injection / XSS', severity: 'High',
      explanation: 'Concatenating values into SQL text allows SQL injection.', remediation: 'Use parameterised queries / prepared statements.', langs: null },
    { re: /\b(query|execute|raw)\s*\(\s*`[^`\n]*\b(select|insert|update|delete)\b[^`\n]*\$\{/i,
      title: 'SQL built with template-string interpolation', category: 'Injection / XSS', severity: 'High',
      explanation: 'Interpolating values into SQL text allows SQL injection.', remediation: 'Use parameterised queries / prepared statements.', langs: JS_EXT },
    { re: /localStorage\.setItem\(\s*['"`][^'"`]*(token|jwt|auth)[^'"`]*['"`]/i, title: 'Auth token stored in localStorage', category: 'Sensitive Data Exposure', severity: 'Medium',
      explanation: 'Anything in localStorage is readable by any script on the page, so one XSS bug leaks the session token.',
      remediation: 'Prefer httpOnly, Secure, SameSite cookies for session tokens.', langs: JS_EXT },
    { re: /[^.\w]cors\(\s*\)/, title: 'CORS enabled with default (allow-all) options', category: 'Unsafe Configuration', severity: 'Low',
      explanation: 'cors() with no options allows requests from every origin.',
      remediation: 'Pass an explicit origin allow-list from environment configuration.', langs: JS_EXT }
  ];

  Object.keys(fileMap).forEach((p) => {
    if (isTestFile(p)) return;
    const ext = extOf(p);
    if (!LANGUAGE_BY_EXT[ext]) return;
    const content = fileMap[p] || '';
    const lines = content.split('\n');
    rules.forEach((rule) => {
      if (rule.langs && !rule.langs.has(ext)) return;
      lines.forEach((text, idx) => {
        if (text.length > 400 || !rule.re.test(text)) return;
        if (/^\s*(\/\/|\*|#)/.test(text)) return; // comment line
        if (/\bre\s*:\s*\/|Regex\s*=|RegExp\(|^\s*[{,]?\s*(title|explanation|remediation|message)\s*:/.test(text)) return; // rule definitions
        push({
          title: rule.title, category: rule.category, severity: rule.severity, filePath: p, line: idx + 1,
          codeSnippet: text.trim().slice(0, 120), explanation: rule.explanation, remediation: rule.remediation
        });
      });
    });
  });

  // Dependency based project-level observations (only for server projects)
  const hasServer = dependencies.some(d => ['express', 'fastify', 'koa', '@nestjs/core', 'flask', 'fastapi', 'django'].includes(d));
  if (hasServer && endpointCount > 0) {
    if (!dependencies.some(d => ['express-rate-limit', 'rate-limiter-flexible', 'slowapi', 'flask-limiter', 'django-ratelimit', '@fastify/rate-limit'].includes(d))) {
      push({
        title: 'No rate limiting library detected', category: 'Unsafe Configuration', severity: 'Medium', filePath: 'package manifest', line: 1,
        explanation: 'Without rate limiting, login, upload and expensive endpoints can be brute-forced or abused.',
        remediation: 'Add a rate limiter (for example express-rate-limit) at least on authentication and costly endpoints.'
      });
    }
    if (dependencies.includes('express') && !dependencies.includes('helmet')) {
      push({
        title: 'No security-headers middleware (helmet) detected', category: 'Unsafe Configuration', severity: 'Low', filePath: 'package manifest', line: 1,
        explanation: 'Helmet sets headers such as X-Content-Type-Options and Strict-Transport-Security that harden an Express API.',
        remediation: 'Add helmet() early in the middleware chain.'
      });
    }
  }
  return out;
};

// ---------------------------------------------------------------------------
// Code-quality issues
// ---------------------------------------------------------------------------
const collectCodeIssues = (fileMap, allPaths, sourceFileCount) => {
  const issues = [];
  Object.keys(fileMap).forEach((p) => {
    const ext = extOf(p);
    if (!LANGUAGE_BY_EXT[ext] || isTestFile(p)) return;
    const content = fileMap[p] || '';
    const lines = content.split('\n');

    if (lines.length > 500) {
      issues.push({
        filePath: p, line: 1, severity: 'Medium', issueType: 'Large File', category: 'Maintainability',
        message: `File has ${lines.length} lines. Large files are hard to review, test and reuse.`,
        suggestion: 'Split the file by responsibility (e.g. routes, services, helpers) into smaller modules.', count: 1
      });
    }

    const grouped = (matcher, make) => {
      const hits = [];
      lines.forEach((t, i) => { if (matcher(t)) hits.push(i + 1); });
      if (hits.length) issues.push({ filePath: p, line: hits[0], count: hits.length, ...make(hits) });
    };

    if (JS_EXT.has(ext)) {
      grouped((t) => /\bconsole\.(log|debug)\s*\(/.test(t) && !/^\s*\/\//.test(t), (hits) => ({
        severity: 'Low', issueType: 'Code Smell', category: 'Debug Output',
        message: `${hits.length} console.log/debug statement(s) left in code (lines ${hits.slice(0, 6).join(', ')}${hits.length > 6 ? ', …' : ''}).`,
        suggestion: 'Remove debug logging or replace it with a configurable logger (e.g. pino/winston) with log levels.'
      }));
      const re = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        issues.push({
          filePath: p, line: lineOf(content, m.index), severity: 'Medium', issueType: 'Empty Catch Block', category: 'Error Handling',
          message: 'Empty catch block silently swallows errors, which makes failures invisible.',
          suggestion: 'Log the error, handle it, or rethrow it. If ignoring is intentional, add a comment explaining why.', count: 1
        });
      }
    }
    if (ext === 'py') {
      grouped((t) => /^\s*print\(/.test(t), (hits) => ({
        severity: 'Low', issueType: 'Code Smell', category: 'Debug Output',
        message: `${hits.length} print() debug statement(s) (lines ${hits.slice(0, 6).join(', ')}).`,
        suggestion: 'Use the logging module instead of print().'
      }));
      const re = /except[^\n]*:\s*\n\s*pass\b/g;
      let m;
      while ((m = re.exec(content)) !== null) {
        issues.push({
          filePath: p, line: lineOf(content, m.index), severity: 'Medium', issueType: 'Empty Catch Block', category: 'Error Handling',
          message: 'except block that only does `pass` silently swallows errors.',
          suggestion: 'Log or handle the exception, and catch specific exception types.', count: 1
        });
      }
    }
    grouped((t) => /(^|[^\w])(TODO|FIXME|HACK|XXX)\b/.test(t) && /(\/\/|#|\/\*|\*)/.test(t), (hits) => ({
      severity: 'Low', issueType: 'Unfinished Work', category: 'Maintainability',
      message: `${hits.length} TODO/FIXME marker(s) (lines ${hits.slice(0, 6).join(', ')}).`,
      suggestion: 'Resolve the marked work or track it in an issue tracker instead of leaving it in code.'
    }));
  });

  const hasTests = allPaths.some(isTestFile);
  if (!hasTests && sourceFileCount >= 5) {
    issues.push({
      filePath: '(project)', line: 1, severity: 'Medium', issueType: 'No Automated Tests', category: 'Testing', count: 1,
      message: 'No test files (*.test.*, *.spec.*, tests/) were found in the project.',
      suggestion: 'Add unit tests for core logic and API tests for critical endpoints, and run them in CI.'
    });
  }
  if (!allPaths.some(p => /^readme(\.md|\.txt)?$/i.test(baseName(p)))) {
    issues.push({
      filePath: '(project)', line: 1, severity: 'Low', issueType: 'Missing Documentation', category: 'Documentation', count: 1,
      message: 'No README file was found.',
      suggestion: 'Add a README describing what the project does, how to install it and how to run it.'
    });
  }
  return issues;
};

// ---------------------------------------------------------------------------
// File ranking (used to decide what the AI / quiz / RAG sees first)
// ---------------------------------------------------------------------------
const rankFiles = (fileMap, dependencyGraph) => {
  const indegree = {};
  dependencyGraph.forEach(e => { indegree[e.to] = (indegree[e.to] || 0) + 1; });
  return Object.keys(fileMap)
    .filter(p => LANGUAGE_BY_EXT[extOf(p)] || MANIFESTS.includes(baseName(p).toLowerCase()))
    .map(p => {
      const lines = (fileMap[p] || '').split('\n').length;
      let score = getFilePriority(p) + (indegree[p] || 0) * 6;
      if (isTestFile(p)) score -= 60;
      if (lines < 5) score -= 20;
      if (lines > 1500) score -= 10;
      return { path: p, score, lines, indegree: indegree[p] || 0 };
    })
    .sort((a, b) => b.score - a.score);
};

// ---------------------------------------------------------------------------
// Architecture (derived only from detected modules + real import edges)
// ---------------------------------------------------------------------------
const LAYER_ORDER = ['ui', 'routes', 'middleware', 'controllers', 'services', 'models', 'utils', 'config', 'bootstrap'];
const LAYER_LABELS = {
  ui: 'Client UI', routes: 'Routing / API', middleware: 'Middleware', controllers: 'Controllers',
  services: 'Services', models: 'Models / Persistence', utils: 'Utilities', config: 'Configuration', bootstrap: 'Entry / Bootstrap'
};

const buildArchitecture = ({ modules, dependencyGraph, endpointRoutes, databaseInfo, techStack, fileMap, fileLibs, dependencies, manifestFiles }) => {
  const fileToLayer = {};
  modules.forEach(m => (m.files || []).forEach(f => { fileToLayer[f] = m.category; }));
  const layerSet = new Set(modules.map(m => m.category));
  const layerName = (key) => (modules.find(m => m.category === key) || {}).name || LAYER_LABELS[key] || key;

  // Layer-to-layer import edges
  const edgeMap = {};
  dependencyGraph.forEach(e => {
    const a = fileToLayer[e.from], b = fileToLayer[e.to];
    if (!a || !b || a === b) return;
    const k = `${a}->${b}`;
    edgeMap[k] = edgeMap[k] || { from: a, to: b, count: 0, kind: 'imports', evidence: [] };
    edgeMap[k].count++;
    if (edgeMap[k].evidence.length < 3) edgeMap[k].evidence.push(`${e.from} → ${e.to}`);
  });
  const edges = Object.values(edgeMap);

  // UI → API (HTTP) edge: UI files that call fetch/axios while endpoints exist
  const uiFiles = modules.filter(m => m.category === 'ui').flatMap(m => m.files);
  const httpCallers = uiFiles.filter(f => /\b(fetch|axios)\s*[.(]/.test(fileMap[f] || ''));
  if (httpCallers.length && endpointRoutes.length) {
    const tally = {};
    endpointRoutes.forEach(e => { const l = fileToLayer[e.handlerFile]; if (l) tally[l] = (tally[l] || 0) + 1; });
    const target = Object.entries(tally).sort((a, b) => b[1] - a[1])[0];
    if (target) {
      edges.push({
        from: 'ui', to: target[0], count: httpCallers.length, kind: 'http',
        evidence: [`${httpCallers.length} UI file(s) call the API via fetch/axios`, `${endpointRoutes.length} endpoint(s) detected`]
      });
    }
  }

  // External services + database nodes
  const external = {};
  const dbEdges = {};
  Object.keys(fileLibs).forEach(f => {
    const layer = fileToLayer[f];
    if (!layer) return;
    fileLibs[f].forEach(lib => {
      if (LIB_LABELS[lib]) {
        const label = LIB_LABELS[lib];
        external[label] = external[label] || { name: label, usedBy: {} };
        external[label].usedBy[layer] = (external[label].usedBy[layer] || 0) + 1;
      }
      if (DB_LIBS[lib]) dbEdges[layer] = (dbEdges[layer] || 0) + 1;
    });
  });
  const hasDb = databaseInfo && databaseInfo.dbType && databaseInfo.dbType !== 'None detected';
  const database = hasDb ? { name: `Database (${databaseInfo.dbType})`, type: databaseInfo.dbType, connectionFile: databaseInfo.connectionStringFile, collections: databaseInfo.detectedTablesOrCollections } : null;
  if (database) {
    Object.entries(dbEdges).forEach(([layer, count]) => {
      edges.push({ from: layer, to: 'database', count, kind: 'persists', evidence: [`${count} file(s) in this layer import a ${databaseInfo.dbType} driver/ORM`] });
    });
  }
  const externalServices = Object.values(external).map(x => ({ name: x.name, usedBy: Object.keys(x.usedBy).map(layerName) }));
  Object.values(external).forEach(x => {
    Object.entries(x.usedBy).forEach(([layer, count]) => {
      edges.push({ from: layer, to: `external:${x.name}`, count, kind: 'calls', evidence: [`${count} file(s) import the ${x.name} SDK`] });
    });
  });

  const orderIdx = (k) => { const i = LAYER_ORDER.indexOf(k); return i === -1 ? LAYER_ORDER.length : i; };
  const layers = modules
    .map(m => ({
      key: m.category, name: m.name, purpose: m.purpose, fileCount: (m.files || []).length,
      files: (m.files || []).slice(0, 12), techs: m.techs || [],
      isDomain: !LAYER_ORDER.includes(m.category)
    }))
    .sort((a, b) => orderIdx(a.key) - orderIdx(b.key));

  const hasUi = layerSet.has('ui');
  const hasEndpoints = endpointRoutes.length > 0;
  let type = 'Application / library';
  if (hasUi && hasEndpoints) type = 'Full-stack application (client UI + REST API)';
  else if (hasUi) type = 'Frontend application';
  else if (hasEndpoints) type = 'Backend REST API';
  const patterns = [];
  if (layerSet.has('controllers') && layerSet.has('models') && (layerSet.has('routes') || hasEndpoints)) patterns.push('MVC-style layering');
  if (layerSet.has('services') && layerSet.has('controllers')) patterns.push('controller → service separation');
  if (layerSet.has('middleware')) patterns.push('middleware pipeline');
  const manifestRoots = new Set(manifestFiles.map(f => path.posix.dirname(f)));
  if (manifestRoots.size > 1) patterns.push(`multi-package repository (${manifestRoots.size} manifests)`);

  const entryPoints = [
    ...modules.filter(m => m.category === 'bootstrap').flatMap(m => m.files),
    ...Object.keys(fileMap).filter(f => baseName(f) === 'package.json').flatMap(f => {
      try { const p = JSON.parse(fileMap[f]); return p.main ? [path.posix.join(path.posix.dirname(f), p.main).replace(/^\.\//, '')] : []; } catch (e) { return []; }
    })
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8);

  const summaryParts = [];
  summaryParts.push(`Detected architecture: ${type}${patterns.length ? ` with ${patterns.join(', ')}` : ''}.`);
  summaryParts.push(`${layers.length} layer(s)/module group(s) were identified from ${layers.reduce((a, l) => a + l.fileCount, 0)} files: ${layers.map(l => `${l.name} (${l.fileCount})`).join(', ')}.`);
  if (hasEndpoints) summaryParts.push(`${endpointRoutes.length} API endpoint(s) were found.`);
  if (database) summaryParts.push(`Persistence: ${databaseInfo.dbType}${databaseInfo.detectedTablesOrCollections.length ? ` (${databaseInfo.detectedTablesOrCollections.join(', ')})` : ''}.`);
  if (externalServices.length) summaryParts.push(`External services: ${externalServices.map(s => s.name).join(', ')}.`);
  if (edges.filter(e => e.kind === 'imports').length === 0) summaryParts.push('No imports between different layers could be resolved, so no layer-to-layer relationships are drawn.');

  return {
    type, patterns, technologies: techStack, layers, edges,
    database, externalServices, entryPoints, summary: summaryParts.join(' '),
    generatedFrom: 'static-analysis', dependencyCount: dependencies.length
  };
};

// ---------------------------------------------------------------------------
// Main entry: analyse a whole repository
// ---------------------------------------------------------------------------
/**
 * @param {Object<string,string>} fileMap  path -> text for every file we could read
 * @param {string[]} allPaths             every non-ignored, non-binary file path in the archive
 */
const analyzeProject = (fileMap, allPaths, scanStats = {}) => {
  const pathSet = new Set(allPaths);
  const sourcePaths = allPaths.filter(p => LANGUAGE_BY_EXT[extOf(p)]);

  const languageDistribution = {};
  const techStackSet = new Set();
  sourcePaths.forEach(p => {
    const lang = LANGUAGE_BY_EXT[extOf(p)];
    languageDistribution[lang] = (languageDistribution[lang] || 0) + 1;
    techStackSet.add(lang);
  });

  let linesOfCode = 0;
  const dependencyEdges = new Set();
  const dependencyGraph = [];
  const fileLibs = {};
  const endpointRoutes = [];
  const mountPrefix = {}; // handler file -> mount prefix (app.use('/api/x', router))
  let dbConnectFile = 'None';
  const collections = [];

  const addEdge = (from, to) => {
    if (!to || from === to) return;
    const k = `${from}\u0000${to}`;
    if (dependencyEdges.has(k)) return;
    dependencyEdges.add(k);
    dependencyGraph.push({ from, to, relationType: 'imports' });
  };

  const manifest = parseManifests(fileMap);
  manifest.techs.forEach(t => techStackSet.add(t));

  const jsImportRe = /(?:\bimport\s+(?:[^'"`;]*?\s+from\s+)?|\bexport\s+[^'"`;]*?\s+from\s+|\brequire\s*\(\s*|\bimport\s*\(\s*)['"`]([^'"`]+)['"`]/g;
  const pyFromRe = /^\s*from\s+(\.*)([\w.]*)\s+import\s+/gm;
  const pyImportRe = /^\s*import\s+([\w.]+)/gm;
  const javaImportRe = /^\s*import\s+(?:static\s+)?([\w.]+);/gm;

  const javaIndex = {};
  allPaths.filter(p => p.endsWith('.java')).forEach(p => { javaIndex[p.replace(/\.java$/, '').split('/').slice(-6).join('.')] = p; });

  Object.keys(fileMap).forEach((p) => {
    const content = fileMap[p] || '';
    const ext = extOf(p);
    if (!LANGUAGE_BY_EXT[ext]) return;
    linesOfCode += content.split('\n').length;
    const libs = new Set();
    let m;

    if (JS_EXT.has(ext)) {
      jsImportRe.lastIndex = 0;
      while ((m = jsImportRe.exec(content)) !== null) {
        const spec = m[1];
        const pkg = externalPackageName(spec);
        if (pkg) libs.add(pkg); else addEdge(p, resolveJsImport(p, spec, pathSet));
      }
      if (!isTestFile(p)) {
        const mountRe = /\.use\(\s*['"`](\/[^'"`]*)['"`]\s*,\s*(?:[\w.$]+\s*,\s*)*([A-Za-z_$][\w$]*)\s*\)/g;
        const reqRe = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*require\(\s*['"`](\.[^'"`]+)['"`]\s*\)|import\s+([A-Za-z_$][\w$]*)\s+from\s+['"`](\.[^'"`]+)['"`]/g;
        const varToFile = {};
        let r;
        while ((r = reqRe.exec(content)) !== null) {
          const v = r[1] || r[3];
          const f = resolveJsImport(p, r[2] || r[4], pathSet);
          if (v && f) varToFile[v] = f;
        }
        while ((m = mountRe.exec(content)) !== null) {
          if (varToFile[m[2]]) mountPrefix[varToFile[m[2]]] = m[1].replace(/\/$/, '');
        }
        // inline form: app.use('/api/x', require('./routes/x'))
        const inlineRe = /\.use\(\s*['"`](\/[^'"`]*)['"`]\s*,\s*(?:[\w.$]+\s*,\s*)*require\(\s*['"`](\.[^'"`]+)['"`]\s*\)\s*\)/g;
        while ((m = inlineRe.exec(content)) !== null) {
          const f = resolveJsImport(p, m[2], pathSet);
          if (f) mountPrefix[f] = m[1].replace(/\/$/, '');
        }
      }
    } else if (ext === 'py') {
      pyFromRe.lastIndex = 0; pyImportRe.lastIndex = 0;
      while ((m = pyFromRe.exec(content)) !== null) {
        const r = resolvePyImport(p, m[1], m[2], pathSet);
        if (r) addEdge(p, r); else if (m[2]) libs.add(m[2].split('.')[0].toLowerCase());
      }
      while ((m = pyImportRe.exec(content)) !== null) {
        const r = resolvePyImport(p, '', m[1], pathSet);
        if (r) addEdge(p, r); else libs.add(m[1].split('.')[0].toLowerCase());
      }
    } else if (ext === 'java') {
      while ((m = javaImportRe.exec(content)) !== null) {
        const target = Object.keys(javaIndex).find(k => k.endsWith(m[1]) || m[1].endsWith(k));
        if (target) addEdge(p, javaIndex[target]);
      }
    }
    if (libs.size) fileLibs[p] = libs;

    if (isTestFile(p)) return;

    // Endpoints (multi-language)
    const addRoute = (route, method, type) => endpointRoutes.push({ path: route, method, handlerFile: p, type });
    const express = /(router|app)\.(get|post|put|delete|patch)\s*\(\s*['"`](\/[a-zA-Z0-9_\-\/:.*]*)['"`]/g;
    while ((m = express.exec(content)) !== null) addRoute(m[3], m[2].toUpperCase(), 'REST Endpoint');
    const py = /@(app|router|bp|blueprint)\.(route|get|post|put|delete|patch)\s*\(\s*['"`](\/[a-zA-Z0-9_\-\/:<>.]*)['"`]/g;
    while ((m = py.exec(content)) !== null) addRoute(m[3], m[2] === 'route' ? 'GET/POST' : m[2].toUpperCase(), 'REST Endpoint');
    const django = /\bpath\s*\(\s*['"`]([a-zA-Z0-9_\-\/:<>]*)['"`]\s*,/g;
    if (/urls\.py$/.test(p)) while ((m = django.exec(content)) !== null) addRoute('/' + m[1], 'GET/POST', 'Web Route');
    const java = /@(GetMapping|PostMapping|PutMapping|DeleteMapping|RequestMapping)\s*\(\s*(?:value\s*=\s*)?['"`](\/[a-zA-Z0-9_\-\/:{}]*)['"`]/g;
    while ((m = java.exec(content)) !== null) addRoute(m[2], m[1] === 'RequestMapping' ? 'ANY' : m[1].replace('Mapping', '').toUpperCase(), 'REST Endpoint');
    const go = /\.(GET|POST|PUT|DELETE|HandleFunc)\s*\(\s*['"`](\/[a-zA-Z0-9_\-\/:]*)['"`]/g;
    while ((m = go.exec(content)) !== null) addRoute(m[2], m[1] === 'HandleFunc' ? 'GET/POST' : m[1].toUpperCase(), 'API Route');

    // Database facts
    if (dbConnectFile === 'None' && /(mongoose\.connect|createConnection|createPool|new\s+Pool\(|create_engine|MongoClient|sqlite3\.connect|DataSource\()/.test(content)) dbConnectFile = p;
    const schema = /mongoose\.model\(\s*['"`]([A-Za-z0-9_\-]+)['"`]/.exec(content);
    if (schema) collections.push(schema[1]);
    const table = /@Table\(\s*name\s*=\s*['"`]([A-Za-z0-9_\-]+)['"`]/.exec(content);
    if (table) collections.push(table[1]);
  });

  // Apply mount prefixes so endpoints show their full public path
  endpointRoutes.forEach((e) => {
    const prefix = mountPrefix[e.handlerFile];
    if (prefix && !e.path.startsWith(prefix + '/') && e.path !== prefix) e.path = (prefix + (e.path === '/' ? '' : e.path)) || '/';
  });

  // Tech stack / database from manifests and libraries actually imported
  const allLibs = new Set([...manifest.dependencies, ...Object.values(fileLibs).flatMap(s => [...s])]);
  let dbType = 'None detected';
  for (const lib of Object.keys(DB_LIBS)) {
    if (allLibs.has(lib)) { dbType = DB_LIBS[lib]; break; }
  }
  if (dbType.startsWith('SQL') || ['PostgreSQL', 'MySQL', 'SQLite'].includes(dbType)) techStackSet.add(dbType);
  if (dbType === 'MongoDB') techStackSet.add('MongoDB');
  if (manifest.hasNodeBackend) techStackSet.add('Node.js');
  const techStack = [...techStackSet];
  if (techStack.length === 0) techStack.push('Vanilla Codebase');

  const databaseInfo = { dbType, connectionStringFile: dbConnectFile, detectedTablesOrCollections: [...new Set(collections)] };

  // Modules (static, category-tagged) – never sliced
  const modules = detectProjectModules(fileMap, allPaths, [], techStack, manifest.dependencies);
  modules.forEach(m => { if (!m.category) { m.category = 'core'; m.type = 'core'; } });

  // Evidence-based connections between modules
  const fileToModule = {};
  modules.forEach(m => (m.files || []).forEach(f => { fileToModule[f] = m; }));
  const out = {}, inc = {};
  dependencyGraph.forEach(e => {
    const a = fileToModule[e.from], b = fileToModule[e.to];
    if (!a || !b || a === b) return;
    out[a.name] = out[a.name] || {}; out[a.name][b.name] = (out[a.name][b.name] || 0) + 1;
    inc[b.name] = inc[b.name] || {}; inc[b.name][a.name] = (inc[b.name][a.name] || 0) + 1;
  });
  modules.forEach(m => {
    const lines = [
      ...Object.entries(out[m.name] || {}).sort((x, y) => y[1] - x[1]).map(([n, c]) => `Imports from ${n} (${c} import${c > 1 ? 's' : ''})`),
      ...Object.entries(inc[m.name] || {}).sort((x, y) => y[1] - x[1]).map(([n, c]) => `Imported by ${n} (${c} import${c > 1 ? 's' : ''})`)
    ];
    m.connections = lines.length ? lines.slice(0, 6) : ['No imports to/from other modules were detected'];
  });

  const architecture = buildArchitecture({
    modules, dependencyGraph, endpointRoutes, databaseInfo, techStack, fileMap, fileLibs,
    dependencies: manifest.dependencies, manifestFiles: manifest.manifestFiles
  });
  const nameOf = (key) => {
    if (key === 'database') return architecture.database ? architecture.database.name : 'Database';
    if (key.startsWith('external:')) return key.slice(9);
    return (modules.find(m => m.category === key) || {}).name || key;
  };
  const architectureFlow = architecture.edges.map(e => ({
    from: nameOf(e.from), to: nameOf(e.to),
    relationType: e.kind === 'http' ? 'HTTP requests' : e.kind === 'persists' ? 'Persists data' : e.kind === 'calls' ? 'External calls' : `${e.count} import${e.count > 1 ? 's' : ''}`
  }));

  // Findings (complete, not truncated)
  const securityFindings = [
    ...detectSecurityFindings(fileMap, endpointRoutes, manifest.dependencies),
    ...detectExtraSecurityFindings(fileMap, [...allPaths, ...(scanStats.secretFiles || [])], manifest.dependencies, endpointRoutes.length)
  ];
  const seen = new Set();
  const dedupSecurity = securityFindings.filter(f => {
    const k = `${f.title}|${f.filePath}|${f.line}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  }).sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const codeIssues = collectCodeIssues(fileMap, allPaths, sourcePaths.length)
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]);

  const ranked = rankFiles(fileMap, dependencyGraph);

  return {
    techStack,
    dependencies: manifest.dependencies.slice(0, 120),
    apiEndpointsCount: endpointRoutes.length,
    codeIssues: codeIssues.slice(0, 500),
    codeIssuesTotal: codeIssues.length,
    securityFindings: dedupSecurity.slice(0, 500),
    securityFindingsTotal: dedupSecurity.length,
    dependencyGraph: dependencyGraph.slice(0, 3000),
    dependencyGraphTotal: dependencyGraph.length,
    linesOfCode,
    totalFiles: allPaths.length,
    sourceFiles: sourcePaths.length,
    languageDistribution,
    architectureFlow,
    architecture,
    endpointRoutes: endpointRoutes.slice(0, 500),
    databaseInfo,
    modules,
    rankedFiles: ranked.slice(0, 60),
    scanStats: {
      filesInArchive: scanStats.filesInArchive ?? allPaths.length,
      filesAnalyzed: Object.keys(fileMap).length,
      filesNotRead: Math.max(0, allPaths.length - Object.keys(fileMap).length),
      ...scanStats
    }
  };
};

module.exports = {
  analyzeProject, rankFiles, buildTree, createChunks, cosineSimilarity, getFilePriority,
  detectSecurityFindings, detectProjectModules, isSensitiveOrBinary, isSecretFile,
  isIgnoredPath, isReadableSource, isTestFile, LANGUAGE_BY_EXT, extOf, baseName
};
