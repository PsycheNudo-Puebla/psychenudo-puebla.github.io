# ============================================================
# Script de despliegue para GitHub Pages
# Uso: .\deploy.ps1
# 1. Compila TypeScript con Vite
# 2. Copia los archivos compilados al directorio fuente
# 3. Prepara el git stage (quita skip-worktree, staggea
#    los HTMLs de producción y re-aplica skip-worktree)
# ============================================================

$RepoRoot = Resolve-Path "$PSScriptRoot\..\.."

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

# 2. Respaldar HTMLs fuente locales (modo desarrollo: apuntan a .ts)
#    Por si quieres restaurarlos después del deploy.
Write-Host "📦 Respaldando HTMLs fuente locales..." -ForegroundColor Yellow
if (-not (Test-Path "alumno.html.bak"))  { Copy-Item "alumno.html" "alumno.html.bak" }
if (-not (Test-Path "profesor.html.bak")) { Copy-Item "profesor.html" "profesor.html.bak" }
if (-not (Test-Path "index.html.bak"))    { Copy-Item "index.html" "index.html.bak" }
Write-Host "   ✅ Respaldos actualizados" -ForegroundColor Green

# 3. Copiar archivos compilados del dist/ a la raíz del proyecto
Write-Host "📋 Copiando archivos compilados..." -ForegroundColor Yellow

# Assets (JS, CSS compilados)
if (Test-Path "dist/assets") {
    Remove-Item "assets" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item "dist/assets" "assets" -Recurse -Force
    Write-Host "   ✅ assets/ actualizado" -ForegroundColor Green
}

# QRCode library
if (Test-Path "dist/js/qrcode.min.js") {
    Copy-Item "dist/js/qrcode.min.js" "js/qrcode.min.js" -Force
    Write-Host "   ✅ js/qrcode.min.js actualizado" -ForegroundColor Green
}

# HTMLs compilados (producción)
Copy-Item "dist/profesor.html" "profesor.html" -Force
Write-Host "   ✅ profesor.html (producción)" -ForegroundColor Green
Copy-Item "dist/alumno.html" "alumno.html" -Force
Write-Host "   ✅ alumno.html (producción)" -ForegroundColor Green
Copy-Item "dist/index.html" "index.html" -Force
Write-Host "   ✅ index.html (producción)" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Archivos copiados correctamente" -ForegroundColor Green

# 4. Git stage (quitar skip-worktree temporalmente para staggear
#    los HTMLs de producción, y luego re-aplicarlo)
Write-Host "📌 Preparando git stage..." -ForegroundColor Yellow
Push-Location $RepoRoot

# Quitar skip-worktree para poder staggear los HTMLs actualizados
git update-index --no-skip-worktree recursos/asistencia-qr/profesor.html
git update-index --no-skip-worktree recursos/asistencia-qr/alumno.html
git update-index --no-skip-worktree recursos/asistencia-qr/index.html

# Staggear assets y HTMLs de producción
git add -f recursos/asistencia-qr/assets/
git add recursos/asistencia-qr/profesor.html
git add recursos/asistencia-qr/alumno.html
git add recursos/asistencia-qr/index.html

# Re-aplicar skip-worktree para que cambios locales
# (modo desarrollo) no ensucien el git status
git update-index --skip-worktree recursos/asistencia-qr/profesor.html
git update-index --skip-worktree recursos/asistencia-qr/alumno.html
git update-index --skip-worktree recursos/asistencia-qr/index.html

Pop-Location
Write-Host "   ✅ Archivos en staging listos para commit" -ForegroundColor Green

Write-Host ""
Write-Host "✅ Despliegue completado" -ForegroundColor Green
Write-Host ""
Write-Host "Ahora ejecuta estos comandos para subir a GitHub Pages:" -ForegroundColor Cyan
Write-Host "  cd $RepoRoot" -ForegroundColor White
Write-Host '  git commit -m "despliegue produccion"' -ForegroundColor White
Write-Host "  git push" -ForegroundColor White
Write-Host ""
Write-Host "Después del push, restaura los HTMLs a modo desarrollo:" -ForegroundColor Cyan
Write-Host "  Copy-Item alumno.html.bak alumno.html" -ForegroundColor White
Write-Host "  Copy-Item profesor.html.bak profesor.html" -ForegroundColor White
Write-Host "  Copy-Item index.html.bak index.html" -ForegroundColor White
Write-Host ""
Write-Host "🛡️  Los HTMLs tienen skip-worktree: git ignora cambios" -ForegroundColor Green
Write-Host "   locales (modo desarrollo). Puedes hacer git add -A" -ForegroundColor Green
Write-Host "   sin riesgo de subirlos accidentalmente." -ForegroundColor Green
