const pool = require('../db');

// Получить варианты ответов
const getAnswers = async (req, res) => {
    try {
        const { questionId } = req.params;

        const result = await pool.query(
            `SELECT id, question_id, text, position
             FROM answer_options
             WHERE question_id = $1
             ORDER BY position`,
            [questionId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения вариантов ответов:', error.message);

        res.status(500).json({
            message: 'Не удалось получить варианты ответов'
        });
    }
};

// Создать вариант ответа
const createAnswer = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { text, is_correct, position } = req.body;

        if (typeof text !== 'string' || !text.trim() ||
            typeof is_correct !== 'boolean' ||
            !Number.isInteger(position) || position <= 0) {
            return res.status(400).json({
                message: 'Проверьте правильность заполнения полей'
            });
        }

        const result = await pool.query(
            `INSERT INTO answer_options (question_id, text, is_correct, position)
             SELECT questions.id, $2, $3, $4
             FROM questions
             JOIN quizzes ON quizzes.id = questions.quiz_id
             WHERE questions.id = $1 AND quizzes.creator_id = $5
             RETURNING id, question_id, text, is_correct, position`,
            [questionId, text.trim(), is_correct, position, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Вопрос не найден или у вас нет прав'
            });
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка создания варианта ответа:', error.message);

        res.status(500).json({
            message: 'Не удалось создать вариант ответа'
        });
    }
};

// Удалить вариант ответа
const deleteAnswer = async (req, res) => {
    try {
        const { answerId } = req.params;

        const result = await pool.query(
            `DELETE FROM answer_options
             WHERE id = $1
               AND EXISTS (
                   SELECT 1
                   FROM questions
                   JOIN quizzes ON quizzes.id = questions.quiz_id
                   WHERE questions.id = answer_options.question_id
                     AND quizzes.creator_id = $2
               )
             RETURNING id`,
            [answerId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Вариант ответа не найден или у вас нет прав'
            });
        }

        res.json({
            message: 'Вариант ответа успешно удалён'
        });
    } catch (error) {
        console.error('Ошибка удаления варианта ответа:', error.message);

        res.status(500).json({
            message: 'Не удалось удалить вариант ответа'
        });
    }
};

// Редактировать вариант ответа
const updateAnswer = async (req, res) => {
    try {
        const { answerId } = req.params;
        const { text, is_correct, position } = req.body;

        if (typeof text !== 'string' || !text.trim() ||
            typeof is_correct !== 'boolean' ||
            !Number.isInteger(position) || position <= 0) {
            return res.status(400).json({
                message: 'Проверьте правильность заполнения полей'
            });
        }

        const result = await pool.query(
            `UPDATE answer_options
             SET text = $1, is_correct = $2, position = $3
             WHERE id = $4
               AND EXISTS (
                   SELECT 1
                   FROM questions
                   JOIN quizzes ON quizzes.id = questions.quiz_id
                   WHERE questions.id = answer_options.question_id
                     AND quizzes.creator_id = $5
               )
             RETURNING id, question_id, text, is_correct, position`,
            [text.trim(), is_correct, position, answerId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Вариант ответа не найден или у вас нет прав'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка редактирования варианта ответа:', error.message);

        res.status(500).json({
            message: 'Не удалось изменить вариант ответа'
        });
    }
};

module.exports = {
    getAnswers,
    createAnswer,
    deleteAnswer,
    updateAnswer
};
