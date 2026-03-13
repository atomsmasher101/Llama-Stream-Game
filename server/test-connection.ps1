# Test external connectivity

Write-Host "=== External Connectivity Test ===" -ForegroundColor Cyan
Write-Host ""

# Your local IP
Write-Host "Your local IP: 192.168.1.248" -ForegroundColor Yellow

# Check your public IP
Write-Host "`nDetecting public IP..." -ForegroundColor Cyan
try {
    $publicIP = (Invoke-WebRequest -Uri "https://api.ipify.org" -TimeoutSec 5 -UseBasicParsing).Content
    Write-Host "Your public IP: $publicIP" -ForegroundColor Yellow
} catch {
    Write-Host "Could not detect public IP" -ForegroundColor Red
}

Write-Host "`n=== Testing Cloudflare URL ===" -ForegroundColor Cyan
Write-Host "URL: https://llamagame-ai-server.wascomb.com:3000/health"
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "https://llamagame-ai-server.wascomb.com:3000/health" -TimeoutSec 10 -UseBasicParsing
    Write-Host "Cloudflare connection: OK!" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Cloudflare connection: FAILED" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)"
}

Write-Host "`n=== Common Issues ===" -ForegroundColor Cyan
Write-Host "1. Cloudflare: Make sure port 3000 is allowed in Cloudflare dashboard"
Write-Host "2. Router: Forward port 3000 to 192.168.1.248"
Write-Host "3. Cloudflare Tunnel: If using Cloudflare Tunnel, configure it to forward port 3000"
