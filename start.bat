@echo off
title MedOS HMS Launcher
color 0A
echo.
echo ======================================================
echo    MedOS Hospital Management System v2.0
echo ======================================================
echo.

:: Install backend deps if needed
if not exist "backend\node_modules" (
    echo [1/4] Installing backend dependencies...
    cd backend && npm install && cd ..
    echo Done.
)

:: Install frontend deps if needed
if not exist "frontend\node_modules" (
    echo [2/4] Installing frontend dependencies...
    cd frontend && npm install && cd ..
    echo Done.
)

echo [3/4] Starting backend on port 3001...
start "MedOS Backend" cmd /k "cd /d %~dp0backend && node server.js"

timeout /t 2 /nobreak > nul

echo [4/4] Starting frontend on port 3000...
start "MedOS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 3 /nobreak > nul

echo.
echo ======================================================
echo   Backend  : http://localhost:3001/api/health
echo   Frontend : http://localhost:3000
echo ======================================================
echo.
echo   Logins:
echo   admin / admin123        (Full access)
echo   drpriya / doctor123     (Doctor - OPD)
echo   reception1 / recep123   (Front Office)
echo   nurse1 / nurse123       (Nursing)
echo   billing1 / billing123   (Billing)
echo.
echo   Press any key to open in browser...
pause > nul
start http://localhost:3000
