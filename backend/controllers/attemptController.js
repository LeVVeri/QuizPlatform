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
                ao.text AS answer_text
             FROM questions q
             LEFT JOIN answer_options ao ON ao.question_id = q.id
             WHERE q.quiz_id = $1
             ORDER BY q.position, ao.position`,
            [attempt.quiz_id]
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
    try {
        const { attemptId } = req.params;
        const { questionId, answerId } = req.body;
        const userId = req.user.id;

        if (!questionId || !answerId) {
            return res.status(400).json({
                message: 'Необходимо указать вопрос и вариант ответа'
            });
        }

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

        // Проверяем, что вопрос относится к квизу,
        // а вариант ответа — к этому вопросу
        const answerCheck = await pool.query(
            `SELECT ao.id
             FROM answer_options ao
             JOIN questions q ON q.id = ao.question_id
             WHERE ao.id = $1
               AND q.id = $2
               AND q.quiz_id = $3`,
            [answerId, questionId, attempt.quiz_id]
        );

        if (answerCheck.rows.length === 0) {
            return res.status(400).json({
                message: 'Неверный вариант ответа для этого вопроса'
            });
        }

        // Сохраняем ответ или обновляем предыдущий
        const result = await pool.query(
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

        res.status(201).json({
            message: 'Ответ сохранён',
            answer: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка сохранения ответа:', error.message);

        res.status(500).json({
            message: 'Не удалось сохранить ответ'
        });
    }
};

// Завершить попытку и подсчитать результат
const finishAttempt = async (req, res) => {
    try {
        const { attemptId } = req.params;
        const userId = req.user.id;

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

        if (attempt.status !== 'in_progress') {
            return res.status(400).json({
                message: 'Попытка уже завершена'
            });
        }

        if (new Date(attempt.expires_at) <= new Date()) {
            return res.status(400).json({
                message: 'Время попытки истекло'
            });
        }

        // Подсчитываем баллы за правильные ответы
        const scoreResult = await pool.query(
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
        const result = await pool.query(
            `UPDATE attempts
             SET score = $1,
                 status = 'completed',
                 submitted_at = NOW()
             WHERE id = $2
             RETURNING id, score, status, submitted_at`,
            [score, attemptId]
        );

        res.json({
            message: 'Попытка успешно завершена',
            result: result.rows[0]
        });
    } catch (error) {
        console.error('Ошибка завершения попытки:', error.message);

        res.status(500).json({
            message: 'Не удалось завершить попытку'
        });
    }
};

module.exports = {
    startAttempt,
    getAttemptQuestions,
    submitAnswer,
    finishAttempt
};
