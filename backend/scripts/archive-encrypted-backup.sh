#!/usr/bin/env bash
set -euo pipefail

archive=${1:?Encrypted backup path required}
: "${BACKUP_S3_BUCKET:?Set the independent backup bucket}"
: "${AWS_ACCESS_KEY_ID:?Set the backup storage access key ID}"
: "${AWS_SECRET_ACCESS_KEY:?Set the backup storage secret access key}"
: "${GITHUB_RUN_ID:?GitHub run ID required}"
: "${GITHUB_RUN_ATTEMPT:?GitHub run attempt required}"

aws_options=()
if [[ -n ${BACKUP_S3_ENDPOINT:-} ]]; then
  if [[ $BACKUP_S3_ENDPOINT != https://* ]]; then
    echo "The backup storage endpoint must use HTTPS." >&2
    exit 1
  fi
  aws_options+=(--endpoint-url "$BACKUP_S3_ENDPOINT")
fi

umask 077
download_dir=$(mktemp -d)
trap 'rm -rf -- "$download_dir"' EXIT
object="s3://$BACKUP_S3_BUCKET/ladies-first/$(date -u +%F)/$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT.pgdump.enc"

aws "${aws_options[@]}" s3 cp "$archive" "$object" --only-show-errors
aws "${aws_options[@]}" s3 cp "$object" "$download_dir/backup.enc" --only-show-errors
cmp -s "$archive" "$download_dir/backup.enc" || {
  echo "The downloaded encrypted backup differs from the source archive." >&2
  exit 1
}
echo "Independent encrypted backup uploaded and verified byte for byte."
