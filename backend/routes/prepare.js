const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { aiLimiter, apiLimiter } = require('../middleware/rateLimits');
const {
  getRoadmap,
  completeRoadmapModule,
  getQuizQuestions,
  submitQuizScore,
  getVivaQuestions,
  submitVivaAnswers,
  getInterviewQuestions,
  evaluateMockInterview,
  getInterviewHistory,
  getInterviewReadiness,
  getQuizHistory,
  getVivaHistory,
  getPracticeQuestions
} = require('../controllers/prepareController');

// @route   GET /api/prepare/:id/roadmap
// @desc    Retrieve dynamic, persistent learning roadmap for the project (Phase 12)
router.get('/:id/roadmap', protect, getRoadmap);

// @route   POST /api/prepare/:id/roadmap/complete
// @desc    Mark a syllabus roadmap node completed and award XP (Phase 12)
router.post('/:id/roadmap/complete', protect, completeRoadmapModule);

// @route   GET /api/prepare/:id/quiz
// @desc    Generate dynamic project-specific quiz questions
router.get('/:id/quiz', protect, aiLimiter, getQuizQuestions);

// @route   POST /api/prepare/:id/quiz/submit
// @desc    Submit quiz choices, log QuizAttempt history, and sync user profile XP (Phase 13/14)
router.post('/:id/quiz/submit', protect, apiLimiter, submitQuizScore);

// @route   GET /api/prepare/:id/viva
// @desc    Generate custom project-specific Viva questions
router.get('/:id/viva', protect, aiLimiter, getVivaQuestions);

// @route   POST /api/prepare/:id/viva/submit
// @desc    Evaluate viva answers, log VivaAttempt history, and sync user profile XP
router.post('/:id/viva/submit', protect, aiLimiter, submitVivaAnswers);

// @route   GET /api/prepare/:id/interview/questions
// @desc    Generate dynamic project-specific Mock Interview questions
router.get('/:id/interview/questions', protect, aiLimiter, getInterviewQuestions);

// @route   POST /api/prepare/:id/interview/evaluate
// @desc    Evaluate technical mock interview, save MockInterview scorecard to DB (Phase 15)
router.post('/:id/interview/evaluate', protect, aiLimiter, evaluateMockInterview);

// @route   GET /api/prepare/:id/interview/history
// @desc    Retrieve past Mock Interview scorecard attempts history logs
router.get('/:id/interview/history', protect, getInterviewHistory);

// @route   GET /api/prepare/:id/readiness
// @desc    Calculate technical interview readiness index dynamically (Phase 16)
router.get('/:id/readiness', protect, getInterviewReadiness);

// @route   GET /api/prepare/:id/quiz/history
// @desc    Retrieve past MCQ Quiz scorecard attempts history logs
router.get('/:id/quiz/history', protect, getQuizHistory);

// @route   GET /api/prepare/:id/viva/history
// @desc    Retrieve past Oral Viva scorecard attempts history logs
router.get('/:id/viva/history', protect, getVivaHistory);

// @route   GET /api/prepare/:id/practice
// @desc    Generate 10 targeted practice questions dynamically
router.get('/:id/practice', protect, aiLimiter, getPracticeQuestions);

module.exports = router;
