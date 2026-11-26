import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await register(username, email, password);
            navigate('/login');
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="form-page">
            <form className="auth-form" onSubmit={handleSubmit}>
                <h2>Регистрация</h2>

                {error && <p className="error">{error}</p>}

                <label>Имя пользователя</label>
                <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />

                <label>Email</label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <label>Пароль</label>
                <input
                    type="password"
                    minLength="8"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                <button className="button button-primary" type="submit">
                    Зарегистрироваться
                </button>
            </form>
        </div>
    );
}

export default Register;