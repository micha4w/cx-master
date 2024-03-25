using namespace System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$NATIVE_NAME = "ch.micha4w.cx_lsp"
$REPO = "micha4w/cx-master"
$DOWNLOAD = "v1.2.3/cx-lsp-controller-x86_64-pc-windows-msvc.exe"

$MANIFEST_CHROME = '{
  "name": "' + $NATIVE_NAME + '",
  "description": "Bridge to connect Code Expert with local LSPs Servers",
  "path": ' + (ConvertTo-Json ($Env:APPDATA + "\cx-master\cx-lsp-controller.exe")) + ',
  "type": "stdio",
  "allowed_origins": ["chrome-extension://fdmghidnemaceleocaolmgdkpegkhlcf/"]
}'

$MANIFEST_FIREFOX = '{
  "name": "' + $NATIVE_NAME + '",
  "description": "Bridge to connect Code Expert with local LSPs Servers",
  "path": ' + (ConvertTo-Json ($Env:APPDATA + "\cx-master\cx-lsp-controller.exe")) + ',
  "type": "stdio",
  "allowed_extensions": ["cx-master@micha4w.ch"],
}'

$MANIFEST_LOCATION_CHROME="HKCU:\Software\Google\Chrome\NativeMessagingHosts"
$MANIFEST_LOCATION_FIREFOX="HKCU:\Software\Mozilla\NativeMessagingHosts" 

Write-Host "Downloading Executable..."
New-Item -ItemType Directory -Path "$Env:APPDATA/cx-master" -Force
Invoke-WebRequest "https://github.com/$REPO/releases/download/$DOWNLOAD" -OutFile "$Env:APPDATA\cx-master\cx-lsp-controller.exe"

Write-Host "Downloading Repository..."
$tmp = New-TemporaryFile
Invoke-WebRequest "https://codeload.github.com/$REPO/zip/main" -OutFile $tmp 

Write-Host "Extracting Zip Configs..."
$zip = [ZipFile]::OpenRead($tmp)
$zip.Entries.Where{ $_.FullName -match "^[^/]*-main/native-host/lsps/." -and $_.FullName -notmatch "/$" }.ForEach{
  $newFile = [IO.FileInfo]($_.FullName -replace "^[^/]*-main/native-host/", "$Env:APPDATA\cx-master\")
  $newFile.Directory.Create()
  $newFile.Delete()
  [ZipFileExtensions]::ExtractToFile($_, $newFile)
}
$zip.Dispose()
$tmp | Remove-Item

Write-Host "Creating Manifests..."
New-Item "$Env:APPDATA\cx-master\$NATIVE_NAME.chrome.json" -ItemType File -Value $MANIFEST_CHROME -Force
New-Item "$Env:APPDATA\cx-master\$NATIVE_NAME.firefox.json" -ItemType File -Value $MANIFEST_FIREFOX -Force

Write-Host "Registering Manifests..."
New-Item -Path "$MANIFEST_LOCATION_CHROME\$NATIVE_NAME" -Value "$Env:APPDATA\cx-master\$NATIVE_NAME.chrome.json" -Force
New-Item -Path "$MANIFEST_LOCATION_FIREFOX\$NATIVE_NAME" -Value "$Env:APPDATA\cx-master\$NATIVE_NAME.firefox.json" -Force
