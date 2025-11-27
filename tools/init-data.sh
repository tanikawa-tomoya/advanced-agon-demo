#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1; then
        exec sudo "$0" "$@"
    else
        echo "Error: this script must be run as root or with sudo." >&2
        exit 1
    fi
fi

DOC_ROOT="/var/www/htmlv"
DATA_ROOT_DISPLAY="${DOC_ROOT}/<site-id>"
DEFAULT_OWNER="www-data:www-data"

log_action() {
    echo ">>> $*"
}

require_command() {
    local command_name="$1"
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "Error: ${command_name} is required but not found in PATH." >&2
        exit 1
    fi
}

usage() {
    cat <<USAGE
Usage: $0 [options] --domain <domain> --support-mail <address> --site-title <title> <site-id>

Create an initial Marmo Hub data tree under ${DATA_ROOT_DISPLAY}.

Options:
  --domain <domain>        Domain name used for generated email addresses (required).
  --support-mail <mail>    Support email address (required).
  --site-title <title>     Title of the site to store in settings (required).
  --owner <user:group>     Set ownership for created files (default: ${DEFAULT_OWNER}).
  --password-seed <s>      Seed value for deterministic password generation.
  --with-test-data         Insert comprehensive test data into every created table.
  --skip-owner             Do not change ownership after creating files.
  -h, --help               Show this help message and exit.
USAGE
}

SITE_ID=""
DOMAIN=""
SUPPORT_MAIL=""
SITE_TITLE=""
OWNER="${DEFAULT_OWNER}"
PASSWORD_SEED=""
SKIP_OWNER=false
INCLUDE_FULL_TEST_DATA=false

require_command "ffmpeg"
require_command "convert"
require_command "sqlite3"

ADMIN_USER_CODE="admin-001"
OPERATOR_USER_CODES=("operator-001" "operator-002")
USER_CODES=("user-001" "user-002" "user-003" "user-004")

declare -A GENERATED_PASSWORDS=()
declare -Ag COMMON_USER_IDS=()

PASSWORD_COUNTER=0
ALLOWED_CHARS='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

generate_password() {
    local identifier="${1:-}"
    local password=""
    if [[ -n "$PASSWORD_SEED" ]]; then
        local seed_source="$PASSWORD_SEED"
        if [[ -n "$identifier" ]]; then
            seed_source+=":${identifier}"
        else
            seed_source+=":${PASSWORD_COUNTER}"
            PASSWORD_COUNTER=$((PASSWORD_COUNTER + 1))
        fi

        local hash
        hash=$(printf '%s' "$seed_source" | sha256sum | awk '{print $1}')
        local i
        for ((i = 0; i < 4; i++)); do
            local hex_pair=${hash:$((i * 2)):2}
            local value=$((16#${hex_pair}))
            local idx=$((value % ${#ALLOWED_CHARS}))
            password+="${ALLOWED_CHARS:idx:1}"
        done
        echo "$password"
        return
    fi

    while [[ ${#password} -lt 4 ]]; do
        local needed=$((4 - ${#password}))
        password+="$(tr -dc 'A-Za-z0-9' </dev/urandom | head -c "$needed" || true)"
    done
    echo "${password:0:4}"
}

sqlite_escape() {
    local input="${1-}"
    input="${input//\'/''}"
    printf '%s' "$input"
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain)
            if [[ $# -lt 2 ]]; then
                echo "Error: --domain requires a value." >&2
                exit 1
            fi
            DOMAIN="$2"
            shift 2
            ;;
        --domain=*)
            DOMAIN="${1#*=}"
            shift
            ;;
        --support-mail)
            if [[ $# -lt 2 ]]; then
                echo "Error: --support-mail requires a value." >&2
                exit 1
            fi
            SUPPORT_MAIL="$2"
            shift 2
            ;;
        --support-mail=*)
            SUPPORT_MAIL="${1#*=}"
            shift
            ;;
        --site-title)
            if [[ $# -lt 2 ]]; then
                echo "Error: --site-title requires a value." >&2
                exit 1
            fi
            SITE_TITLE="$2"
            shift 2
            ;;
        --site-title=*)
            SITE_TITLE="${1#*=}"
            shift
            ;;
        --owner)
            if [[ $# -lt 2 ]]; then
                echo "Error: --owner requires a value." >&2
                exit 1
            fi
            OWNER="$2"
            shift 2
            ;;
        --owner=*)
            OWNER="${1#*=}"
            shift
            ;;
        --password-seed)
            if [[ $# -lt 2 ]]; then
                echo "Error: --password-seed requires a value." >&2
                exit 1
            fi
            PASSWORD_SEED="$2"
            shift 2
            ;;
        --password-seed=*)
            PASSWORD_SEED="${1#*=}"
            shift
            ;;
        --with-test-data)
            INCLUDE_FULL_TEST_DATA=true
            shift
            ;;
        --with-test-data=*)
            value="${1#*=}"
            case "$value" in
                true|1|yes|on)
                    INCLUDE_FULL_TEST_DATA=true
                    ;;
                false|0|no|off)
                    INCLUDE_FULL_TEST_DATA=false
                    ;;
                *)
                    echo "Error: --with-test-data expects a boolean value." >&2
                    exit 1
                    ;;
            esac
            shift
            ;;
        --skip-owner)
            SKIP_OWNER=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            echo "Error: unknown option $1" >&2
            usage >&2
            exit 1
            ;;
        *)
            if [[ -n "$SITE_ID" ]]; then
                echo "Error: multiple site IDs specified." >&2
                usage >&2
                exit 1
            fi
            SITE_ID="$1"
            shift
            ;;
    esac
done

if [[ -z "$SITE_ID" ]]; then
    echo "Error: <site-id> is required." >&2
    usage >&2
    exit 1
fi

if [[ -z "$DOMAIN" ]]; then
    echo "Error: --domain is required." >&2
    usage >&2
    exit 1
fi

if [[ -z "$SUPPORT_MAIL" ]]; then
    echo "Error: --support-mail is required." >&2
    usage >&2
    exit 1
fi

if [[ -z "$SITE_TITLE" ]]; then
    echo "Error: --site-title is required." >&2
    usage >&2
    exit 1
fi

if [[ ! "$SITE_ID" =~ ^[A-Za-z0-9_-]+$ ]]; then
    echo "Error: site ID may only contain letters, numbers, hyphens, and underscores." >&2
    exit 1
fi

SITE_DIR="${DOC_ROOT}/${SITE_ID}"
DATA_DIR="${SITE_DIR}/data"
DB_DIR="${DATA_DIR}/db"
USERDATA_BASE_DIR="${DATA_DIR}/userdata"
DATA_SERVICE_DIR="${DATA_DIR}/dataService"

SITE_DIR_EXISTS_BEFORE=false
if [[ -d "$SITE_DIR" ]]; then
    SITE_DIR_EXISTS_BEFORE=true
fi

if [[ -e "$DB_DIR" ]]; then
    echo "Error: ${DB_DIR} already exists. Aborting." >&2
    exit 1
fi

umask 002

create_dir() {
    local dir="$1"
    local mode="$2"
    if [[ ! -d "$dir" ]]; then
        install -d -m "$mode" "$dir"
    fi
}

if [[ "$SITE_DIR_EXISTS_BEFORE" = false ]]; then
    create_dir "$SITE_DIR" 0775
fi

create_dir "$DATA_DIR" 0775
create_dir "$DB_DIR" 0775
create_dir "${DATA_DIR}/log" 0775
create_dir "$USERDATA_BASE_DIR" 0775
create_dir "${DATA_DIR}/jwt" 0770
create_dir "${DATA_DIR}/jwt/archive" 0770
create_dir "$DATA_SERVICE_DIR" 0775
create_dir "${DATA_SERVICE_DIR}/buckets" 0775

load_common_user_ids() {
    local db_path="$1"

    if [[ ! -f "${db_path}" ]]; then
        echo "Error: expected common database at ${db_path} before seeding related data." >&2
        exit 1
    fi

    COMMON_USER_IDS=()

    local user_code
    for user_code in "${ADMIN_USER_CODE}" "${OPERATOR_USER_CODES[@]}" "${USER_CODES[@]}"; do
        local user_id
        user_id=$(sqlite3 "${db_path}" "SELECT id FROM user WHERE userCode = '${user_code}' LIMIT 1;" | tr -d '\r\n') || true
        if [[ -z "${user_id}" ]]; then
            echo "Error: userCode '${user_code}' is missing from ${db_path}." >&2
            echo "       Run the initializer without --with-test-data first to generate base records." >&2
            exit 1
        fi
        COMMON_USER_IDS["${user_code}"]="${user_id}"
    done
}

resolve_user_content_path() {
    local user_code="$1"
    local relative_path="$2"

    if [[ ! -v COMMON_USER_IDS["${user_code}"] ]]; then
        echo ""
        return 1
    fi

    local user_id="${COMMON_USER_IDS["${user_code}"]}"
    local sanitized_path="${relative_path#/}"
    local absolute_path="${USERDATA_BASE_DIR}/${user_id}/${sanitized_path}"

    create_dir "$(dirname "${absolute_path}")" 0775

    printf '%s\n' "${absolute_path}"
}

generate_sample_video() {
    local user_code="$1"
    local relative_path="$2"
    local target_path

    if ! target_path=$(resolve_user_content_path "${user_code}" "${relative_path}"); then
        echo 0
        return
    fi

    ffmpeg -y -f lavfi -i "smptebars=size=1920x1080:rate=30" -t 3 "${target_path}" >/dev/null 2>&1

    if [[ -f "${target_path}" ]]; then
        stat -c%s "${target_path}"
    else
        echo 0
    fi
}

generate_sample_audio() {
    local user_code="$1"
    local relative_path="$2"
    local target_path

    if ! target_path=$(resolve_user_content_path "${user_code}" "${relative_path}"); then
        echo 0
        return
    fi

    ffmpeg -y -f lavfi -i "sine=frequency=100:duration=10:beep_factor=10" "${target_path}" >/dev/null 2>&1

    if [[ -f "${target_path}" ]]; then
        stat -c%s "${target_path}"
    else
        echo 0
    fi
}

generate_sample_pdf() {
    local user_code="$1"
    local relative_path="$2"
    local target_path

    if ! target_path=$(resolve_user_content_path "${user_code}" "${relative_path}"); then
        echo 0
        return
    fi

    convert -size 1240x1754 xc:white -gravity center -pointsize 36 \
        -annotate 0 "Sample PDF\nUser: ${user_code}" "${target_path}" >/dev/null 2>&1

    if [[ -f "${target_path}" ]]; then
        stat -c%s "${target_path}"
    else
        echo 0
    fi
}

generate_sample_image() {
    local user_code="$1"
    local relative_path="$2"
    local target_path

    if ! target_path=$(resolve_user_content_path "${user_code}" "${relative_path}"); then
        echo 0
        return
    fi

    convert -size 1280x720 "gradient:#2563eb-#1d4ed8" -gravity center -pointsize 42 \
        -annotate 0 "Sample Image\nUser: ${user_code}" "${target_path}" >/dev/null 2>&1

    if [[ -f "${target_path}" ]]; then
        stat -c%s "${target_path}"
    else
        echo 0
    fi
}

create_db_common() {
    local db_path="$1"
    local notify_mail="noreply@${DOMAIN}"
    local bounce_mail="bounce@${DOMAIN}"
    local host_name_raw
    host_name_raw=$(hostname)
    local host_suffix="$host_name_raw"
    if [[ "$host_name_raw" =~ ^v([0-9-]+)$ ]]; then
        host_suffix="${BASH_REMATCH[1]}"
    fi
    local computed_hostname="mx-${host_suffix}.${DOMAIN}"
    sqlite3 "$db_path" <<'SQL'
PRAGMA foreign_keys = OFF;
BEGIN;
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userCode VARCHAR(32) NOT NULL UNIQUE,
    hash VARCHAR(64),
    displayName VARCHAR(32),
    organization VARCHAR(64),
    imageFileName VARCHAR(32),
    isSupervisor INTEGER,
    isOperator INTEGER,
    useContentsManagement INTEGER DEFAULT 1,
    role VARCHAR(16),
    autoPassword VARCHAR(16),
    mail VARCHAR(128),
    mailCheckDate VARCHAR(32),
    passwordResetDate VARCHAR(32),
    hint VARCHAR(32),
    isDeleted INTEGER
);
CREATE TABLE IF NOT EXISTS userSelectable (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operatorUserId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    UNIQUE(operatorUserId, userId)
);
CREATE INDEX IF NOT EXISTS idx_userSelectable_operator ON userSelectable(operatorUserId);
CREATE INDEX IF NOT EXISTS idx_userSelectable_user ON userSelectable(userId);
CREATE TABLE IF NOT EXISTS siteSettings (
    key VARCHAR(128) PRIMARY KEY,
    value VARCHAR(1024)
);

CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    announcementCode VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    createdByUserCode VARCHAR(32),
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS announcementAcknowledgements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    announcementId INTEGER NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    acknowledgedAt VARCHAR(32),
    UNIQUE(announcementId, userCode),
    FOREIGN KEY (announcementId) REFERENCES announcements(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_announcementAcknowledgements_announcement
    ON announcementAcknowledgements(announcementId);
CREATE INDEX IF NOT EXISTS idx_announcementAcknowledgements_userCode
    ON announcementAcknowledgements(userCode);
COMMIT;
SQL

    local admin_auto_password
    admin_auto_password="$(generate_password "$ADMIN_USER_CODE")"
    GENERATED_PASSWORDS["${ADMIN_USER_CODE}"]="$admin_auto_password"

    local -A operator_auto_passwords=()
    for operator_code in "${OPERATOR_USER_CODES[@]}"; do
        local generated
        generated="$(generate_password "$operator_code")"
        operator_auto_passwords["${operator_code}"]="$generated"
        GENERATED_PASSWORDS["${operator_code}"]="$generated"
    done

    local -A user_auto_passwords=()
    for user_code in "${USER_CODES[@]}"; do
        local generated
        generated="$(generate_password "$user_code")"
        user_auto_passwords["${user_code}"]="$generated"
        GENERATED_PASSWORDS["${user_code}"]="$generated"
    done

    sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO user (userCode, hash, displayName, organization, isSupervisor, isOperator, useContentsManagement, autoPassword, mail, role)
VALUES ('${ADMIN_USER_CODE}', '', 'Administrator', 'Head Office', 1, 0, 1, '${admin_auto_password}', '', 'supervisor');
SQL

    for operator_code in "${OPERATOR_USER_CODES[@]}"; do
        local password="${operator_auto_passwords[${operator_code}]}"
        local display_name="${operator_code//-/ }"
        display_name="${display_name^}"
        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO user (userCode, hash, displayName, organization, isSupervisor, isOperator, useContentsManagement, autoPassword, mail, role)
VALUES ('${operator_code}', '', '${display_name}', 'Operations', 0, 1, 1, '${password}', '', 'operator');
SQL
    done

    for user_code in "${USER_CODES[@]}"; do
        local password="${user_auto_passwords[${user_code}]}"
        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO user (userCode, hash, displayName, organization, isSupervisor, isOperator, useContentsManagement, autoPassword, mail, role)
VALUES ('${user_code}', '', '${user_code}', 'General', 0, 0, 1, '${password}', '', 'member');
SQL
    done

    seed_user_selectable "$db_path"

    sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO siteSettings (key, value) VALUES
    ('supportMail', '["${SUPPORT_MAIL}"]'),
    ('notifyMail', '${notify_mail}'),
    ('bounceMail', '${bounce_mail}'),
    ('hostname', '${computed_hostname}'),
    ('siteTitle', '${SITE_TITLE}'),
    ('codex-auto-pull', '1'),
    ('latest-code-update', '0');
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing common test data"
        seed_common_test_data "$db_path"
    fi
}

create_db_contents() {

    local db_path="$1"
    sqlite3 "$db_path" <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS userContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contentCode VARCHAR(32) NOT NULL UNIQUE,
    userCode VARCHAR(32) NOT NULL,
    contentType VARCHAR(32) NOT NULL,
    fileName VARCHAR(256),
    filePath VARCHAR(256),
    mimeType VARCHAR(64),
    fileSize INTEGER,
    duration REAL,
    bitrate INTEGER,
    width INTEGER,
    height INTEGER,
    isVisible INTEGER NOT NULL DEFAULT 1,
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32)
);
CREATE TABLE IF NOT EXISTS userContentsProxy (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filePath VARCHAR(256) NOT NULL,
    fileSize INTEGER,
    queueId INTEGER,
    userContentsId INTEGER NOT NULL,
    bitrate INTEGER,
    width INTEGER,
    height INTEGER,
    duration REAL,
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32)
);
CREATE TABLE IF NOT EXISTS userContentClipBookmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contentCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    clipTimes TEXT NOT NULL,
    createdAt VARCHAR(32) NOT NULL,
    updatedAt VARCHAR(32) NOT NULL,
    UNIQUE(contentCode, userCode)
);
CREATE INDEX IF NOT EXISTS idx_userContentClipBookmarks_content ON userContentClipBookmarks(contentCode);
CREATE INDEX IF NOT EXISTS idx_userContentClipBookmarks_user ON userContentClipBookmarks(userCode);
CREATE TABLE IF NOT EXISTS userContentsAccess (
    userCode VARCHAR(32) NOT NULL,
    contentsCode VARCHAR(32) NOT NULL,
    startDate VARCHAR(32),
    endDate VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    PRIMARY KEY (userCode, contentsCode)
);
CREATE INDEX IF NOT EXISTS idx_userContentsAccess_user ON userContentsAccess(userCode);
CREATE INDEX IF NOT EXISTS idx_userContentsAccess_contents ON userContentsAccess(contentsCode);
COMMIT;
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing user content test data with generated media assets"
        seed_contents_test_data "$db_path"
    fi
}

create_db_target() {
    local db_path="$1"
    sqlite3 "$db_path" <<'SQL'
PRAGMA foreign_keys = OFF;
BEGIN;
CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetCode VARCHAR(32) NOT NULL UNIQUE,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    imageFile TEXT,
    status VARCHAR(32),
    priority VARCHAR(32),
    dueDate VARCHAR(32),
    startDate VARCHAR(32),
    endDate VARCHAR(32),
    assignedUserCode VARCHAR(32),
    assignedGroupCode VARCHAR(32),
    displayGuidance INTEGER DEFAULT 1,
    displayGoals INTEGER DEFAULT 1,
    displayAgreements INTEGER DEFAULT 1,
    displayAnnouncements INTEGER DEFAULT 1,
    displayReferences INTEGER DEFAULT 1,
    displaySchedules INTEGER DEFAULT 1,
    displayProducts INTEGER DEFAULT 1,
    displayChat INTEGER DEFAULT 1,
    displayBbs INTEGER DEFAULT 1,
    displaySubmissions INTEGER DEFAULT 1,
    displayReviews INTEGER DEFAULT 1,
    displayBadges INTEGER DEFAULT 1,
    displaySurvey INTEGER DEFAULT 1,
    createdByUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    isDeleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS targetAssignedUsers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    isActive INTEGER DEFAULT 1,
    endedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    UNIQUE(targetCode, userCode)
);
CREATE INDEX IF NOT EXISTS idx_targetAssignedUsers_target ON targetAssignedUsers(targetCode);
CREATE INDEX IF NOT EXISTS idx_targetAssignedUsers_user ON targetAssignedUsers(userCode);
CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submissionCode VARCHAR(32) NOT NULL UNIQUE,
    userCode VARCHAR(32) NOT NULL,
    contentsId INTEGER,
    submittedAt VARCHAR(32),
    status VARCHAR(32),
    content TEXT,
    comment TEXT,
    reviewStatus VARCHAR(32),
    score INTEGER,
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    isDeleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS targetSubmissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetCode VARCHAR(32) NOT NULL,
    submissionCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    contentId INTEGER,
    contentsCode VARCHAR(32),
    title VARCHAR(256),
    description TEXT,
    UNIQUE(targetCode, submissionCode, userCode)
);
CREATE TABLE IF NOT EXISTS targetReferenceMaterials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materialCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    contentsId INTEGER,
    contentCode VARCHAR(32),
    title VARCHAR(256),
    description TEXT,
    startDate VARCHAR(32),
    endDate VARCHAR(32),
    category VARCHAR(32),
    linkUrl VARCHAR(512),
    downloadUrl VARCHAR(512),
    fileName VARCHAR(256),
    fileSize INTEGER,
    ownerUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetReferenceMaterials_target ON targetReferenceMaterials(targetCode);
CREATE TABLE IF NOT EXISTS targetReferenceMaterialContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materialCode VARCHAR(32) NOT NULL,
    contentCode VARCHAR(32) NOT NULL,
    contentType VARCHAR(32),
    createdAt VARCHAR(32),
    UNIQUE(materialCode, contentCode)
);
CREATE INDEX IF NOT EXISTS idx_targetReferenceMaterialContents_material ON targetReferenceMaterialContents(materialCode);
CREATE TABLE IF NOT EXISTS targetGuidanceContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guidanceCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    contentsId INTEGER,
    contentCode VARCHAR(32),
    title VARCHAR(256),
    category VARCHAR(32),
    fileName VARCHAR(256),
    fileSize INTEGER,
    ownerUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS targetScheduleMaterials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materialCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    contentsId INTEGER,
    contentCode VARCHAR(32),
    title VARCHAR(256),
    description TEXT,
    startDate VARCHAR(32),
    endDate VARCHAR(32),
    category VARCHAR(32),
    linkUrl VARCHAR(512),
    downloadUrl VARCHAR(512),
    fileName VARCHAR(256),
    fileSize INTEGER,
    ownerUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetScheduleMaterials_target ON targetScheduleMaterials(targetCode);
CREATE TABLE IF NOT EXISTS targetScheduleMaterialContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materialCode VARCHAR(32) NOT NULL,
    contentCode VARCHAR(32) NOT NULL,
    contentType VARCHAR(32),
    createdAt VARCHAR(32),
    UNIQUE(materialCode, contentCode)
);
CREATE INDEX IF NOT EXISTS idx_targetScheduleMaterialContents_material ON targetScheduleMaterialContents(materialCode);
CREATE TABLE IF NOT EXISTS targetGuidanceContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guidanceCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    contentsId INTEGER,
    contentCode VARCHAR(32),
    title VARCHAR(256),
    category VARCHAR(32),
    fileName VARCHAR(256),
    fileSize INTEGER,
    ownerUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS targetProductMaterials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materialCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    contentsId INTEGER,
    contentCode VARCHAR(32),
    title VARCHAR(256),
    description TEXT,
    startDate VARCHAR(32),
    endDate VARCHAR(32),
    category VARCHAR(32),
    linkUrl VARCHAR(512),
    downloadUrl VARCHAR(512),
    fileName VARCHAR(256),
    fileSize INTEGER,
    ownerUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetProductMaterials_target ON targetProductMaterials(targetCode);
CREATE TABLE IF NOT EXISTS targetProductMaterialContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    materialCode VARCHAR(32) NOT NULL,
    contentCode VARCHAR(32) NOT NULL,
    contentType VARCHAR(32),
    createdAt VARCHAR(32),
    UNIQUE(materialCode, contentCode)
);
CREATE INDEX IF NOT EXISTS idx_targetProductMaterialContents_material ON targetProductMaterialContents(materialCode);
CREATE TABLE IF NOT EXISTS targetGuidanceContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guidanceCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    contentsId INTEGER,
    contentCode VARCHAR(32),
    title VARCHAR(256),
    category VARCHAR(32),
    fileName VARCHAR(256),
    fileSize INTEGER,
    ownerUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_targetGuidanceContents_target ON targetGuidanceContents(targetCode);
CREATE TABLE IF NOT EXISTS targetAgreements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agreementCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    agreementKind VARCHAR(128),
    title VARCHAR(256) NOT NULL,
    content TEXT,
    notes TEXT,
    createdByUserId INTEGER,
    createdByUserCode VARCHAR(32),
    updatedByUserId INTEGER,
    updatedByUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetAgreements_target ON targetAgreements(targetCode);
CREATE UNIQUE INDEX IF NOT EXISTS idx_targetAgreements_code ON targetAgreements(agreementCode);
CREATE TABLE IF NOT EXISTS targetGoals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goalCode VARCHAR(64) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    title VARCHAR(256) NOT NULL,
    targetUserId INTEGER,
    targetUserCode VARCHAR(32),
    targetValue VARCHAR(256),
    evidence TEXT,
    memo TEXT,
    createdByUserId INTEGER,
    createdByUserCode VARCHAR(32),
    updatedByUserId INTEGER,
    updatedByUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetGoals_target ON targetGoals(targetCode);
CREATE INDEX IF NOT EXISTS idx_targetGoals_target_user ON targetGoals(targetUserCode);
CREATE TABLE IF NOT EXISTS targetGoalAssignees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goalCode VARCHAR(64) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    displayOrder INTEGER DEFAULT 0,
    UNIQUE(goalCode, userCode),
    FOREIGN KEY(goalCode) REFERENCES targetGoals(goalCode) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_targetGoalAssignees_goal ON targetGoalAssignees(goalCode);
CREATE INDEX IF NOT EXISTS idx_targetGoalAssignees_user ON targetGoalAssignees(userCode);
CREATE TABLE IF NOT EXISTS targetSectionViews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    sectionKey VARCHAR(32) NOT NULL,
    lastViewedAt VARCHAR(32) NOT NULL,
    createdAt VARCHAR(32) NOT NULL,
    updatedAt VARCHAR(32) NOT NULL,
    UNIQUE(targetCode, userCode, sectionKey)
);
CREATE INDEX IF NOT EXISTS idx_targetSectionViews_target ON targetSectionViews(targetCode);
CREATE INDEX IF NOT EXISTS idx_targetSectionViews_user ON targetSectionViews(userCode);
CREATE TABLE IF NOT EXISTS targetAnnouncements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    announcementCode VARCHAR(64) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    createdByUserCode VARCHAR(32),
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetAnnouncements_target ON targetAnnouncements(targetCode);
CREATE TABLE IF NOT EXISTS targetAnnouncementAcknowledgements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetAnnouncementId INTEGER NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    acknowledgedAt VARCHAR(32),
    UNIQUE(targetAnnouncementId, userCode),
    FOREIGN KEY (targetAnnouncementId) REFERENCES targetAnnouncements(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_targetAnnouncementAck_announcement ON targetAnnouncementAcknowledgements(targetAnnouncementId);
CREATE INDEX IF NOT EXISTS idx_targetAnnouncementAck_user ON targetAnnouncementAcknowledgements(userCode);
CREATE TABLE IF NOT EXISTS targetSurvey (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    surveyCode VARCHAR(64) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    title VARCHAR(256) NOT NULL,
    content TEXT NOT NULL,
    startAt VARCHAR(32) NOT NULL,
    endAt VARCHAR(32) NOT NULL,
    createdByUserCode VARCHAR(32),
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    displayOrder INTEGER DEFAULT 0,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetSurvey_target ON targetSurvey(targetCode);
CREATE TABLE IF NOT EXISTS targetSurveyItem (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetSurveyId INTEGER NOT NULL,
    title VARCHAR(256) NOT NULL,
    description TEXT,
    kind VARCHAR(32) NOT NULL,
    position INTEGER DEFAULT 0,
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    isDeleted INTEGER DEFAULT 0,
    FOREIGN KEY (targetSurveyId) REFERENCES targetSurvey(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_targetSurveyItem_survey ON targetSurveyItem(targetSurveyId);
CREATE TABLE IF NOT EXISTS targetSurveyItemKind (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetSurveyItemId INTEGER NOT NULL,
    title VARCHAR(256) NOT NULL,
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    isDeleted INTEGER DEFAULT 0,
    FOREIGN KEY (targetSurveyItemId) REFERENCES targetSurveyItem(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_targetSurveyItemKind_item ON targetSurveyItemKind(targetSurveyItemId);
CREATE TABLE IF NOT EXISTS targetSurveyAcknowledgements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetSurveyId INTEGER NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    acknowledgedAt VARCHAR(32),
    UNIQUE(targetSurveyId, userCode),
    FOREIGN KEY (targetSurveyId) REFERENCES targetSurvey(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_targetSurveyAck_survey ON targetSurveyAcknowledgements(targetSurveyId);
CREATE INDEX IF NOT EXISTS idx_targetSurveyAck_user ON targetSurveyAcknowledgements(userCode);
CREATE TABLE IF NOT EXISTS targetSurveyResponses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetSurveyId INTEGER NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    respondedAt VARCHAR(32) NOT NULL,
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    UNIQUE(targetSurveyId, userCode),
    FOREIGN KEY (targetSurveyId) REFERENCES targetSurvey(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_targetSurveyResponses_survey ON targetSurveyResponses(targetSurveyId);
CREATE INDEX IF NOT EXISTS idx_targetSurveyResponses_user ON targetSurveyResponses(userCode);
CREATE TABLE IF NOT EXISTS targetSurveyResponseItems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    responseId INTEGER NOT NULL,
    surveyItemId INTEGER NOT NULL,
    value TEXT,
    text TEXT,
    json TEXT,
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    FOREIGN KEY (responseId) REFERENCES targetSurveyResponses(id) ON DELETE CASCADE,
    FOREIGN KEY (surveyItemId) REFERENCES targetSurveyItem(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_targetSurveyResponseItems_response ON targetSurveyResponseItems(responseId);
CREATE INDEX IF NOT EXISTS idx_targetSurveyResponseItems_item ON targetSurveyResponseItems(surveyItemId);
CREATE TABLE IF NOT EXISTS targetBasicInfoConfirmations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    confirmedAt VARCHAR(32) NOT NULL,
    createdAt VARCHAR(32) NOT NULL,
    updatedAt VARCHAR(32) NOT NULL,
    UNIQUE(targetCode, userCode)
);
CREATE INDEX IF NOT EXISTS idx_targetBasicInfoConfirmations_target ON targetBasicInfoConfirmations(targetCode);
CREATE INDEX IF NOT EXISTS idx_targetBasicInfoConfirmations_user ON targetBasicInfoConfirmations(userCode);
CREATE TABLE IF NOT EXISTS submissionContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submissionCode VARCHAR(32) NOT NULL,
    contentCode VARCHAR(32) NOT NULL,
    contentType VARCHAR(32) NOT NULL,
    createdAt VARCHAR(32),
    UNIQUE(submissionCode, contentCode)
);
CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewCode VARCHAR(32) NOT NULL UNIQUE,
    reviewerCode VARCHAR(32) NOT NULL,
    contentsId INTEGER,
    reviewedAt VARCHAR(32),
    content TEXT,
    privateNote TEXT,
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    isDeleted INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS targetReviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    targetCode VARCHAR(32) NOT NULL,
    reviewCode VARCHAR(32) NOT NULL,
    reviewerCode VARCHAR(32),
    contentId INTEGER,
    contentsCode VARCHAR(32),
    title VARCHAR(256),
    description TEXT,
    UNIQUE(targetCode, reviewCode)
);
CREATE TABLE IF NOT EXISTS reviewContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewCode VARCHAR(32) NOT NULL,
    contentCode VARCHAR(32) NOT NULL,
    contentType VARCHAR(32) NOT NULL,
    createdAt VARCHAR(32),
    UNIQUE(reviewCode, contentCode)
);
CREATE TABLE IF NOT EXISTS reviewSubmissionContents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewCode VARCHAR(32) NOT NULL,
    submissionContentCode VARCHAR(32) NOT NULL,
    createdAt VARCHAR(32),
    UNIQUE(reviewCode, submissionContentCode)
);
CREATE TABLE IF NOT EXISTS reviewVideoComments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reviewCode VARCHAR(32) NOT NULL,
    sourceType VARCHAR(16) NOT NULL,
    contentCode VARCHAR(64) NOT NULL,
    startSeconds INTEGER NOT NULL,
    comment TEXT,
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32)
);
CREATE INDEX IF NOT EXISTS idx_reviewVideoComments_review ON reviewVideoComments(reviewCode);
CREATE INDEX IF NOT EXISTS idx_reviewVideoComments_lookup ON reviewVideoComments(reviewCode, sourceType, contentCode);
CREATE TABLE IF NOT EXISTS badges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_user_id INTEGER NOT NULL,
    badge_code VARCHAR(64) NOT NULL,
    title VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    icon_text VARCHAR(8) NOT NULL DEFAULT '★',
    color_hex VARCHAR(7) NOT NULL,
    highlight_hex VARCHAR(7),
    font_key VARCHAR(32) DEFAULT 'sans',
    font_scale REAL NOT NULL DEFAULT 1.0,
    script_text TEXT NOT NULL,
    template_version INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(creator_user_id, badge_code)
);
CREATE TABLE IF NOT EXISTS badge_awards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    badge_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    awarded_by INTEGER NOT NULL,
    awarded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    note VARCHAR(255),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE RESTRICT,
    FOREIGN KEY (target_id) REFERENCES targets(id) ON DELETE RESTRICT,
    UNIQUE(badge_id, target_id)
);
CREATE INDEX IF NOT EXISTS idx_badge_awards_badge ON badge_awards(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_awards_target ON badge_awards(target_id);
CREATE TABLE IF NOT EXISTS badge_palettes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    creator_user_id INTEGER NOT NULL,
    name VARCHAR(64) NOT NULL,
    color_hex VARCHAR(7) NOT NULL,
    highlight_hex VARCHAR(7) NOT NULL,
    gradient_pattern VARCHAR(32) NOT NULL,
    icon_pattern VARCHAR(32) NOT NULL,
    effect_pattern VARCHAR(32) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS targetChatThreads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threadCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    threadType VARCHAR(16) NOT NULL,
    title VARCHAR(256),
    description TEXT,
    createdByUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    lastMessageAt VARCHAR(32),
    lastMessageSnippet TEXT,
    lastMessageSenderCode VARCHAR(32),
    isArchived INTEGER DEFAULT 0,
    isLocked INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetChatThreads_target ON targetChatThreads(targetCode);
CREATE INDEX IF NOT EXISTS idx_targetChatThreads_activity ON targetChatThreads(targetCode, lastMessageAt);
CREATE INDEX IF NOT EXISTS idx_targetChatThreads_lastSender ON targetChatThreads(lastMessageSenderCode);
CREATE TABLE IF NOT EXISTS targetChatThreadMembers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threadCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    joinedAt VARCHAR(32),
    leftAt VARCHAR(32),
    notificationsMuted INTEGER DEFAULT 0,
    UNIQUE(threadCode, userCode)
);
CREATE INDEX IF NOT EXISTS idx_targetChatThreadMembers_thread ON targetChatThreadMembers(threadCode);
CREATE INDEX IF NOT EXISTS idx_targetChatThreadMembers_user ON targetChatThreadMembers(userCode);
CREATE TABLE IF NOT EXISTS targetChatMessages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageCode VARCHAR(32) NOT NULL UNIQUE,
    threadCode VARCHAR(32) NOT NULL,
    senderUserCode VARCHAR(32) NOT NULL,
    content TEXT,
    sentAt VARCHAR(32),
    deliveredAt VARCHAR(32),
    readAt VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    replyToMessageCode VARCHAR(32),
    metadata TEXT,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetChatMessages_thread ON targetChatMessages(threadCode);
CREATE INDEX IF NOT EXISTS idx_targetChatMessages_order ON targetChatMessages(threadCode, sentAt);
CREATE INDEX IF NOT EXISTS idx_targetChatMessages_sender ON targetChatMessages(senderUserCode);
CREATE TABLE IF NOT EXISTS targetChatMessageAttachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attachmentCode VARCHAR(32) NOT NULL UNIQUE,
    messageCode VARCHAR(32) NOT NULL,
    contentCode VARCHAR(32) NOT NULL,
    contentType VARCHAR(32),
    fileName VARCHAR(256),
    mimeType VARCHAR(64),
    fileSize INTEGER,
    downloadUrl VARCHAR(512),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32)
);
CREATE INDEX IF NOT EXISTS idx_targetChatAttachments_message ON targetChatMessageAttachments(messageCode);
CREATE TABLE IF NOT EXISTS targetChatMessageReads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    readAt VARCHAR(32),
    createdAt VARCHAR(32),
    UNIQUE(messageCode, userCode)
);
CREATE INDEX IF NOT EXISTS idx_targetChatMessageReads_user ON targetChatMessageReads(userCode);

CREATE TABLE IF NOT EXISTS targetBbsThreads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threadCode VARCHAR(32) NOT NULL UNIQUE,
    targetCode VARCHAR(32) NOT NULL,
    threadType VARCHAR(16) NOT NULL,
    title VARCHAR(256) NOT NULL DEFAULT '',
    description TEXT,
    createdByUserCode VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    lastMessageAt VARCHAR(32),
    lastMessageSnippet TEXT,
    lastMessageSenderCode VARCHAR(32),
    isArchived INTEGER DEFAULT 0,
    isLocked INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetBbsThreads_target ON targetBbsThreads(targetCode);
CREATE INDEX IF NOT EXISTS idx_targetBbsThreads_activity ON targetBbsThreads(targetCode, lastMessageAt);
CREATE INDEX IF NOT EXISTS idx_targetBbsThreads_lastSender ON targetBbsThreads(lastMessageSenderCode);
CREATE TABLE IF NOT EXISTS targetBbsThreadMembers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    threadCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    joinedAt VARCHAR(32),
    leftAt VARCHAR(32),
    notificationsMuted INTEGER DEFAULT 0,
    UNIQUE(threadCode, userCode)
);
CREATE INDEX IF NOT EXISTS idx_targetBbsThreadMembers_thread ON targetBbsThreadMembers(threadCode);
CREATE INDEX IF NOT EXISTS idx_targetBbsThreadMembers_user ON targetBbsThreadMembers(userCode);
CREATE TABLE IF NOT EXISTS targetBbsMessages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageCode VARCHAR(32) NOT NULL UNIQUE,
    threadCode VARCHAR(32) NOT NULL,
    senderUserCode VARCHAR(32) NOT NULL,
    content TEXT,
    sentAt VARCHAR(32),
    deliveredAt VARCHAR(32),
    readAt VARCHAR(32),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32),
    replyToMessageCode VARCHAR(32),
    metadata TEXT,
    isDeleted INTEGER DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_targetBbsMessages_thread ON targetBbsMessages(threadCode);
CREATE INDEX IF NOT EXISTS idx_targetBbsMessages_order ON targetBbsMessages(threadCode, sentAt);
CREATE INDEX IF NOT EXISTS idx_targetBbsMessages_sender ON targetBbsMessages(senderUserCode);
CREATE TABLE IF NOT EXISTS targetBbsMessageAttachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attachmentCode VARCHAR(32) NOT NULL UNIQUE,
    messageCode VARCHAR(32) NOT NULL,
    contentCode VARCHAR(32) NOT NULL,
    contentType VARCHAR(32),
    fileName VARCHAR(256),
    mimeType VARCHAR(64),
    fileSize INTEGER,
    downloadUrl VARCHAR(512),
    createdAt VARCHAR(32),
    updatedAt VARCHAR(32)
);
CREATE INDEX IF NOT EXISTS idx_targetBbsAttachments_message ON targetBbsMessageAttachments(messageCode);
CREATE TABLE IF NOT EXISTS targetBbsMessageReads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    messageCode VARCHAR(32) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    readAt VARCHAR(32),
    createdAt VARCHAR(32),
    UNIQUE(messageCode, userCode)
);
CREATE INDEX IF NOT EXISTS idx_targetBbsMessageReads_user ON targetBbsMessageReads(userCode);

COMMIT;
SQL

    local common_db_path="${DB_DIR}/common.sqlite"
    local primary_operator_code="${OPERATOR_USER_CODES[0]}"
    local secondary_operator_code="${OPERATOR_USER_CODES[1]:-${OPERATOR_USER_CODES[0]}}"

    load_common_user_ids "${common_db_path}"

    if [[ ! -v COMMON_USER_IDS[$primary_operator_code] ]]; then
        echo "Error: missing primary operator (${primary_operator_code}) in ${common_db_path}." >&2
        exit 1
    fi
    if [[ ! -v COMMON_USER_IDS[$secondary_operator_code] ]]; then
        echo "Error: missing secondary operator (${secondary_operator_code}) in ${common_db_path}." >&2
        exit 1
    fi

    local primary_operator_id="${COMMON_USER_IDS[$primary_operator_code]}"
    local secondary_operator_id="${COMMON_USER_IDS[$secondary_operator_code]}"

    sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO badges (
    creator_user_id,
    badge_code,
    title,
    description,
    icon_text,
    color_hex,
    highlight_hex,
    font_key,
    font_scale,
    script_text,
    template_version
)
VALUES
    (
        ${primary_operator_id},
        'precision-ace',
        'Precision Ace',
        'サーブ速度とコントロールを極めた証。',
        '★',
        '#4F8BFF',
        '#8FB2FF',
        'sans',
        1.0,
        'const BADGE = {
  title: "Precision Ace",
  icon: "★",
  color: "#4F8BFF",
  highlight: "#8FB2FF",
  fontKey: "sans",
  fontScale: 1.0
};
new p5((p) => {
  const W = 320;
  const H = 180;
  p.setup = function () {
    p.createCanvas(W, H);
    p.noLoop();
  };
  p.draw = function () {
    const g = p.drawingContext.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, BADGE.color);
    g.addColorStop(1, BADGE.highlight);
    p.drawingContext.fillStyle = g;
    p.noStroke();
    p.rect(0, 0, W, H);
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(64 * BADGE.fontScale);
    p.text(BADGE.icon, W * 0.3, H * 0.5);
    p.textSize(22 * BADGE.fontScale);
    p.text(BADGE.title, W * 0.65, H * 0.55);
  };
});',
        1
    ),
    (
        ${secondary_operator_id},
        'mental-anchor',
        'Mental Anchor',
        'ルーティンを崩さず取り組んだ生徒に授与。',
        '◎',
        '#8B5CF6',
        '#C4B5FD',
        'serif',
        1.1,
        'const BADGE = {
  title: "Mental Anchor",
  icon: "◎",
  color: "#8B5CF6",
  highlight: "#C4B5FD",
  fontKey: "serif",
  fontScale: 1.1
};
new p5((p) => {
  const W = 320;
  const H = 180;
  p.setup = function () {
    p.createCanvas(W, H);
    p.noLoop();
  };
  p.draw = function () {
    const g = p.drawingContext.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, BADGE.color);
    g.addColorStop(1, BADGE.highlight);
    p.drawingContext.fillStyle = g;
    p.noStroke();
    p.rect(0, 0, W, H);
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(64 * BADGE.fontScale);
    p.text(BADGE.icon, W * 0.3, H * 0.5);
    p.textSize(22 * BADGE.fontScale);
    p.text(BADGE.title, W * 0.65, H * 0.55);
  };
});',
        1
    ),
    (
        ${primary_operator_id},
        'engine-core',
        'Engine Core',
        'フィジカルメニューを完遂した証明。',
        '⚙',
        '#14B8A6',
        '#5EEAD4',
        'display',
        0.95,
        'const BADGE = {
  title: "Engine Core",
  icon: "⚙",
  color: "#14B8A6",
  highlight: "#5EEAD4",
  fontKey: "display",
  fontScale: 0.95
};
new p5((p) => {
  const W = 320;
  const H = 180;
  p.setup = function () {
    p.createCanvas(W, H);
    p.noLoop();
  };
  p.draw = function () {
    const g = p.drawingContext.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, BADGE.color);
    g.addColorStop(1, BADGE.highlight);
    p.drawingContext.fillStyle = g;
    p.noStroke();
    p.rect(0, 0, W, H);
    p.fill(255);
    p.textAlign(p.CENTER, p.CENTER);
    p.textSize(64 * BADGE.fontScale);
    p.text(BADGE.icon, W * 0.3, H * 0.5);
    p.textSize(22 * BADGE.fontScale);
    p.text(BADGE.title, W * 0.65, H * 0.55);
  };
});',
        1
    );
INSERT OR IGNORE INTO badge_palettes (
    creator_user_id,
    name,
    color_hex,
    highlight_hex,
    gradient_pattern,
    icon_pattern,
    effect_pattern
)
VALUES
    (${primary_operator_id}, 'Aurora Grid', '#22C55E', '#86EFAC', 'split-tone', 'static', 'scan'),
    (${secondary_operator_id}, 'Orbit Bloom', '#8B5CF6', '#C4B5FD', 'radial-bloom', 'orbit', 'glow'),
    (${primary_operator_id}, 'Glass Spark', '#0EA5E9', '#7DD3FC', 'glass', 'halo', 'spark');
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing target test data"
        seed_target_test_data "$db_path"
    fi
}

seed_common_test_data() {
    local db_path="$1"
    sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO announcements (announcementCode, title, content, createdByUserCode, createdAt, updatedAt)
VALUES (
    'maintenance-window',
    '定期メンテナンスのお知らせ',
    '下記の日時にシステムメンテナンスを実施します。作業中はログインや学習機能が一時的にご利用いただけません。',
    '${ADMIN_USER_CODE}',
    datetime('now','localtime','-3 day'),
    datetime('now','localtime','-3 day')
);
INSERT OR IGNORE INTO announcements (announcementCode, title, content, createdByUserCode, createdAt, updatedAt)
VALUES (
    'feature-update',
    'ダッシュボード機能アップデート',
    '新しいダッシュボードウィジェットを追加し、進捗分析がより簡単になりました。ぜひご活用ください。',
    '${ADMIN_USER_CODE}',
    datetime('now','localtime','-7 day'),
    datetime('now','localtime','-7 day')
);
INSERT OR IGNORE INTO announcementAcknowledgements (announcementId, userCode, acknowledgedAt)
SELECT id, '${ADMIN_USER_CODE}', datetime('now','localtime','-2 day')
FROM announcements WHERE announcementCode = 'maintenance-window';
INSERT OR IGNORE INTO announcementAcknowledgements (announcementId, userCode, acknowledgedAt)
SELECT id, '${OPERATOR_USER_CODES[0]}', datetime('now','localtime','-1 day')
FROM announcements WHERE announcementCode = 'maintenance-window';
INSERT OR IGNORE INTO announcementAcknowledgements (announcementId, userCode, acknowledgedAt)
SELECT id, '${USER_CODES[0]}', datetime('now','localtime','-6 day')
FROM announcements WHERE announcementCode = 'feature-update';
SQL
}

seed_user_selectable() {
    local db_path="$1"

    load_common_user_ids "${db_path}"

    local primary_operator_code="${OPERATOR_USER_CODES[0]}"
    local secondary_operator_code="${OPERATOR_USER_CODES[1]:-${OPERATOR_USER_CODES[0]}}"

    if [[ ! -v COMMON_USER_IDS[$primary_operator_code] ]]; then
        echo "Warning: operator '${primary_operator_code}' is missing; skipping userSelectable seeding." >&2
        return
    fi

    if [[ ! -v COMMON_USER_IDS[$secondary_operator_code] ]]; then
        echo "Warning: operator '${secondary_operator_code}' is missing; skipping userSelectable seeding." >&2
        return
    fi

    local p_id="${COMMON_USER_IDS[$primary_operator_code]}"
    local s_id="${COMMON_USER_IDS[$secondary_operator_code]}"

    sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO userSelectable (operatorUserId, userId, createdAt, updatedAt)
SELECT ${p_id}, id, datetime('now','localtime'), datetime('now','localtime')
FROM user
WHERE userCode IN ('${USER_CODES[0]}', '${USER_CODES[1]}') AND isDeleted IS NULL;

INSERT OR REPLACE INTO userSelectable (operatorUserId, userId, createdAt, updatedAt)
SELECT ${s_id}, id, datetime('now','localtime'), datetime('now','localtime')
FROM user
WHERE userCode IN ('${USER_CODES[2]}', '${USER_CODES[3]:-${USER_CODES[0]}}') AND isDeleted IS NULL;
SQL
}

seed_user_contents_samples() {
    local db_path="$1"
    local -a templates=(
        "document|application/pdf|0|reference-guide.pdf"
        "image|image/png|0|team-overview.png"
        "note|text/plain|2048|coaching-memo.txt"
        "video|video/mp4|0|highlight.mp4"
        "audio|audio/wav|0|sweep.wav"
    )

    local user_code
    for user_code in "${USER_CODES[@]}"; do
        local idx=0
        local template
        for template in "${templates[@]}"; do
            idx=$((idx + 1))
            printf -v padded_idx '%02d' "$idx"
            IFS='|' read -r content_type mime_type file_size file_stub <<<"${template}"
            local content_code="contents-${user_code}-${padded_idx}"
            local extension="${file_stub##*.}"
            local file_name="${user_code}-${file_stub}"
            local file_path="content/${content_code}.${extension}"
            local duration="NULL"
            local width="NULL"
            local height="NULL"

            if [[ "${content_type}" == "video" ]]; then
                file_size=$(generate_sample_video "${user_code}" "${file_path}")
                duration=3
                width=1920
                height=1080
            elif [[ "${content_type}" == "audio" ]]; then
                file_size=$(generate_sample_audio "${user_code}" "${file_path}")
                duration=10
            elif [[ "${content_type}" == "document" ]]; then
                file_size=$(generate_sample_pdf "${user_code}" "${file_path}")
            elif [[ "${content_type}" == "image" ]]; then
                file_size=$(generate_sample_image "${user_code}" "${file_path}")
                width=1280
                height=720
            fi

            file_size=${file_size:-0}

            sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO userContents (
    contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, isVisible, createdAt, updatedAt
) VALUES (
    '${content_code}',
    '${user_code}',
    '${content_type}',
    '${file_name}',
    '${file_path}',
    '${mime_type}',
    ${file_size},
    ${duration},
    NULL,
    ${width},
    ${height},
    1,
    datetime('now','localtime'),
    datetime('now','localtime')
);
SQL
        done
    done
}

seed_contents_access_test_data() {
    local db_path="$1"
    local -a entries=(
        "${ADMIN_USER_CODE}|contents-admin-001-01|2024-03-01 00:00|"
        "${OPERATOR_USER_CODES[0]}|contents-operator-001-01|2024-03-05 00:00|2024-05-31 23:59"
        "${USER_CODES[0]}|contents-user-001-02|2024-03-10 09:00|"
        "${USER_CODES[1]}|contents-user-002-01||2024-04-30 23:59"
        "${OPERATOR_USER_CODES[1]:-${OPERATOR_USER_CODES[0]}}|contents-operator-002-03|2024-03-15 00:00|2024-03-31 23:59"
    )

    local entry
    for entry in "${entries[@]}"; do
        IFS='|' read -r user_code content_code start_date end_date <<<"${entry}"
        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO userContentsAccess (
    userCode, contentsCode, startDate, endDate, createdAt, updatedAt
) VALUES (
    '$(sqlite_escape "${user_code}")',
    '$(sqlite_escape "${content_code}")',
    '$(sqlite_escape "${start_date}")',
    '$(sqlite_escape "${end_date}")',
    datetime('now','localtime'),
    datetime('now','localtime')
);
SQL
    done
}

seed_contents_test_data() {
    local db_path="$1"
    local common_db_path="${DB_DIR}/common.sqlite"

    load_common_user_ids "${common_db_path}"
    seed_user_contents_samples "$db_path"
    seed_contents_access_test_data "$db_path"
}

seed_target_test_data() {
    local db_path="$1"
    local common_db_path="${DB_DIR}/common.sqlite"
    local contents_db_path="${DB_DIR}/contents.sqlite"
    local primary_operator_code="${OPERATOR_USER_CODES[0]}"
    local secondary_operator_code="${OPERATOR_USER_CODES[1]:-${OPERATOR_USER_CODES[0]}}"

    load_common_user_ids "${common_db_path}"

    if [[ ! -f "${contents_db_path}" ]]; then
        echo "Error: expected contents database at ${contents_db_path} before seeding target test data." >&2
        exit 1
    fi

    local -a target_codes=(
        "target-001"
        "target-002"
        "target-003"
        "target-004"
    )
    local -a titles=(
        "初回オンボーディング"
        "チームチャットを活用しよう"
        "レビュー手順の確認"
        "フィードバックの実践"
    )
    local -a descriptions=(
        "プラットフォームの各機能を確認するタスク"
        "チャット機能で情報共有を行う"
        "レビュー手順書に目を通す"
        "フィードバック内容をまとめて共有する"
    )
    local -a creators=(
        "${primary_operator_code}"
        "${primary_operator_code}"
        "${secondary_operator_code}"
        "${secondary_operator_code}"
    )
    local -a assigned_users=(
        "${USER_CODES[0]}"
        "${USER_CODES[1]}"
        "${USER_CODES[2]}"
        "${USER_CODES[3]}"
    )
    local -a operator_participants=(
        "${primary_operator_code}"
        "${secondary_operator_code}"
        "${primary_operator_code}"
        "${secondary_operator_code}"
    )
    local -a priorities=("high" "medium" "medium" "low")
    local -a due_offsets=(7 10 12 14)
    local -a start_offsets=(-5 -8 -12 -16)
    local -a end_offsets=(9 13 16 20)
    local -a statuses=("draft" "active" "completed" "cancelled")
    local -a badge_codes=("precision-ace" "mental-anchor" "engine-core" "mental-anchor")
    local -a chat_titles=(
        "オンボーディング共有スレッド"
        "チーム連絡スレッド"
        "レビュー相談スレッド"
        "フィードバック共有スレッド"
    )
    local -a chat_messages_user=(
        "現在の進捗は50%です。次回までに残りを対応します。"
        "ドキュメントのドラフトを作成しました。確認をお願いします。"
        "手順書を読み進めていますが、不明点はありません。"
        "収集したフィードバックを整理したので見てください。"
    )
    local -a chat_messages_operator=(
        "確認しました。次はレポート作成に進みましょう。"
        "共有ありがとうございます。ミーティングの議事録も追加してください。"
        "ペースは問題ありません。レビュー観点をメモしておきましょう。"
        "資料の構成が良いですね。完了報告のテンプレートも添付します。"
    )
    local -a bbs_titles=(
        "オンボーディング共有スレッド"
        "チーム連絡スレッド"
        "レビュー相談スレッド"
        "フィードバック共有スレッド"
    )
    local -a bbs_messages_user=(
        "現在の進捗は50%です。次回までに残りを対応します。"
        "ドキュメントのドラフトを作成しました。確認をお願いします。"
        "手順書を読み進めていますが、不明点はありません。"
        "収集したフィードバックを整理したので見てください。"
    )
    local -a bbs_messages_operator=(
        "確認しました。次はレポート作成に進みましょう。"
        "共有ありがとうございます。ミーティングの議事録も追加してください。"
        "ペースは問題ありません。レビュー観点をメモしておきましょう。"
        "資料の構成が良いですね。完了報告のテンプレートも添付します。"
    )
	local -a review_comments=(
        "全体的に良くまとまっています。"
        "コミュニケーションの流れが分かりやすいです。"
        "レビュー観点の整理が丁寧です。"
        "フィードバックの要点が整理されています。"
    )
    local -a review_private_notes=(
        "次回は動画も添付すると良いでしょう。"
        "テンプレート化した手順を共有予定。"
        "実演動画の準備を依頼済み。"
        "進捗報告の頻度を週次に設定。"
    )
    local -a video_ids=("M7lc1UVf-VE" "-" "dQw4w9WgXcQ" "-")
    local -a submission_bodies=(
        "初回課題の提出内容です。"
        "チャット運用ルールのドラフトを作成しました。"
        "レビューの手順と観点を整理したレポートです。"
        "フィードバックまとめと改善案の共有資料です。"
    )
    local -a submission_comments=(
        "添削をお願いします。"
        "確認後に修正点があれば教えてください。"
        "レビュー観点の追加があればコメントください。"
        "改善案について意見をいただけると助かります。"
    )
    local -a review_video_comments=(
        "動画の重要なシーンを振り返ってください。"
        "チャットの記録を時系列で見直しましょう。"
        "レビュー観点リストの優先度を確認してください。"
        "共有資料の図表を更新しておきましょう。"
    )
    local -a submission_statuses=("submitted" "resubmitted" "submitted" "submitted")
    local -a review_statuses=("completed" "completed" "pending" "completed")
    local -a submission_scores=(95 88 0 92)

    local -a doc_urls
    local -a support_urls
    local -a support_titles
    local -a support_descriptions
    local -a agreement_kind_primary=("ルール" "ガイドライン" "ポリシー" "ルール")
    local -a agreement_title_primary=(
        "オンボーディング基本ルール"
        "チームチャット投稿ガイド"
        "レビュー参加ポリシー"
        "フィードバック投稿ルール"
    )
    local -a agreement_content_primary=(
        "オンボーディング期間中は毎日のチェックリスト更新と、進捗の共有を必ず行ってください。"
        "共有する情報はテーマごとのスレッドで投稿し、検索しやすい形で整理してください。"
        "レビュー結果は公開後二十四時間以内に確認し、必要な修正方針をコメント欄で共有してください。"
        "参加者へのフィードバックは事実ベースで簡潔にまとめ、改善案をあわせて提示してください。"
    )
    local -a agreement_notes_primary=(
        "進捗報告は担当コーチが週次で確認します。"
        "緊急の連絡事項はピン留めを活用してください。"
        "疑問点がある場合はレビュー担当者へ早めに相談しましょう。"
        "口頭での共有内容も要点をまとめてチャットに記録してください。"
    )
    local -a agreement_kind_secondary=("コミュニケーション" "運用ルール" "レビュー基準" "共有ガイド")
    local -a agreement_title_secondary=(
        "質問対応のガイドライン"
        "チャンネル運用ルール"
        "レビュー基準まとめ"
        "フィードバック共有ガイド"
    )
    local -a agreement_content_secondary=(
        "質問はチャットスレッドで共有し、回答は同じスレッドで完結させてください。"
        "重要な連絡はピン留めし、完了後にアーカイブする運用を徹底してください。"
        "判定基準はテンプレートに沿って記録し、改善提案も併記してください。"
        "資料や記録は共有フォルダーに保存し、リンクをチャットで通知してください。"
    )
    local -a agreement_notes_secondary=(
        "同じ質問が繰り返されないよう履歴を整理してください。"
        "不要になったスレッドは月末に整理します。"
        "評価のブレがあった場合はレビューチームで共有します。"
        "個人情報を含む内容はアクセス権に注意してください。"
    )
    local -a goal_title_primary=(
        "初回課題を期限内に提出"
        "チャット質問を週1回投稿"
        "レビュー観点シートを完成"
        "フィードバックまとめを共有"
    )
    local -a goal_value_primary=(
        "提出期限までに完了"
        "週次で1件以上"
        "テンプレート全項目入力"
        "主要改善案3件"
    )
    local -a goal_evidence_primary=(
        "提出履歴スクリーンショット"
        "チャットログのURL"
        "シートの共有リンク"
        "共有資料のリンク"
    )
    local -a goal_memo_primary=(
        "初回オリエン時に確認予定。"
        "質問内容はまとめてタグ付けする。"
        "レビュー会議前日にコーチ確認。"
        "フィードバックはSlackにも共有。"
    )
    local -a goal_title_secondary=(
        "オンボーディング振り返りを記録"
        "チャット運用ガイドを更新"
        "レビューフィードバックを反映"
        "改善サイクルを回す"
    )
    local -a goal_value_secondary=(
        "記録テンプレ完了"
        "更新内容を5件反映"
        "レビュー後48時間以内"
        "週次で改善案1件"
    )
    local -a goal_evidence_secondary=(
        "振り返りノートのURL"
        "運用ドキュメントの更新履歴"
        "レビューコメントの回答"
        "振り返りミーティング議事録"
    )
    local -a goal_memo_secondary=(
        "担当者がメンターと共有。"
        "更新差分はコメントに残す。"
        "必要に応じて相談会を設定。"
        "改善案は次回会議で共有。"
    )
    local -a target_announcements=(
        "${target_codes[0]}|target-001-orientation|オンボーディング開始のお知らせ|初日はダッシュボードの導線を確認し、チャットに自己紹介を投稿してください。|${creators[0]}|-3",
        "${target_codes[0]}|target-001-deadline|提出期限が近づいています|参考資料タブを確認し、期限内に提出できるよう準備を進めてください。|${creators[0]}|-1",
        "${target_codes[1]}|target-002-guideline|新しいチャット運用ルールの共有|スレッドごとの投稿ルールを見直したので、運用を更新してください。|${creators[1]}|-5",
        "${target_codes[2]}|target-003-workshop|レビュー手順の勉強会のお知らせ|今週の勉強会でレビューの観点を解説します。事前資料を確認してください。|${creators[2]}|-4",
        "${target_codes[3]}|target-004-roundtable|フィードバック共有会の参加登録|週末の共有会に向けて参加可否をチャットで回答してください。|${creators[3]}|-2"
    )
    local -a target_announcement_acknowledgements=(
        "${target_codes[0]}|target-001-orientation|${assigned_users[0]}|-2",
        "${target_codes[0]}|target-001-orientation|${primary_operator_code}|-3",
        "${target_codes[0]}|target-001-deadline|${assigned_users[0]}|",
        "${target_codes[0]}|target-001-deadline|${primary_operator_code}|-1",
        "${target_codes[1]}|target-002-guideline|${assigned_users[1]}|-2",
        "${target_codes[1]}|target-002-guideline|${secondary_operator_code}|-2",
        "${target_codes[2]}|target-003-workshop|${assigned_users[2]}|",
        "${target_codes[2]}|target-003-workshop|${primary_operator_code}|-1",
        "${target_codes[2]}|target-003-workshop|${secondary_operator_code}|-2",
        "${target_codes[3]}|target-004-roundtable|${assigned_users[3]}|-1",
        "${target_codes[3]}|target-004-roundtable|${secondary_operator_code}|",
        "${target_codes[3]}|target-004-roundtable|${primary_operator_code}|-3"
    )
    local i
    for i in "${!target_codes[@]}"; do
        doc_urls[i]="https://example.com/resources/${target_codes[i]}/guide"
        support_urls[i]="https://example.com/resources/${target_codes[i]}/faq"
        support_titles[i]="FAQとヒント集"
        support_descriptions[i]="${titles[i]}に関連するよくある質問と回答"
    done

    local display_order=0
    for i in "${!target_codes[@]}"; do
        local target_code="${target_codes[i]}"
        local title="${titles[i]}"
        local description="${descriptions[i]}"
        local creator="${creators[i]}"
        if [[ ! -v COMMON_USER_IDS[$creator] ]]; then
            echo "Error: missing user mapping for ${creator} in ${common_db_path}." >&2
            exit 1
        fi
        local creator_id="${COMMON_USER_IDS[$creator]}"
        local assigned_user="${assigned_users[i]}"
        if [[ ! -v COMMON_USER_IDS[$assigned_user] ]]; then
            echo "Error: missing user mapping for ${assigned_user} in ${common_db_path}." >&2
            exit 1
        fi
        local assigned_user_id="${COMMON_USER_IDS[$assigned_user]}"
        local operator_participant="${operator_participants[i]}"
        if [[ ! -v COMMON_USER_IDS[$operator_participant] ]]; then
            echo "Error: missing operator mapping for ${operator_participant} in ${common_db_path}." >&2
            exit 1
        fi
        local priority="${priorities[i]}"
        local due_offset="${due_offsets[i]}"
        local start_offset="${start_offsets[i]}"
        local end_offset="${end_offsets[i]}"
        local status="${statuses[i]}"
        local badge_code="${badge_codes[i]}"
        local chat_title="${chat_titles[i]}"
        local chat_message_user="${chat_messages_user[i]}"
        local chat_message_operator="${chat_messages_operator[i]}"
        local bbs_title="${bbs_titles[i]}"
        local bbs_message_user="${bbs_messages_user[i]}"
        local bbs_message_operator="${bbs_messages_operator[i]}"		
        local review_comment="${review_comments[i]}"
        local review_private_note="${review_private_notes[i]}"
        local video_id="${video_ids[i]}"
        local submission_body="${submission_bodies[i]}"
        local submission_comment="${submission_comments[i]}"
        local review_video_comment="${review_video_comments[i]}"
        local review_status="${review_statuses[i]}"
        local submission_status="${submission_statuses[i]}"
        local submission_score="${submission_scores[i]}"
        local doc_url="${doc_urls[i]}"
        local support_url="${support_urls[i]}"
        local support_title="${support_titles[i]}"
        local support_description="${support_descriptions[i]}"

        local padded_index
        printf -v padded_index '%03d' $((i + 1))

        local submission_code="submission-${padded_index}"
        local submission_content_code="content-sub-${padded_index}"
        local review_code="review-${padded_index}"
        local thread_code="thread-${padded_index}"
        local user_message_code="message-${padded_index}-u"
        local operator_message_code="message-${padded_index}-o"
        local attachment_code="attachment-${padded_index}"
        local doc_material_code="material-${padded_index}-doc"
        local support_material_code="material-${padded_index}-faq"
        local video_material_code="material-${padded_index}-video"
        local doc_content_code="content-doc-${padded_index}"
        local support_content_code="content-link-${padded_index}"
        local video_content_code="content-video-${padded_index}"
        local chat_attachment_content_code="content-chat-${padded_index}"
		local bbs_attachment_content_code="content-bbs-${padded_index}"
        local agreement_primary_code="agreement-${padded_index}-01"
        local agreement_secondary_code="agreement-${padded_index}-02"
        local agreement_primary_kind="${agreement_kind_primary[i]}"
        local agreement_secondary_kind="${agreement_kind_secondary[i]}"
        local agreement_primary_title="${agreement_title_primary[i]}"
        local agreement_secondary_title="${agreement_title_secondary[i]}"
        local agreement_primary_content="${agreement_content_primary[i]}"
        local agreement_secondary_content="${agreement_content_secondary[i]}"
        local agreement_primary_note="${agreement_notes_primary[i]}"
        local agreement_secondary_note="${agreement_notes_secondary[i]}"
        local goal_primary_code="goal-${padded_index}-01"
        local goal_secondary_code="goal-${padded_index}-02"
        local goal_primary_title="${goal_title_primary[i]}"
        local goal_secondary_title="${goal_title_secondary[i]}"
        local goal_primary_value="${goal_value_primary[i]}"
        local goal_secondary_value="${goal_value_secondary[i]}"
        local goal_primary_evidence="${goal_evidence_primary[i]}"
        local goal_secondary_evidence="${goal_evidence_secondary[i]}"
        local goal_primary_memo="${goal_memo_primary[i]}"
        local goal_secondary_memo="${goal_memo_secondary[i]}"

        local status_value="${status:-}"
        # Normalize empty / whitespace-only statuses to the default "draft".
        if [[ -z "${status_value//[[:space:]]/}" ]]; then
            status_value="draft"
        fi

        local escaped_status
        escaped_status="$(sqlite_escape "${status_value}")"

        local status_sql
        printf -v status_sql "'%s'" "${escaped_status}"

        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO targets (
    targetCode, title, description, imageFile, status, priority, dueDate,
    startDate, endDate, assignedUserCode, assignedGroupCode,
    displayGuidance, displayGoals, displayAgreements, displayAnnouncements,
    displayReferences, displaySchedules, displayProducts, displayChat, displayBbs, displaySubmissions, displayReviews, displayBadges, displaySurvey,
    createdByUserCode, createdAt, updatedAt, isDeleted
)
VALUES (
    '${target_code}',
    '${title}',
    '${description}',
    NULL,
    ${status_sql},
    '${priority}',
    date('now','+${due_offset} days'),
    date('now','${start_offset} days'),
    date('now','+${end_offset} days'),
    '${assigned_user}',
    NULL,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    0
);
INSERT OR IGNORE INTO targetAssignedUsers (targetCode, userCode, isActive, endedAt, displayOrder)
VALUES ('${target_code}', '${assigned_user}', 1, NULL, ${display_order});
INSERT OR IGNORE INTO targetAssignedUsers (targetCode, userCode, isActive, endedAt, displayOrder)
VALUES ('${target_code}', '${operator_participant}', 1, NULL, ${display_order} + 1);
SQL

        sqlite3 "${contents_db_path}" <<SQL
INSERT OR REPLACE INTO userContents (
    contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, isVisible, createdAt, updatedAt
)
VALUES (
    '${submission_content_code}',
    '${assigned_user}',
    'text',
    '${target_code}-submission.txt',
    'content/${submission_content_code}.txt',
    'text/plain',
    256,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    datetime('now','localtime'),
    datetime('now','localtime')
);
SQL

        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO submissions (
    submissionCode, userCode, contentsId, submittedAt, status, content, comment,
    reviewStatus, score, createdAt, updatedAt, isDeleted
)
VALUES (
    '${submission_code}',
    '${assigned_user}',
    ${submission_content_id:-NULL},
    datetime('now','localtime'),
    '${submission_status}',
    '${submission_body}',
    '${submission_comment}',
    '${review_status}',
    ${submission_score},
    datetime('now','localtime'),
    datetime('now','localtime'),
    0
);
INSERT OR REPLACE INTO targetSubmissions (targetCode, submissionCode, userCode, contentId, contentsCode, title, description)
VALUES (
    '${target_code}',
    '${submission_code}',
    '${assigned_user}',
    ${submission_content_id:-NULL},
    '${submission_content_code}',
    NULL,
    NULL
);
INSERT OR REPLACE INTO submissionContents (submissionCode, contentCode, contentType, createdAt)
VALUES ('${submission_code}', '${submission_content_code}', 'text', datetime('now','localtime'));
SQL

        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO reviews (
    reviewCode, reviewerCode, contentsId, reviewedAt, content, privateNote, createdAt, updatedAt, isDeleted
)
VALUES (
    '${review_code}',
    '${creator}',
    ${submission_content_id:-NULL},
    datetime('now','localtime'),
    '${review_comment}',
    '${review_private_note}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    0
);
INSERT OR REPLACE INTO targetReviews (
    targetCode,
    reviewCode,
    reviewerCode,
    contentId,
    contentsCode,
    title,
    description
)
VALUES (
    '${target_code}',
    '${review_code}',
    '${creator}',
    ${submission_content_id:-NULL},
    '${submission_content_code}',
    NULL,
    NULL
);
INSERT OR REPLACE INTO reviewContents (reviewCode, contentCode, contentType, createdAt)
VALUES ('${review_code}', '${submission_content_code}', 'text', datetime('now','localtime'));
INSERT OR REPLACE INTO reviewSubmissionContents (reviewCode, submissionContentCode, createdAt)
VALUES ('${review_code}', '${submission_content_code}', datetime('now','localtime'));
INSERT OR REPLACE INTO reviewVideoComments (
    reviewCode, sourceType, contentCode, startSeconds, comment, createdAt, updatedAt
)
VALUES (
    '${review_code}',
    'submission',
    '${submission_content_code}',
    12,
    '${review_video_comment}',
    datetime('now','localtime'),
    datetime('now','localtime')
);
SQL

        sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO badge_awards (
    badge_id,
    target_id,
    awarded_by,
    awarded_at,
    note
)
SELECT
    b.id,
    t.id,
    ${creator_id},
    datetime('now','localtime'),
    '${title}の成果を称えて授与'
FROM badges b
JOIN targets t ON t.targetCode = '${target_code}'
WHERE b.badge_code = '${badge_code}'
  AND b.creator_user_id = ${creator_id}
  AND NOT EXISTS (
      SELECT 1
      FROM badge_awards ba
      WHERE ba.badge_id = b.id
        AND ba.target_id = t.id
  );
SQL

    sqlite3 "${contents_db_path}" <<SQL
INSERT OR REPLACE INTO userContents (
    contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, isVisible, createdAt, updatedAt
)
VALUES
    ('${doc_content_code}', '${creator}', 'document', '${target_code}-guide.pdf', 'content/${doc_content_code}.pdf', 'application/pdf', 4096, NULL, NULL, NULL, NULL, 1, datetime('now','localtime'), datetime('now','localtime')),
    ('${support_content_code}', '${creator}', 'link', '${target_code}-faq.html', 'content/${support_content_code}.html', 'text/html', 0, NULL, NULL, NULL, NULL, 1, datetime('now','localtime'), datetime('now','localtime')),
    ('${chat_attachment_content_code}', '${assigned_user}', 'note', '${target_code}-memo.txt', 'content/${chat_attachment_content_code}.txt', 'text/plain', 128, NULL, NULL, NULL, NULL, 1, datetime('now','localtime'), datetime('now','localtime')),
    ('${bbs_attachment_content_code}', '${assigned_user}', 'note', '${target_code}-memo.txt', 'content/${bbs_attachment_content_code}.txt', 'text/plain', 128, NULL, NULL, NULL, NULL, 1, datetime('now','localtime'), datetime('now','localtime'));
SQL

        local doc_content_id
        doc_content_id=$(sqlite3 "${contents_db_path}" "SELECT id FROM userContents WHERE contentCode = '${doc_content_code}' LIMIT 1;")
        local support_content_id
        support_content_id=$(sqlite3 "${contents_db_path}" "SELECT id FROM userContents WHERE contentCode = '${support_content_code}' LIMIT 1;")
        local submission_content_id
        submission_content_id=$(sqlite3 "${contents_db_path}" "SELECT id FROM userContents WHERE contentCode = '${submission_content_code}' LIMIT 1;")

        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO targetReferenceMaterials (
    materialCode, targetCode, contentsId, contentCode, title, description, category,
    linkUrl, downloadUrl, fileName, fileSize, ownerUserCode, createdAt, updatedAt,
    displayOrder, isDeleted
)
VALUES (
    '${doc_material_code}',
    '${target_code}',
    ${doc_content_id:-NULL},
    '${doc_content_code}',
    '${title}ガイド',
    '${description}の詳細資料',
    'documentation',
    '${doc_url}',
    '${doc_url}.pdf',
    '${target_code}-guide.pdf',
    4096,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    0,
    0
), (
    '${support_material_code}',
    '${target_code}',
    ${support_content_id:-NULL},
    '${support_content_code}',
    '${support_title}',
    '${support_description}',
    'faq',
    '${support_url}',
    NULL,
    '${target_code}-faq.html',
    0,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    1,
    0
);
INSERT OR REPLACE INTO targetReferenceMaterialContents (materialCode, contentCode, contentType, createdAt)
VALUES
    ('${doc_material_code}', '${doc_content_code}', 'document', datetime('now','localtime')),
    ('${support_material_code}', '${support_content_code}', 'link', datetime('now','localtime'));
INSERT OR REPLACE INTO targetGuidanceContents (
    guidanceCode, targetCode, contentsId, contentCode, title, category, fileName, fileSize,
    ownerUserCode, createdAt, updatedAt, displayOrder, isDeleted
)
VALUES
    ('${target_code}-guidance-01', '${target_code}', ${doc_content_id:-NULL}, '${doc_content_code}', '${title}ガイドステップ', 'document', '${target_code}-guide.pdf', 4096,
        '${creator}', datetime('now','localtime'), datetime('now','localtime'), 0, 0),
    ('${target_code}-guidance-02', '${target_code}', ${support_content_id:-NULL}, '${support_content_code}', '${title}FAQリンク', 'document', '${target_code}-faq.html', 0,
        '${creator}', datetime('now','localtime'), datetime('now','localtime'), 1, 0);
INSERT OR REPLACE INTO targetScheduleMaterials (
    materialCode, targetCode, contentsId, contentCode, title, description, startDate, endDate, category,
    linkUrl, downloadUrl, fileName, fileSize, ownerUserCode, createdAt, updatedAt,
    displayOrder, isDeleted
)
VALUES (
    '${doc_material_code}',
    '${target_code}',
    ${doc_content_id:-NULL},
    '${doc_content_code}',
    '${title}ガイド',
    '${description}の詳細資料',
    date('now','${start_offset} days'),
    date('now','+${end_offset} days'),
    'documentation',
    '${doc_url}',
    '${doc_url}.pdf',
    '${target_code}-guide.pdf',
    4096,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    0,
    0
), (
    '${support_material_code}',
    '${target_code}',
    ${support_content_id:-NULL},
    '${support_content_code}',
    '${support_title}',
    '${support_description}',
    date('now','${start_offset} days'),
    date('now','+${end_offset} days'),
    'faq',
    '${support_url}',
    NULL,
    '${target_code}-faq.html',
    0,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    1,
    0
);
INSERT OR REPLACE INTO targetScheduleMaterialContents (materialCode, contentCode, contentType, createdAt)
VALUES
    ('${doc_material_code}', '${doc_content_code}', 'document', datetime('now','localtime')),
    ('${support_material_code}', '${support_content_code}', 'link', datetime('now','localtime'));

INSERT OR REPLACE INTO targetProductMaterials (
    materialCode, targetCode, contentsId, contentCode, title, description, startDate, endDate, category,
    linkUrl, downloadUrl, fileName, fileSize, ownerUserCode, createdAt, updatedAt,
    displayOrder, isDeleted
)
VALUES (
    '${doc_material_code}',
    '${target_code}',
    ${doc_content_id:-NULL},
    '${doc_content_code}',
    '${title}ガイド',
    '${description}の詳細資料',
    date('now','${start_offset} days'),
    date('now','+${end_offset} days'),
    'documentation',
    '${doc_url}',
    '${doc_url}.pdf',
    '${target_code}-guide.pdf',
    4096,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    0,
    0
), (
    '${support_material_code}',
    '${target_code}',
    ${support_content_id:-NULL},
    '${support_content_code}',
    '${support_title}',
    '${support_description}',
    date('now','${start_offset} days'),
    date('now','+${end_offset} days'),
    'faq',
    '${support_url}',
    NULL,
    '${target_code}-faq.html',
    0,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    1,
    0
);
INSERT OR REPLACE INTO targetProductMaterialContents (materialCode, contentCode, contentType, createdAt)
VALUES
    ('${doc_material_code}', '${doc_content_code}', 'document', datetime('now','localtime')),
    ('${support_material_code}', '${support_content_code}', 'link', datetime('now','localtime'));

INSERT OR REPLACE INTO targetGuidanceContents (
    guidanceCode, targetCode, contentsId, contentCode, title, category, fileName, fileSize,
    ownerUserCode, createdAt, updatedAt, displayOrder, isDeleted
)
VALUES
    ('${target_code}-guidance-01', '${target_code}', ${doc_content_id:-NULL}, '${doc_content_code}', '${title}ガイドステップ', 'document', '${target_code}-guide.pdf', 4096,
        '${creator}', datetime('now','localtime'), datetime('now','localtime'), 0, 0),
    ('${target_code}-guidance-02', '${target_code}', ${support_content_id:-NULL}, '${support_content_code}', '${title}FAQリンク', 'document', '${target_code}-faq.html', 0,
        '${creator}', datetime('now','localtime'), datetime('now','localtime'), 1, 0);
SQL

sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO targetAgreements (
    agreementCode, targetCode, agreementKind, title, content, notes,
    createdByUserId, createdByUserCode, updatedByUserId, updatedByUserCode,
    createdAt, updatedAt, displayOrder, isDeleted
)
VALUES (
    '${agreement_primary_code}',
    '${target_code}',
    '${agreement_primary_kind}',
    '${agreement_primary_title}',
    '${agreement_primary_content}',
    '${agreement_primary_note}',
    ${creator_id},
    '${creator}',
    ${creator_id},
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    0,
    0
), (
    '${agreement_secondary_code}',
    '${target_code}',
    '${agreement_secondary_kind}',
    '${agreement_secondary_title}',
    '${agreement_secondary_content}',
    '${agreement_secondary_note}',
    ${creator_id},
    '${creator}',
    ${creator_id},
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    1,
    0
);
SQL

        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO targetGoals (
    goalCode, targetCode, title, targetUserId, targetUserCode, targetValue,
    evidence, memo, createdByUserId, createdByUserCode, updatedByUserId,
    updatedByUserCode, createdAt, updatedAt, displayOrder, isDeleted
)
VALUES (
    '${goal_primary_code}',
    '${target_code}',
    '${goal_primary_title}',
    ${assigned_user_id},
    '${assigned_user}',
    '${goal_primary_value}',
    '${goal_primary_evidence}',
    '${goal_primary_memo}',
    ${creator_id},
    '${creator}',
    ${creator_id},
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    0,
    0
), (
    '${goal_secondary_code}',
    '${target_code}',
    '${goal_secondary_title}',
    ${assigned_user_id},
    '${assigned_user}',
    '${goal_secondary_value}',
    '${goal_secondary_evidence}',
    '${goal_secondary_memo}',
    ${creator_id},
    '${creator}',
    ${creator_id},
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    1,
    0
);
INSERT OR REPLACE INTO targetGoalAssignees (goalCode, userCode, displayOrder)
VALUES
    ('${goal_primary_code}', '${assigned_user}', 0),
    ('${goal_secondary_code}', '${assigned_user}', 0);
SQL

        if [[ "${video_id}" != "-" ]]; then
            local video_embed_url="https://www.youtube.com/embed/${video_id}"
            local video_watch_url="https://www.youtube.com/watch?v=${video_id}"
            sqlite3 "${contents_db_path}" <<SQL
INSERT OR REPLACE INTO userContents (
    contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, isVisible, createdAt, updatedAt
)
VALUES ('${video_content_code}', '${creator}', 'video', 'youtube-${video_id}.html', 'content/${video_content_code}.html', 'text/html', 0, NULL, NULL, NULL, NULL, 1, datetime('now','localtime'), datetime('now','localtime'));
SQL

            sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO targetReferenceMaterials (
    materialCode, targetCode, contentCode, title, description, category,
    linkUrl, downloadUrl, fileName, fileSize, ownerUserCode, createdAt, updatedAt,
    displayOrder, isDeleted
)
VALUES (
    '${video_material_code}',
    '${target_code}',
    '${video_content_code}',
    '${title}動画チュートリアル',
    '重要なポイントを動画で復習できます。',
    'video',
    '${video_embed_url}',
    '${video_watch_url}',
    'youtube-${video_id}.html',
    0,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    2,
    0
);
INSERT OR REPLACE INTO targetReferenceMaterialContents (materialCode, contentCode, contentType, createdAt)
VALUES ('${video_material_code}', '${video_content_code}', 'video', datetime('now','localtime'));
INSERT OR REPLACE INTO targetScheduleMaterials (
    materialCode, targetCode, contentCode, title, description, startDate, endDate, category,
    linkUrl, downloadUrl, fileName, fileSize, ownerUserCode, createdAt, updatedAt,
    displayOrder, isDeleted
)
VALUES (
    '${video_material_code}',
    '${target_code}',
    '${video_content_code}',
    '${title}動画チュートリアル',
    '重要なポイントを動画で復習できます。',
    date('now','${start_offset} days'),
    date('now','+${end_offset} days'),
    'video',
    '${video_embed_url}',
    '${video_watch_url}',
    'youtube-${video_id}.html',
    0,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    2,
    0
);
INSERT OR REPLACE INTO targetScheduleMaterialContents (materialCode, contentCode, contentType, createdAt)
VALUES ('${video_material_code}', '${video_content_code}', 'video', datetime('now','localtime'));

INSERT OR REPLACE INTO targetProductMaterials (
    materialCode, targetCode, contentCode, title, description, startDate, endDate, category,
    linkUrl, downloadUrl, fileName, fileSize, ownerUserCode, createdAt, updatedAt,
    displayOrder, isDeleted
)
VALUES (
    '${video_material_code}',
    '${target_code}',
    '${video_content_code}',
    '${title}動画チュートリアル',
    '重要なポイントを動画で復習できます。',
    date('now','${start_offset} days'),
    date('now','+${end_offset} days'),
    'video',
    '${video_embed_url}',
    '${video_watch_url}',
    'youtube-${video_id}.html',
    0,
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    2,
    0
);
INSERT OR REPLACE INTO targetProductMaterialContents (materialCode, contentCode, contentType, createdAt)
VALUES ('${video_material_code}', '${video_content_code}', 'video', datetime('now','localtime'));

SQL
        fi

        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO targetChatThreads (
    threadCode, targetCode, threadType, title, description, createdByUserCode,
    createdAt, updatedAt, lastMessageAt, lastMessageSnippet, lastMessageSenderCode, isArchived, isLocked
)
VALUES (
    '${thread_code}',
    '${target_code}',
    'discussion',
    '${chat_title}',
    '${description}',
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    '${chat_message_operator}',
    '${creator}',
    0,
    0
);
INSERT OR IGNORE INTO targetChatThreadMembers (threadCode, userCode, joinedAt, notificationsMuted)
VALUES
    ('${thread_code}', '${assigned_user}', datetime('now','localtime'), 0),
    ('${thread_code}', '${creator}', datetime('now','localtime'), 0),
    ('${thread_code}', '${ADMIN_USER_CODE}', datetime('now','localtime'), 0);
INSERT OR REPLACE INTO targetChatMessages (
    messageCode, threadCode, senderUserCode, content, sentAt, deliveredAt,
    readAt, createdAt, updatedAt, replyToMessageCode, metadata, isDeleted
)
VALUES (
    '${user_message_code}',
    '${thread_code}',
    '${assigned_user}',
    '${chat_message_user}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    NULL,
    '{"emphasis": "normal"}',
    0
), (
    '${operator_message_code}',
    '${thread_code}',
    '${creator}',
    '${chat_message_operator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    '${user_message_code}',
    '{"emphasis": "info"}',
    0
);
INSERT OR REPLACE INTO targetChatMessageAttachments (
    attachmentCode, messageCode, contentCode, contentType, fileName, mimeType, fileSize, downloadUrl, createdAt, updatedAt
)
VALUES (
    '${attachment_code}',
    '${user_message_code}',
    '${chat_attachment_content_code}',
    'note',
    '${target_code}-memo.txt',
    'text/plain',
    128,
    '${doc_url}/memo.txt',
    datetime('now','localtime'),
    datetime('now','localtime')
);
INSERT OR REPLACE INTO targetChatMessageReads (messageCode, userCode, readAt, createdAt)
VALUES
    ('${user_message_code}', '${creator}', datetime('now','localtime'), datetime('now','localtime')),
    ('${operator_message_code}', '${assigned_user}', datetime('now','localtime'), datetime('now','localtime'));

INSERT OR REPLACE INTO targetBbsThreads (
    threadCode, targetCode, threadType, title, description, createdByUserCode,
    createdAt, updatedAt, lastMessageAt, lastMessageSnippet, lastMessageSenderCode, isArchived, isLocked
)
VALUES (
    '${thread_code}',
    '${target_code}',
    'discussion',
    '${bbs_title}',
    '${description}',
    '${creator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    '${bbs_message_operator}',
    '${creator}',
    0,
    0
);
INSERT OR IGNORE INTO targetBbsThreadMembers (threadCode, userCode, joinedAt, notificationsMuted)
VALUES
    ('${thread_code}', '${assigned_user}', datetime('now','localtime'), 0),
    ('${thread_code}', '${creator}', datetime('now','localtime'), 0),
    ('${thread_code}', '${ADMIN_USER_CODE}', datetime('now','localtime'), 0);
INSERT OR REPLACE INTO targetBbsMessages (
    messageCode, threadCode, senderUserCode, content, sentAt, deliveredAt,
    readAt, createdAt, updatedAt, replyToMessageCode, metadata, isDeleted
)
VALUES (
    '${user_message_code}',
    '${thread_code}',
    '${assigned_user}',
    '${bbs_message_user}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    NULL,
    '{"emphasis": "normal"}',
    0
), (
    '${operator_message_code}',
    '${thread_code}',
    '${creator}',
    '${bbs_message_operator}',
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    datetime('now','localtime'),
    '${user_message_code}',
    '{"emphasis": "info"}',
    0
);
INSERT OR REPLACE INTO targetBbsMessageAttachments (
    attachmentCode, messageCode, contentCode, contentType, fileName, mimeType, fileSize, downloadUrl, createdAt, updatedAt
)
VALUES (
    '${attachment_code}',
    '${user_message_code}',
    '${bbs_attachment_content_code}',
    'note',
    '${target_code}-memo.txt',
    'text/plain',
    128,
    '${doc_url}/memo.txt',
    datetime('now','localtime'),
    datetime('now','localtime')
);
INSERT OR REPLACE INTO targetBbsMessageReads (messageCode, userCode, readAt, createdAt)
VALUES
    ('${user_message_code}', '${creator}', datetime('now','localtime'), datetime('now','localtime')),
    ('${operator_message_code}', '${assigned_user}', datetime('now','localtime'), datetime('now','localtime'));

SQL

        display_order=$((display_order + 1))
    done

    declare -A announcement_display_order=()
    local announcement_entry
    for announcement_entry in "${target_announcements[@]}"; do
        IFS='|' read -r announcement_target announcement_code announcement_title announcement_body announcement_creator announcement_offset <<<"${announcement_entry}"
        local title_sql content_sql
        title_sql="$(sqlite_escape "${announcement_title}")"
        content_sql="$(sqlite_escape "${announcement_body}")"

        local created_at_expr="datetime('now','localtime')"
        if [[ "${announcement_offset}" =~ ^-?[0-9]+$ ]]; then
            if (( announcement_offset > 0 )); then
                created_at_expr="datetime('now','+${announcement_offset} days','localtime')"
            elif (( announcement_offset < 0 )); then
                created_at_expr="datetime('now','${announcement_offset} days','localtime')"
            fi
        fi

        local display_index="${announcement_display_order["${announcement_target}"]:-0}"
        display_index=$((display_index + 1))
        announcement_display_order["${announcement_target}"]="${display_index}"

        local survey_start_expr="${created_at_expr}"
        local survey_end_expr="datetime(${created_at_expr}, '+14 days')"

        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO targetAnnouncements (
    announcementCode, targetCode, title, content, createdByUserCode, createdAt, updatedAt, displayOrder, isDeleted
)
VALUES (
    '${announcement_code}',
    '${announcement_target}',
    '${title_sql}',
    '${content_sql}',
    '${announcement_creator}',
    ${created_at_expr},
    datetime('now','localtime'),
    ${display_index},
    0
);
INSERT OR REPLACE INTO targetSurvey (
    surveyCode, targetCode, title, content, startAt, endAt, createdByUserCode, createdAt, updatedAt, displayOrder, isDeleted
)
VALUES (
    '${announcement_code}',
    '${announcement_target}',
    '${title_sql}',
    '${content_sql}',
    ${survey_start_expr},
    ${survey_end_expr},
    '${announcement_creator}',
    ${created_at_expr},
    datetime('now','localtime'),
    ${display_index},
    0
);
SQL
    done

    local acknowledgement_entry
    for acknowledgement_entry in "${target_announcement_acknowledgements[@]}"; do
        IFS="|" read -r acknowledgement_target acknowledgement_code acknowledgement_user acknowledgement_offset <<<"${acknowledgement_entry}"
        local acknowledged_expr="NULL"
        if [[ "${acknowledgement_offset}" =~ ^-?[0-9]+$ ]]; then
            if (( acknowledgement_offset > 0 )); then
                acknowledged_expr="datetime('now','+${acknowledgement_offset} days','localtime')"
            elif (( acknowledgement_offset < 0 )); then
                acknowledged_expr="datetime('now','${acknowledgement_offset} days','localtime')"
            else
                acknowledged_expr="datetime('now','localtime')"
            fi
        fi

        sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO targetAnnouncementAcknowledgements (targetAnnouncementId, userCode, acknowledgedAt)
SELECT id, '${acknowledgement_user}', ${acknowledged_expr}
FROM targetAnnouncements
WHERE announcementCode = '${acknowledgement_code}'
  AND targetCode = '${acknowledgement_target}'
LIMIT 1;
INSERT OR IGNORE INTO targetSurveyAcknowledgements (targetSurveyId, userCode, acknowledgedAt)
SELECT id, '${acknowledgement_user}', ${acknowledged_expr}
FROM targetSurvey
WHERE surveyCode = '${acknowledgement_code}'
  AND targetCode = '${acknowledgement_target}'
LIMIT 1;
SQL
    done

    local -a additional_submissions=(
        "submission-101|${USER_CODES[1]}|content-101|${target_codes[0]}|ステップを踏んで整理した提出内容です。|前回のフィードバックを反映しました。|progress-101.txt"
        "submission-102|${USER_CODES[2]}|content-102|${target_codes[0]}|効率化の工夫をまとめたレポートです。|レビュー観点の確認も完了しています。|progress-102.txt"
        "submission-103|${USER_CODES[0]}|content-103|${target_codes[1]}|チャット運用の改善案をまとめたノートです。|operator-001への質問事項も含めました。|chat-improvement-103.txt"
    )

    local submission_info
    for submission_info in "${additional_submissions[@]}"; do
        IFS='|' read -r submission_code submitter_code content_code target_code content_body comment_body primary_file <<<"${submission_info}"
        local extra_thread_code="${target_code/target/thread}"
        sqlite3 "${contents_db_path}" <<SQL
INSERT OR REPLACE INTO userContents (
    contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, isVisible, createdAt, updatedAt
)
VALUES (
    '${content_code}',
    '${submitter_code}',
    'text',
    '${primary_file}',
    'content/${content_code}.txt',
    'text/plain',
    192,
    NULL,
    NULL,
    NULL,
    NULL,
    1,
    datetime('now','localtime'),
    datetime('now','localtime')
);
SQL

        local submission_content_id
        submission_content_id=$(sqlite3 "${contents_db_path}" "SELECT id FROM userContents WHERE contentCode = '${content_code}' LIMIT 1;")

        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO submissions (
    submissionCode, userCode, contentsId, submittedAt, status, content, comment,
    reviewStatus, score, createdAt, updatedAt, isDeleted
)
VALUES (
    '${submission_code}',
    '${submitter_code}',
    ${submission_content_id:-NULL},
    datetime('now','localtime'),
    'submitted',
    '${content_body}',
    '${comment_body}',
    'pending',
    0,
    datetime('now','localtime'),
    datetime('now','localtime'),
    0
);
INSERT OR REPLACE INTO targetSubmissions (targetCode, submissionCode, userCode, contentId, contentsCode, title, description)
VALUES (
    '${target_code}',
    '${submission_code}',
    '${submitter_code}',
    ${submission_content_id:-NULL},
    '${content_code}',
    NULL,
    NULL
);
INSERT OR REPLACE INTO submissionContents (submissionCode, contentCode, contentType, createdAt)
VALUES ('${submission_code}', '${content_code}', 'text', datetime('now','localtime'));
INSERT OR IGNORE INTO targetChatThreadMembers (threadCode, userCode, joinedAt, notificationsMuted)
VALUES ('${extra_thread_code}', '${submitter_code}', datetime('now','localtime'), 0);
INSERT OR IGNORE INTO targetBbsThreadMembers (threadCode, userCode, joinedAt, notificationsMuted)
VALUES ('${extra_thread_code}', '${submitter_code}', datetime('now','localtime'), 0);
SQL
    done

    seed_user_contents_samples "${contents_db_path}"
}

create_db_register() {
    local db_path="$1"
    sqlite3 "$db_path" <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS mailCheck (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER,
  keyword VARCHAR(128),
  registerExpire VARCHAR(128),
  token VARCHAR(128),
  isComplete INTEGER
);
CREATE TABLE IF NOT EXISTS passwordReset (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mail VARCHAR(128),
  keyword VARCHAR(128),
  registerExpire VARCHAR(128),
  token VARCHAR(128),
  isComplete INTEGER
);
CREATE TABLE IF NOT EXISTS register (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userMail VARCHAR(128),
  registerExpire VARCHAR(128),
  token VARCHAR(128),
  isComplete INTEGER,
  hint VARCHAR(32),
  password VARCHAR(64)
);
COMMIT;
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing register test data"
        seed_register_test_data "$db_path"
    fi
}

create_db_contact() {
    local db_path="$1"
    sqlite3 "$db_path" <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS contactLog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userName VARCHAR(128),
    userMail VARCHAR(128),
    date VARCHAR(32),
    legend VARCHAR(2048),
    userId INTEGER
);
COMMIT;
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing contact test data"
        seed_contact_test_data "$db_path"
    fi
}

create_db_docker() {
    local db_path="$1"
    sqlite3 "$db_path" <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    serviceId INTEGER,
    pid INTEGER,
    startDate VARCHAR(32),
    endDate VARCHAR(32),
    status VARCHAR(16),
    errorReason VARCHAR(32),
    params VARCHAR(1024),
    uuid VARCHAR(36),
    progress INTEGER
);
CREATE TABLE IF NOT EXISTS service (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serviceCode VARCHAR(32),
    weight INTEGER
);
COMMIT;
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing docker queue test data"
        seed_docker_test_data "$db_path"
    fi
}

create_db_purchase() {
    local db_path="$1"
    sqlite3 "$db_path" <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS productPurchase (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    productCode VARCHAR(64) NOT NULL,
    userCode VARCHAR(32) NOT NULL,
    orderCode VARCHAR(64) NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    currency VARCHAR(8) DEFAULT 'JPY',
    paymentMethod VARCHAR(32),
    paymentStatus VARCHAR(32),
    orderDate VARCHAR(32),
    paymentDate VARCHAR(32),
    shippingDate VARCHAR(32),
    deliveryDate VARCHAR(32),
    shippingStatus VARCHAR(32),
    memo TEXT,
    createdAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    updatedAt VARCHAR(32) DEFAULT (datetime('now','localtime')),
    UNIQUE(orderCode, productCode, userCode)
);
CREATE INDEX IF NOT EXISTS idx_productPurchase_user ON productPurchase(userCode);
CREATE INDEX IF NOT EXISTS idx_productPurchase_orderDate ON productPurchase(orderDate);
CREATE TRIGGER IF NOT EXISTS trg_productPurchase_updated
AFTER UPDATE ON productPurchase
FOR EACH ROW
BEGIN
    UPDATE productPurchase
       SET updatedAt = datetime('now','localtime')
     WHERE id = NEW.id;
END;
COMMIT;
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing purchase test data"
        sqlite3 "$db_path" <<SQL
INSERT OR REPLACE INTO productPurchase (
    productCode, userCode, orderCode, price, quantity, currency, paymentMethod,
    paymentStatus, orderDate, paymentDate, shippingDate, deliveryDate, shippingStatus, memo,
    createdAt, updatedAt
) VALUES
    (
        'product-001',
        '${USER_CODES[0]}',
        'order-2024001',
        12000,
        1,
        'JPY',
        'credit-card',
        'paid',
        datetime('now','localtime','-10 days'),
        datetime('now','localtime','-9 days'),
        datetime('now','localtime','-8 days'),
        datetime('now','localtime','-6 days'),
        'delivered',
        '初回セット購入',
        datetime('now','localtime'),
        datetime('now','localtime')
    ),
    (
        'product-002',
        '${USER_CODES[1]}',
        'order-2024002',
        6800,
        2,
        'JPY',
        'bank-transfer',
        'pending',
        datetime('now','localtime','-3 days'),
        NULL,
        NULL,
        NULL,
        'preparing',
        '追加アクセサリ',
        datetime('now','localtime'),
        datetime('now','localtime')
    );
SQL
    fi
}

create_db_dataservice() {
    local db_path="$1"
    sqlite3 "$db_path" <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS objects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket TEXT NOT NULL,
    "key" TEXT NOT NULL,
    userId TEXT NOT NULL,
    fileName TEXT NOT NULL,
    mimeType TEXT,
    size INTEGER,
    createdAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    UNIQUE (bucket, "key", userId)
);
CREATE TABLE IF NOT EXISTS data_files (
    id INTEGER PRIMARY KEY,
    file_path TEXT NOT NULL,
    FOREIGN KEY (id) REFERENCES objects(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_objects_bucket_user ON objects(bucket, userId);
CREATE INDEX IF NOT EXISTS idx_objects_created ON objects(createdAt);
CREATE TRIGGER IF NOT EXISTS trg_objects_updatedAt
AFTER UPDATE ON objects
FOR EACH ROW
BEGIN
    UPDATE objects
       SET updatedAt = datetime('now','localtime')
     WHERE id = NEW.id;
END;
CREATE TABLE IF NOT EXISTS data_meta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bucket TEXT NOT NULL,
    key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    mime_type TEXT,
    size INTEGER,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(bucket, key, user_id)
);
CREATE INDEX IF NOT EXISTS idx_meta_user ON data_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_meta_bucket ON data_meta(bucket);
COMMIT;
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing data service test data"
        seed_dataservice_test_data "$db_path"
    fi
}

create_db_queue() {
    local db_path="$1"
    sqlite3 "$db_path" <<'SQL'
BEGIN;
CREATE TABLE IF NOT EXISTS job_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL,
    source_path TEXT NOT NULL,
    target_path TEXT NOT NULL,
    target_bitrate INTEGER NOT NULL,
    original_bitrate INTEGER,
    context TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
    started_at TEXT,
    finished_at TEXT,
    error_message TEXT
);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_target ON job_queue(job_type, target_path);
CREATE TRIGGER IF NOT EXISTS trg_job_queue_updated_at
AFTER UPDATE ON job_queue
FOR EACH ROW
BEGIN
    UPDATE job_queue
       SET updated_at = datetime('now','localtime')
     WHERE id = NEW.id;
END;
COMMIT;
SQL

    if [[ "$INCLUDE_FULL_TEST_DATA" = true ]]; then
        log_action "Preparing queue test data"
        seed_queue_test_data "$db_path"
    fi
}

seed_register_test_data() {
    local db_path="$1"
    sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO mailCheck (userId, keyword, registerExpire, token, isComplete)
VALUES (1, 'verify-key', datetime('now','+1 day'), 'mail-token-001', 0);
INSERT OR IGNORE INTO passwordReset (mail, keyword, registerExpire, token, isComplete)
VALUES ('${SUPPORT_MAIL}', 'reset-key', datetime('now','+2 days'), 'reset-token-001', 0);
INSERT OR IGNORE INTO register (userMail, registerExpire, token, isComplete, hint, password)
VALUES ('user001@example.com', datetime('now','+3 days'), 'register-token-001', 0, 'ペットの名前', 'テスト回答');
SQL
}

seed_contact_test_data() {
    local db_path="$1"
    sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO contactLog (
    userName, userMail, date, legend, userId
)
VALUES (
    '山田 太郎',
    'yamada@example.com',
    datetime('now','localtime'),
    'サービスについて問い合わせました。',
    1
);
SQL
}

seed_docker_test_data() {
    local db_path="$1"
    sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO service (serviceCode, weight)
VALUES ('video-encoder', 10);
INSERT OR IGNORE INTO queue (
    userId, serviceId, pid, startDate, endDate, status, errorReason,
    params, uuid, progress
)
VALUES (
    1,
    (SELECT id FROM service WHERE serviceCode = 'video-encoder' LIMIT 1),
    12345,
    datetime('now','localtime'),
    NULL,
    'queued',
    '',
    '{"bitrate":"1M"}',
    'uuid-queue-001',
    0
);
SQL
}

seed_dataservice_test_data() {
    local db_path="$1"
    local object_path="${DATA_SERVICE_DIR}/buckets/media/sample.txt"
    sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO objects (bucket, "key", userId, fileName, mimeType, size)
VALUES ('media', 'sample.txt', '${USER_CODES[0]}', 'sample.txt', 'text/plain', 512);
INSERT OR IGNORE INTO data_files (id, file_path)
SELECT id, '${object_path}' FROM objects
 WHERE bucket = 'media' AND "key" = 'sample.txt' AND userId = '${USER_CODES[0]}';
INSERT OR IGNORE INTO data_meta (bucket, key, user_id, mime_type, size)
VALUES ('media', 'sample.txt', '${USER_CODES[0]}', 'text/plain', 512);
SQL
}

seed_queue_test_data() {
    local db_path="$1"
    sqlite3 "$db_path" <<SQL
INSERT OR IGNORE INTO job_queue (
    job_type, status, source_path, target_path, target_bitrate,
    original_bitrate, context, created_at, updated_at, started_at, finished_at, error_message
)
VALUES
    (
        'transcode',
        'queued',
        '/input/video.mp4',
        '/output/video.mp4',
        800000,
        1200000,
        '{"userCode":"${ADMIN_USER_CODE}","priority":"high"}',
        datetime('now','localtime','-20 minutes'),
        datetime('now','localtime','-5 minutes'),
        NULL,
        NULL,
        NULL
    ),
    (
        'transcode',
        'running',
        '/input/highlight.mov',
        '/output/highlight_low.mov',
        600000,
        1800000,
        '{"userCode":"${ADMIN_USER_CODE}","progressPercent":42.5}',
        datetime('now','localtime','-2 hours'),
        datetime('now','localtime'),
        datetime('now','localtime','-90 minutes'),
        NULL,
        NULL
    ),
    (
        'thumbnail',
        'success',
        '/input/thumb-source.png',
        '/output/thumb-generated.png',
        0,
        NULL,
        '{"userCode":"${OPERATOR_USER_CODES[0]}","progress":"100"}',
        datetime('now','localtime','-1 day'),
        datetime('now','localtime','-22 hours'),
        datetime('now','localtime','-23 hours'),
        datetime('now','localtime','-22 hours','-30 minutes'),
        NULL
    ),
    (
        'transcode',
        'error',
        '/input/lesson.mp4',
        '/output/lesson_low.mp4',
        500000,
        1500000,
        '{"userCode":"${USER_CODES[0]}","progress_rate":67}',
        datetime('now','localtime','-3 days'),
        datetime('now','localtime','-3 days','+2 hours'),
        datetime('now','localtime','-3 days','+30 minutes'),
        datetime('now','localtime','-3 days','+2 hours'),
        'ffmpeg exited with status 1'
    ),
    (
        'cleanup',
        'queued',
        '/tmp/old-assets',
        '/tmp/old-assets',
        0,
        NULL,
        '{"requestedBy":"${OPERATOR_USER_CODES[1]:-${OPERATOR_USER_CODES[0]}}","notes":"nightly cleanup"}',
        datetime('now','localtime','-5 days'),
        datetime('now','localtime','-5 days'),
        NULL,
        NULL,
        NULL
    );
SQL
}

create_db_common "${DB_DIR}/common.sqlite"
create_db_contents "${DB_DIR}/contents.sqlite"
create_db_target "${DB_DIR}/target.sqlite"
create_db_register "${DB_DIR}/register.sqlite"
create_db_contact "${DB_DIR}/contact.sqlite"
create_db_docker "${DB_DIR}/dockerService.sqlite"
create_db_purchase "${DB_DIR}/purchase.sqlite"
create_db_dataservice "${DB_DIR}/dataService.sqlite"
create_db_queue "${DB_DIR}/queue.sqlite"

resolve_site_path() {
    local relative_path="$1"
    local candidates=(
        "${SITE_DIR}/${relative_path}"
        "${SITE_DIR}/root/${relative_path}"
    )

    local candidate
    for candidate in "${candidates[@]}"; do
        if [[ -e "$candidate" ]]; then
            printf '%s\n' "$candidate"
            return 0
        fi
    done

    return 1
}

update_readme_with_credentials() {
    local readme_path
    if ! readme_path=$(resolve_site_path "README.md"); then
        echo "Warning: README file not found under ${SITE_DIR}/README.md or ${SITE_DIR}/root/README.md. Skipping README update." >&2
        return
    fi
    local marker_start="<!-- INIT_CREDENTIALS_START -->"
    local marker_end="<!-- INIT_CREDENTIALS_END -->"

    if ! grep -q "$marker_start" "$readme_path"; then
        echo "Warning: README missing ${marker_start} marker. Skipping README update." >&2
        return
    fi

    if ! grep -q "$marker_end" "$readme_path"; then
        echo "Warning: README missing ${marker_end} marker. Skipping README update." >&2
        return
    fi

    if ! command -v python3 >/dev/null 2>&1; then
        echo "Warning: python3 is not available. Skipping README update." >&2
        return
    fi

    local tmp
    tmp=$(mktemp)

    {
        echo "最終更新: $(date '+%Y-%m-%d %H:%M:%S %z')"
        echo ""
        echo "| ユーザーコード | 初期パスワード |"
        echo "| --- | --- |"
        for user_code in "${ADMIN_USER_CODE}" "${OPERATOR_USER_CODES[@]}" "${USER_CODES[@]}"; do
            printf '| %s | %s |\n' "$user_code" "${GENERATED_PASSWORDS[$user_code]}"
        done
    } >"$tmp"

    if python3 - "$readme_path" "$tmp" "$marker_start" "$marker_end" <<'PY'; then
import pathlib
import sys

readme_path = pathlib.Path(sys.argv[1])
content_path = pathlib.Path(sys.argv[2])
marker_start = sys.argv[3]
marker_end = sys.argv[4]

text = readme_path.read_text()

try:
    before, rest = text.split(marker_start, 1)
    _, after = rest.split(marker_end, 1)
except ValueError:
    sys.exit(0)

content = content_path.read_text().rstrip('\n')

new_text = before + marker_start + '\n' + content + '\n' + marker_end + after
readme_path.write_text(new_text)
PY
        echo "README updated with generated credentials at ${readme_path}."
    else
        echo "Warning: failed to update README credentials section." >&2
    fi

    rm -f "$tmp"
}

run_jwt_key_generation() {
    local site_dir="${SITE_DIR}"
    local jwt_script

    if ! jwt_script=$(resolve_site_path "tools/jwt-key.sh"); then
        echo "Warning: JWT key script not found under ${site_dir}/tools/jwt-key.sh or ${site_dir}/root/tools/jwt-key.sh." >&2
        return
    fi

    if [[ ! -d "${site_dir}" ]]; then
        echo "Warning: cannot generate JWT key because ${site_dir} does not exist." >&2
        return
    fi

    if [[ ! -x "${jwt_script}" ]]; then
        echo "Warning: JWT key script not executable at ${jwt_script}." >&2
        return
    fi

    (
        set +e
        cd "${site_dir}" || exit 1
        "${jwt_script}"
    )
    local status=$?

    if [[ ${status} -ne 0 ]]; then
        echo "Warning: jwt-key.sh exited with status ${status}. Please run it manually if needed." >&2
    else
        echo "JWT key initialized via jwt-key.sh."
    fi
}

if [[ "$SITE_DIR_EXISTS_BEFORE" = true ]]; then
    chmod -R g+w "${SITE_DIR}"
    update_readme_with_credentials
    run_jwt_key_generation
else
    echo "Warning: document root ${SITE_DIR} does not exist. Create or link your clone manually." >&2
fi

if [[ "$SKIP_OWNER" = false ]]; then
    if [[ "$SITE_DIR_EXISTS_BEFORE" = true ]]; then
        if ! chown -R "$OWNER" "${SITE_DIR}" 2>/dev/null; then
            echo "Warning: failed to chown ${SITE_DIR} to ${OWNER}." >&2
        fi
    fi
fi

MANAGED_PATHS=(
    "$DB_DIR"
    "$USERDATA_BASE_DIR"
    "$DATA_SERVICE_DIR"
    "${DATA_DIR}/log"
    "${DATA_DIR}/jwt"
    "${DATA_DIR}/jwt/archive"
)

for managed_path in "${MANAGED_PATHS[@]}"; do
    if [[ -d "${managed_path}" ]]; then
        chmod -R 775 "${managed_path}"
    fi
done

if [[ "$SKIP_OWNER" = false ]]; then
    for managed_path in "${MANAGED_PATHS[@]}"; do
        if [[ -d "${managed_path}" ]]; then
            if ! chown -R "$OWNER" "${managed_path}" 2>/dev/null; then
                echo "Warning: failed to chown ${managed_path} to ${OWNER}. Adjust ownership manually if needed." >&2
            fi
        fi
    done
fi

echo "Initialization complete."
echo "Data directory : ${DATA_DIR}"
echo "Generated user credentials:"
for user_code in "${ADMIN_USER_CODE}" "${OPERATOR_USER_CODES[@]}" "${USER_CODES[@]}"; do
    echo "  ${user_code} : password=${GENERATED_PASSWORDS[${user_code}]}"
done
