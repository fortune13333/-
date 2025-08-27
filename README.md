
# 链踪本地代理 (ChainTrace Local Agent)

欢迎使用链踪本地代理！这是一个轻量级的Python程序，它充当您的“链踪”Web应用程序与真实网络设备之间的“桥梁”。新版本采用了更简单、更安全的 `config.ini` 文件进行配置，无需再编辑任何代码。

## 功能

-   通过**SSH**安全地连接到您的网络设备。
-   提供简单的 **HTTP API** 接口，供“链踪”Web应用调用。
-   **获取**设备的当前运行配置。
-   **推送**新的配置到设备。
-   所有凭据和设备信息均在外部 `config.ini` 文件中管理，安全且方便。
-   包含一个**模拟模式**，允许您在没有真实硬件的情况下测试完整的工作流程。

---

## 🚀 快速开始：设置与运行指南

请按照以下步骤在您的本地计算机上设置并运行代理。

### 1. 先决条件

-   **Python 3.7+**: 确保您的系统已安装Python。您可以在终端或命令提示符中运行 `python --version` 或 `python3 --version` 来检查。

### 2. 准备文件

在您的电脑上创建一个新文件夹（例如，`chaintrace-agent`）。然后，将以下文件放入该文件夹：
-   `agent.py` (从上方聊天中获取的最新版本)
-   `config.ini` (配置文件)
-   `requirements.txt`

### 3. 安装依赖库

打开您的终端或命令提示符，使用 `cd` 命令进入您刚刚创建的文件夹，然后运行以下命令来安装所有必需的Python库：

```bash
pip install -r requirements.txt
```

### 4. 配置代理 (重要！)

这是最关键的一步。您**只需编辑 `config.ini` 文件**即可完成所有配置。

1.  用任何文本编辑器（如记事本、VS Code）打开 `config.ini` 文件。
    -   **⭐ 重要提示**: 保存文件时，请**务必选择 `UTF-8` 编码**，以避免因中文字符注释导致程序读取错误。

2.  **配置服务器 (可选)**:
    在 `[server]` 部分，您可以自定义代理监听的IP地址和端口。如果此部分不存在，将使用默认值 `127.0.0.1:8000`。
    ```ini
    [server]
    host = 127.0.0.1
    port = 8000
    ```
3.  **填写凭据**:
    在 `[credentials]` 部分，填入您用于登录网络设备的用户名和密码。
    ```ini
    [credentials]
    username = your_username
    password = your_password
    ; secret = your_enable_password
    ```
    **⭐ 如何使用模拟模式？**
    如果您暂时没有真实的设备进行测试，只需将用户名设置为 `SIM_USER` 即可。

4.  **映射设备**:
    在 `[device_map]` 部分，将您在Web应用中使用的设备ID与真实设备的IP地址和类型关联起来。
    ```ini
    [device_map]
    ; 格式: WEB应用中的设备ID = IP地址, Netmiko设备类型
    RTR01-NYC = 192.168.1.1, cisco_ios
    SW01-SFO = 10.10.5.254, cisco_ios
    ```
    - `Netmiko设备类型` 必须是 [Netmiko 支持的类型](https://github.com/ktbyers/netmiko/blob/develop/README.md#supports)。

### 5. 运行代理程序！

一切准备就绪！在您的终端中（确保您仍在该文件夹内），运行以下命令来启动代理：

```bash
python agent.py
```
或者，如果您想在代码更改时自动重启服务（开发时常用）：
```bash
uvicorn agent:app --reload
```

如果一切顺利，您应该会看到类似下面的输出，表示代理正在运行（地址和端口将根据您的 `config.ini` 设置而变化）：

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
...
```

**现在，您的本地代理已经成功运行了！** 请保持这个终端窗口**开启**状态。

### 6. 连接Web应用

1.  打开您的“链踪”Web应用。
2.  点击右上角的**设置图标**。
3.  在“本地代理接口”输入框中，填入您在 `config.ini` 中配置的代理地址 (例如 `http://127.0.0.1:8000`)。
4.  点击**“测试连接”**按钮。如果一切正常，您应该会看到“连接成功！”的提示。

现在您可以返回设备详情页面，尝试使用**“从设备获取”**和**“推送到设备并记录”**功能了！
