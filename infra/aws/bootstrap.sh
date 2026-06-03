#!/usr/bin/env bash
#
# First-deploy bootstrap for the FirstTest app on AWS.
#
# Handles the one ordering quirk (App Runner needs an image before it can start):
#   1. create the ECR repository
#   2. build the linux/amd64 API image and push it
#   3. apply the rest of the infrastructure
#   4. build the React client and publish it to S3 + CloudFront
#
# Safe to re-run. Terraform shows a plan and asks for confirmation before each apply.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$SCRIPT_DIR"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

bold() { printf '\n\033[1m==> %s\033[0m\n' "$1"; }

# --- Prerequisites -----------------------------------------------------------
bold "Checking prerequisites"
for cmd in aws terraform docker; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "Missing required tool: $cmd"; exit 1; }
done
aws sts get-caller-identity >/dev/null 2>&1 || {
  echo "AWS CLI is not authenticated. Run 'aws configure' first."; exit 1; }
docker info >/dev/null 2>&1 || {
  echo "Docker daemon not reachable. Start Docker Desktop and retry."; exit 1; }
echo "OK: aws, terraform, docker all present and authenticated."

# --- Terraform init ----------------------------------------------------------
bold "terraform init"
terraform -chdir="$TF_DIR" init -input=false

# --- Step 1: ECR repository --------------------------------------------------
bold "Step 1/4 - create the ECR repository"
terraform -chdir="$TF_DIR" apply -target=aws_ecr_repository.api

ECR_URL="$(terraform -chdir="$TF_DIR" output -raw ecr_repository_url)"
REGION="$(terraform -chdir="$TF_DIR" output -raw region)"
REGISTRY="${ECR_URL%/*}"

# --- Step 2: build & push the API image --------------------------------------
bold "Step 2/4 - build & push API image to $ECR_URL"
aws ecr get-login-password --region "$REGION" \
  | docker login --username AWS --password-stdin "$REGISTRY"

docker build --platform linux/amd64 \
  -f "$REPO_ROOT/src/FirstTest.Api/Dockerfile" \
  -t "$ECR_URL:latest" \
  "$REPO_ROOT"

docker push "$ECR_URL:latest"

# --- Step 3: apply the rest --------------------------------------------------
bold "Step 3/4 - apply remaining infrastructure (VPC, RDS, App Runner, S3, CloudFront)"
terraform -chdir="$TF_DIR" apply

# --- Step 4: build & publish the client --------------------------------------
API_URL="$(terraform -chdir="$TF_DIR" output -raw api_url)"
BUCKET="$(terraform -chdir="$TF_DIR" output -raw client_bucket)"
DIST_ID="$(terraform -chdir="$TF_DIR" output -raw cloudfront_distribution_id)"

if command -v npm >/dev/null 2>&1; then
  bold "Step 4/4 - build & publish the React client"
  ( cd "$REPO_ROOT/client" \
      && VITE_API_URL="$API_URL" npm ci \
      && VITE_API_URL="$API_URL" npm run build )
  aws s3 sync "$REPO_ROOT/client/dist" "s3://$BUCKET" --delete
  aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" >/dev/null
  echo "Client published."
else
  bold "Step 4/4 - skipped (npm not found)"
  echo "Install Node, then build/publish the client manually (see README)."
fi

# --- Summary -----------------------------------------------------------------
bold "Done"
echo "API:    $API_URL"
echo "Client: $(terraform -chdir="$TF_DIR" output -raw client_url)"
echo
echo "Quick check:  curl $API_URL/health"
