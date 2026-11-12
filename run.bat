@echo off
setlocal
echo ========================================================
echo   Starting AttendPay - Employee Payroll System
echo ========================================================

:: Configure environment paths
set "JAVA_HOME=%LOCALAPPDATA%\Programs\Java\jdk-17.0.21.0.2+1"
set "MYSQL_DIR=%LOCALAPPDATA%\Programs\MySQL\mariadb-10.11.10-winx64"
set "PYTHON_DIR=%LOCALAPPDATA%\Programs\Python\Python311"

set "PATH=%JAVA_HOME%\bin;%MYSQL_DIR%\bin;%PYTHON_DIR%;%PYTHON_DIR%\Scripts;%PATH%"

:: Check if MySQL is listening on port 3306
netstat -ano | findstr /R /C:":3306 .*LISTENING" >nul
if errorlevel 1 (
    echo [1/3] Starting MySQL database server...
    start /B "" "%MYSQL_DIR%\bin\mysqld.exe" --datadir="%MYSQL_DIR%\data" --port=3306
    timeout /t 3 /nobreak >nul
) else (
    echo [1/3] MySQL database server is already running.
)

echo [2/3] Opening browser at http://localhost:8080...
start http://localhost:8080

echo [3/3] Starting AttendPay Java Web Server on port 8080...
java -cp "lib/*" src/Main.java
pause
