# AWS deployment (Terraform)

Deploys the FirstTest app to AWS:

- **API** → AWS App Runner (runs the existing Docker image, auto-scaling, managed HTTPS)
- **Database** → Amazon RDS for PostgreSQL (private)
- **Client** → S3 + CloudFront (static React build on a CDN)
- **CI** → GitHub Actions authenticates via OIDC (no stored AWS keys)

The API reaches the private database through an App Runner **VPC connector**; the
connection string is stored in **Secrets Manager** and injected as
`ConnectionStrings__Postgres`. The API runs its DbUp migrations on startup, so the
schema is created automatically the first time it boots.

```
Internet ──HTTPS──> CloudFront ──> S3 (React build)
Internet ──HTTPS──> App Runner (API) ──VPC connector──> RDS PostgreSQL (private)
                         └── reads ConnectionStrings__Postgres from Secrets Manager
```

## Prerequisites

- An AWS account and the **AWS CLI** configured (`aws configure`) with admin-ish rights for the first apply.
- **Terraform** >= 1.6
- **Docker** (to build and push the API image)
- The GitHub repo for this project (for the CI deploy role)

> Region defaults to `us-east-1`. Change it via `region` in `terraform.tfvars`.

## One-time setup

```bash
cd infra/aws
cp terraform.tfvars.example terraform.tfvars   # then edit: set github_repo = "owner/name"
terraform init
```

### Step 1 — create the ECR repository first

App Runner needs an image to exist before it can start, so create just the
registry, push an image, then apply the rest.

```bash
terraform apply -target=aws_ecr_repository.api
```

### Step 2 — build and push the API image

```bash
# From the repo root (note the trailing dot = build context):
ECR_URL=$(terraform -chdir=infra/aws output -raw ecr_repository_url)
AWS_REGION=$(terraform -chdir=infra/aws output -raw region 2>/dev/null || echo us-east-1)

aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "${ECR_URL%/*}"

# IMPORTANT on Apple Silicon (M-series): build for the platform App Runner runs.
docker build --platform linux/amd64 \
  -f src/FirstTest.Api/Dockerfile \
  -t "$ECR_URL:latest" .

docker push "$ECR_URL:latest"
```

### Step 3 — apply everything else

```bash
cd infra/aws
terraform apply
```

This creates the VPC, RDS, Secrets Manager entry, App Runner service, S3 +
CloudFront, and the GitHub OIDC role. Note the outputs:

```bash
terraform output
```

### Step 4 — deploy the client the first time

The client build needs the API URL baked in. Build and upload it once:

```bash
API_URL=$(terraform -chdir=infra/aws output -raw api_url)
BUCKET=$(terraform -chdir=infra/aws output -raw client_bucket)
DIST_ID=$(terraform -chdir=infra/aws output -raw cloudfront_distribution_id)

cd client
VITE_API_URL="$API_URL" npm ci && VITE_API_URL="$API_URL" npm run build
aws s3 sync dist "s3://$BUCKET" --delete
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*"
```

Open the `client_url` output in your browser — the app should load and talk to the API.

## Continuous deployment (GitHub Actions)

`.github/workflows/deploy-aws.yml` builds/pushes the API to ECR and the client to
S3/CloudFront on every push to `main`. Set these as **repository variables**
(Settings → Secrets and variables → Actions → Variables) using the Terraform outputs:

| GitHub variable               | Value (from `terraform output`)      |
| ----------------------------- | ------------------------------------ |
| `AWS_REGION`                  | your region, e.g. `us-east-1`        |
| `AWS_ROLE_ARN`                | `github_actions_role_arn`            |
| `ECR_REPOSITORY`              | `firsttest-api` (the repo name)      |
| `APP_RUNNER_SERVICE_ARN`      | `apprunner_service_arn`              |
| `S3_BUCKET`                   | `client_bucket`                      |
| `CLOUDFRONT_DISTRIBUTION_ID`  | `cloudfront_distribution_id`         |
| `VITE_API_URL`                | `api_url`                            |

After that, pushing to `main` deploys automatically. (You can delete the old
Azure workflows `deploy.yml` and `azure-static-web-apps.yml` once you're happy.)

## Costs (rough, us-east-1)

App Runner bills per vCPU/GB while running; RDS `db.t4g.micro` and the S3/CloudFront
traffic for a small app are the other line items. Expect a low-double-digit
monthly cost at idle. To tear everything down:

```bash
cd infra/aws
terraform destroy
```

## Notes

- **RDS is private** by design — there's no public endpoint. The API connects over
  the VPC connector. To inspect the database directly later, add a bastion host or
  temporarily flip `publicly_accessible`; ask and I can wire up a secure option.
- **Secrets** never land in Terraform outputs; only the secret ARN is referenced.
- `skip_final_snapshot` and `deletion_protection=false` are set for easy teardown
  during testing — tighten both before any real production use.
