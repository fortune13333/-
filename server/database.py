from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 使用SQLite，数据库文件将创建在 server/ 目录下
SQLALCHEMY_DATABASE_URL = "sqlite:///./chaintrace.db"

engine = create_engine(
    # `check_same_thread` 仅适用于 SQLite
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
