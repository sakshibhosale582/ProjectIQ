const { describe, it } = require('node:test');
const assert = require('node:assert');

describe('Assessment Suite: Learning Path, Quiz & Mock Interview', () => {

  describe('Learning Path Roadmap & Progression', () => {
    const buildMockRoadmap = (project) => {
      return [
        {
          id: 'fundamental',
          name: `${project.name} Structure & Core Entry Points`,
          duration: '15 mins',
          difficulty: 'Easy',
          status: 'in-progress'
        },
        {
          id: 'architecture',
          name: `${project.name} Architecture & Request Flow`,
          duration: '25 mins',
          difficulty: 'Medium',
          status: 'locked'
        },
        {
          id: 'database',
          name: `${project.name} Data Models & Persistence`,
          duration: '30 mins',
          difficulty: 'Hard',
          status: 'locked'
        }
      ];
    };

    it('generates sequential syllabus roadmap with first module unlocked', () => {
      const mockProject = { name: 'E-Commerce Core' };
      const roadmap = buildMockRoadmap(mockProject);

      assert.strictEqual(roadmap.length, 3);
      assert.strictEqual(roadmap[0].status, 'in-progress');
      assert.strictEqual(roadmap[1].status, 'locked');
      assert.strictEqual(roadmap[2].status, 'locked');
      assert.ok(roadmap[0].name.includes('E-Commerce Core'));
    });

    it('unlocks subsequent modules and increments user completion state', () => {
      const roadmap = buildMockRoadmap({ name: 'Test' });
      const completedModuleId = 'fundamental';

      const updatedRoadmap = roadmap.map((m, idx) => {
        if (m.id === completedModuleId) {
          return { ...m, status: 'completed' };
        }
        if (idx === 1) {
          return { ...m, status: 'in-progress' };
        }
        return m;
      });

      assert.strictEqual(updatedRoadmap[0].status, 'completed');
      assert.strictEqual(updatedRoadmap[1].status, 'in-progress');
      assert.strictEqual(updatedRoadmap[2].status, 'locked');
    });
  });

  describe('Quiz Engine & Scorecard Evaluation', () => {
    const evaluateQuizAnswers = (questions, userAnswers) => {
      let score = 0;
      const breakdown = [];

      questions.forEach((q, idx) => {
        const isCorrect = userAnswers[idx] === q.correct;
        if (isCorrect) score++;
        breakdown.push({
          questionIndex: idx,
          isCorrect,
          selected: userAnswers[idx],
          correct: q.correct,
          explanation: q.explanation
        });
      });

      const percentage = Math.round((score / questions.length) * 100);
      const passed = percentage >= 50;

      return {
        score,
        total: questions.length,
        percentage,
        passed,
        breakdown
      };
    };

    it('evaluates quiz answers, calculates percentage score, and awards pass status', () => {
      const questions = [
        { question: 'Q1', options: ['A', 'B', 'C', 'D'], correct: 0, explanation: 'A is correct' },
        { question: 'Q2', options: ['A', 'B', 'C', 'D'], correct: 1, explanation: 'B is correct' },
        { question: 'Q3', options: ['A', 'B', 'C', 'D'], correct: 2, explanation: 'C is correct' },
        { question: 'Q4', options: ['A', 'B', 'C', 'D'], correct: 3, explanation: 'D is correct' }
      ];

      // 3 correct, 1 wrong -> 75%
      const userAnswers = [0, 1, 2, 0];
      const result = evaluateQuizAnswers(questions, userAnswers);

      assert.strictEqual(result.score, 3);
      assert.strictEqual(result.total, 4);
      assert.strictEqual(result.percentage, 75);
      assert.strictEqual(result.passed, true);
      assert.strictEqual(result.breakdown[3].isCorrect, false);
    });

    it('identifies failing attempts (<50%) and provides explanation breakdown', () => {
      const questions = [
        { question: 'Q1', options: ['A', 'B'], correct: 0, explanation: 'E1' },
        { question: 'Q2', options: ['A', 'B'], correct: 1, explanation: 'E2' }
      ];

      const userAnswers = [1, 0]; // 0 correct -> 0%
      const result = evaluateQuizAnswers(questions, userAnswers);

      assert.strictEqual(result.score, 0);
      assert.strictEqual(result.percentage, 0);
      assert.strictEqual(result.passed, false);
    });
  });

  describe('Mock Interview Engine & Multi-Criteria Evaluation', () => {
    const evaluateMockInterview = (transcripts) => {
      // Metric scoring formula based on explanation quality
      let totalScore = 0;
      const evaluatedAnswers = transcripts.map(item => {
        const wordCount = item.answer.trim().split(/\s+/).length;
        const correctness = wordCount >= 15 ? 85 : wordCount >= 5 ? 60 : 30;
        const missingPoints = wordCount < 15 ? ['Could explain edge cases', 'Could mention security tradeoffs'] : [];
        const explainedWell = wordCount >= 5 ? ['Addressed primary question objective'] : [];
        const sampleAnswer = `In ${item.context || 'this project'}, this component handles the request through modular boundaries.`;

        totalScore += correctness;

        return {
          question: item.question,
          answer: item.answer,
          correctness,
          missingPoints,
          explainedWell,
          sampleAnswer
        };
      });

      const finalScore = Math.round(totalScore / transcripts.length);
      const passed = finalScore >= 50;

      return {
        finalScore,
        passed,
        evaluatedAnswers,
        readinessLevel: finalScore >= 75 ? 'Interview Ready' : finalScore >= 50 ? 'Needs Minor Practice' : 'Requires Revision'
      };
    };

    it('evaluates interview transcripts with constructive explainable feedback', () => {
      const mockTranscripts = [
        {
          question: 'How is user authentication secured in this project?',
          answer: 'We use JWT stored in local storage, verified by an auth middleware using a secret loaded from environment variables.',
          context: 'ProjectIQ'
        },
        {
          question: 'How do modules communicate in your architecture?',
          answer: 'Through REST API endpoints and Express router controllers that import database models.',
          context: 'ProjectIQ'
        }
      ];

      const evaluation = evaluateMockInterview(mockTranscripts);
      assert.ok(evaluation.finalScore >= 70);
      assert.strictEqual(evaluation.passed, true);
      assert.strictEqual(evaluation.evaluatedAnswers.length, 2);

      const firstEvaluation = evaluation.evaluatedAnswers[0];
      assert.ok(firstEvaluation.sampleAnswer);
      assert.ok(firstEvaluation.explainedWell.length > 0);
    });
  });

  describe('Oral Viva Evaluation & Rubric Engine', () => {
    const evaluateVivaRubric = (project, answers) => {
      const tech = (project.techStack || []).join(' ').toLowerCase();
      const files = (project.importantFiles || []).map(f => (f.name || '').toLowerCase());
      let total = 0;

      answers.forEach(ans => {
        const text = String(ans || '').trim();
        const words = text.split(/\s+/).filter(Boolean);
        let score = 35;
        if (words.length >= 10) score += 25;
        if (words.length >= 25) score += 20;
        const lower = text.toLowerCase();
        if (tech && tech.split(' ').some(t => t.length > 2 && lower.includes(t))) score += 20;
        total += Math.min(100, score);
      });

      const avg = Math.round(total / answers.length);
      return {
        score: avg,
        passed: avg >= 50,
        feedback: [`Score: ${avg}/100`]
      };
    };

    it('evaluates oral viva answers with project context and keywords', () => {
      const project = {
        name: 'ProjectIQ',
        techStack: ['Node.js', 'Express', 'React', 'MongoDB'],
        importantFiles: [{ name: 'server.js' }]
      };
      const answers = [
        'The application bootstraps inside server.js using Express and establishes connection to MongoDB database.',
        'Data flows from React frontend to backend Express REST endpoints through JWT-authenticated middleware.'
      ];

      const res = evaluateVivaRubric(project, answers);
      assert.ok(res.score >= 70);
      assert.strictEqual(res.passed, true);
    });
  });
});
