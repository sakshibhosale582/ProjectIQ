const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Please add a project name']
  },
  description: {
    type: String,
    required: [true, 'Please add a description']
  },
  techStack: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['Pending', 'Analyzing', 'Analyzed', 'Failed'],
    default: 'Pending'
  },
  // Legacy field kept for old documents. New projects never get an AI-guessed score;
  // real readiness is computed from quiz / viva / interview results (see prepareController).
  understanding: {
    type: Number,
    default: null
  },
  metrics: {
    understanding: { type: Number, default: null },
    interviewReadiness: { type: Number, default: null },
    confidence: { type: Number, default: null },
    architecture: { type: Number, default: null },
    
    // Programmatic metrics (Hybrid Phase 1)
    totalFiles: { type: Number, default: 0 },
    sourceFiles: { type: Number, default: 0 },
    linesOfCode: { type: Number, default: 0 },
    apiEndpointsCount: { type: Number, default: 0 },
    codeIssuesCount: { type: Number, default: 0 }
  },
  
  // Dynamic distributions and structures
  languageDistribution: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  dependencies: {
    type: [String],
    default: []
  },
  codeIssues: [
    {
      filePath: { type: String, required: true },
      line: { type: Number, default: 0 },
      severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
      issueType: { type: String, required: true },
      category: { type: String, default: '' },
      message: { type: String, required: true },
      suggestion: { type: String, default: '' },
      count: { type: Number, default: 1 }
    }
  ],
  // Project code se detect kiye gaye security issues
  securityFindings: [
    {
      title: { type: String, required: true },
      category: { 
        type: String, 
        enum: ['Hardcoded Secrets', 'Authentication / Authorization', 'Unsafe Configuration', 'Sensitive Data Exposure', 'Dependency Risks', 'Injection / XSS', 'Weak Cryptography'], 
        required: true 
      },
      severity: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Low' },
      filePath: { type: String, required: true },
      line: { type: Number, default: 0 },
      codeSnippet: { type: String, default: '' },
      explanation: { type: String, required: true },
      remediation: { type: String, required: true }
    }
  ],
  dependencyGraph: [
    {
      from: { type: String, required: true },
      to: { type: String, required: true },
      relationType: { type: String, default: 'imports' }
    }
  ],
  
  folderStructure: {
    type: mongoose.Schema.Types.Mixed
  },
  importantFiles: [
    {
      name: { type: String, required: true },
      purpose: { type: String, required: true },
      explanation: { type: String, required: true },
      code: { type: String, default: '' }
    }
  ],
  modules: [
    {
      name: { type: String, required: true },
      category: { type: String },
      type: { type: String },
      purpose: { type: String, required: true },
      techs: { type: [String], default: [] },
      files: { type: [String], default: [] },
      dependencies: { type: [String], default: [] },
      connections: { type: [String], default: [] },
      explanation: { type: String, default: '' },
      classesOrComponents: { type: [String], default: [] }
    }
  ],
  // Real architecture derived from the scanned repository (layers, edges, entry points, summary)
  architecture: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // How the analysis was produced and how complete it is
  analysis: {
    mode: { type: String, enum: ['ai', 'static'], default: 'static' },
    warnings: { type: [String], default: [] },
    scanStats: { type: mongoose.Schema.Types.Mixed, default: {} },
    codeIssuesTotal: { type: Number, default: 0 },
    securityFindingsTotal: { type: Number, default: 0 },
    dependencyGraphTotal: { type: Number, default: 0 }
  },
  // RAG indexing lifecycle: pending -> indexing -> ready | failed | skipped
  indexing: {
    status: { type: String, enum: ['pending', 'indexing', 'ready', 'failed', 'skipped'], default: 'pending' },
    mode: { type: String, enum: ['embeddings', 'keyword'], default: 'embeddings' },
    total: { type: Number, default: 0 },
    done: { type: Number, default: 0 },
    error: { type: String, default: '' },
    updatedAt: { type: Date }
  },
  architectureFlow: [
    {
      from: { type: String, required: true },
      to: { type: String, required: true },
      relationType: { type: String, default: 'calls' }
    }
  ],
  endpointRoutes: [
    {
      path: { type: String, required: true },
      method: { type: String, required: true },
      handlerFile: { type: String },
      type: { type: String, default: 'API Route' }
    }
  ],
  databaseInfo: {
    dbType: { type: String, default: 'None detected' },
    connectionStringFile: { type: String },
    detectedTablesOrCollections: { type: [String], default: [] }
  },
  // Server-side only (contain answer keys) -> never selected by default
  quizQuestions: {
    Easy: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    Medium: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    Hard: { type: [mongoose.Schema.Types.Mixed], default: [], select: false }
  },
  vivaQuestions: {
    Easy: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    Medium: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    Hard: { type: [mongoose.Schema.Types.Mixed], default: [], select: false }
  },
  interviewQuestions: {
    Easy: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    Medium: { type: [mongoose.Schema.Types.Mixed], default: [], select: false },
    Hard: { type: [mongoose.Schema.Types.Mixed], default: [], select: false }
  }
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
