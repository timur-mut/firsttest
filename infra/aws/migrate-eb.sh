#!/usr/bin/env bash
#
# Migrate the AWS Terraform from App Runner to Elastic Beanstalk.
# Run from the REPO ROOT:  bash infra/aws/migrate-eb.sh
# It rewrites files under infra/aws/ and does NOT touch terraform state.

set -euo pipefail
D="infra/aws"
[ -d "$D" ] || { echo "Run this from the repo root (infra/aws not found)."; exit 1; }

echo "Removing App Runner / Secrets Manager files..."
rm -f "$D/apprunner.tf" "$D/secrets.tf"

echo "Writing network.tf..."
cat > "$D/network.tf" <<'TF'
# VPC with PRIVATE subnets (RDS) and PUBLIC subnets (the Beanstalk instance).
# The single Beanstalk EC2 instance needs a public IP so it is reachable and can
# pull the image from ECR; RDS stays private and only accepts traffic from it.

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = { Name = "${var.project}-vpc" }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-igw" }
}

# --- Private subnets (database) ----------------------------------------------
resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]
  tags              = { Name = "${var.project}-private-${count.index}" }
}

# --- Public subnets (app instance) -------------------------------------------
resource "aws_subnet" "public" {
  count                   = 2
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(var.vpc_cidr, 8, count.index + 10)
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true
  tags                    = { Name = "${var.project}-public-${count.index}" }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }
  tags = { Name = "${var.project}-public-rt" }
}

resource "aws_route_table_association" "public" {
  count          = length(aws_subnet.public)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# --- Security groups ----------------------------------------------------------
# The Beanstalk EC2 instance: allow inbound HTTP from anywhere (the API), all out.
resource "aws_security_group" "app" {
  name        = "${var.project}-app-sg"
  description = "Beanstalk instance: inbound HTTP, all outbound"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-app-sg" }
}

# RDS: only Postgres, only from the app instance.
resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "Postgres access from the app instance only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from app"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  tags = { Name = "${var.project}-rds-sg" }
}
TF

echo "Writing rds.tf..."
cat > "$D/rds.tf" <<'TF'
# Managed PostgreSQL, private. Backups disabled to stay within the free plan
# (raise db_backup_retention after upgrading the account if you want PITR).

resource "random_password" "db" {
  length  = 24
  special = false
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-db-subnets"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "${var.project}-db-subnets" }
}

resource "aws_db_instance" "this" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage = var.db_allocated_storage
  storage_type      = "gp2"
  storage_encrypted = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period = var.db_backup_retention
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true

  tags = { Name = "${var.project}-db" }
}
TF

echo "Writing beanstalk.tf..."
cat > "$D/beanstalk.tf" <<'TF'
# Elastic Beanstalk single-instance Docker environment running the ECR image,
# fronted by CloudFront so the API is reachable over HTTPS (free-tier friendly).

locals {
  connection_string = join(";", [
    "Host=${aws_db_instance.this.address}",
    "Port=${aws_db_instance.this.port}",
    "Database=${var.db_name}",
    "Username=${var.db_username}",
    "Password=${random_password.db.result}",
    "SSL Mode=Require",
    "Trust Server Certificate=true",
  ])
}

# --- Source bundle: a Dockerrun.aws.json pointing at the ECR image ------------
resource "aws_s3_bucket" "eb_versions" {
  bucket_prefix = "${var.project}-eb-versions-"
  force_destroy = true
}

resource "aws_s3_object" "dockerrun" {
  bucket = aws_s3_bucket.eb_versions.id
  key    = "dockerrun-${var.image_tag}.json"
  content = jsonencode({
    AWSEBDockerrunVersion = "1"
    Image = {
      Name   = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
      Update = "true"
    }
    Ports = [{ ContainerPort = var.container_port, HostPort = 80 }]
  })
}

# --- IAM: instance profile (pull from ECR + standard web tier) ----------------
data "aws_iam_policy_document" "ec2_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eb_instance" {
  name               = "${var.project}-eb-instance"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume.json
}

resource "aws_iam_role_policy_attachment" "eb_webtier" {
  role       = aws_iam_role.eb_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier"
}

resource "aws_iam_role_policy_attachment" "eb_ecr" {
  role       = aws_iam_role.eb_instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_instance_profile" "eb" {
  name = "${var.project}-eb-instance-profile"
  role = aws_iam_role.eb_instance.name
}

# --- IAM: Beanstalk service role ---------------------------------------------
data "aws_iam_policy_document" "eb_service_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["elasticbeanstalk.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "eb_service" {
  name               = "${var.project}-eb-service"
  assume_role_policy = data.aws_iam_policy_document.eb_service_assume.json
}

resource "aws_iam_role_policy_attachment" "eb_service_health" {
  role       = aws_iam_role.eb_service.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSElasticBeanstalkEnhancedHealth"
}

resource "aws_iam_role_policy_attachment" "eb_service_updates" {
  role       = aws_iam_role.eb_service.name
  policy_arn = "arn:aws:iam::aws:policy/AWSElasticBeanstalkManagedUpdatesCustomerRolePolicy"
}

# --- The application + environment -------------------------------------------
data "aws_elastic_beanstalk_solution_stack" "docker" {
  most_recent = true
  name_regex  = "running Docker$"
}

resource "aws_elastic_beanstalk_application" "api" {
  name = "${var.project}-api"
}

resource "aws_elastic_beanstalk_application_version" "api" {
  name        = "${var.project}-${var.image_tag}-${substr(aws_s3_object.dockerrun.etag, 0, 8)}"
  application = aws_elastic_beanstalk_application.api.name
  bucket      = aws_s3_bucket.eb_versions.id
  key         = aws_s3_object.dockerrun.key
}

resource "aws_elastic_beanstalk_environment" "api" {
  name                = "${var.project}-api"
  application         = aws_elastic_beanstalk_application.api.name
  solution_stack_name = data.aws_elastic_beanstalk_solution_stack.docker.name
  version_label       = aws_elastic_beanstalk_application_version.api.name

  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "EnvironmentType"
    value     = "SingleInstance"
  }
  setting {
    namespace = "aws:elasticbeanstalk:environment"
    name      = "ServiceRole"
    value     = aws_iam_role.eb_service.arn
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "IamInstanceProfile"
    value     = aws_iam_instance_profile.eb.name
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "InstanceType"
    value     = var.instance_type
  }
  setting {
    namespace = "aws:autoscaling:launchconfiguration"
    name      = "SecurityGroups"
    value     = aws_security_group.app.id
  }
  setting {
    namespace = "aws:ec2:vpc"
    name      = "VPCId"
    value     = aws_vpc.main.id
  }
  setting {
    namespace = "aws:ec2:vpc"
    name      = "Subnets"
    value     = join(",", aws_subnet.public[*].id)
  }
  setting {
    namespace = "aws:ec2:vpc"
    name      = "AssociatePublicIpAddress"
    value     = "true"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application"
    name      = "Application Healthcheck URL"
    value     = "/health"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ASPNETCORE_ENVIRONMENT"
    value     = "Production"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "RunMigrationsOnStartup"
    value     = "true"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "Cors__AllowedOrigins"
    value     = "https://${aws_cloudfront_distribution.client.domain_name}"
  }
  setting {
    namespace = "aws:elasticbeanstalk:application:environment"
    name      = "ConnectionStrings__Postgres"
    value     = local.connection_string
  }

  depends_on = [aws_db_instance.this]
}

# --- CloudFront in front of the API for HTTPS --------------------------------
resource "aws_cloudfront_distribution" "api" {
  enabled = true
  comment = "${var.project} api"

  origin {
    domain_name = aws_elastic_beanstalk_environment.api.cname
    origin_id   = "eb-api"
    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    target_origin_id       = "eb-api"
    viewer_protocol_policy  = "redirect-to-https"
    allowed_methods         = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods          = ["GET", "HEAD"]
    # CachingDisabled + AllViewerExceptHostHeader (managed policies).
    cache_policy_id          = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
    origin_request_policy_id = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  price_class = "PriceClass_100"
}
TF

echo "Writing outputs.tf..."
cat > "$D/outputs.tf" <<'TF'
output "region" {
  description = "AWS region everything is deployed in."
  value       = var.region
}

output "api_url" {
  description = "Public HTTPS URL of the API (CloudFront in front of Beanstalk)."
  value       = "https://${aws_cloudfront_distribution.api.domain_name}"
}

output "beanstalk_env" {
  description = "Elastic Beanstalk environment name."
  value       = aws_elastic_beanstalk_environment.api.name
}

output "beanstalk_cname" {
  description = "Beanstalk environment hostname (HTTP origin behind CloudFront)."
  value       = aws_elastic_beanstalk_environment.api.cname
}

output "ecr_repository_url" {
  description = "ECR repo URL to push the API image to."
  value       = aws_ecr_repository.api.repository_url
}

output "client_url" {
  description = "Public URL of the React client (CloudFront)."
  value       = "https://${aws_cloudfront_distribution.client.domain_name}"
}

output "client_bucket" {
  description = "S3 bucket name for the client build."
  value       = aws_s3_bucket.client.bucket
}

output "cloudfront_distribution_id" {
  description = "Client CloudFront distribution ID."
  value       = aws_cloudfront_distribution.client.id
}

output "rds_endpoint" {
  description = "RDS endpoint (private)."
  value       = aws_db_instance.this.address
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC (empty if github_repo unset)."
  value       = local.create_ci ? aws_iam_role.github_actions[0].arn : ""
}
TF

echo "Writing github_oidc.tf..."
cat > "$D/github_oidc.tf" <<'TF'
# GitHub Actions OIDC deploy role. Created only when var.github_repo is set.

locals {
  create_ci = var.github_repo != ""
}

resource "aws_iam_openid_connect_provider" "github" {
  count           = local.create_ci ? 1 : 0
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_assume" {
  count = local.create_ci ? 1 : 0
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github[0].arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:*"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  count              = local.create_ci ? 1 : 0
  name               = "${var.project}-github-actions"
  assume_role_policy = data.aws_iam_policy_document.github_assume[0].json
}

data "aws_iam_policy_document" "github_deploy" {
  count = local.create_ci ? 1 : 0

  statement {
    sid       = "EcrAuth"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }
  statement {
    sid = "EcrPush"
    actions = [
      "ecr:BatchCheckLayerAvailability", "ecr:CompleteLayerUpload",
      "ecr:InitiateLayerUpload", "ecr:PutImage", "ecr:UploadLayerPart",
      "ecr:BatchGetImage", "ecr:GetDownloadUrlForLayer",
    ]
    resources = [aws_ecr_repository.api.arn]
  }
  # Beanstalk deploys (create app version + update env) and read-only describes.
  statement {
    sid       = "Beanstalk"
    actions   = ["elasticbeanstalk:*"]
    resources = ["*"]
  }
  statement {
    sid = "BeanstalkSupporting"
    actions = [
      "autoscaling:Describe*", "ec2:Describe*", "cloudformation:Describe*",
      "cloudformation:GetTemplate", "elasticloadbalancing:Describe*",
      "s3:PutObject", "s3:GetObject", "s3:ListBucket",
    ]
    resources = ["*"]
  }
  statement {
    sid       = "PassEbRoles"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.eb_instance.arn, aws_iam_role.eb_service.arn]
  }
  statement {
    sid       = "ClientObjects"
    actions   = ["s3:PutObject", "s3:DeleteObject", "s3:ListBucket"]
    resources = [aws_s3_bucket.client.arn, "${aws_s3_bucket.client.arn}/*"]
  }
  statement {
    sid       = "CloudFrontInvalidate"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.client.arn, aws_cloudfront_distribution.api.arn]
  }
}

resource "aws_iam_role_policy" "github_deploy" {
  count  = local.create_ci ? 1 : 0
  name   = "${var.project}-github-deploy"
  role   = aws_iam_role.github_actions[0].id
  policy = data.aws_iam_policy_document.github_deploy[0].json
}
TF

echo "Patching variables.tf (add db_backup_retention + instance_type if missing)..."
grep -q 'db_backup_retention' "$D/variables.tf" || cat >> "$D/variables.tf" <<'TF'

variable "db_backup_retention" {
  description = "RDS automated backup retention in days. 0 disables backups (free-plan friendly)."
  type        = number
  default     = 0
}

variable "instance_type" {
  description = "EC2 instance type for the Beanstalk environment (t3.micro is free-tier eligible)."
  type        = string
  default     = "t3.micro"
}
TF

echo
echo "Done. Review with:  terraform -chdir=$D fmt && terraform -chdir=$D validate"
echo "Then deploy with:   terraform -chdir=$D apply"
