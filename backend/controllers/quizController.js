const pool = require('../db');

// Получить список квизов
const getQuizzes = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, title, description, time_limit_seconds, status, created_at
            FROM quizzes
            WHERE status = 'published'
            ORDER BY created_at DESC
        `);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения квизов:', error.message);

        res.status(500).json({
            message: 'Не удалось получить список квизов'
        });
    }
};

const createQuiz = async (req, res) => {
    try {
        const { creator_id, title, description, time_limit_seconds } = req.body;

        if (!creator_id || !title || !time_limit_seconds || time_limit_seconds <= 0) {
            return res.status(400).json({
                message: 'Заполните обязательные поля'
            });
        }

        const result = await pool.query(
            `INSERT INTO quizzes (creator_id, title, description, time_limit_seconds)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [creator_id, title, description || null, time_limit_seconds]
        );

        res.status(201).json(result.rows[0]);

    } catch (error) {
    console.error('Ошибка создания квиза:', error.message);

    res.status(500).json({
        message: 'Не удалось создать квиз'
    });
    }
};

module.exports = {
    getQuizzes,
    createQuiz
};