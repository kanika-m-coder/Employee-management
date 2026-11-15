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
if (!(Test-Path Env:DB_PASSWORD)) {
    $DatabaseUser = "root"
    if ($env:DB_USER) { $DatabaseUser = $env:DB_USER }
    $SecurePassword = Read-Host "Enter the MySQL password for $DatabaseUser (leave blank if none)" -AsSecureString
    $PasswordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecurePassword)
    try {
        $env:DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($PasswordPointer)
    } finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($PasswordPointer)
        $SecurePassword.Dispose()
    }
}
java -cp "out;$Driver" app.Main
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
