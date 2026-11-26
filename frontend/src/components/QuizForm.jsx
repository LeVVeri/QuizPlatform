function QuizForm({
    title,
    description,
    timeLimit,
    onTitleChange,
    onDescriptionChange,
    onTimeLimitChange,
    onSubmit,
    submitLabel,
    loading,
}) {
    return (
        <form className="auth-form" onSubmit={onSubmit}>
            <label>Название квиза</label>
            <input
                value={title}
                onChange={(e) => onTitleChange(e.target.value)}
                required
            />

            <label>Описание</label>
            <textarea
                value={description}
                onChange={(e) => onDescriptionChange(e.target.value)}
                rows="3"
            />

            <label>Время прохождения (минуты)</label>
            <input
                type="number"
                min="1"
                value={timeLimit}
                onChange={(e) => onTimeLimitChange(e.target.value)}
                required
            />

            <button
                className={`button ${
                    submitLabel === 'Создать черновик'
                        ? 'button-primary'
                        : 'button-outline'
                }`}
                type="submit"
                disabled={loading}
            >
                {submitLabel}
            </button>
        </form>
    );
}

export default QuizForm;