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

echo [INFO] Sewepo service uninstall started.

rem Require admin rights to stop/uninstall Windows services.
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

echo [INFO] 检查服务是否存在: %SERVICE_ID%
sc query "%SERVICE_ID%" >nul 2>&1
if not "%ERRORLEVEL%"=="0" (
	echo [INFO] 未检测到服务 %SERVICE_ID%，无需卸载。
	set "EXIT_CODE=0"
	goto :END
)

echo [INFO] 正在停止服务...
"%WINSW_EXE%" stop >nul 2>&1

echo [INFO] 正在卸载服务...
"%WINSW_EXE%" uninstall
if errorlevel 1 (
	echo [WARN] WinSW 卸载失败，尝试使用 sc delete 强制删除...
	sc delete "%SERVICE_ID%" >nul 2>&1
	if not "%ERRORLEVEL%"=="0" (
		echo [ERROR] 服务卸载失败，请检查权限或服务状态。
		set "EXIT_CODE=1"
		goto :END
	)
)

echo [SUCCESS] 服务已卸载。
set "EXIT_CODE=0"

:END
echo.
pause
exit /b %EXIT_CODE%
