import asyncio
from sqlalchemy import text
from database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Adding start_time column...")
        try:
            await conn.execute(text("ALTER TABLE clips ADD COLUMN start_time FLOAT"))
        except Exception as e:
            print(f"start_time might already exist: {e}")

        print("Adding end_time column...")
        try:
            await conn.execute(text("ALTER TABLE clips ADD COLUMN end_time FLOAT"))
        except Exception as e:
            print(f"end_time might already exist: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
