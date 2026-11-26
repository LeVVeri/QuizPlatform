import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api';

function MyDrafts() {
    const [drafts, setDrafts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchDrafts = async () => {
        try {
            const data = await apiRequest('/quizzes/my/drafts');
            setDrafts(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrafts();
    }, []);

    const handleDelete = async (quizId) => {
        if (!window.confirm('Удалить этот черновик?')) return;

        setError('');

        try {
            await apiRequest(`/quizzes/${quizId}`, {
                method: 'DELETE',
            });

            setDrafts((previous) =>
                previous.filter((draft) => draft.id !== quizId)
            );
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="home">
            <h1>Мои черновики</h1>

            {loading && <p>Загрузка...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && drafts.length === 0 && (
                <p>У вас пока нет черновиков.</p>
            )}

            <div className="quiz-list">
                {drafts.map((draft) => (
                    <article className="quiz-card" key={draft.id}>
                        <h3>{draft.title}</h3>
                        <p>{draft.description || 'Описание отсутствует.'}</p>

                        <span>
                            Время: {Math.ceil(draft.time_limit_seconds / 60)} мин.
                        </span>

                        <Link
                            to={`/create-quiz/${draft.id}`}
                            className="button button-primary"
                        >
                            Редактировать
                        </Link>

                        <button
                            className="button button-outline"
                            onClick={() => handleDelete(draft.id)}
                        >
                            Удалить
                        </button>
                    </article>
                ))}
            </div>
        </div>
    );
}

export default MyDrafts;