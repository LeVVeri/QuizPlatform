const express = require('express');
const router = express.Router();

const {
    startAttempt,
    getAttemptQuestions,
    submitAnswer,
    finishAttempt,
    getAttemptHistory,
    getLeaderboard
} = require('../controllers/attemptController');

const authMiddleware = require('../middleware/authMiddleware');

router.post('/:quizId/start', authMiddleware, startAttempt);
router.get('/:attemptId/questions', authMiddleware, getAttemptQuestions);
router.post('/:attemptId/answers', authMiddleware, submitAnswer);
router.post('/:attemptId/finish', authMiddleware, finishAttempt);
router.get('/history', authMiddleware, getAttemptHistory);
router.get('/leaderboard/:quizId', authMiddleware, getLeaderboard);

module.exports = router;