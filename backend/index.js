const express = require('express');
const cors = require('cors');
const quizRoutes = require('./routes/quizRoutes');
const authRoutes = require('./routes/authRoutes');
const attemptRoutes = require('./routes/attemptRoutes');
require('dotenv').config();
if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET не задан в файле .env');
}

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: 'http://localhost:5173'
}));
app.use(express.json());
app.use('/api/quizzes', quizRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/attempts', attemptRoutes);

// старт сервера
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
