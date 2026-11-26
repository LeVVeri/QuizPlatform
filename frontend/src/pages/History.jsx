
import { useEffect, useState } from 'react';
import { apiRequest } from '../api';

function History() {
    const [attempts, setAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await apiRequest('/attempts/history');
                setAttempts(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    return (
        <div className="home">
            <h1>История попыток</h1>

            {loading && <p>Загрузка...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && !error && attempts.length === 0 && (
                <p>Вы ещё не проходили квизы.</p>
            )}

            {!loading && !error && attempts.length > 0 && (
                <div className="quiz-list">
                    {attempts.map((attempt) => (
                        <article className="quiz-card" key={attempt.id}>
                            <h3>{attempt.quiz_title}</h3>
                            <p>Результат: {attempt.score ?? 'Не завершён'}</p>

                            <span>
                                Статус: {
                                    attempt.status === 'completed'
                                        ? 'Завершён'
                                        : attempt.status === 'expired'
                                            ? 'Время истекло'
                                            : 'Не завершён'
                                }
                            </span>

                            <span>
                                Дата: {new Date(attempt.started_at).toLocaleString('ru-RU')}
                            </span>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

export default History;