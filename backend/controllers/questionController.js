const pool = require('../db');

// Получить вопросы квиза
const getQuestions = async (req, res) => {
    try {
        const { quizId } = req.params;

        const result = await pool.query(
            `SELECT id, quiz_id, text, points, position
             FROM questions
             WHERE quiz_id = $1
             ORDER BY position`,
            [quizId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения вопросов:', error.message);

        res.status(500).json({
            message: 'Не удалось получить вопросы квиза'
        });
    }
};

// Создать вопрос
const createQuestion = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { text, points, position } = req.body;

        if (!text || !text.trim() ||
            !Number.isInteger(points) || points <= 0 ||
            !Number.isInteger(position) || position <= 0) {
            return res.status(400).json({
                message: 'Заполните обязательные поля'
            });
        }

        const result = await pool.query(
            `INSERT INTO questions (quiz_id, text, points, position)
             SELECT id, $2, $3, $4
             FROM quizzes
             WHERE id = $1 AND creator_id = $5
             RETURNING *`,
            [quizId, text.trim(), points, position, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Квиз не найден или у вас нет прав'
            });
        }

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка создания вопроса:', error.message);

        res.status(500).json({
            message: 'Не удалось создать вопрос'
        });
    }
};

// Редактировать вопрос
const updateQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;
        const { text, points, position } = req.body;

        if (!text || !text.trim() ||
            !Number.isInteger(points) || points <= 0 ||
            !Number.isInteger(position) || position <= 0) {
            return res.status(400).json({
                message: 'Проверьте правильность заполнения полей'
            });
        }

        const result = await pool.query(
            `UPDATE questions
             SET text = $1, points = $2, position = $3
             WHERE id = $4
               AND EXISTS (
                   SELECT 1 FROM quizzes
                   WHERE quizzes.id = questions.quiz_id
                     AND quizzes.creator_id = $5
               )
             RETURNING *`,
            [text.trim(), points, position, questionId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Вопрос не найден или у вас нет прав'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка редактирования вопроса:', error.message);

        res.status(500).json({
            message: 'Не удалось изменить вопрос'
        });
    }
};

// Удалить вопрос
const deleteQuestion = async (req, res) => {
    try {
        const { questionId } = req.params;

        const result = await pool.query(
            `DELETE FROM questions
             WHERE id = $1
               AND EXISTS (
                   SELECT 1 FROM quizzes
                   WHERE quizzes.id = questions.quiz_id
                     AND quizzes.creator_id = $2
               )
             RETURNING id`,
            [questionId, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Вопрос не найден или у вас нет прав'
            });
        }

        res.json({
            message: 'Вопрос успешно удалён'
        });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({
                message: 'Нельзя удалить вопрос, связанный с попытками прохождения'
            });
        }

        console.error('Ошибка удаления вопроса:', error.message);

        res.status(500).json({
            message: 'Не удалось удалить вопрос'
        });
    }
};

module.exports = {
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion
};
