# 链踪本地代理 (ChainTrace Local Agent)

欢迎使用链踪本地代理！这是一个轻量级的Python程序，它充当您的“链踪”Web应用程序与真实网络设备之间的“桥梁”。

## 功能

-   通过**SSH**安全地连接到您的网络设备。
-   提供简单的 **HTTP API** 接口，供“链踪”Web应用调用。
-   **获取**设备的当前运行配置。
-   **推送**新的配置到设备。
-   包含一个**模拟模式**，允许您在没有真实硬件的情况下测试完整的工作流程。

---

## 🚀 快速开始：设置与运行指南

请按照以下步骤在您的本地计算机上设置并运行代理。

### 1. 先决条件

-   **Python 3.7+**: 确保您的系统已安装Python。您可以在终端或命令提示符中运行 `python --version` 或 `python3 --version` 来检查。

### 2. 创建文件

在您的电脑上创建一个新文件夹（例如，`chaintrace-agent`）。然后，将我提供的三个文件的内容分别**复制**并**粘贴**到这个文件夹下的三个新文件中：
-   `agent.py`
-   `requirements.txt`
-   `README.md`

### 3. 安装依赖库

打开您的终端或命令提示符，使用 `cd` 命令进入您刚刚创建的文件夹，然后运行以下命令来安装所有必需的Python库：

```bash
pip install -r requirements.txt
```

### 4. 配置设备凭据 (重要！)

为了安全起见，我们不将设备的登录用户名和密码直接写在代码里。

1.  在与 `agent.py` **相同的文件夹**中，创建一个名为 `.env` 的新文件。

2.  打开 `.env` 文件，并复制以下内容进去：

    ```
    DEVICE_USERNAME=your_username
    DEVICE_PASSWORD=your_password
    ```

3.  **修改文件内容**：
    -   将 `your_username` 替换为您用于登录网络设备的**真实用户名**。
    -   将 `your_password` 替换为对应的**真实密码**。

    **⭐ 如何使用模拟模式？**
    如果您暂时没有真实的设备进行测试，只需将用户名设置为 `SIM_USER` 即可。像这样：
    ```
    DEVICE_USERNAME=SIM_USER
    DEVICE_PASSWORD=whatever
    ```
    当代理检测到用户名为 `SIM_USER` 时，它将不会尝试进行真实的SSH连接，而是直接返回成功的模拟数据。

### 5. （可选）配置设备信息

打开 `agent.py` 文件，找到 `DEVICE_MAP` 这个部分。您可以根据您的实际设备信息修改或添加条目。

-   `host`: 设备的IP地址。
-   `device_type`: 设备的类型，这必须是 [Netmiko 支持的类型](https://github.com/ktbyers/netmiko/blob/develop/README.md#supports)。例如，思科IOS设备是 `cisco_ios`，华为设备是 `huawei`。

### 6. 运行代理程序！

一切准备就绪！在您的终端中（确保您仍在该文件夹内），运行以下命令来启动代理：

```bash
uvicorn agent:app --reload
```

如果一切顺利，您应该会看到类似下面的输出，表示代理正在运行：

```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
...
```

**现在，您的本地代理已经成功运行了！** 请保持这个终端窗口**开启**状态。

### 7. 连接Web应用

1.  打开您的“链踪”Web应用。
2.  点击右上角的**设置图标**。
3.  在“本地代理接口”输入框中，填入代理的地址：`http://127.0.0.1:8000`
4.  点击**“测试连接”**按钮。如果一切正常，您应该会看到“连接成功！”的提示。

现在您可以返回设备详情页面，尝试使用**“从设备获取”**和**“推送到设备并记录”**功能了！
