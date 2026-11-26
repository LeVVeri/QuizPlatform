import AnswerEditor from './AnswerEditor';

function QuestionEditor({
    question,
    index,
    loading,
    onQuestionChange,
    onAnswerChange,
    onAddAnswer,
    onRemoveAnswer,
    onSave,
    onDelete,
}) {
    return (
        <section className="question-card">
            <h3>Вопрос {index + 1}</h3>

            <label>Текст вопроса</label>
            <textarea
                value={question.text}
                onChange={(e) =>
                    onQuestionChange(question.id, 'text', e.target.value)
                }
                rows="3"
            />

            <label>Баллы</label>
            <input
                type="number"
                min="1"
                value={question.points}
                onChange={(e) =>
                    onQuestionChange(question.id, 'points', e.target.value)
                }
            />

            <h3>Варианты ответов</h3>

            <AnswerEditor
                answers={question.answers}
                radioName={`correct-${question.id}`}
                onChange={(index, field, value) =>
                    onAnswerChange(
                        question.id,
                        question.answers[index].id ||
                            question.answers[index].localId,
                        field,
                        value
                    )
                }
                onRemove={(index) =>
                    onRemoveAnswer(question.id, index)
                }
            />

            <button
                type="button"
                className="button button-outline"
                onClick={() => onAddAnswer(question.id)}
            >
                Добавить вариант
            </button>

            <button
                type="button"
                className="button button-primary"
                onClick={() => onSave(question)}
                disabled={loading}
            >
                Сохранить вопрос
            </button>

            <button
                type="button"
                className="button button-outline"
                onClick={() => onDelete(question.id)}
                disabled={loading}
            >
                Удалить вопрос
            </button>
        </section>
    );
}

export default QuestionEditor;