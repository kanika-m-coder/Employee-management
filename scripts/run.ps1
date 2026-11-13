$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
$Driver = Join-Path $ProjectRoot "lib\mysql-connector-j.jar"
if (!(Test-Path $Driver)) {
    Write-Host "MySQL Connector/J was not found." -ForegroundColor Red
    Write-Host "Download and place the JAR at: $Driver"
    exit 1
}
New-Item -ItemType Directory -Force -Path "out" | Out-Null
$Sources = Get-ChildItem -Path "src\main\java" -Filter "*.java" -Recurse | ForEach-Object { $_.FullName }
javac -encoding UTF-8 -cp $Driver -d out $Sources
if ($LASTEXITCODE -ne 0) { throw "Java compilation failed." }
java -cp "out;$Driver" app.Main
