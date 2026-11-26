import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiRequest } from '../api';

import AnswerEditor from '../components/AnswerEditor';
import QuestionEditor from '../components/QuestionEditor';
import QuizForm from '../components/QuizForm';

const emptyAnswers = () => [
    { text: '', is_correct: true },
    { text: '', is_correct: false },
];

function CreateQuiz() {
    const { quizId } = useParams();
    const navigate = useNavigate();

    const [quiz, setQuiz] = useState(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [timeLimit, setTimeLimit] = useState(30);

    const [questions, setQuestions] = useState([]);
    const [questionText, setQuestionText] = useState('');
    const [points, setPoints] = useState(1);
    const [answers, setAnswers] = useState(emptyAnswers);

    const [loading, setLoading] = useState(Boolean(quizId));
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    // Загрузка черновика
    useEffect(() => {
        if (!quizId) return;

        const loadQuiz = async () => {
            try {
                const drafts = await apiRequest('/quizzes/my/drafts');

                const currentQuiz = drafts.find(
                    (item) => String(item.id) === quizId
                );

                if (!currentQuiz) {
                    throw new Error('Черновик не найден');
                }

                setQuiz(currentQuiz);
                setTitle(currentQuiz.title);
                setDescription(currentQuiz.description || '');
                setTimeLimit(currentQuiz.time_limit_seconds / 60);

                const questionData = await apiRequest(
                    `/quizzes/${quizId}/questions`
                );

                const loadedQuestions = await Promise.all(
                    questionData.map(async (question) => {
                        const answerData = await apiRequest(
                            `/quizzes/questions/${question.id}/answers`
                        );

                        return {
                            ...question,
                            answers: answerData,
                            deletedAnswerIds: [],
                        };
                    })
                );

                setQuestions(loadedQuestions);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadQuiz();
    }, [quizId]);

    // Создание черновика
    const handleCreateQuiz = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await apiRequest('/quizzes', {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    description,
                    time_limit_seconds: Number(timeLimit) * 60,
                }),
            });

            navigate(`/create-quiz/${data.id}`);
        } catch (err) {
            setError(err.message);
            setLoading(false);
        }
    };

    // Сохранение данных квиза
    const handleQuizSave = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const data = await apiRequest(`/quizzes/${quiz.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title,
                    description,
                    time_limit_seconds: Number(timeLimit) * 60,
                    status: 'draft',
                }),
            });

            setQuiz(data);
            setMessage('Данные квиза сохранены');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Изменение вариантов нового вопроса
    const handleAnswerChange = (index, field, value) => {
        setAnswers((previous) =>
            previous.map((answer, i) => {
                if (field === 'is_correct') {
                    return { ...answer, is_correct: i === index };
                }

                return i === index
                    ? { ...answer, [field]: value }
                    : answer;
            })
        );
    };

    const handleAddAnswer = () => {
        setAnswers((previous) => [
            ...previous,
            { text: '', is_correct: false },
        ]);
    };

    // Добавление нового вопроса
    const handleAddQuestion = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (answers.some((answer) => !answer.text.trim())) {
            setError('Заполните все варианты ответов');
            return;
        }

        if (!answers.some((answer) => answer.is_correct)) {
            setError('Отметьте правильный ответ');
            return;
        }

        setLoading(true);

        try {
            const question = await apiRequest(
                `/quizzes/${quiz.id}/questions`,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        text: questionText,
                        points: Number(points),
                        position: questions.length + 1,
                    }),
                }
            );

            const savedAnswers = [];

            for (let i = 0; i < answers.length; i++) {
                const answer = await apiRequest(
                    `/quizzes/questions/${question.id}/answers`,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            text: answers[i].text,
                            is_correct: answers[i].is_correct,
                            position: i + 1,
                        }),
                    }
                );

                savedAnswers.push(answer);
            }

            setQuestions((previous) => [
                ...previous,
                {
                    ...question,
                    answers: savedAnswers,
                    deletedAnswerIds: [],
                },
            ]);

            setQuestionText('');
            setPoints(1);
            setAnswers(emptyAnswers());
            setMessage('Вопрос добавлен');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Изменение существующего вопроса
    const handleExistingQuestionChange = (questionId, field, value) => {
        setQuestions((previous) =>
            previous.map((question) =>
                question.id === questionId
                    ? { ...question, [field]: value }
                    : question
            )
        );
    };

    // Изменение существующего варианта
    const handleExistingAnswerChange = (
        questionId,
        answerId,
        field,
        value
    ) => {
        setQuestions((previous) =>
            previous.map((question) => {
                if (question.id !== questionId) return question;

                return {
                    ...question,
                    answers: question.answers.map((answer) => {
                        const isTarget = answer.id
                            ? answer.id === answerId
                            : answer.localId === answerId;

                        if (field === 'is_correct') {
                            return {
                                ...answer,
                                is_correct: isTarget,
                            };
                        }

                        return isTarget
                            ? { ...answer, [field]: value }
                            : answer;
                    }),
                };
            })
        );
    };

    // Добавление варианта к существующему вопросу
    const handleAddExistingAnswer = (questionId) => {
        setQuestions((previous) =>
            previous.map((question) =>
                question.id === questionId
                    ? {
                        ...question,
                        answers: [
                            ...question.answers,
                            {
                                text: '',
                                is_correct: false,
                                localId: Date.now() + Math.random(),
                            },
                        ],
                    }
                    : question
            )
        );
    };

    // Удаление варианта
    const handleRemoveExistingAnswer = (questionId, index) => {
        setQuestions((previous) =>
            previous.map((question) => {
                if (
                    question.id !== questionId ||
                    question.answers.length <= 2
                ) {
                    return question;
                }

                const answer = question.answers[index];

                return {
                    ...question,
                    answers: question.answers.filter(
                        (_, i) => i !== index
                    ),
                    deletedAnswerIds: answer.id
                        ? [...question.deletedAnswerIds, answer.id]
                        : question.deletedAnswerIds,
                };
            })
        );
    };

    // Сохранение существующего вопроса
    const handleSaveQuestion = async (question) => {
        setError('');
        setMessage('');

        if (
            !question.text.trim() ||
            !Number.isInteger(Number(question.points)) ||
            Number(question.points) <= 0
        ) {
            setError('Проверьте текст вопроса и количество баллов');
            return;
        }

        if (
            question.answers.length < 2 ||
            question.answers.some((answer) => !answer.text.trim()) ||
            !question.answers.some((answer) => answer.is_correct)
        ) {
            setError('Добавьте минимум два варианта и отметьте правильный ответ');
            return;
        }

        setLoading(true);

        try {
            await apiRequest(`/quizzes/questions/${question.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    text: question.text,
                    points: Number(question.points),
                    position: Number(question.position),
                }),
            });

            for (const answerId of question.deletedAnswerIds) {
                await apiRequest(
                    `/quizzes/questions/${question.id}/answers/${answerId}`,
                    { method: 'DELETE' }
                );
            }

            const savedAnswers = [];

            for (let i = 0; i < question.answers.length; i++) {
                const answer = question.answers[i];

                const body = {
                    text: answer.text,
                    is_correct: answer.is_correct,
                    position: i + 1,
                };

                if (answer.id) {
                    await apiRequest(
                        `/quizzes/questions/${question.id}/answers/${answer.id}`,
                        {
                            method: 'PUT',
                            body: JSON.stringify(body),
                        }
                    );

                    savedAnswers.push({ ...answer });
                } else {
                    const savedAnswer = await apiRequest(
                        `/quizzes/questions/${question.id}/answers`,
                        {
                            method: 'POST',
                            body: JSON.stringify(body),
                        }
                    );

                    savedAnswers.push(savedAnswer);
                }
            }

            setQuestions((previous) =>
                previous.map((item) =>
                    item.id === question.id
                        ? {
                            ...question,
                            answers: savedAnswers,
                            deletedAnswerIds: [],
                        }
                        : item
                )
            );

            setMessage('Вопрос сохранён');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Удаление вопроса
    const handleDeleteQuestion = async (questionId) => {
        if (!window.confirm('Удалить этот вопрос?')) return;

        setError('');
        setLoading(true);

        try {
            await apiRequest(`/quizzes/questions/${questionId}`, {
                method: 'DELETE',
            });

            setQuestions((previous) =>
                previous.filter((question) => question.id !== questionId)
            );

            setMessage('Вопрос удалён');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Публикация квиза
    const handlePublish = async () => {
        setError('');
        setLoading(true);

        try {
            await apiRequest(`/quizzes/${quiz.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title,
                    description,
                    time_limit_seconds: Number(timeLimit) * 60,
                    status: 'published',
                }),
            });

            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !quiz && quizId) {
        return (
            <div className="home">
                <p>Загрузка черновика...</p>
            </div>
        );
    }

    return (
        <div className="home">
            <h1>{quiz ? 'Редактирование квиза' : 'Создание квиза'}</h1>

            {error && <p className="error">{error}</p>}
            {message && <p>{message}</p>}

            <QuizForm
                title={title}
                description={description}
                timeLimit={timeLimit}
                onTitleChange={setTitle}
                onDescriptionChange={setDescription}
                onTimeLimitChange={setTimeLimit}
                onSubmit={quiz ? handleQuizSave : handleCreateQuiz}
                submitLabel={
                    quiz ? 'Сохранить данные квиза' : 'Создать черновик'
                }
                loading={loading}
            />

            {quiz && (
                <>
                    <h2>Вопросы ({questions.length})</h2>

                    {questions.map((question, index) => (
                        <QuestionEditor
                            key={question.id}
                            question={question}
                            index={index}
                            loading={loading}
                            onQuestionChange={handleExistingQuestionChange}
                            onAnswerChange={handleExistingAnswerChange}
                            onAddAnswer={handleAddExistingAnswer}
                            onRemoveAnswer={handleRemoveExistingAnswer}
                            onSave={handleSaveQuestion}
                            onDelete={handleDeleteQuestion}
                        />
                    ))}

                    <form
                        className="auth-form question-form"
                        onSubmit={handleAddQuestion}
                    >
                        <h2>Новый вопрос</h2>

                        <label>Текст вопроса</label>
                        <textarea
                            value={questionText}
                            onChange={(e) => setQuestionText(e.target.value)}
                            rows="3"
                            required
                        />

                        <label>Количество баллов</label>
                        <input
                            type="number"
                            min="1"
                            value={points}
                            onChange={(e) => setPoints(e.target.value)}
                            required
                        />

                        <h3>Варианты ответов</h3>

                        <AnswerEditor
                            answers={answers}
                            radioName="new-correct-answer"
                            placeholder
                            onChange={handleAnswerChange}
                            onRemove={(index) =>
                                setAnswers((previous) =>
                                    previous.length > 2
                                        ? previous.filter(
                                            (_, i) => i !== index
                                        )
                                        : previous
                                )
                            }
                        />

                        <button
                            type="button"
                            className="button button-outline"
                            onClick={handleAddAnswer}
                        >
                            Добавить вариант
                        </button>

                        <button
                            type="submit"
                            className="button button-primary"
                            disabled={loading}
                        >
                            Добавить вопрос
                        </button>
                    </form>

                    <button
                        className="button button-primary"
                        onClick={handlePublish}
                        disabled={loading || questions.length === 0}
                    >
                        Опубликовать квиз
                    </button>
                </>
            )}
        </div>
    );
}

export default CreateQuiz;