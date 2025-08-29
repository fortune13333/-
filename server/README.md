# 链踪 - 中央后端服务器

这是“链踪”项目的核心后端服务。它是一个使用 FastAPI 构建的API服务器，负责处理所有的数据逻辑、用户认证以及与数据库的交互。

## 架构

- **框架**: FastAPI
- **数据库**: SQLite (通过 SQLAlchemy ORM)
- **认证**: JWT (JSON Web Tokens)
- **数据验证**: Pydantic

## 🚀 快速开始

### 1. 先决条件

- **Python 3.7+**: 确保您的系统已安装Python。

### 2. 安装依赖

在您的终端中，进入此 `server` 目录，然后运行以下命令来安装所有必需的Python库：

```bash
# 进入 server 目录
cd server

# 安装依赖
pip install -r requirements.txt
```

### 3. 运行服务器

在 `server` 目录下，运行以下命令来启动API服务器：

```bash
uvicorn main:app --reload
```

- `--reload` 参数会在您修改代码后自动重启服务器，非常适合开发环境。

服务器启动后，您应该会看到类似以下的输出：

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process [xxxxx] using statreload
INFO:     Started server process [xxxxx]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
```

### 数据库初始化

**您无需手动操作。**

当您第一次运行服务器时，它会自动执行以下操作：
1. 在 `server` 目录下创建一个名为 `chaintrace.db` 的SQLite数据库文件。
2. 在数据库中创建所有必需的表 (`users`, `devices`, `blocks`)。
3. 如果数据库是空的，它会自动填充与原始前端应用相同的初始数据（包括设备、创世区块和模拟用户）。

### API 文档

服务器运行后，您可以访问自动生成的交互式API文档：

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)