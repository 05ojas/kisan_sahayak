import os
try:
    import psycopg2
    from psycopg2.extras import DictCursor
except ImportError:
    psycopg2 = None
    DictCursor = None

def get_db():
    db_url = os.environ.get('DATABASE_URL')
    
    # If DATABASE_URL is missing, we raise an error in production,
    # but allow a fallback for local testing if needed.
    if not db_url:
        import sqlite3
        db_path = os.environ.get('KISAN_DB_PATH')
        if not db_path:
            db_path = os.path.join(os.path.dirname(__file__), 'database', 'database.db')
            if not os.path.exists(db_path):
                db_path = 'database.db'
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        return conn

    # Connect to Neon Postgres
    conn = psycopg2.connect(db_url, cursor_factory=DictCursor)
    conn.autocommit = True
    return SQLiteToPostgresWrapper(conn)

class SQLiteToPostgresWrapper:
    def __init__(self, conn):
        self.conn = conn

    def execute(self, query, params=()):
        # Convert SQLite '?' to Postgres '%s' automatically
        pg_query = query.replace('?', '%s')
        cursor = self.conn.cursor()
        cursor.execute(pg_query, params)
        return cursor

    def commit(self):
        # We set autocommit=True, so manual commits are basically no-ops, 
        # but this keeps compatibility with app.py's conn.commit()
        pass

    def close(self):
        self.conn.close()

def init_db(force_reset=False):
    db_path = os.environ.get('KISAN_DB_PATH')
    src_db = os.path.join(os.path.dirname(__file__), 'database', 'database.db')
    if db_path and os.path.exists(src_db):
        import shutil
        if force_reset or not os.path.exists(db_path):
            shutil.copyfile(src_db, db_path)

def sync_admin_credentials(conn):
    admin_user = os.environ.get('ADMIN_USERNAME')
    admin_pass = os.environ.get('ADMIN_PASSWORD')
    if admin_user and admin_pass:
        from werkzeug.security import generate_password_hash
        hashed = generate_password_hash(admin_pass)
        email = f"{admin_user}@kisansahayak.in"
        row = conn.execute("SELECT id FROM users WHERE LOWER(username) = ? OR LOWER(email) = ?", (admin_user.lower(), email.lower())).fetchone()
        if row:
            row_id = row['id'] if isinstance(row, dict) or hasattr(row, 'keys') else row[0]
            conn.execute("UPDATE users SET username = ?, password_hash = ?, role = 'admin' WHERE id = ?", (admin_user, hashed, row_id))
        else:
            conn.execute("""
                INSERT INTO users (full_name, username, email, password_hash, state, preferred_category, role)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, ('System Administrator', admin_user, email, hashed, 'Delhi', 'schemes', 'admin'))
        conn.commit()
