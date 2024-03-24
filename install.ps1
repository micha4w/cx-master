using namespace System.IO.Compression

$NATIVE_NAME = "ch.micha4w.cx_lsp"
$REPO = "micha4w/cx-master"
$DOWNLOAD = "v1.2.3/cx-lsp-controller-x86_64-pc-windows-msvc.exe"

# TODO 
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

$MANIFEST_LOCATIONS = @(
  "HKCU:\Software\Google\Chrome\NativeMessagingHosts",
  "HKCU:\Software\Mozilla\NativeMessagingHosts" 
)

Write-Host "Downloading Executable..."
New-Item -ItemType Directory -Path "$Env:APPDATA/cx-master" -Force
Invoke-WebRequest "https://github.com/$REPO/releases/download/$DOWNLOAD" -OutFile "$Env:APPDATA\cx-master\cx-lsp-controller.exe"

Write-Host "Downloading Repository..."
$tmp = New-TemporaryFile
Invoke-WebRequest "https://codeload.github.com/$REPO/zip/main" -OutFile $tmp 

Write-Host "Extracting Zip Configs..."
$zip = [ZipFile]::OpenRead($tmp)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip.Entries.Where{ $_.FullName -match "^[^/]*-main/native-host/lsps/." -and $_.FullName -notmatch "/$" }.ForEach{
  $newFile = [IO.FileInfo]($_.FullName -replace "^[^/]*-main/native-host/", "$Env:APPDATA\cx-master\")
  $newFile.Directory.Create()
  $newFile.Delete()
  [ZipFileExtensions]::ExtractToFile($_, $newFile)
}
$zip.Dispose()
$tmp | Remove-Item

Write-Host "Creating Manifest..."
New-Item "$Env:APPDATA\cx-master\$NATIVE_NAME.json" -ItemType File -Value $MANIFEST -Force

Write-Host "Registering Manifest..."
foreach ($LOCATION in $MANIFEST_LOCATIONS) {
  New-Item -Path "$LOCATION\$NATIVE_NAME" -Value "$Env:APPDATA\cx-master\$NATIVE_NAME.json" -Force
}
