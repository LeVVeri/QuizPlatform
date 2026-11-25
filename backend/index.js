const express = require('express');
const cors = require('cors');
const pool = require('./db');
const quizRoutes = require('./routes/quizRoutes');
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/quizzes', quizRoutes);
app.use('/api/auth', authRoutes);

// проверка
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'QuizPlatform API is running'
    });
});


app.get('/api/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');

        res.json({
            status: 'ok',
            databaseTime: new Date(result.rows[0].now).toLocaleString('ru-RU', {
                timeZone: 'Europe/Moscow'
            })
        });
    } catch (error) {
        console.error('Database connection error:', error.message);

        res.status(500).json({
            status: 'error',
            message: 'Не удалось подключиться к базе данных'
        });
    }
});

// старт сервера
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
