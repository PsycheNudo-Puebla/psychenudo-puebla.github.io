# ============================================================
# Script de despliegue para GitHub Pages
# Uso: .\deploy.ps1
# 1. Compila TypeScript con Vite
# 2. Copia los archivos compilados al directorio fuente
# 3. Listo para git commit + push
# ============================================================

Write-Host "🚀 Iniciando despliegue..." -ForegroundColor Cyan
Write-Host ""

# 1. Compilar
Write-Host "📦 Compilando con Vite..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en la compilación" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Compilación exitosa" -ForegroundColor Green
Write-Host ""

# 2. Backup HTMLs fuente antes de sobrescribir (para que Vite pueda rebuildear después)
Write-Host "📦 Respaldando HTMLs fuente para rebuild..." -ForegroundColor Yellow
Copy-Item -Path "alumno.html" -Destination "alumno.html.bak" -Force
Copy-Item -Path "profesor.html" -Destination "profesor.html.bak" -Force
Copy-Item -Path "index.html" -Destination "index.html.bak" -Force

# 3. Copiar archivos compilados al directorio fuente
Write-Host "📋 Copiando archivos compilados..." -ForegroundColor Yellow

# Assets (JS, CSS compilados)
if (Test-Path "dist/assets") {
    Remove-Item -Path "assets" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "dist/assets" -Destination "assets" -Recurse -Force
    Write-Host "   ✅ assets/ actualizado" -ForegroundColor Green
}

# QRCode library
if (Test-Path "dist/js/qrcode.min.js") {
    Copy-Item -Path "dist/js/qrcode.min.js" -Destination "js/qrcode.min.js" -Force
    Write-Host "   ✅ js/qrcode.min.js actualizado" -ForegroundColor Green
}

# HTMLs compilados (producción) — sobrescriben los fuente para deploy
Copy-Item -Path "dist/profesor.html" -Destination "profesor.html" -Force
Write-Host "   ✅ profesor.html (producción)" -ForegroundColor Green

Copy-Item -Path "dist/alumno.html" -Destination "alumno.html" -Force
Write-Host "   ✅ alumno.html (producción)" -ForegroundColor Green

Copy-Item -Path "dist/index.html" -Destination "index.html" -Force
Write-Host "   ✅ index.html (producción)" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Despliegue completado" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  Los HTMLs fuente han sido respaldados como *.html.bak" -ForegroundColor Yellow
Write-Host "   Después del commit, ejecuta 'undo:restore' en Copilot" -ForegroundColor Yellow
Write-Host "   O manualmente: Copy-Item alumno.html.bak alumno.html (etc.)" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ahora ejecuta estos comandos para subir a GitHub Pages:" -ForegroundColor Cyan
Write-Host "  git add ." -ForegroundColor White
Write-Host '  git commit -m "despliegue produccion"' -ForegroundColor White
Write-Host "  git push" -ForegroundColor White
Write-Host ""
Write-Host "Después del push, restaura los HTMLs fuente con:" -ForegroundColor Cyan
Write-Host "  Copy-Item alumno.html.bak alumno.html" -ForegroundColor White
Write-Host "  Copy-Item profesor.html.bak profesor.html" -ForegroundColor White
Write-Host "  Copy-Item index.html.bak index.html" -ForegroundColor White
Write-Host ""
Write-Host "Para volver a desarrollar, restaura los HTMLs originales:" -ForegroundColor Yellow
Write-Host "  git checkout -- index.html profesor.html alumno.html" -ForegroundColor White
