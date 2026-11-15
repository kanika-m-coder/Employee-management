$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot
$DriverVersion = "9.3.0"
$DriverDirectory = Join-Path $ProjectRoot "lib"
$Driver = Join-Path $ProjectRoot "lib\mysql-connector-j.jar"
if (!(Test-Path $Driver)) {
    New-Item -ItemType Directory -Force -Path $DriverDirectory | Out-Null
    $DownloadUrl = "https://repo.maven.apache.org/maven2/com/mysql/mysql-connector-j/$DriverVersion/mysql-connector-j-$DriverVersion.jar"
    $TemporaryDriver = "$Driver.download"
    Write-Host "Downloading MySQL Connector/J $DriverVersion..."
    try {
        Invoke-WebRequest -Uri $DownloadUrl -OutFile $TemporaryDriver -UseBasicParsing
        if (!(Test-Path $TemporaryDriver) -or (Get-Item $TemporaryDriver).Length -eq 0) {
            throw "The downloaded MySQL Connector/J file is empty."
        }
        Move-Item -Path $TemporaryDriver -Destination $Driver -Force
    } catch {
        if (Test-Path $TemporaryDriver) {
            Remove-Item -Path $TemporaryDriver -Force
        }
        throw "Could not download MySQL Connector/J from $DownloadUrl. Check your internet connection and try again. $($_.Exception.Message)"
    }
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
