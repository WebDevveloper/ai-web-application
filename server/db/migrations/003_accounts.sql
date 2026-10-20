-- Профиль ссылается на постоянный справочник, а не на заменяемый снимок navigator.
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE CHECK (email = lower(email)),
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  group_id UUID NOT NULL REFERENCES study_groups(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Запись сессии позволяет отозвать JWT сразу после выхода.
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX user_sessions_user_idx ON user_sessions(user_id);
CREATE INDEX user_sessions_expiry_idx ON user_sessions(expires_at);
