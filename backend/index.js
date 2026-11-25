const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// проверка
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        message: 'QuizPlatform API is running'
    });
});

// старт сервера
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
