@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Switch console to UTF-8 to avoid garbled Chinese output.
chcp 65001 >nul 2>&1
if errorlevel 1 (
	echo [WARN] 无法切换到 UTF-8 代码页，中文输出可能异常。
)

set "EXIT_CODE=0"

set "BASE_DIR=%~dp0"
if "%BASE_DIR:~-1%"=="\" set "BASE_DIR=%BASE_DIR:~0,-1%"

set "SERVICE_ID=sewepo"
set "WINSW_EXE=%BASE_DIR%\Sewepo.exe"
set "WINSW_XML=%BASE_DIR%\Sewepo.xml"
set "NODE_EXE=%BASE_DIR%\tools\node.exe"

echo [INFO] 开始安装。

rem Require admin rights to install/start Windows services.
net session >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
	echo [ERROR] 请使用管理员权限运行此脚本。
	set "EXIT_CODE=1"
	goto :END
)

if not exist "%WINSW_EXE%" (
	echo [ERROR] 未找到 WinSW 可执行文件。它应该位于 %WINSW_EXE%
	set "EXIT_CODE=1"
	goto :END
)

if not exist "%WINSW_XML%" (
	echo [ERROR] 未找到 WinSW 配置文件。它应该位于 %WINSW_XML%
	set "EXIT_CODE=1"
	goto :END
)

if not exist "%NODE_EXE%" (
	echo [ERROR] 未找到 Node 可执行文件。它应该位于 %NODE_EXE%
	set "EXIT_CODE=1"
	goto :END
)

"%NODE_EXE%" --version >nul 2>&1
if errorlevel 1 (
	echo [ERROR] Node 可执行文件不可运行: %NODE_EXE%
	set "EXIT_CODE=1"
	goto :END
)

echo [INFO] 检查现有服务: %SERVICE_ID%
sc query "%SERVICE_ID%" >nul 2>&1
if "%ERRORLEVEL%"=="0" (
	echo [INFO] 检测到已存在的服务。正在重新安装...
	"%WINSW_EXE%" stop >nul 2>&1
	"%WINSW_EXE%" uninstall >nul 2>&1
)

echo [INFO] 正在安装 Windows 服务...
"%WINSW_EXE%" install
if errorlevel 1 (
	echo [ERROR] 服务安装失败。
	set "EXIT_CODE=1"
	goto :END
)

rem Ensure boot autostart even if XML start mode is changed later.
sc config "%SERVICE_ID%" start= auto >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
	echo [WARN] 无法设置自动启动。

)

echo [INFO] 正在启动服务...
"%WINSW_EXE%" start
if errorlevel 1 (
	echo [ERROR] 服务启动失败。请检查项目目录中的 WinSW 日志。
	set "EXIT_CODE=1"
	goto :END
)

sc query "%SERVICE_ID%" | findstr /I "RUNNING" >nul 2>&1
if "%ERRORLEVEL%"=="0" (
	echo [SUCCESS] 服务正在运行，并设置为开机自动启动。
	set "EXIT_CODE=0"
	goto :END
)

echo [WARN] 服务已安装，但未确认运行状态。
set "EXIT_CODE=0"

:END
echo.
pause
exit /b %EXIT_CODE%