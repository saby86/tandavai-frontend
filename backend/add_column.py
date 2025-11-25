import asyncio
from database import engine
from sqlalchemy import text

async def add_column():
    async with engine.connect() as conn:
        try:
            await conn.execute(text("ALTER TABLE projects ADD COLUMN error_message TEXT;"))
            await conn.commit()
            print("Successfully added error_message column.")
        except Exception as e:
            print(f"Column might already exist or error occurred: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
