#!/usr/bin/env bash
# Create/replace JWT secret for a site (HS256) with archive and kid support.
# Output path depends on the siteId inferred from the current directory:
#   Active key : /var/www/htmlv/<siteId>/data/jwt/secret.key
#   Archive    : /var/www/htmlv/<siteId>/data/jwt/archive/<kid>.key
#
# Behavior:
#   * No option (default): create new key. If active key exists -> NG (exit 1).
#   * --replace         : archive existing active key (kid-hash) then create new key.
#   * --show            : show active key summary and archive listing.
#   * --help            : show this help.
#
# Notes:
#   - kid := first 16 hex chars of SHA256(secret).
#   - Owner/group/mode are locked down for safety.
#   - Replacing the key invalidates NEW signatures; OLD tokens remain valid
#     until expiry via archive verification (if server supports kid+archive).
#
# Usage:
#   sudo /var/www/htmlv/<siteId>/root/tools/jwt-key.sh
#   sudo /var/www/htmlv/<siteId>/root/tools/jwt-key.sh --replace
#   sudo /var/www/htmlv/<siteId>/root/tools/jwt-key.sh --show
#   sudo /var/www/htmlv/<siteId>/root/tools/jwt-key.sh --help

set -euo pipefail

# ==== SITE CONTEXT (resolved dynamically) ====
require_site_context() {
  local cwd
  cwd=$(pwd -P)
  if [[ ! "${cwd}" =~ ^/var/www/htmlv/[^/]+$ ]]; then
    cat <<'EOF' >&2
ERROR: jwt-key.sh must be executed from /var/www/htmlv/<siteId>.
Example:
  cd /var/www/htmlv/example-site
  sudo ./tools/jwt-key.sh
EOF
    exit 1
  fi

  SITE_ID=${cwd##*/}
  DATA_ROOT="/var/www/htmlv/${SITE_ID}/data"
  KEY_DIR="${DATA_ROOT}/jwt"
  KEY_FILE="${KEY_DIR}/secret.key"
  ARCHIVE_DIR="${KEY_DIR}/archive"
}

# ==== PERMISSIONS (fixed defaults; no env overrides) ====
OWNER="www-data"
GROUP="www-data"
MODE_DIR="700"   # drwx------
MODE_FILE="600"  # -rw-------
UMASK_VAL="077"  # new files go 600

# ==== KEY SIZE ====
BYTES="64"       # 64 bytes (512-bit)

# ---- helpers ----
usage() {
  cat <<'EOF'
Usage:
  jwt-key.sh            # create (NG if active key exists)
  jwt-key.sh --replace  # archive old -> create new
  jwt-key.sh --show     # show active key summary and archive list
  jwt-key.sh --help     # show this help

Paths:
  Active : /var/www/htmlv/<siteId>/data/jwt/secret.key
  Archive: /var/www/htmlv/<siteId>/data/jwt/archive/<kid>.key

Notes:
  - Replacing the key rotates signing key. Old tokens remain valid until expiry
    if the app verifies using archive by kid. If you want immediate invalidation,
    clear the archive or disable kid-fallback in server.
EOF
}

openssl_available() { command -v openssl >/dev/null 2>&1; }

rand_bytes() {
  if openssl_available; then
    openssl rand "${BYTES}"
  else
    head -c "${BYTES}" /dev/urandom
  fi
}

sha256_hex() {
  if openssl_available; then
    openssl dgst -sha256 "$1" | awk '{print $2}'
  else
    sha256sum "$1" | awk '{print $1}'
  fi
}

ensure_dirs() {
  mkdir -p "${KEY_DIR}" "${ARCHIVE_DIR}"
  chown "${OWNER}:${GROUP}" "${KEY_DIR}" "${ARCHIVE_DIR}"
  chmod "${MODE_DIR}" "${KEY_DIR}" "${ARCHIVE_DIR}"
}

write_new_key() {
  local tmp="${KEY_FILE}.tmp.$$"
  umask "${UMASK_VAL}"
  rand_bytes > "${tmp}"

  local sz
  sz=$(wc -c < "${tmp}")
  if [[ "${sz}" -lt "${BYTES}" ]]; then
    rm -f "${tmp}"
    echo "ERROR: generated key too small (${sz} bytes)" >&2
    exit 1
  fi

  chown "${OWNER}:${GROUP}" "${tmp}"
  chmod "${MODE_FILE}" "${tmp}"
  mv -f "${tmp}" "${KEY_FILE}"
}

archive_existing_if_any() {
  if [[ -f "${KEY_FILE}" ]]; then
    local sha kid dst
    sha=$(sha256_hex "${KEY_FILE}")
    kid="${sha:0:16}"
    dst="${ARCHIVE_DIR}/${kid}.key"

    # move active -> archive/<kid>.key (overwrite if collides)
    mv -f "${KEY_FILE}" "${dst}"
    chown "${OWNER}:${GROUP}" "${dst}"
    chmod "${MODE_FILE}" "${dst}"
    echo "Archived old key -> ${dst}"
  fi
}

cmd_create() {
  ensure_dirs
  if [[ -e "${KEY_FILE}" ]]; then
    echo "NG: key already exists: ${KEY_FILE}" >&2
    echo "Hint: use --replace to recreate." >&2
    exit 1
  fi
  write_new_key
  echo "OK: key created -> ${KEY_FILE}"
  cmd_show
}

cmd_replace() {
  ensure_dirs
  archive_existing_if_any
  write_new_key
  echo "OK: key replaced -> ${KEY_FILE}"
  cmd_show
  echo
  echo "NOTE: New tokens will use the new active key."
  echo "      Existing tokens remain valid until expiry via archive (kid fallback)."
}

cmd_show() {
  if [[ ! -f "${KEY_FILE}" ]]; then
    echo "No active key found at: ${KEY_FILE}" >&2
  else
    local sz mode owner group sha kid
    sz=$(wc -c < "${KEY_FILE}")
    mode=$(stat -c '%a' "${KEY_FILE}")
    owner=$(stat -c '%U' "${KEY_FILE}")
    group=$(stat -c '%G' "${KEY_FILE}")
    sha=$(sha256_hex "${KEY_FILE}")
    kid="${sha:0:16}"
    cat <<EOF
Active Key:
  Path   : ${KEY_FILE}
  Owner  : ${owner}:${group}
  Mode   : ${mode}
  Size   : ${sz} bytes
  SHA256 : ${sha}
  KID    : ${kid}
EOF
  fi

  echo
  echo "Archive:"
  if [[ -d "${ARCHIVE_DIR}" ]]; then
    ls -1 "${ARCHIVE_DIR}" 2>/dev/null | sed 's/^/  - /' || echo "  (empty)"
  else
    echo "  (none)"
  fi
}

main() {
  require_site_context
  case "${1-}" in
    "" )         cmd_create ;;
    --replace )  cmd_replace ;;
    --show )     cmd_show ;;
    --help )     usage ;;
    * )          echo "Unknown option: $1" >&2; usage; exit 1 ;;
  esac
}

main "$@"
