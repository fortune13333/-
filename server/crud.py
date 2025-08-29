from sqlalchemy.orm import Session
from sqlalchemy import desc
import hashlib
import datetime
from . import models, schemas, security

# --- User CRUD ---
def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(username=user.username, hashed_password=hashed_password, role=user.role)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# --- Device CRUD ---
def get_device(db: Session, device_id: str):
    return db.query(models.Device).filter(models.Device.id == device_id).first()

def get_devices(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Device).offset(skip).limit(limit).all()

def create_device(db: Session, device: schemas.DeviceCreate):
    db_device = models.Device(**device.dict())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

def delete_device(db: Session, device_id: str):
    db_device = db.query(models.Device).filter(models.Device.id == device_id).first()
    if db_device:
        db.delete(db_device)
        db.commit()
    return db_device


# --- Block CRUD ---
def get_latest_block_for_device(db: Session, device_id: str):
    return db.query(models.Block).filter(models.Block.device_id == device_id).order_by(desc(models.Block.index)).first()

def create_device_block(db: Session, device_id: str, block_data: schemas.BlockCreate):
    last_block = get_latest_block_for_device(db, device_id)
    
    index = (last_block.index + 1) if last_block else 0
    version = (last_block.version + 1) if last_block else 1
    prev_hash = last_block.hash if last_block else "0"
    timestamp = datetime.datetime.utcnow()

    block_string = f"{index}{timestamp}{prev_hash}{device_id}{version}{block_data.operator}{block_data.config}"
    hash_value = hashlib.sha256(block_string.encode()).hexdigest()

    db_block = models.Block(
        hash=hash_value,
        index=index,
        timestamp=timestamp,
        prev_hash=prev_hash,
        device_id=device_id,
        version=version,
        **block_data.dict()
    )
    db.add(db_block)
    db.commit()
    db.refresh(db_block)
    return db_block
