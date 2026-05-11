@echo off
echo.
echo ==========================================
echo   AI Research Agent - Windows Setup
echo   Groq (FREE) + Tavily + LangGraph
echo ==========================================
echo.

echo [1/3] Installing packages...
pip install -r requirements.txt

echo.
echo [2/3] Checking .env file...
if not exist .env (
    echo .env file nahi mili!
    copy NUL .env
)

echo .env file khul rahi hai - apni keys daalo aur save karo...
notepad .env

echo.
echo [3/3] Starting AI Research Agent...
echo.
echo =========================================
echo  Browser mein yeh kholo:
echo  http://localhost:8000/docs
echo =========================================
echo.
python main.py

pause
