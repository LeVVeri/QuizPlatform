function AnswerEditor({
    answers,
    radioName,
    onChange,
    onRemove,
    placeholder = false,
}) {
    return (
        <>
            {answers.map((answer, index) => (
                <div
                    className="answer-editor"
                    key={answer.id || answer.localId || index}
                >
                    <input
                        value={answer.text}
                        onChange={(e) =>
                            onChange(index, 'text', e.target.value)
                        }
                        placeholder={
                            placeholder ? `Вариант ${index + 1}` : undefined
                        }
                        required
                    />

                    <label>
                        <input
                            type="radio"
                            name={radioName}
                            checked={answer.is_correct}
                            onChange={() =>
                                onChange(index, 'is_correct', true)
                            }
                        />
                        Правильный
                    </label>

                    <button
                        type="button"
                        className="button button-outline"
                        onClick={() => onRemove(index)}
                        disabled={answers.length <= 2}
                    >
                        Удалить
                    </button>
                </div>
            ))}
        </>
    );
}

export default AnswerEditor;