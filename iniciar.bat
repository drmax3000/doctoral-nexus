@echo off
echo [1/3] Sincronizando codigo con GitHub...
git add .
git commit -m "chore: auto-sync (Antigravity Handoff)"
git push

echo [2/3] Levantando el tunel de Cloudflare...
start /b cmd /c "C:\estudios_doctoral_v2\cloudflared.exe tunnel --url http://localhost:8081 > C:\estudios_doctoral_v2\tunnel.log 2>&1"

echo [3/3] Levantando el sistema Doctoral Nexus (Expo)...
npx expo start -c
