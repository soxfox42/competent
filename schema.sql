CREATE TABLE Comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    post_slug TEXT NOT NULL
);

CREATE INDEX index_comment_slug ON Comments (post_slug);
