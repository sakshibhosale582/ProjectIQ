const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Analysis Suite: Multi-Language Scanner, Modules & Architecture', () => {

  describe('Multi-Language Signature Detection', () => {
    const detectLanguages = (filenames) => {
      const langs = new Set();
      for (const file of filenames) {
        const ext = file.split('.').pop().toLowerCase();
        if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) langs.add('JavaScript');
        if (['ts', 'tsx'].includes(ext)) langs.add('TypeScript');
        if (ext === 'py') langs.add('Python');
        if (ext === 'java') langs.add('Java');
        if (ext === 'go') langs.add('Go');
        if (ext === 'rs') langs.add('Rust');
        if (file.endsWith('pom.xml')) langs.add('Java');
        if (file.endsWith('Cargo.toml')) langs.add('Rust');
        if (file.endsWith('go.mod')) langs.add('Go');
        if (file.endsWith('requirements.txt')) langs.add('Python');
      }
      return Array.from(langs);
    };

    it('identifies JavaScript, TypeScript, Python, Java, Go, and Rust project files', () => {
      const files = [
        'src/App.jsx',
        'src/types.ts',
        'backend/api.py',
        'service/OrderService.java',
        'server/main.go',
        'Cargo.toml'
      ];
      const detected = detectLanguages(files);
      assert.ok(detected.includes('JavaScript'));
      assert.ok(detected.includes('TypeScript'));
      assert.ok(detected.includes('Python'));
      assert.ok(detected.includes('Java'));
      assert.ok(detected.includes('Go'));
      assert.ok(detected.includes('Rust'));
    });
  });

  describe('Framework & Library Detection', () => {
    const detectFrameworks = (contentMap) => {
      const frameworks = new Set();
      for (const [file, content] of Object.entries(contentMap)) {
        if (content.includes('react') || content.includes('import React')) frameworks.add('React');
        if (content.includes('express()') || content.includes('require(\'express\')') || content.includes('from \'express\'')) frameworks.add('Express');
        if (content.includes('from django') || content.includes('DJANGO_SETTINGS_MODULE')) frameworks.add('Django');
        if (content.includes('from flask import') || content.includes('FastAPI()')) frameworks.add('Flask/FastAPI');
        if (content.includes('@SpringBootApplication') || content.includes('@RestController')) frameworks.add('Spring Boot');
      }
      return Array.from(frameworks);
    };

    it('identifies React, Express, Django, Flask/FastAPI, and Spring Boot', () => {
      const codebase = {
        'src/App.jsx': "import React from 'react'; export default function App() {}",
        'server.js': "const express = require('express'); const app = express();",
        'api/views.py': "from django.http import JsonResponse; def home(r): pass",
        'main.py': "from flask import Flask; app = Flask(__name__)",
        'Application.java': "@SpringBootApplication public class Application {}"
      };

      const detected = detectFrameworks(codebase);
      assert.ok(detected.includes('React'));
      assert.ok(detected.includes('Express'));
      assert.ok(detected.includes('Django'));
      assert.ok(detected.includes('Flask/FastAPI'));
      assert.ok(detected.includes('Spring Boot'));
    });
  });

  describe('Multi-Language API Route Scanner', () => {
    const scanRoutes = (codeMap) => {
      const routes = [];

      for (const [filePath, content] of Object.entries(codeMap)) {
        const ext = filePath.split('.').pop().toLowerCase();

        // Node.js Express routes
        if (['js', 'jsx', 'ts', 'tsx'].includes(ext)) {
          const expressRegex = /(?:router|app)\.(get|post|put|delete)\s*\(\s*['"`](\/[a-zA-Z0-9_\-\/\:]*)['"`]/g;
          let match;
          while ((match = expressRegex.exec(content)) !== null) {
            routes.push({ method: match[1].toUpperCase(), path: match[2], file: filePath, framework: 'Express' });
          }
        }

        // Python Flask/FastAPI routes
        if (ext === 'py') {
          const pyRegex = /@(?:app|router)\.(route|get|post|put|delete)\s*\(\s*['"`](\/[a-zA-Z0-9_\-\/\:]*)['"`]/g;
          let match;
          while ((match = pyRegex.exec(content)) !== null) {
            routes.push({ method: match[1].toUpperCase(), path: match[2], file: filePath, framework: 'Python' });
          }
        }

        // Java Spring Boot routes
        if (ext === 'java') {
          const javaRegex = /@(GetMapping|PostMapping|PutMapping|DeleteMapping)\s*\(\s*(?:value\s*=\s*)?['"`](\/[a-zA-Z0-9_\-\/\:]*)['"`]/g;
          let match;
          while ((match = javaRegex.exec(content)) !== null) {
            const method = match[1].replace('Mapping', '').toUpperCase();
            routes.push({ method, path: match[2], file: filePath, framework: 'Spring Boot' });
          }
        }

        // Go routes
        if (ext === 'go') {
          const goRegex = /\.(GET|POST|PUT|DELETE|HandleFunc)\s*\(\s*['"`](\/[a-zA-Z0-9_\-\/\:]*)['"`]/g;
          let match;
          while ((match = goRegex.exec(content)) !== null) {
            routes.push({ method: match[1].toUpperCase(), path: match[2], file: filePath, framework: 'Go' });
          }
        }
      }

      return routes;
    };

    it('extracts REST routes across Node.js Express, Python, Java Spring Boot, and Go', () => {
      const codebase = {
        'routes/auth.js': `
          router.post('/api/auth/login', authHandler);
          router.get('/api/auth/profile', profileHandler);
        `,
        'controllers/users.py': `
          @app.get('/api/users')
          def get_users(): pass
        `,
        'OrderController.java': `
          @PostMapping("/api/orders/checkout")
          public Response checkout() {}
        `,
        'server.go': `
          r.GET("/api/health", healthHandler)
        `
      };

      const routes = scanRoutes(codebase);
      assert.strictEqual(routes.length, 5);

      assert.ok(routes.some(r => r.method === 'POST' && r.path === '/api/auth/login'));
      assert.ok(routes.some(r => r.method === 'GET' && r.path === '/api/auth/profile'));
      assert.ok(routes.some(r => r.method === 'GET' && r.path === '/api/users'));
      assert.ok(routes.some(r => r.method === 'POST' && r.path === '/api/orders/checkout'));
      assert.ok(routes.some(r => r.method === 'GET' && r.path === '/api/health'));
    });
  });

  describe('Database & Schema Detection', () => {
    const detectDatabases = (codeMap) => {
      const detected = {
        types: new Set(),
        models: new Set()
      };

      const dbUriRegex = /(mongodb(?:\+srv)?:\/\/[a-zA-Z0-9_\-\.\:\/]+|mysql:\/\/[a-zA-Z0-9_\-\.\:\/]+|postgres(?:ql)?:\/\/[a-zA-Z0-9_\-\.\:\/]+|jdbc:[a-z0-9]+:\/\/[a-zA-Z0-9_\-\.\:\/]+)/i;

      for (const [filePath, content] of Object.entries(codeMap)) {
        const uriMatch = dbUriRegex.exec(content);
        if (uriMatch) {
          if (uriMatch[1].startsWith('mongodb')) detected.types.add('MongoDB');
          if (uriMatch[1].startsWith('postgres')) detected.types.add('PostgreSQL');
          if (uriMatch[1].startsWith('mysql')) detected.types.add('MySQL');
        }

        // Mongoose Models
        const mongooseMatch = /mongoose\.model\(\s*['"`]([a-zA-Z0-9_\-]+)['"`]/g;
        let mMatch;
        while ((mMatch = mongooseMatch.exec(content)) !== null) {
          detected.models.add(mMatch[1]);
          detected.types.add('MongoDB');
        }

        // JPA Entities
        if (content.includes('@Entity') || content.includes('@Table')) {
          const entityMatch = /@Table\(\s*name\s*=\s*['"`]([a-zA-Z0-9_\-]+)['"`]/i.exec(content);
          if (entityMatch) detected.models.add(entityMatch[1]);
        }
      }

      return {
        types: Array.from(detected.types),
        models: Array.from(detected.models)
      };
    };

    it('identifies MongoDB and PostgreSQL with schema entities', () => {
      const codebase = {
        'models/User.js': `
          const mongoose = require('mongoose');
          module.exports = mongoose.model('User', UserSchema);
        `,
        'models/Project.js': `
          const mongoose = require('mongoose');
          module.exports = mongoose.model('Project', ProjectSchema);
        `,
        'config/db.js': `
          const uri = "mongodb+srv://admin:pass@cluster.mongodb.net/projectiq";
        `,
        'UserEntity.java': `
          @Entity
          @Table(name = "customers")
          public class UserEntity {}
        `
      };

      const result = detectDatabases(codebase);
      assert.ok(result.types.includes('MongoDB'));
      assert.ok(result.models.includes('User'));
      assert.ok(result.models.includes('Project'));
      assert.ok(result.models.includes('customers'));
    });
  });

  describe('Module Detection & Responsibilities', () => {
    const clusterIntoModules = (fileList) => {
      const moduleMap = {};

      for (const file of fileList) {
        const parts = file.split(/[\\/]/);
        let modName = 'Core System';
        if (parts.length > 1) {
          const topFolder = parts[0].toLowerCase();
          if (['controllers', 'routes', 'api'].includes(topFolder)) modName = 'API & Routing Module';
          else if (['models', 'schemas', 'database', 'db'].includes(topFolder)) modName = 'Database & Persistence Module';
          else if (['middleware', 'auth', 'security'].includes(topFolder)) modName = 'Authentication & Security Module';
          else if (['components', 'views', 'pages'].includes(topFolder)) modName = 'UI & Presentation Module';
          else if (['utils', 'helpers', 'services'].includes(topFolder)) modName = 'Business Logic & Services Module';
        }

        if (!moduleMap[modName]) {
          moduleMap[modName] = { name: modName, files: [], count: 0 };
        }
        moduleMap[modName].files.push(file);
        moduleMap[modName].count++;
      }

      return Object.values(moduleMap);
    };

    it('segments codebase files into accurate modules without synthetic hallucinations', () => {
      const files = [
        'routes/auth.js',
        'routes/projects.js',
        'models/User.js',
        'models/Project.js',
        'middleware/auth.js',
        'components/Navbar.jsx',
        'utils/logger.js'
      ];

      const modules = clusterIntoModules(files);
      assert.strictEqual(modules.length, 5);

      const authMod = modules.find(m => m.name === 'Authentication & Security Module');
      assert.ok(authMod);
      assert.strictEqual(authMod.count, 1);
      assert.ok(authMod.files.includes('middleware/auth.js'));

      const dbMod = modules.find(m => m.name === 'Database & Persistence Module');
      assert.ok(dbMod);
      assert.strictEqual(dbMod.count, 2);
    });
  });
});
