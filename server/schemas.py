from pydantic import BaseModel
from typing import List, Optional
import datetime

# --- Block Schemas ---
class BlockBase(BaseModel):
    config: str
    operator: str
    change_type: str
    diff: str
    summary: str
    analysis: str
    security_risks: str

class BlockCreate(BlockBase):
    pass

class Block(BlockBase):
    hash: str
    index: int
    timestamp: datetime.datetime
    prev_hash: str
    device_id: str
    version: int

    class Config:
        orm_mode = True

# --- Device Schemas ---
class DeviceBase(BaseModel):
    id: str
    name: str
    ip_address: str
    type: str

class DeviceCreate(DeviceBase):
    pass

class Device(DeviceBase):
    class Config:
        orm_mode = True

class DeviceWithBlocks(Device):
    blocks: List[Block] = []


# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    role: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    class Config:
        orm_mode = True

# --- Token Schemas ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
