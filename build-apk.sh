#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTPUT_DIR="$ROOT_DIR/dist"
OUTPUT_APK="$OUTPUT_DIR/rhythm-health-debug.apk"
MIN_NODE_MAJOR=20
MIN_JAVA_MAJOR=21
ANDROID_CLI_VERSION=15859902

log() {
  printf '\n\033[1;32m==>\033[0m %s\n' "$1"
}

fail() {
  printf '\n\033[1;31mBuild failed:\033[0m %s\n' "$1" >&2
  exit 1
}

node_major_from() {
  "$1/node" -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || printf '0'
}

select_node() {
  local candidate current_dir
  current_dir="$(dirname "$(command -v node 2>/dev/null || printf '/missing/node')")"

  for candidate in "$current_dir" "/usr/local/bin" "/opt/homebrew/bin"; do
    if [[ -x "$candidate/node" ]] && [[ "$(node_major_from "$candidate")" -ge "$MIN_NODE_MAJOR" ]]; then
      export PATH="$candidate:$PATH"
      return
    fi
  done

  for candidate in "$HOME"/.nvm/versions/node/*/bin; do
    if [[ -x "$candidate/node" ]] && [[ "$(node_major_from "$candidate")" -ge "$MIN_NODE_MAJOR" ]]; then
      export PATH="$candidate:$PATH"
      return
    fi
  done

  fail "Node.js $MIN_NODE_MAJOR or newer is required. Install it with: brew install node"
}

sha256_file() {
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$1" | awk '{print $1}'
  elif command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$1" | awk '{print $1}'
  else
    fail "A SHA-256 tool is required (shasum or sha256sum)."
  fi
}

java_major_from() {
  "$1" -version 2>&1 | awk -F'[\".]' '/version/ { if ($2 == 1) print $3; else print $2; exit }'
}

use_java_home() {
  local candidate="$1"
  if [[ -x "$candidate/bin/java" ]] && [[ "$(java_major_from "$candidate/bin/java")" -ge "$MIN_JAVA_MAJOR" ]]; then
    export JAVA_HOME="$candidate"
    export PATH="$JAVA_HOME/bin:$PATH"
    return 0
  fi
  return 1
}

install_jdk() {
  local install_root="$HOME/.cache/rhythm-health/jdk-$MIN_JAVA_MAJOR"
  local os_name architecture api_os api_arch api_url temp_dir package_url checksum actual_checksum java_bin

  java_bin="$(find "$install_root" \( -type f -o -type l \) -path '*/bin/java' 2>/dev/null | head -n 1 || true)"
  if [[ -n "$java_bin" ]] && use_java_home "${java_bin%/bin/java}"; then
    return
  fi

  os_name="$(uname -s)"
  architecture="$(uname -m)"
  case "$os_name" in
    Darwin) api_os="mac" ;;
    Linux) api_os="linux" ;;
    *) fail "Automatic JDK installation is not supported on $os_name." ;;
  esac
  case "$architecture" in
    arm64|aarch64) api_arch="aarch64" ;;
    x86_64|amd64) api_arch="x64" ;;
    *) fail "Automatic JDK installation is not supported on $architecture." ;;
  esac

  api_url="https://api.adoptium.net/v3/assets/latest/$MIN_JAVA_MAJOR/hotspot?architecture=$api_arch&image_type=jdk&os=$api_os&page_size=1&project=jdk&vendor=eclipse"
  temp_dir="$(mktemp -d)"
  trap "rm -rf '$temp_dir'" EXIT

  log "Resolving Eclipse Temurin JDK $MIN_JAVA_MAJOR"
  curl --fail --location --retry 3 --silent "$api_url" -o "$temp_dir/jdk.json"
  package_url="$(node -e 'const x=require(process.argv[1])[0]; process.stdout.write(x.binary.package.link)' "$temp_dir/jdk.json")"
  checksum="$(node -e 'const x=require(process.argv[1])[0]; process.stdout.write(x.binary.package.checksum)' "$temp_dir/jdk.json")"
  [[ -n "$package_url" && -n "$checksum" ]] || fail "Unable to resolve a JDK download."

  log "Downloading Eclipse Temurin JDK $MIN_JAVA_MAJOR"
  curl --fail --location --retry 3 --progress-bar "$package_url" -o "$temp_dir/jdk.tar.gz"
  actual_checksum="$(sha256_file "$temp_dir/jdk.tar.gz")"
  [[ "$actual_checksum" == "$checksum" ]] || fail "JDK archive checksum mismatch."

  rm -rf "$install_root"
  mkdir -p "$install_root"
  tar -xzf "$temp_dir/jdk.tar.gz" -C "$install_root"
  java_bin="$(find "$install_root" \( -type f -o -type l \) -path '*/bin/java' | head -n 1)"
  [[ -n "$java_bin" ]] || fail "The downloaded JDK does not contain bin/java."
  use_java_home "${java_bin%/bin/java}" || fail "The downloaded JDK version is not supported."

  rm -rf "$temp_dir"
  trap - EXIT
}

configure_java() {
  local detected_java_home system_java_home

  if command -v java >/dev/null 2>&1 && [[ "$(java_major_from "$(command -v java)")" -ge "$MIN_JAVA_MAJOR" ]]; then
    detected_java_home="$(java -XshowSettings:properties -version 2>&1 | awk -F'= ' '/java.home =/ { print $2; exit }')"
    if [[ -n "$detected_java_home" ]] && use_java_home "$detected_java_home"; then
      return
    fi
  fi

  if [[ "$(uname -s)" == "Darwin" ]] && [[ -x /usr/libexec/java_home ]]; then
    system_java_home="$(/usr/libexec/java_home -v "$MIN_JAVA_MAJOR" 2>/dev/null || true)"
    if [[ -n "$system_java_home" ]] && use_java_home "$system_java_home"; then
      return
    fi
  fi

  [[ "${AUTO_INSTALL_JDK:-1}" == "1" ]] ||
    fail "JDK $MIN_JAVA_MAJOR or newer is required."
  install_jdk
}

find_sdkmanager() {
  local sdk_root candidate

  for sdk_root in \
    "${ANDROID_SDK_ROOT:-}" \
    "${ANDROID_HOME:-}" \
    "$HOME/Library/Android/sdk" \
    "/opt/homebrew/share/android-commandlinetools" \
    "/usr/local/share/android-commandlinetools"; do
    [[ -n "$sdk_root" ]] || continue
    for candidate in \
      "$sdk_root/cmdline-tools/latest/bin/sdkmanager" \
      "$sdk_root/tools/bin/sdkmanager" \
      "$sdk_root/bin/sdkmanager"; do
      if [[ -x "$candidate" ]]; then
        printf '%s' "$candidate"
        return 0
      fi
    done
  done

  command -v sdkmanager 2>/dev/null || return 1
}

install_android_command_line_tools() {
  local sdk_root="$1"
  local os_name architecture archive_name checksum url temp_dir actual_checksum

  command -v curl >/dev/null 2>&1 || fail "curl is required to download the Android SDK."
  command -v unzip >/dev/null 2>&1 || fail "unzip is required to install the Android SDK."

  os_name="$(uname -s)"
  architecture="$(uname -m)"
  case "$os_name:$architecture" in
    Darwin:arm64)
      archive_name="commandlinetools-mac_arm64-${ANDROID_CLI_VERSION}_latest.zip"
      checksum="835b62a26162b229b441d1f6d4680383815a270809eb33522c0d480fa5002c4e"
      ;;
    Darwin:x86_64)
      archive_name="commandlinetools-mac_x86_64-${ANDROID_CLI_VERSION}_latest.zip"
      checksum="c5a6378ab5cf7e0d5701921405115befff13e9ff7417fb588389338f8bd050f3"
      ;;
    Linux:*)
      archive_name="commandlinetools-linux-${ANDROID_CLI_VERSION}_latest.zip"
      checksum="4e4c464f145a7512b57d088ac6c278c03c9eea610886b35a5e0804e74eedf583"
      ;;
    *)
      fail "Automatic Android SDK installation is not supported on $os_name $architecture."
      ;;
  esac

  url="https://dl.google.com/android/repository/$archive_name"
  temp_dir="$(mktemp -d)"
  trap "rm -rf '$temp_dir'" EXIT

  log "Downloading Android SDK command-line tools"
  curl --fail --location --retry 3 --progress-bar "$url" -o "$temp_dir/tools.zip"

  actual_checksum="$(sha256_file "$temp_dir/tools.zip")"
  [[ "$actual_checksum" == "$checksum" ]] ||
    fail "Android SDK archive checksum mismatch."

  unzip -q "$temp_dir/tools.zip" -d "$temp_dir/unpacked"
  mkdir -p "$sdk_root/cmdline-tools"
  rm -rf "$sdk_root/cmdline-tools/latest"
  mv "$temp_dir/unpacked/cmdline-tools" "$sdk_root/cmdline-tools/latest"
  rm -rf "$temp_dir"
  trap - EXIT
}

configure_android_sdk() {
  local sdkmanager sdk_root license_status

  sdkmanager="$(find_sdkmanager || true)"
  if [[ -z "$sdkmanager" ]]; then
    [[ "${AUTO_INSTALL_ANDROID_SDK:-1}" == "1" ]] ||
      fail "Android SDK command-line tools were not found."
    sdk_root="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-$HOME/Library/Android/sdk}}"
    install_android_command_line_tools "$sdk_root"
    sdkmanager="$sdk_root/cmdline-tools/latest/bin/sdkmanager"
  fi
  [[ -n "$sdkmanager" ]] || fail "sdkmanager is still unavailable after installation."

  if [[ "$sdkmanager" == *"/cmdline-tools/"* ]]; then
    sdk_root="${sdkmanager%%/cmdline-tools/*}"
  elif [[ -n "${ANDROID_SDK_ROOT:-}" ]]; then
    sdk_root="$ANDROID_SDK_ROOT"
  else
    sdk_root="$(cd "$(dirname "$sdkmanager")/.." && pwd)"
  fi

  export ANDROID_SDK_ROOT="$sdk_root"
  export ANDROID_HOME="$sdk_root"
  export PATH="$(dirname "$sdkmanager"):$ANDROID_SDK_ROOT/platform-tools:$PATH"

  log "Accepting Android SDK licenses"
  set +o pipefail
  yes | "$sdkmanager" --sdk_root="$ANDROID_SDK_ROOT" --licenses >/dev/null
  license_status="${PIPESTATUS[1]}"
  set -o pipefail
  [[ "$license_status" -eq 0 ]] || fail "Android SDK licenses could not be accepted."

  log "Installing Android SDK build components"
  "$sdkmanager" --sdk_root="$ANDROID_SDK_ROOT" \
    "platform-tools" \
    "platforms;android-35" \
    "build-tools;35.0.0"
}

prepare_project() {
  cd "$ROOT_DIR"

  log "Installing JavaScript dependencies"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi

  log "Preparing web assets"
  npm run prepare:web

  if [[ ! -f android/gradlew ]]; then
    log "Creating the Capacitor Android project"
    mkdir -p "$ROOT_DIR/.cap-home"
    HOME="$ROOT_DIR/.cap-home" npx --no-install cap add android
  fi

  sed -i.bak 's/-all\.zip/-bin.zip/' android/gradle/wrapper/gradle-wrapper.properties
  rm -f android/gradle/wrapper/gradle-wrapper.properties.bak

  log "Synchronizing Capacitor"
  npx --no-install cap sync android

  log "Applying Android home widget"
  node scripts/prepare-android.js

  printf 'sdk.dir=%s\n' "$ANDROID_SDK_ROOT" > android/local.properties
  chmod +x android/gradlew
}

build_apk() {
  log "Building the debug APK"
  (
    cd "$ROOT_DIR/android"
    ./gradlew --no-daemon assembleDebug
  )

  local source_apk="$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
  [[ -f "$source_apk" ]] || fail "Gradle finished without producing $source_apk"

  mkdir -p "$OUTPUT_DIR"
  cp "$source_apk" "$OUTPUT_APK"
  shasum -a 256 "$OUTPUT_APK" > "$OUTPUT_APK.sha256"

  log "APK ready"
  printf '%s\n' "$OUTPUT_APK"
  printf 'SHA-256: %s\n' "$(awk '{print $1}' "$OUTPUT_APK.sha256")"
}

main() {
  select_node
  configure_java

  log "Using Node $(node -v) and Java $(java -version 2>&1 | head -n 1)"
  configure_android_sdk
  prepare_project
  build_apk
}

main "$@"
