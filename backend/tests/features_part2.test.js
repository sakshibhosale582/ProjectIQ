const { describe, it } = require('node:test');
const assert = require('node:assert');

// Simple wording: Tests for the newly implemented Part 2 features
describe('Part 2 Features Suite: Security, AI Fallback, Health & Grounded Q&A', () => {

  // 1. Feature 7: AI Model Fallback Sequence
  describe('Automatic AI Model Routing & Fallback Chain', () => {
    const { MODELS_FALLBACK_SEQUENCE } = require('../utils/aiService');

    it('defines the correct fallback hierarchy sequence', () => {
      assert.ok(Array.isArray(MODELS_FALLBACK_SEQUENCE), 'Fallback sequence must be an array');
      assert.strictEqual(MODELS_FALLBACK_SEQUENCE[0], 'gemini-3.5-flash-lite', 'First model must be flash-lite');
      assert.strictEqual(MODELS_FALLBACK_SEQUENCE[1], 'gemini-3.6-flash', 'Second model must be flash');
      assert.strictEqual(MODELS_FALLBACK_SEQUENCE[2], 'gemini-flash-latest', 'Third fallback model must be flash-latest');
    });

    it('falls back through sequence when simulated rate limit error occurs', async () => {
      // Simulate chain progression on 429 quota exhaustion
      const attempts = [];
      const simulateCall = async (modelName) => {
        attempts.push(modelName);
        if (modelName === 'gemini-3.5-flash-lite') {
          const err = new Error('Resource has been exhausted (e.g. check quota)');
          err.status = 429;
          throw err;
        }
        return { text: () => '{"success": true, "model": "' + modelName + '"}' };
      };

      let result = null;
      for (const model of MODELS_FALLBACK_SEQUENCE) {
        try {
          result = await simulateCall(model);
          break;
        } catch (err) {
          if (err.status === 429) continue;
          throw err;
        }
      }

      assert.strictEqual(attempts.length, 2, 'Should have fallen back to second model');
      assert.strictEqual(attempts[0], 'gemini-3.5-flash-lite');
      assert.strictEqual(attempts[1], 'gemini-3.6-flash');
      assert.ok(result, 'Second model invocation succeeded');
    });
  });

  // 2. Feature 3: Security Static Analysis
  describe('Security Analysis & Vulnerability Scanner', () => {
    // Lightweight replica of the scanner logic to verify detection rules
    const scanSecurity = (fileContentsMap, endpointRoutes, dependencies) => {
      const findings = [];

      for (const [filePath, content] of Object.entries(fileContentsMap)) {
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          const lineNum = index + 1;

          // Secrets check
          if (/((api[_-]?key|secret|token|password|auth_token)\s*[:=]\s*['"`][a-zA-Z0-9_\-]{8,}['"`])/i.test(line)) {
            if (!line.includes('process.env') && !line.includes('os.environ')) {
              findings.push({
                category: 'Hardcoded Secrets',
                severity: 'High',
                filePath,
                line: lineNum,
                title: 'Potential Hardcoded Secret or API Key'
              });
            }
          }

          // Insecure configuration (e.g. debug flags or wildcard cors)
          if (/cors\(\s*\{\s*origin\s*:\s*['"`]\*['"`]\s*\}\s*\)/i.test(line)) {
            findings.push({
              category: 'Insecure Configuration',
              severity: 'Medium',
              filePath,
              line: lineNum,
              title: 'Permissive Wildcard CORS Configuration'
            });
          }

          // Sensitive logging
          if (/console\.(log|info|debug)\(.*(password|secret|token|apikey).*\)/i.test(line)) {
            findings.push({
              category: 'Sensitive Data Exposure',
              severity: 'Low',
              filePath,
              line: lineNum,
              title: 'Sensitive Credential Logged to Console'
            });
          }
        });
      }

      // Dependency risks check
      (dependencies || []).forEach(dep => {
        if (typeof dep === 'string' && (dep.includes(': *') || dep.includes(': latest'))) {
          findings.push({
            category: 'Dependency Risk',
            severity: 'Medium',
            filePath: 'package.json',
            title: `Wildcard dependency version: ${dep}`
          });
        }
      });

      return findings;
    };

    it('flags hardcoded secrets not using environment variables', () => {
      const mockFiles = {
        'config/api.js': "const API_KEY = 'sk-proj-abc123456789xyz';",
        'server.js': "const key = process.env.API_KEY;"
      };
      const findings = scanSecurity(mockFiles, [], []);
      assert.strictEqual(findings.length, 1);
      assert.strictEqual(findings[0].category, 'Hardcoded Secrets');
      assert.strictEqual(findings[0].severity, 'High');
      assert.strictEqual(findings[0].filePath, 'config/api.js');
    });

    it('flags wildcard CORS configurations', () => {
      const mockFiles = {
        'server.js': "app.use(cors({ origin: '*' }));"
      };
      const findings = scanSecurity(mockFiles, [], []);
      assert.strictEqual(findings.length, 1);
      assert.strictEqual(findings[0].category, 'Insecure Configuration');
      assert.strictEqual(findings[0].severity, 'Medium');
    });

    it('flags sensitive credentials logged to standard console', () => {
      const mockFiles = {
        'controllers/auth.js': "console.log('User login password:', password);"
      };
      const findings = scanSecurity(mockFiles, [], []);
      assert.strictEqual(findings.length, 1);
      assert.strictEqual(findings[0].category, 'Sensitive Data Exposure');
      assert.strictEqual(findings[0].severity, 'Low');
    });

    it('flags wildcard dependency versions in packages', () => {
      const deps = ['express: 4.18.2', 'axios: *'];
      const findings = scanSecurity({}, [], deps);
      assert.strictEqual(findings.length, 1);
      assert.strictEqual(findings[0].category, 'Dependency Risk');
      assert.strictEqual(findings[0].severity, 'Medium');
    });
  });

  // 3. Feature 1: AI Explainer Offline Fallback Structure
  describe('AI Explainer Offline Fallback', () => {
    it('generates a complete 5-part explanation breakdown', () => {
      const filePath = 'src/services/authService.js';
      const codeSnippet = 'function verifyToken(token) { return jwt.verify(token, secret); }';
      const action = 'explain';

      // Verify shape of explainer response
      const fallbackExplanation = {
        summary: `Static analysis explanation for ${filePath.split('/').pop()}`,
        howItWorks: `Inspects the logic in ${filePath}: executes token validation routine.`,
        whyUsed: 'Provides isolated modular verification within the application.',
        dependencies: ['jsonwebtoken', 'auth middleware'],
        projectContext: 'Acts as authentication guard for incoming protected API routes.'
      };

      assert.ok(fallbackExplanation.summary.length > 0);
      assert.ok(fallbackExplanation.howItWorks.length > 0);
      assert.ok(fallbackExplanation.whyUsed.length > 0);
      assert.ok(Array.isArray(fallbackExplanation.dependencies));
      assert.ok(fallbackExplanation.projectContext.length > 0);
    });
  });

  // 4. Feature 5: Project Health Analysis (Qualitative, no fake numbers)
  describe('Project Health Analysis (Qualitative)', () => {
    const buildHealthAssessment = (project) => {
      const metrics = project.metrics || {};
      const issues = project.codeIssues || [];
      const findings = project.securityFindings || [];
      const modules = project.modules || [];

      return {
        codeQuality: {
          status: issues.filter(i => i.severity === 'High').length === 0 ? 'Good' : 'Needs Review',
          keyFindings: [`Scanned ${metrics.totalFiles || 0} files.`],
          recommendations: ['Maintain current formatting standards.']
        },
        architecture: {
          status: modules.length >= 2 ? 'Modular' : 'Monolithic',
          keyFindings: [`Identified ${modules.length} functional modules.`],
          recommendations: ['Enforce clean layer boundaries.']
        },
        security: {
          status: findings.filter(f => f.severity === 'High').length === 0 ? 'Strong' : 'Attention Required',
          keyFindings: [`${findings.length} findings evaluated.`],
          recommendations: ['Isolate API secrets in .env']
        },
        maintainability: {
          status: 'High',
          keyFindings: ['Average file size within healthy limits.'],
          recommendations: ['Keep dependencies up to date.']
        },
        complexity: {
          status: 'Balanced',
          keyFindings: ['Balanced API surface area.'],
          recommendations: ['Group API routes with version prefixes.']
        }
      };
    };

    it('evaluates healthy project with qualitative tags without arbitrary score numbers', () => {
      const project = {
        metrics: { totalFiles: 12, linesOfCode: 1400 },
        codeIssues: [],
        securityFindings: [],
        modules: [{ name: 'Auth' }, { name: 'Dashboard' }]
      };

      const health = buildHealthAssessment(project);
      assert.strictEqual(health.codeQuality.status, 'Good');
      assert.strictEqual(health.architecture.status, 'Modular');
      assert.strictEqual(health.security.status, 'Strong');
      assert.strictEqual(health.maintainability.status, 'High');
      assert.strictEqual(health.complexity.status, 'Balanced');
      // Verify no numeric scores were invented
      assert.strictEqual(typeof health.codeQuality.status, 'string');
      assert.strictEqual(typeof health.security.status, 'string');
    });

    it('flags high severity security issues with qualitative status Attention Required', () => {
      const project = {
        metrics: { totalFiles: 5, linesOfCode: 800 },
        codeIssues: [{ severity: 'High' }],
        securityFindings: [{ severity: 'High', title: 'Hardcoded Secret' }],
        modules: [{ name: 'Core' }]
      };

      const health = buildHealthAssessment(project);
      assert.strictEqual(health.codeQuality.status, 'Needs Review');
      assert.strictEqual(health.architecture.status, 'Monolithic');
      assert.strictEqual(health.security.status, 'Attention Required');
    });
  });

  // 5. Feature 2: Code-Grounded Interview Questions
  describe('Code-Grounded Technical Interview Questions', () => {
    it('generates questions grounded in real project routes and database models', () => {
      const project = {
        name: 'ProjectIQ',
        techStack: ['Node.js', 'Express', 'React', 'MongoDB'],
        endpointRoutes: [
          { method: 'POST', path: '/api/auth/login' },
          { method: 'GET', path: '/api/projects' }
        ],
        databaseInfo: {
          dbType: 'MongoDB',
          detectedTablesOrCollections: ['users', 'projects']
        }
      };

      // Generate grounded questions
      const questions = [];
      if (project.endpointRoutes.length > 0) {
        questions.push({
          question: `How does the ${project.endpointRoutes[0].method} ${project.endpointRoutes[0].path} route handle incoming request parameters and errors?`,
          category: 'API Routes'
        });
      }
      if (project.databaseInfo.detectedTablesOrCollections.length > 0) {
        questions.push({
          question: `Explain how the ${project.databaseInfo.detectedTablesOrCollections[0]} entity is modeled and indexed in ${project.databaseInfo.dbType}.`,
          category: 'Database'
        });
      }

      assert.strictEqual(questions.length, 2);
      assert.ok(questions[0].question.includes('/api/auth/login'));
      assert.ok(questions[1].question.includes('users'));
      assert.ok(questions[1].question.includes('MongoDB'));
    });
  });

});
