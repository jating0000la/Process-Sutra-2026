# Load Testing Script for Windows
# Tests your VPS application from your local machine

param(
    [string]$VpsIp = "194.238.16.140",
    [int]$Requests = 100,
    [int]$Concurrent = 10
)

$AppUrl = "http://$VpsIp"

Write-Host "=================================="
Write-Host "LOAD TEST FROM LOCAL MACHINE"
Write-Host "=================================="
Write-Host ""
Write-Host "Target: $AppUrl"
Write-Host "Total Requests: $Requests"
Write-Host "Concurrent: $Concurrent"
Write-Host ""

# 1. CONNECTION TEST
Write-Host "1. CONNECTION TEST"
Write-Host "-----------------------------------"
try {
    $response = Invoke-WebRequest -Uri $AppUrl -Method GET -TimeoutSec 10
    Write-Host "✓ Connection successful (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "✗ Connection failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

# 2. LATENCY TEST
Write-Host "2. LATENCY TEST (5 requests)"
Write-Host "-----------------------------------"
$latencies = @()
for ($i = 1; $i -le 5; $i++) {
    $start = Get-Date
    try {
        Invoke-WebRequest -Uri $AppUrl -Method GET -TimeoutSec 10 | Out-Null
        $end = Get-Date
        $duration = ($end - $start).TotalMilliseconds
        $latencies += $duration
        Write-Host "Request $i: $([math]::Round($duration, 2))ms"
    } catch {
        Write-Host "Request $i: Failed"
    }
}
$avgLatency = ($latencies | Measure-Object -Average).Average
Write-Host "Average Latency: $([math]::Round($avgLatency, 2))ms" -ForegroundColor Cyan
Write-Host ""

# 3. CONCURRENT REQUESTS TEST
Write-Host "3. CONCURRENT REQUESTS TEST"
Write-Host "-----------------------------------"
Write-Host "Sending $Concurrent concurrent requests..."

$jobs = @()
$startTime = Get-Date

for ($i = 1; $i -le $Concurrent; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($url)
        try {
            Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 30 | Out-Null
            return "Success"
        } catch {
            return "Failed"
        }
    } -ArgumentList $AppUrl
}

$results = $jobs | Wait-Job | Receive-Job
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

$successful = ($results | Where-Object { $_ -eq "Success" }).Count
$failed = ($results | Where-Object { $_ -eq "Failed" }).Count

Write-Host "Completed in: $([math]::Round($duration, 2))s"
Write-Host "Successful: $successful" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor Red
Write-Host "Requests/second: $([math]::Round($Concurrent / $duration, 2))"
Write-Host ""

$jobs | Remove-Job

# 4. SUSTAINED LOAD TEST
Write-Host "4. SUSTAINED LOAD TEST ($Requests total requests)"
Write-Host "-----------------------------------"
Write-Host "Running..."

$successCount = 0
$failCount = 0
$totalTime = 0
$startTime = Get-Date

for ($i = 1; $i -le $Requests; $i++) {
    $requestStart = Get-Date
    try {
        Invoke-WebRequest -Uri $AppUrl -Method GET -TimeoutSec 10 | Out-Null
        $requestEnd = Get-Date
        $requestTime = ($requestEnd - $requestStart).TotalMilliseconds
        $totalTime += $requestTime
        $successCount++
    } catch {
        $failCount++
    }
    
    if ($i % 10 -eq 0) {
        Write-Host "Progress: $i/$Requests requests completed..."
    }
}

$endTime = Get-Date
$totalDuration = ($endTime - $startTime).TotalSeconds

Write-Host ""
Write-Host "Results:"
Write-Host "  Total Time: $([math]::Round($totalDuration, 2))s"
Write-Host "  Successful Requests: $successCount" -ForegroundColor Green
Write-Host "  Failed Requests: $failCount" -ForegroundColor Red
Write-Host "  Average Response Time: $([math]::Round($totalTime / $successCount, 2))ms"
Write-Host "  Requests/second: $([math]::Round($Requests / $totalDuration, 2))"
Write-Host ""

# 5. API ENDPOINT TESTS
Write-Host "5. API ENDPOINT TESTS"
Write-Host "-----------------------------------"

$endpoints = @(
    @{ Path = "/"; Name = "Homepage" },
    @{ Path = "/api/health"; Name = "Health Check" },
    @{ Path = "/api/organizations"; Name = "Organizations API" }
)

foreach ($endpoint in $endpoints) {
    $url = "$AppUrl$($endpoint.Path)"
    try {
        $response = Invoke-WebRequest -Uri $url -Method GET -TimeoutSec 5
        Write-Host "✓ $($endpoint.Name): $($response.StatusCode)" -ForegroundColor Green
    } catch {
        Write-Host "✗ $($endpoint.Name): Failed" -ForegroundColor Red
    }
}
Write-Host ""

# 6. SUMMARY
Write-Host "=================================="
Write-Host "TEST SUMMARY"
Write-Host "=================================="
Write-Host "VPS IP: $VpsIp"
Write-Host "Average Latency: $([math]::Round($avgLatency, 2))ms"
Write-Host "Success Rate: $([math]::Round(($successCount / $Requests) * 100, 2))%"
Write-Host "Throughput: $([math]::Round($Requests / $totalDuration, 2)) req/s"
Write-Host ""
Write-Host "Recommendations:"
if ($avgLatency -lt 100) {
    Write-Host "  ✓ Excellent latency" -ForegroundColor Green
} elseif ($avgLatency -lt 300) {
    Write-Host "  ⚠ Good latency" -ForegroundColor Yellow
} else {
    Write-Host "  ✗ High latency - consider optimization" -ForegroundColor Red
}

$successRate = ($successCount / $Requests) * 100
if ($successRate -eq 100) {
    Write-Host "  ✓ Perfect reliability" -ForegroundColor Green
} elseif ($successRate -gt 95) {
    Write-Host "  ⚠ Good reliability" -ForegroundColor Yellow
} else {
    Write-Host "  ✗ Poor reliability - investigate errors" -ForegroundColor Red
}
Write-Host ""
