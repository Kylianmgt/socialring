-- Initial schema for socialring
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- sample data
INSERT INTO users (email, name)
VALUES ('hello@example.com', 'First User')
ON CONFLICT DO NOTHING;

INSERT INTO posts (author_id, title, content)
SELECT id, 'Welcome', 'This is the first post.' FROM users LIMIT 1
ON CONFLICT DO NOTHING;
