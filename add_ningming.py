import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), 'data', 'weather.db')

def add_cities():
    if not os.path.exists(db_path):
        print("Database not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    cities = [
        ('宁明', 107.07, 22.14),
        ('扶绥', 107.90, 22.63),
        ('大新', 107.20, 22.83),
        ('天等', 107.13, 23.08),
        ('龙州', 106.85, 22.34),
        ('凭祥', 106.75, 22.10)
    ]

    for name, lon, lat in cities:
        # Check if exists
        cursor.execute("SELECT id FROM city_config WHERE city_name = ?", (name,))
        if cursor.fetchone():
            print(f"{name} already exists in database.")
            continue

        # Find next ID
        cursor.execute("SELECT MAX(id) FROM city_config")
        max_id = cursor.fetchone()[0] or 0
        next_id = max_id + 1

        # Insert
        try:
            cursor.execute(
                "INSERT INTO city_config (id, city_name, longitude, latitude, region, is_active) VALUES (?, ?, ?, ?, ?, ?)",
                (next_id, name, lon, lat, '广西', 1)
            )
            print(f"Successfully added {name} with ID {next_id}")
        except Exception as e:
            print(f"Error adding {name}: {e}")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    add_cities()
