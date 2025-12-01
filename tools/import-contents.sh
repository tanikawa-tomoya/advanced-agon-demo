#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: import-contents.sh <user-id> <content-dir>

Arguments:
  <user-id>      Numeric user.id stored in user.sqlite/common.sqlite
  <content-dir>  Directory containing files to import for the user

Run this script from the site root directory (e.g. /var/www/htmlv/<siteId>).
It will copy files under data/userdata/<userId>/content and insert
metadata rows into data/db/contents.sqlite (userContents table).
USAGE
}

if [[ $# -ne 2 ]]; then
  usage >&2
  exit 1
fi

USER_ID_RAW="$1"
CONTENT_SRC_DIR="$2"

if [[ ! "$USER_ID_RAW" =~ ^[0-9]+$ ]]; then
  echo "Error: user-id must be a numeric ID." >&2
  exit 1
fi

USER_ID="$USER_ID_RAW"

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    echo "Error: required command not found: ${name}" >&2
    exit 1
  fi
}

require_site_context() {
  local cwd
  cwd=$(pwd -P)
  if [[ ! "$cwd" =~ ^/var/www/htmlv/[^/]+$ ]]; then
    cat <<'CTX'
ERROR: Run this script from /var/www/htmlv/<site-id> (site root).
Example:
  cd /var/www/htmlv/example-site
  sudo ./tools/import-contents.sh <user-id> <content-dir>
CTX
    exit 1
  fi

  SITE_ROOT="$cwd"
  DATA_ROOT="${SITE_ROOT}/data"
  DB_DIR="${DATA_ROOT}/db"
  COMMON_DB="${DB_DIR}/common.sqlite"
  CONTENTS_DB="${DB_DIR}/contents.sqlite"
  USERDATA_BASE="${DATA_ROOT}/userdata"
}

require_command "sqlite3"
require_command "file"

require_site_context

if [[ ! -d "$CONTENT_SRC_DIR" ]]; then
  echo "Error: content directory does not exist: ${CONTENT_SRC_DIR}" >&2
  exit 1
fi

if [[ ! -f "$COMMON_DB" ]]; then
  echo "Error: common database not found: ${COMMON_DB}" >&2
  exit 1
fi

if [[ ! -f "$CONTENTS_DB" ]]; then
  echo "Error: contents database not found: ${CONTENTS_DB}" >&2
  exit 1
fi

if [[ ! -d "$USERDATA_BASE" ]]; then
  echo "Error: userdata directory not found: ${USERDATA_BASE}" >&2
  exit 1
fi

FILE_COUNT=$(find "$CONTENT_SRC_DIR" -type f | wc -l | tr -d ' ')
if [[ "$FILE_COUNT" -eq 0 ]]; then
  echo "Error: content directory contains no files: ${CONTENT_SRC_DIR}" >&2
  exit 1
fi

USER_CODE=$(sqlite3 "$COMMON_DB" "SELECT userCode FROM user WHERE id = ${USER_ID} LIMIT 1;")
if [[ -z "$USER_CODE" ]]; then
  echo "Error: user id ${USER_ID} not found in ${COMMON_DB}." >&2
  exit 1
fi

TABLE_EXISTS=$(sqlite3 "$CONTENTS_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='userContents' LIMIT 1;")
if [[ "$TABLE_EXISTS" != "userContents" ]]; then
  echo "Error: userContents table not found in ${CONTENTS_DB}." >&2
  exit 1
fi

install -d -m 0775 "${USERDATA_BASE}/${USER_ID}/content"

sql_quote() {
  local value="$1"
  value=${value//"'"/"''"}
  printf "'%s'" "$value"
}

number_or_null() {
  local value="$1"
  if [[ -z "$value" ]]; then
    echo NULL
  else
    echo "$value"
  fi
}

to_integer() {
  local value="$1"
  if [[ "$value" =~ ^[0-9]+$ ]]; then
    echo "$value"
  elif [[ "$value" =~ ^[0-9]+([.][0-9]+)?$ ]]; then
    printf '%.0f' "$value"
  else
    echo ""
  fi
}

detect_content_type() {
  local mime="$1"
  local extension="$2"
  local lowered_ext
  lowered_ext=$(echo "$extension" | tr 'A-Z' 'a-z')

  if [[ "$mime" == video/* ]]; then
    echo video
    return
  fi

  case "$lowered_ext" in
    mp4|mov|mkv|avi|flv|webm|wmv|m4v|mpg|mpeg)
      echo video
      return
      ;;
  esac

  if [[ "$mime" == image/* ]]; then
    echo image
    return
  fi

  if [[ "$mime" == audio/* ]]; then
    echo audio
    return
  fi

  echo file
}

FFPROBE_AVAILABLE=false
if command -v ffprobe >/dev/null 2>&1; then
  FFPROBE_AVAILABLE=true
fi

IDENTIFY_AVAILABLE=false
if command -v identify >/dev/null 2>&1; then
  IDENTIFY_AVAILABLE=true
fi

FFMPEG_AVAILABLE=false
if command -v ffmpeg >/dev/null 2>&1; then
  FFMPEG_AVAILABLE=true
fi

CONVERT_AVAILABLE=false
if command -v convert >/dev/null 2>&1; then
  CONVERT_AVAILABLE=true
fi

probe_media_metadata() {
  local path="$1"
  MEDIA_DURATION=""
  MEDIA_BITRATE=""
  MEDIA_WIDTH=""
  MEDIA_HEIGHT=""

  if [[ "$FFPROBE_AVAILABLE" == true ]]; then
    local format_output
    format_output=$(ffprobe -v error -show_entries format=duration,bit_rate -of default=noprint_wrappers=1:nokey=1 "$path" 2>/dev/null || true)
    MEDIA_DURATION=$(echo "$format_output" | sed -n '1p')
    MEDIA_BITRATE=$(echo "$format_output" | sed -n '2p')

    local video_output
    video_output=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,bit_rate -of default=noprint_wrappers=1:nokey=1 "$path" 2>/dev/null || true)
    local v_width v_height v_bitrate
    v_width=$(echo "$video_output" | sed -n '1p')
    v_height=$(echo "$video_output" | sed -n '2p')
    v_bitrate=$(echo "$video_output" | sed -n '3p')

    if [[ -n "$v_width" ]]; then
      MEDIA_WIDTH="$v_width"
    fi
    if [[ -n "$v_height" ]]; then
      MEDIA_HEIGHT="$v_height"
    fi
    if [[ -n "$v_bitrate" ]]; then
      MEDIA_BITRATE="$v_bitrate"
    fi
  fi
}

create_video_thumbnail() {
  local source_path="$1"
  local target_path="$2"

  if [[ "$FFMPEG_AVAILABLE" != true ]]; then
    return 1
  fi

  local filter="thumbnail,scale=min(320\\,iw):-2"

  if ffmpeg -y -i "$source_path" -vframes 1 -vf "$filter" -f image2 -vcodec mjpeg "$target_path" >/dev/null 2>&1; then
    if [[ -f "$target_path" && -s "$target_path" ]]; then
      return 0
    fi
  fi

  rm -f "$target_path"
  return 1
}

create_image_thumbnail() {
  local source_path="$1"
  local target_path="$2"

  if [[ "$CONVERT_AVAILABLE" != true ]]; then
    return 1
  fi

  local max_dimension=320
  local geometry="${max_dimension}x${max_dimension}>"

  if convert -auto-orient -strip -thumbnail "$geometry" "$source_path" "$target_path" >/dev/null 2>&1; then
    if [[ -f "$target_path" && -s "$target_path" ]]; then
      return 0
    fi
  fi

  rm -f "$target_path"
  return 1
}

create_content_thumbnail() {
  local content_type="$1"
  local source_path="$2"
  local target_path="$3"

  case "$content_type" in
    video)
      create_video_thumbnail "$source_path" "$target_path"
      return
      ;;
    image)
      create_image_thumbnail "$source_path" "$target_path"
      return
      ;;
  esac

  return 1
}

probe_image_dimensions() {
  local path="$1"
  MEDIA_WIDTH=""
  MEDIA_HEIGHT=""
  if [[ "$IDENTIFY_AVAILABLE" == true ]]; then
    local dims
    dims=$(identify -format '%w %h' "$path" 2>/dev/null || true)
    MEDIA_WIDTH=$(echo "$dims" | awk '{print $1}')
    MEDIA_HEIGHT=$(echo "$dims" | awk '{print $2}')
  fi
}

NOW=$(date '+%Y-%m-%d %H:%M:%S')
SQL_STATEMENTS="BEGIN;"

while IFS= read -r -d '' file_path; do
  file_name=$(basename "$file_path")
  extension="${file_name##*.}"
  mime=$(file --brief --mime-type "$file_path" 2>/dev/null || true)
  content_type=$(detect_content_type "$mime" "$extension")

  content_code=$(uuidgen 2>/dev/null | tr -d '-' || date +%s%N)
  dest_dir="${USERDATA_BASE}/${USER_ID}/content/${content_code}"
  dest_path="${dest_dir}/${file_name}"
  relative_path="content/${content_code}/${file_name}"
  thumbnail_path="${dest_path}_thumbnail"

  install -d -m 0775 "$dest_dir"
  cp -p "$file_path" "$dest_path"

  if create_content_thumbnail "$content_type" "$dest_path" "$thumbnail_path"; then
    echo "Thumbnail created for ${relative_path}"
  fi

  file_size=$(stat -c '%s' "$dest_path")
  mime_type="$mime"
  [[ -z "$mime_type" ]] && mime_type="application/octet-stream"

  duration=""
  bitrate=""
  width=""
  height=""

  case "$content_type" in
    video)
      probe_media_metadata "$dest_path"
      duration="$MEDIA_DURATION"
      bitrate="$MEDIA_BITRATE"
      width="$MEDIA_WIDTH"
      height="$MEDIA_HEIGHT"
      ;;
    audio)
      probe_media_metadata "$dest_path"
      duration="$MEDIA_DURATION"
      bitrate="$MEDIA_BITRATE"
      ;;
    image)
      probe_image_dimensions "$dest_path"
      width="$MEDIA_WIDTH"
      height="$MEDIA_HEIGHT"
      ;;
  esac

  bitrate=$(to_integer "$bitrate")
  width=$(to_integer "$width")
  height=$(to_integer "$height")

  sql_file_size=$(number_or_null "$file_size")
  sql_duration=$(number_or_null "$duration")
  sql_bitrate=$(number_or_null "$bitrate")
  sql_width=$(number_or_null "$width")
  sql_height=$(number_or_null "$height")

  SQL_STATEMENTS+=$'\n'"INSERT INTO userContents (contentCode, userCode, contentType, fileName, filePath, mimeType, fileSize, duration, bitrate, width, height, isVisible, createdAt, updatedAt) VALUES($(sql_quote "$content_code"), $(sql_quote "$USER_CODE"), $(sql_quote "$content_type"), $(sql_quote "$file_name"), $(sql_quote "$relative_path"), $(sql_quote "$mime_type"), ${sql_file_size}, ${sql_duration}, ${sql_bitrate}, ${sql_width}, ${sql_height}, 1, $(sql_quote "$NOW"), $(sql_quote "$NOW"));"

done < <(find "$CONTENT_SRC_DIR" -type f -print0)

SQL_STATEMENTS+=$'\nCOMMIT;'

echo "Inserting metadata into ${CONTENTS_DB}..."
printf '%s\n' "$SQL_STATEMENTS" | sqlite3 "$CONTENTS_DB"

echo "Copy completed to ${USERDATA_BASE}/${USER_ID}/content."
