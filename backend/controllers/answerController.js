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

        if (!text || !text.trim() || typeof is_correct !== 'boolean' ||
            !Number.isInteger(position) || position <= 0) {
            return res.status(400).json({
                message: 'Проверьте правильность заполнения полей'
            });
        }

        const result = await pool.query(
            `INSERT INTO answer_options (question_id, text, is_correct, position)
             VALUES ($1, $2, $3, $4)
             RETURNING id, question_id, text, is_correct, position`,
            [questionId, text.trim(), is_correct, position]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23503') {
            return res.status(404).json({
                message: 'Вопрос не найден'
            });
        }

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
             RETURNING id`,
            [answerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Вариант ответа не найден'
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

        if (!text || !text.trim() || typeof is_correct !== 'boolean' ||
            !Number.isInteger(position) || position <= 0) {
            return res.status(400).json({
                message: 'Проверьте правильность заполнения полей'
            });
        }

        const result = await pool.query(
            `UPDATE answer_options
             SET text = $1, is_correct = $2, position = $3
             WHERE id = $4
             RETURNING id, question_id, text, is_correct, position`,
            [text.trim(), is_correct, position, answerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Вариант ответа не найден'
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