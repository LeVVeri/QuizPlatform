import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';

function Quiz() {
    const { quizId } = useParams();
    const navigate = useNavigate();

    const [attemptId, setAttemptId] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [expiresAt, setExpiresAt] = useState(null);
    const [remaining, setRemaining] = useState(null);
    const [finishing, setFinishing] = useState(false);
    const [result, setResult] = useState(null);
    const [saving, setSaving] = useState(false);
    const startRequested = useRef(false);

    useEffect(() => {
        if (startRequested.current) return;

        startRequested.current = true;

        const startQuiz = async () => {
            try {
                let attempt;

                try {
                    const data = await apiRequest(`/attempts/${quizId}/start`, {
                        method: 'POST',
                    });

                    attempt = data.attempt;
                } catch (err) {
                    if (err.status === 409 && err.data?.attempt) {
                        attempt = err.data.attempt;
                    } else {
                        throw err;
                    }
                }

                const id = attempt.id;

                setAttemptId(id);
                setExpiresAt(new Date(attempt.expires_at));

                const questionData = await apiRequest(
                    `/attempts/${id}/questions`
                );

                const groupedQuestions = [];
                const savedAnswers = {};

                questionData.forEach((row) => {
                    let question = groupedQuestions.find(
                        (item) => item.id === row.question_id
                    );

                    if (!question) {
                        question = {
                            id: row.question_id,
                            text: row.question_text,
                            points: row.points,
                            answers: [],
                        };

                        groupedQuestions.push(question);
                    }

                    if (row.answer_id !== null) {
                        question.answers.push({
                            id: row.answer_id,
                            text: row.answer_text,
                        });
                    }

                    if (row.selected_option_id !== null) {
                        savedAnswers[row.question_id] = row.selected_option_id;
                    }
                });

                setQuestions(groupedQuestions);
                setAnswers(savedAnswers);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        startQuiz();
    }, [quizId]);

    useEffect(() => {
        if (!expiresAt || result) return;

        const updateTimer = () => {
            const seconds = Math.max(
                0,
                Math.floor((expiresAt.getTime() - Date.now()) / 1000)
            );

            setRemaining(seconds);
        };

        updateTimer();

        const timer = setInterval(updateTimer, 1000);

        return () => clearInterval(timer);
    }, [expiresAt, result]);

    const handleSelectAnswer = async (questionId, answerId) => {
        setAnswers((previous) => ({
            ...previous,
            [questionId]: answerId,
        }));

        if (finishing || saving || remaining === 0) return;

        setError('');
        setSaving(true);

        try {
            await apiRequest(`/attempts/${attemptId}/answers`, {
                method: 'POST',
                body: JSON.stringify({
                    questionId,
                    answerId,
                }),
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleFinish = async () => {
        if (!attemptId || finishing || saving || result) return;

        setFinishing(true);
        setError('');

        try {
            const data = await apiRequest(`/attempts/${attemptId}/finish`, {
                method: 'POST',
            });

            setResult(data.result);
        } catch (err) {
            setError(err.message);
            setFinishing(false);
        }
    };

    useEffect(() => {
        if (
            remaining === 0 &&
            attemptId &&
            !result &&
            !finishing &&
            !saving
        ) {
            handleFinish();
        }
    }, [remaining, attemptId, result, finishing, saving]);

    if (loading) {
        return (
            <div className="quiz-page">
                <p>Загрузка квиза...</p>
            </div>
        );
    }

    if (error && !attemptId) {
        return (
            <div className="quiz-page">
                <p className="error">{error}</p>
                <button className="button" onClick={() => navigate('/')}>
                    На главную
                </button>
            </div>
        );
    }

    if (result) {
        return (
            <div className="quiz-page">
                <h1>Результат</h1>
                <p>Количество набранных баллов: {result.score}</p>
                <button
                    className="button button-primary"
                    onClick={() => navigate('/')}
                >
                    Вернуться к квизам
                </button>
            </div>
        );
    }

    return (
        <div className="quiz-page">
            <div className="quiz-heading">
                <h1>Прохождение квиза</h1>
                <p>
                    Осталось времени: {Math.floor((remaining ?? 0) / 60)}:
                    {String((remaining ?? 0) % 60).padStart(2, '0')}
                </p>
            </div>

            {error && <p className="error">{error}</p>}

            {questions.map((question, index) => (
                <section className="question-card" key={question.id}>
                    <h2>
                        {index + 1}. {question.text}
                    </h2>

                    <div className="answer-list">
                        {question.answers.map((answer) => (
                            <label className="answer-option" key={answer.id}>
                                <input
                                    type="radio"
                                    name={`question-${question.id}`}
                                    checked={answers[question.id] === answer.id}
                                    onChange={() => handleSelectAnswer(
                                        question.id,
                                        answer.id
                                    )}
                                    disabled={finishing || remaining === 0}
                                />
                                {answer.text}
                            </label>
                        ))}
                    </div>
                </section>
            ))}

            {questions.length === 0 && (
                <p>В этом квизе нет вопросов.</p>
            )}

            <button
                className="button button-primary"
                onClick={handleFinish}
                disabled={finishing || saving || questions.length === 0}
            >
                {finishing ? 'Завершение...' : 'Завершить квиз'}
            </button>
        </div>
    );
}

export default Quiz;