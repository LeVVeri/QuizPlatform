const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');

const {
    getQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz
} = require('../controllers/quizController');
const {
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion
} = require('../controllers/questionController');
const {
    getAnswers,
    createAnswer,
    deleteAnswer,
    updateAnswer
} = require('../controllers/answerController');

router.get('/', getQuizzes);
router.post('/', authMiddleware, createQuiz);
router.put('/:quizId', authMiddleware, updateQuiz);
router.delete('/:quizId', authMiddleware, deleteQuiz);

router.get('/:quizId/questions', getQuestions);
router.post('/:quizId/questions', authMiddleware, createQuestion);
router.put('/questions/:questionId', authMiddleware, updateQuestion);
router.delete('/questions/:questionId', authMiddleware, deleteQuestion);

router.get('/questions/:questionId/answers', getAnswers);
router.post('/questions/:questionId/answers', authMiddleware, createAnswer);
router.put('/questions/:questionId/answers/:answerId', authMiddleware, updateAnswer);
router.delete('/questions/:questionId/answers/:answerId', authMiddleware, deleteAnswer);

module.exports = router;
