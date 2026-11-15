CREATE TABLE IF NOT EXISTS staff_members (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 discord_display_name TEXT NOT NULL,
 discord_username TEXT NOT NULL DEFAULT '',
 rank TEXT NOT NULL,
 discord_avatar TEXT NOT NULL DEFAULT '',
 discord_banner TEXT NOT NULL DEFAULT '',
 roblox_display_name TEXT NOT NULL DEFAULT '',
 roblox_username TEXT NOT NULL DEFAULT '',
 roblox_id TEXT NOT NULL DEFAULT '',
 roblox_avatar TEXT NOT NULL DEFAULT '',
 tags TEXT NOT NULL DEFAULT '[]',
 sort_order INTEGER NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_staff_members_order ON staff_members(sort_order,created_at);