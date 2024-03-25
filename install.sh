#!/usr/bin/env bash

NATIVE_NAME="ch.micha4w.cx_lsp"
REPO="micha4w/cx-master"
DOWNLOAD="v1.2.4/cx-lsp-controller-x86_64-unknown-linux-gnu"
DATA_LOCATION="${XDG_DATA_HOME:-$HOME/.local/share}/cx-master"


MANIFEST_LOCATION_FIREFOX="$HOME/.mozilla/native-messaging-hosts"
MANIFEST_LOCATION_CHROMIUM="$HOME/.config/chromium/NativeMessagingHosts"
MANIFEST_LOCATION_CHROME="$HOME/.config/google-chrome/NativeMessagingHosts"

MANIFEST_FIREFOX='{
  "name": "'"$NATIVE_NAME"'",
  "description": "Bridge to connect Code Expert with local LSPs Servers",
  "path": "'"$DATA_LOCATION"'/cx-lsp-controller",
  "type": "stdio",
  "allowed_extensions": ["cx-master@micha4w.ch"]
}'
MANIFEST_CHROME='{
  "name": "'"$NATIVE_NAME"'",
  "description": "Bridge to connect Code Expert with local LSPs Servers",
  "path": "'"$DATA_LOCATION"'/cx-lsp-controller",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://fdmghidnemaceleocaolmgdkpegkhlcf/"]
}'

echo "Creating Manifests..."
mkdir -p "$MANIFEST_LOCATION_FIREFOX"
echo "$MANIFEST_FIREFOX" > "$MANIFEST_LOCATION_FIREFOX/$NATIVE_NAME.json"

mkdir -p "$MANIFEST_LOCATION_CHROME"
echo "$MANIFEST_CHROME" > "$MANIFEST_LOCATION_CHROME/$NATIVE_NAME.json"

mkdir -p "$MANIFEST_LOCATION_CHROMIUM"
echo "$MANIFEST_CHROME" > "$MANIFEST_LOCATION_CHROMIUM/$NATIVE_NAME.json"

echo "Downloading Executable..."
mkdir -p "$DATA_LOCATION"
curl -L "https://github.com/$REPO/releases/download/$DOWNLOAD" -o "$DATA_LOCATION/cx-lsp-controller"

echo "Downloading LSP Configs..."
chmod +x "$DATA_LOCATION/cx-lsp-controller"
curl "https://codeload.github.com/$REPO/tar.gz/main" | tar xzC "$DATA_LOCATION" --strip=2 --wildcards \*-main/native-host/lsps
