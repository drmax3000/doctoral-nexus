@echo off
echo [1/2] Sincronizando codigo con GitHub...
git add .
git commit -m "chore: auto-sync (Antigravity Handoff)"
git push

echo [2/2] Levantando el sistema Doctoral Nexus...
npx expo start
