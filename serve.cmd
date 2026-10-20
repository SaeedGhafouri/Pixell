@echo off
rem Serves this folder at http://localhost:8080 and opens the playground.
cd /d "%~dp0"
start "" http://localhost:8080/index.html
python -m http.server 8080
