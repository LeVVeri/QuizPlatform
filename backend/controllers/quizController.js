const pool = require('../db');

// Получить список опубликованных квизов
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

// Создать квиз
const createQuiz = async (req, res) => {
    try {
        const { title, description, time_limit_seconds } = req.body;
        const creator_id = req.user.id;

        if (typeof title !== 'string' || !title.trim() ||
            !Number.isInteger(time_limit_seconds) || time_limit_seconds <= 0) {
            return res.status(400).json({
                message: 'Проверьте правильность заполнения полей'
            });
        }

        const result = await pool.query(
            `INSERT INTO quizzes (creator_id, title, description, time_limit_seconds)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [creator_id, title.trim(), description || null, time_limit_seconds]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка создания квиза:', error.message);

        res.status(500).json({
            message: 'Не удалось создать квиз'
        });
    }
};

// Редактировать квиз
const updateQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const { title, description, time_limit_seconds, status } = req.body;
        const creator_id = req.user.id;

        if (typeof title !== 'string' || !title.trim() ||
            !Number.isInteger(time_limit_seconds) || time_limit_seconds <= 0 ||
            !['draft', 'published', 'archived'].includes(status)) {
            return res.status(400).json({
                message: 'Проверьте правильность заполнения полей'
            });
        }

        // Проверяем содержимое перед публикацией
        if (status === 'published') {
            const validation = await pool.query(
                `SELECT
                    COUNT(DISTINCT q.id) AS question_count,
                    COUNT(DISTINCT CASE WHEN ao.is_correct = TRUE
                        THEN q.id END) AS questions_with_correct_answers
                 FROM quizzes quiz
                 LEFT JOIN questions q ON q.quiz_id = quiz.id
                 LEFT JOIN answer_options ao ON ao.question_id = q.id
                 WHERE quiz.id = $1 AND quiz.creator_id = $2
                 GROUP BY quiz.id`,
                [quizId, creator_id]
            );

            if (validation.rows.length === 0) {
                return res.status(404).json({
                    message: 'Квиз не найден или у вас нет прав'
                });
            }

            const { question_count, questions_with_correct_answers } =
                validation.rows[0];

            if (Number(question_count) === 0 ||
                Number(question_count) !== Number(questions_with_correct_answers)) {
                return res.status(400).json({
                    message: 'Для публикации добавьте вопросы и хотя бы один правильный ответ к каждому вопросу'
                });
            }
        }

        const result = await pool.query(
            `UPDATE quizzes
             SET title = $1,
                 description = $2,
                 time_limit_seconds = $3,
                 status = $4
             WHERE id = $5
               AND creator_id = $6
               AND status = 'draft'
             RETURNING *`,
            [title.trim(), description || null, time_limit_seconds, status, quizId, creator_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Квиз не найден или у вас нет прав на его редактирование'
            });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка редактирования квиза:', error.message);

        res.status(500).json({
            message: 'Не удалось изменить квиз'
        });
    }
};

// Удалить квиз
const deleteQuiz = async (req, res) => {
    try {
        const { quizId } = req.params;
        const creator_id = req.user.id;

        const result = await pool.query(
            `DELETE FROM quizzes
             WHERE id = $1 AND creator_id = $2
             RETURNING id`,
            [quizId, creator_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: 'Квиз не найден или у вас нет прав на его удаление'
            });
        }

        res.json({
            message: 'Квиз успешно удалён'
        });
    } catch (error) {
        if (error.code === '23503') {
            return res.status(409).json({
                message: 'Нельзя удалить квиз, по которому уже есть попытки прохождения'
            });
        }

        console.error('Ошибка удаления квиза:', error.message);

        res.status(500).json({
            message: 'Не удалось удалить квиз'
        });
    }
};

module.exports = {
    getQuizzes,
    createQuiz,
    updateQuiz,
    deleteQuiz
};
