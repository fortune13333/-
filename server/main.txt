import logging
from typing import List, Dict

from fastapi import Depends, FastAPI, HTTPException, status, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from . import crud, models, schemas, security, initial_data
from .database import SessionLocal, engine, Base
from datetime import timedelta

# --- App Initialization ---
# 创建所有数据库表 (如果它们不存在)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ChainTrace Backend",
    description="The central API server for the ChainTrace application.",
    version="1.0.0"
)

# --- Middleware ---
# 配置CORS以允许所有来源，方便本地开发
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- App Startup Event ---
@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    initial_data.init_db(db)
    db.close()

# --- WebSocket Connection Manager ---
class ConnectionManager:
    def __init__(self):
        # 结构: { "device_id": { "client_id": websocket } }
        self.active_connections: Dict[str, Dict[str, WebSocket]] = {}

    async def connect(self, websocket: WebSocket, device_id: str, client_id: str):
        await websocket.accept()
        if device_id not in self.active_connections:
            self.active_connections[device_id] = {}
        self.active_connections[device_id][client_id] = websocket
        await self.broadcast_users(device_id)

    def disconnect(self, device_id: str, client_id: str):
        if device_id in self.active_connections and client_id in self.active_connections[device_id]:
            del self.active_connections[device_id][client_id]
            if not self.active_connections[device_id]:
                del self.active_connections[device_id]
    
    async def broadcast_users(self, device_id: str):
        if device_id in self.active_connections:
            user_list = list(self.active_connections[device_id].keys())
            # 发送JSON编码的用户列表
            for connection in self.active_connections[device_id].values():
                await connection.send_json(user_list)

manager = ConnectionManager()

# --- API Endpoints ---

# --- Authentication ---
@app.post("/api/token", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.get_user_by_username(db, username=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=security.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = security.create_access_token(
        data={"sub": user.username, "role": user.role}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Devices ---
@app.get("/api/devices", response_model=List[schemas.Device])
def read_devices(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    devices = crud.get_devices(db, skip=skip, limit=limit)
    return devices

@app.post("/api/devices", response_model=schemas.Device, status_code=status.HTTP_201_CREATED)
def create_device(device: schemas.DeviceCreate, db: Session = Depends(get_db)):
    db_device = crud.get_device(db, device_id=device.id)
    if db_device:
        raise HTTPException(status_code=400, detail="Device with this ID already exists")
    new_device = crud.create_device(db, device=device)
    # Create a genesis block for the new device
    genesis_block_data = schemas.BlockCreate(
            config=f"hostname {new_device.id}\n!\nend",
            operator="system",
            change_type="initial",
            diff="Initial configuration.",
            summary="创世区块 - 初始配置",
            analysis="这是该设备的第一个配置记录，作为区块链的起点。",
            security_risks="未进行分析，这是基线配置。"
        )
    crud.create_device_block(db, device_id=new_device.id, block_data=genesis_block_data)
    return new_device

@app.get("/api/devices/{device_id}", response_model=schemas.DeviceWithBlocks)
def read_device_with_blockchain(device_id: str, db: Session = Depends(get_db)):
    db_device = crud.get_device(db, device_id=device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return db_device

@app.delete("/api/devices/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(device_id: str, db: Session = Depends(get_db)):
    db_device = crud.delete_device(db, device_id=device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return

# --- Blockchain ---
@app.post("/api/devices/{device_id}/blockchain", response_model=schemas.Block, status_code=status.HTTP_201_CREATED)
def create_block_for_device(device_id: str, block: schemas.BlockCreate, db: Session = Depends(get_db)):
    db_device = crud.get_device(db, device_id=device_id)
    if db_device is None:
        raise HTTPException(status_code=404, detail="Device not found")
    return crud.create_device_block(db, device_id=device_id, block_data=block)

# --- Admin ---
@app.post("/api/reset-data", status_code=status.HTTP_204_NO_CONTENT)
def reset_data(db: Session = Depends(get_db)):
    # 危险操作：删除所有数据并重新初始化
    db.query(models.Block).delete()
    db.query(models.Device).delete()
    db.query(models.User).delete()
    db.commit()
    initial_data.init_db(db)
    return

# --- WebSocket ---
@app.websocket("/ws/{device_id}/{client_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: str, client_id: str):
    await manager.connect(websocket, device_id, client_id)
    try:
        while True:
            # 保持连接活动，等待断开
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(device_id, client_id)
        # 广播更新后的用户列表
        await manager.broadcast_users(device_id)
