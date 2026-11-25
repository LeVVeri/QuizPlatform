const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Регистрация пользователя
const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password ||
            !username.trim() || !email.trim() || password.length < 8) {
            return res.status(400).json({
                message: 'Проверьте правильность заполнения полей'
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email, created_at`,
            [username.trim(), email.trim().toLowerCase(), passwordHash]
        );

        res.status(201).json({
            message: 'Регистрация успешна',
            user: result.rows[0]
        });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                message: 'Пользователь с таким email уже существует'
            });
        }

        console.error('Ошибка регистрации:', error.message);

        res.status(500).json({
            message: 'Не удалось зарегистрировать пользователя'
        });
    }
};

// Вход пользователя
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: 'Введите email и пароль'
            });
        }

        const result = await pool.query(
            `SELECT id, username, email, password_hash
             FROM users
             WHERE email = $1`,
            [email.trim().toLowerCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: 'Неверный email или пароль'
            });
        }

        const user = result.rows[0];
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                message: 'Неверный email или пароль'
            });
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            message: 'Вход выполнен успешно',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error.message);

        res.status(500).json({
            message: 'Не удалось выполнить вход'
        });
    }
};

module.exports = {
    register,
    login
};