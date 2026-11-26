import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiRequest } from '../api';

function Leaderboard() {
    const { quizId } = useParams();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const data = await apiRequest(
                    `/attempts/leaderboard/${quizId}`
                );

                setUsers(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchLeaderboard();
    }, [quizId]);

    return (
        <div className="home">
            <h1>Рейтинг участников</h1>

            {loading && <p>Загрузка...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && !error && users.length === 0 && (
                <p>Пока никто не прошёл этот квиз.</p>
            )}

            {!loading && !error && users.length > 0 && (
                <div className="quiz-list">
                    {users.map((user, index) => (
                        <article className="quiz-card" key={user.user_id}>
                            <h3>{index + 1}. {user.username}</h3>
                            <p>Лучший результат: {user.best_score}</p>
                        </article>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Leaderboard;