const express = require('express');
const router = express.Router();

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
router.post('/', createQuiz);
router.put('/:quizId', updateQuiz);
router.delete('/:quizId', deleteQuiz);

router.get('/:quizId/questions', getQuestions);
router.post('/:quizId/questions', createQuestion);
router.put('/questions/:questionId', updateQuestion);
router.delete('/questions/:questionId', deleteQuestion);

router.get('/questions/:questionId/answers', getAnswers);
router.post('/questions/:questionId/answers', createAnswer);
router.put('/questions/:questionId/answers/:answerId', updateAnswer);
router.delete('/questions/:questionId/answers/:answerId', deleteAnswer);

module.exports = router;
