const pool = require('../db');

// Начать попытку прохождения квиза
const startAttempt = async (req, res) => {
    try {
        const { quizId } = req.params;
        const userId = req.user.id;

        // Проверяем, существует ли опубликованный квиз
        const quizResult = await pool.query(
            `SELECT id, time_limit_seconds
             FROM quizzes
             WHERE id = $1 AND status = 'published'`,
            [quizId]
        );

        if (quizResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Опубликованный квиз не найден'
            });
        }

        const quiz = quizResult.rows[0];

        // Проверяем, есть ли незавершённая попытка
        const existingAttempt = await pool.query(
            `SELECT id, started_at, expires_at
             FROM attempts
             WHERE quiz_id = $1
                AND user_id = $2
                AND status = 'in_progress'
                AND expires_at > NOW()`,
            [quizId, userId]
        );

        if (existingAttempt.rows.length > 0) {
            return res.status(409).json({
                message: 'У вас уже есть незавершённая попытка',
                attempt: existingAttempt.rows[0]
            });
        }

        // Создаём новую попытку
        const result = await pool.query(
            `INSERT INTO attempts
                (quiz_id, user_id, started_at, expires_at, status)
             VALUES (
                $1, $2, NOW(),
                NOW() + ($3 * INTERVAL '1 second'),
                'in_progress'
             )
             RETURNING id, quiz_id, user_id, started_at, expires_at, status`,
            [quizId, userId, quiz.time_limit_seconds]
        );

        res.status(201).json({
            message: 'Попытка успешно начата',
            attempt: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка запуска попытки:', error.message);

        res.status(500).json({
            message: 'Не удалось начать попытку'
        });
    }
};

// Получить вопросы для попытки
const getAttemptQuestions = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.user.id;

        // Проверяем принадлежность и состояние попытки
        const attemptResult = await pool.query(
            `SELECT id, quiz_id, expires_at, status
             FROM attempts
             WHERE id = $1 AND user_id = $2`,
            [attemptId, userId]
        );

        if (attemptResult.rows.length === 0) {
            return res.status(404).json({
                message: 'Попытка не найдена'
            });
        }

        const attempt = attemptResult.rows[0];

        if (attempt.status !== 'in_progress' ||
            new Date(attempt.expires_at) <= new Date()) {
            return res.status(400).json({
                message: 'Попытка завершена или время истекло'
            });
        }

        // Получаем вопросы и варианты ответов без правильных ответов
        const result = await pool.query(
            `SELECT
                 q.id AS question_id,
                 q.text AS question_text,
                 q.points,
                 ao.id AS answer_id,
                 ao.text AS answer_text,
                 aa.selected_option_id
             FROM questions q
             LEFT JOIN answer_options ao ON ao.question_id = q.id
             LEFT JOIN attempt_answers aa
                 ON aa.question_id = q.id
                 AND aa.attempt_id = $2
             WHERE q.quiz_id = $1
             ORDER BY q.position, ao.position`,
            [attempt.quiz_id, attemptId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения вопросов:', error.message);

        res.status(500).json({
            message: 'Не удалось получить вопросы'
        });
    }
};

// Сохранить ответ участника
const submitAnswer = async (req, res) => {
    let client;

    try {
        const { attemptId } = req.params;
        const { questionId, answerId } = req.body;
        const userId = req.user.id;

        if (!questionId || !answerId) {
            return res.status(400).json({
                message: 'Необходимо указать вопрос и вариант ответа'
            });
        }

        client = await pool.connect();
        await client.query('BEGIN');

        // Блокируем попытку до завершения транзакции
        const attemptResult = await client.query(
            `SELECT id, quiz_id, expires_at, status
             FROM attempts
             WHERE id = $1 AND user_id = $2
             FOR UPDATE`,
            [attemptId, userId]
        );

        if (attemptResult.rows.length === 0) {
            await client.query('ROLLBACK');

            return res.status(404).json({
                message: 'Попытка не найдена'
            });
        }

        const attempt = attemptResult.rows[0];

        if (attempt.status !== 'in_progress' ||
            new Date(attempt.expires_at) <= new Date()) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                message: 'Попытка завершена или время истекло'
            });
        }

        // Проверяем принадлежность вопроса и варианта ответа
        const answerCheck = await client.query(
            `SELECT ao.id
             FROM answer_options ao
             JOIN questions q ON q.id = ao.question_id
             WHERE ao.id = $1
               AND q.id = $2
               AND q.quiz_id = $3`,
            [answerId, questionId, attempt.quiz_id]
        );

        if (answerCheck.rows.length === 0) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                message: 'Неверный вариант ответа для этого вопроса'
            });
        }

        // Сохраняем ответ или обновляем предыдущий
        const result = await client.query(
            `INSERT INTO attempt_answers
                (attempt_id, question_id, selected_option_id, answered_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (attempt_id, question_id)
             DO UPDATE SET
                selected_option_id = EXCLUDED.selected_option_id,
                answered_at = NOW()
             RETURNING id, attempt_id, question_id,
                       selected_option_id, answered_at`,
            [attemptId, questionId, answerId]
        );

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Ответ сохранён',
            answer: result.rows[0]
        });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }

        console.error('Ошибка сохранения ответа:', error.message);

        res.status(500).json({
            message: 'Не удалось сохранить ответ'
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Завершить попытку и подсчитать результат
const finishAttempt = async (req, res) => {
    let client;

    try {
        const { attemptId } = req.params;
        const userId = req.user.id;

        client = await pool.connect();
        await client.query('BEGIN');

        // Блокируем попытку до завершения транзакции
        const attemptResult = await client.query(
            `SELECT id, quiz_id, expires_at, status
             FROM attempts
             WHERE id = $1 AND user_id = $2
             FOR UPDATE`,
            [attemptId, userId]
        );

        if (attemptResult.rows.length === 0) {
            await client.query('ROLLBACK');

            return res.status(404).json({
                message: 'Попытка не найдена'
            });
        }

        const attempt = attemptResult.rows[0];

        if (attempt.status !== 'in_progress') {
            await client.query('ROLLBACK');

            return res.status(400).json({
                message: 'Попытка уже завершена'
            });
        }

        if (new Date(attempt.expires_at) <= new Date()) {
            await client.query(
                `UPDATE attempts
                 SET status = 'expired'
                 WHERE id = $1`,
                [attemptId]
            );

            await client.query('COMMIT');

            return res.status(400).json({
                message: 'Время попытки истекло'
            });
        }

        // Подсчитываем баллы за правильные ответы
        const scoreResult = await client.query(
            `SELECT COALESCE(SUM(q.points), 0) AS score
             FROM attempt_answers aa
             JOIN questions q ON q.id = aa.question_id
             JOIN answer_options ao
               ON ao.id = aa.selected_option_id
              AND ao.question_id = q.id
             WHERE aa.attempt_id = $1
               AND ao.is_correct = TRUE`,
            [attemptId]
        );

        const score = Number(scoreResult.rows[0].score);

        // Сохраняем результат
        const result = await client.query(
            `UPDATE attempts
             SET score = $1,
                 status = 'completed',
                 submitted_at = NOW()
             WHERE id = $2
             RETURNING id, score, status, submitted_at`,
            [score, attemptId]
        );

        await client.query('COMMIT');

        res.json({
            message: 'Попытка успешно завершена',
            result: result.rows[0]
        });
    } catch (error) {
        if (client) {
            await client.query('ROLLBACK');
        }

        console.error('Ошибка завершения попытки:', error.message);

        res.status(500).json({
            message: 'Не удалось завершить попытку'
        });
    } finally {
        if (client) {
            client.release();
        }
    }
};

// Получить историю попыток пользователя
const getAttemptHistory = async (req, res) => {
    try {
        const userId = req.user.id;

        await pool.query(
            `UPDATE attempts
            SET status = 'expired'
            WHERE user_id = $1
                AND status = 'in_progress'
                AND expires_at <= NOW()`,
            [userId]
        );

        const result = await pool.query(
            `SELECT
                a.id,
                a.quiz_id,
                q.title AS quiz_title,
                a.score,
                a.status,
                a.started_at,
                a.submitted_at
             FROM attempts a
             JOIN quizzes q ON q.id = a.quiz_id
             WHERE a.user_id = $1
             ORDER BY a.started_at DESC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения истории попыток:', error);
        res.status(500).json({
            message: 'Ошибка получения истории попыток'
        });
    }
};

// Получить рейтинг участников квиза
const getLeaderboard = async (req, res) => {
    try {
        const { quizId } = req.params;

        const result = await pool.query(
            `SELECT
                u.id AS user_id,
                u.username,
                MAX(a.score) AS best_score
             FROM attempts a
             JOIN users u ON u.id = a.user_id
             WHERE a.quiz_id = $1
               AND a.status = 'completed'
             GROUP BY u.id, u.username
             ORDER BY best_score DESC`,
            [quizId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка получения рейтинга:', error.message);

        res.status(500).json({
            message: 'Не удалось получить рейтинг'
        });
    }
};

module.exports = {
    startAttempt,
    getAttemptQuestions,
    submitAnswer,
    finishAttempt,
    getAttemptHistory,
    getLeaderboard
};