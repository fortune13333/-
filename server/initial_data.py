from sqlalchemy.orm import Session
from . import crud, schemas
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def init_db(db: Session) -> None:
    # 检查数据库是否已初始化 (通过检查是否有用户)
    user = crud.get_user_by_username(db, username="admin")
    if user:
        logger.info("Database already initialized. Skipping.")
        return

    logger.info("Database is empty. Initializing with default data...")

    # --- Create Users ---
    logger.info("Creating initial users...")
    users_in = [
        schemas.UserCreate(username="admin", password="admin", role="admin"),
        schemas.UserCreate(username="operator1", password="password", role="operator"),
    ]
    for user_in in users_in:
        crud.create_user(db, user_in)
    logger.info("Initial users created.")

    # --- Create Devices and Genesis Blocks ---
    logger.info("Creating initial devices and genesis blocks...")
    devices_in = [
        schemas.DeviceCreate(id="RTR01-NYC", name="核心路由器 - 纽约", ip_address="192.168.1.1", type="Router"),
        schemas.DeviceCreate(id="SW01-SFO", name="接入交换机 - 旧金山", ip_address="10.10.5.254", type="Switch"),
        schemas.DeviceCreate(id="FW01-LON", name="边界防火墙 - 伦敦", ip_address="203.0.113.1", type="Firewall"),
    ]

    for device_in in devices_in:
        # Create Device
        crud.create_device(db, device_in)
        
        # Create Genesis Block for the device
        genesis_block_data = schemas.BlockCreate(
            config=f"hostname {device_in.id}\n!\nend",
            operator="system",
            change_type="initial",
            diff="Initial configuration.",
            summary="创世区块 - 初始配置",
            analysis="这是该设备的第一个配置记录，作为区块链的起点。",
            security_risks="未进行分析，这是基线配置。"
        )
        crud.create_device_block(db, device_id=device_in.id, block_data=genesis_block_data)
    
    logger.info("Initial devices and genesis blocks created.")
    logger.info("Database initialization complete.")
