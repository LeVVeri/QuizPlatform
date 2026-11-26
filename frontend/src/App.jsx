import { useEffect, useState } from 'react';
import { Link, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiRequest } from './api';
import Login from './pages/Login';
import Register from './pages/Register';
import Quiz from './pages/Quiz';
import History from './pages/History';
import Leaderboard from './pages/Leaderboard';
import CreateQuiz from './pages/CreateQuiz';
import MyDrafts from './pages/MyDrafts';
import './App.css';

function Home() {
    const { user } = useAuth();

    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchQuizzes = async () => {
            try {
                const data = await apiRequest('/quizzes');
                setQuizzes(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchQuizzes();
    }, []);

    return (
        <div className="home">
            <h1>Онлайн-квизы</h1>
            <p className="home-description">
                Список доступных квизов и проверка знаний.
            </p>

            <section className="quizzes">
                <h2>Доступные квизы</h2>

                {loading && <p>Загрузка...</p>}
                {error && <p className="error">{error}</p>}

                {!loading && !error && quizzes.length === 0 && (
                    <p>Опубликованных квизов пока нет.</p>
                )}

                <div className="quiz-list">
                    {quizzes.map((quiz) => (
                        <article className="quiz-card" key={quiz.id}>
                            <h3>{quiz.title}</h3>
                            <p>{quiz.description || 'Описание отсутствует.'}</p>
                            <span>
                                Время: {Math.ceil(quiz.time_limit_seconds / 60)} мин.
                            </span>

                            <Link
                                to={`/quiz/${quiz.id}`}
                                className="button button-primary"
                            >
                                Начать
                            </Link>

                            {user && (
                                <Link
                                    to={`/leaderboard/${quiz.id}`}
                                    className="button button-outline"
                                >
                                    Рейтинг
                                </Link>
                            )}
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
}

function App() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="app">
            <header className="header">
                <div className="container header-content">
                    <Link to="/" className="logo">QuizPlatform</Link>

                    <div className="auth-buttons">
                        {user ? (
                            <>
                                <Link to="/my-drafts" className="button button-outline">
                                    Мои черновики
                                </Link>
                                <Link to="/create-quiz" className="button button-outline">
                                    Создать квиз
                                </Link>
                                <Link to="/history" className="button button-outline">
                                    История
                                </Link>

                                <span>{user.username}</span>
                                <button
                                    className="button button-outline"
                                    onClick={handleLogout}
                                >
                                    Выйти
                                </button>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="button button-outline">
                                    Войти
                                </Link>
                                <Link to="/register" className="button button-primary">
                                    Регистрация
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </header>

            <main className="container">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/quiz/:quizId" element={<Quiz />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/leaderboard/:quizId" element={<Leaderboard />} />
                    <Route path="/create-quiz" element={user ? <CreateQuiz /> : <Navigate to="/login" />} />
                    <Route path="/create-quiz/:quizId" element={user ? <CreateQuiz /> : <Navigate to="/login" />} />
                    <Route path="/my-drafts" element={user ? <MyDrafts /> : <Navigate to="/login" />} />
                </Routes>
            </main>
        </div>
    );
}

export default App;