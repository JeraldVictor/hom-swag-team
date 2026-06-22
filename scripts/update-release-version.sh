#!/usr/bin/env sh
set -eu

usage() {
  cat <<'EOF'
Usage:
  sh ./scripts/update-release-version.sh
  sh ./scripts/update-release-version.sh 1.2.3
  sh ./scripts/update-release-version.sh 1.2.3 42
  sh ./scripts/update-release-version.sh --version 1.2.3 --code 42

Defaults:
  - versionName/package.json version: bumps Android versionName patch
  - versionCode: increments android/app/build.gradle versionCode by 1

Updates:
  - package.json version
  - android/app/build.gradle versionCode
  - android/app/build.gradle versionName
EOF
}

VERSION_ARG=""
CODE_ARG=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    -h|--help)
      usage
      exit 0
      ;;
    -v|--version)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for $1" >&2
        exit 1
      fi
      VERSION_ARG="$2"
      shift 2
      ;;
    -c|--code|--version-code)
      if [ "$#" -lt 2 ]; then
        echo "Missing value for $1" >&2
        exit 1
      fi
      CODE_ARG="$2"
      shift 2
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [ -z "$VERSION_ARG" ]; then
        VERSION_ARG="$1"
      elif [ -z "$CODE_ARG" ]; then
        CODE_ARG="$1"
      else
        echo "Unexpected argument: $1" >&2
        usage >&2
        exit 1
      fi
      shift
      ;;
  esac
done

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
APP_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

VERSION_ARG="$VERSION_ARG" CODE_ARG="$CODE_ARG" APP_DIR="$APP_DIR" node <<'NODE'
import fs from 'node:fs'
import path from 'node:path'

const appDir = process.env.APP_DIR
const requestedVersion = process.env.VERSION_ARG || ''
const requestedCode = process.env.CODE_ARG || ''

const packagePath = path.join(appDir, 'package.json')
const gradlePath = path.join(appDir, 'android/app/build.gradle')

const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
let gradle = fs.readFileSync(gradlePath, 'utf8')

const codeMatch = gradle.match(/(\bversionCode\s+)(\d+)/)
const nameMatch = gradle.match(/(\bversionName\s+["'])([^"']+)(["'])/)

if (!codeMatch || !nameMatch) {
  throw new Error('Could not find versionCode and versionName in android/app/build.gradle')
}

const currentCode = Number.parseInt(codeMatch[2], 10)
const currentVersionName = nameMatch[2]

function parseVersion(value, label) {
  const match = value.match(/^(\d+)\.(\d+)(?:\.(\d+))?$/)
  if (!match) {
    throw new Error(`${label} must be in major.minor or major.minor.patch format, got "${value}"`)
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3] || '0', 10),
  }
}

function formatVersion(version) {
  return `${version.major}.${version.minor}.${version.patch}`
}

const currentVersion = parseVersion(currentVersionName, 'Current Android versionName')
const nextVersion = requestedVersion
  ? formatVersion(parseVersion(requestedVersion, 'Version'))
  : formatVersion({ ...currentVersion, patch: currentVersion.patch + 1 })

if (!/^\d+$/.test(requestedCode || String(currentCode + 1))) {
  throw new Error(`Version code must be a positive integer, got "${requestedCode}"`)
}

const nextCode = requestedCode ? Number.parseInt(requestedCode, 10) : currentCode + 1

if (nextCode <= currentCode) {
  throw new Error(`Version code must be greater than current versionCode ${currentCode}`)
}

packageJson.version = nextVersion
fs.writeFileSync(`${packagePath}.tmp`, `${JSON.stringify(packageJson, null, 2)}\n`)
fs.renameSync(`${packagePath}.tmp`, packagePath)

gradle = gradle
  .replace(/(\bversionCode\s+)\d+/, `$1${nextCode}`)
  .replace(/(\bversionName\s+["'])([^"']+)(["'])/, `$1${nextVersion}$3`)

fs.writeFileSync(`${gradlePath}.tmp`, gradle)
fs.renameSync(`${gradlePath}.tmp`, gradlePath)

console.log(`Updated release version:`)
console.log(`  package.json version: ${packageJson.version}`)
console.log(`  Android versionName:  ${nextVersion}`)
console.log(`  Android versionCode:  ${nextCode}`)
NODE
