CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quizzes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    creator_id BIGINT NOT NULL,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    time_limit_seconds INTEGER NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_quizzes_creator
        FOREIGN KEY (creator_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_quizzes_time_limit
        CHECK (time_limit_seconds > 0),

    CONSTRAINT chk_quizzes_status
        CHECK (status IN ('draft', 'published', 'archived'))
);

CREATE TABLE questions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    text TEXT NOT NULL,
    points INTEGER NOT NULL DEFAULT 1,
    position INTEGER NOT NULL,

    CONSTRAINT fk_questions_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quizzes(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_questions_points
        CHECK (points > 0),

    CONSTRAINT chk_questions_position
        CHECK (position > 0),

    CONSTRAINT uq_questions_position
        UNIQUE (quiz_id, position)
);

CREATE TABLE answer_options (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    question_id BIGINT NOT NULL,
    text TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    position INTEGER NOT NULL,

    CONSTRAINT fk_answer_options_question
        FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_answer_options_position
        CHECK (position > 0),

    CONSTRAINT uq_answer_options_position
        UNIQUE (question_id, position)
);

CREATE TABLE attempts (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    quiz_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    score INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'in_progress',

    CONSTRAINT fk_attempts_quiz
        FOREIGN KEY (quiz_id)
        REFERENCES quizzes(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_attempts_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE RESTRICT,

    CONSTRAINT chk_attempts_score
        CHECK (score >= 0),

    CONSTRAINT chk_attempts_status
        CHECK (status IN ('in_progress', 'completed', 'expired')),

    CONSTRAINT chk_attempts_time
        CHECK (expires_at > started_at)
);

CREATE TABLE attempt_answers (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    attempt_id BIGINT NOT NULL,
    question_id BIGINT NOT NULL,
    selected_option_id BIGINT,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT fk_attempt_answers_attempt
        FOREIGN KEY (attempt_id)
        REFERENCES attempts(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_attempt_answers_question
        FOREIGN KEY (question_id)
        REFERENCES questions(id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_attempt_answers_option
        FOREIGN KEY (selected_option_id)
        REFERENCES answer_options(id)
        ON DELETE RESTRICT,

    CONSTRAINT uq_attempt_answers_question
        UNIQUE (attempt_id, question_id)
);