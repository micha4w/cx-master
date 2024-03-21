#!/usr/bin/env bash

NATIVE_NAME="ch.micha4w.cx_lsp"
REPO="micha4w/cx-master"
DOWNLOAD="v1.2.3/cx-lsp-controller-x86_64-unknown-linux-gnu"
DATA_LOCATION="${XDG_DATA_HOME:-$HOME/.local/share}/cx-master"
MANIFEST_LOCATIONS=(
  "$HOME/.mozilla/native-messaging-hosts"
  "$HOME/.config/chromium/NativeMessagingHosts"
  "$HOME/.config/google-chrome/NativeMessagingHosts"
)
MANIFEST='{
  "name": "'"$NATIVE_NAME"'",
  "description": "Bridge to connect Code Expert with local LSPs Servers",
  "path": "'"$DATA_LOCATION"'/cx-lsp-controller",
  "type": "stdio",
  "allowed_extensions": ["cx-master@micha4w.ch"],
  "allowed_origins": ["chrome-extension://fdmghidnemaceleocaolmgdkpegkhlcf"]
}'

echo "Creating Manifests..."
for LOCATION in "${MANIFEST_LOCATIONS[@]}" ; do
  mkdir -p "$LOCATION"
  echo "$MANIFEST" > "$LOCATION/$NATIVE_NAME.json"
done

echo "Downloading Executable..."
mkdir -p "$DATA_LOCATION"
curl -L "https://github.com/$REPO/releases/download/$DOWNLOAD" -o "$DATA_LOCATION/cx-lsp-controller"

echo "Downloading LSP Configs..."
chmod +x "$DATA_LOCATION/cx-lsp-controller"
curl "https://codeload.github.com/$REPO/tar.gz/main" | tar xzC "$DATA_LOCATION" --strip=2 --wildcards \*-main/native-host/lsps