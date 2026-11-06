CREATE TABLE IF NOT EXISTS shifts (
    id TEXT PRIMARY KEY,
    employee TEXT NOT NULL,
    date TEXT NOT NULL,
    start TEXT NOT NULL,
    end TEXT NOT NULL,
    zone TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT '',
    label TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    mates TEXT NOT NULL DEFAULT '[]',
    rest INTEGER NOT NULL DEFAULT 0,
    extended INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shifts_date
ON shifts(date);

CREATE INDEX IF NOT EXISTS idx_shifts_employee_date
ON shifts(employee, date);
