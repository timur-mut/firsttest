output "region" {
  description = "AWS region everything is deployed in."
  value       = var.region
}

output "api_url" {
  description = "Public HTTPS URL of the App Runner API."
  value       = "https://${aws_apprunner_service.api.service_url}"
}

output "apprunner_service_arn" {
  description = "App Runner service ARN (set as APP_RUNNER_SERVICE_ARN in GitHub)."
  value       = aws_apprunner_service.api.arn
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
  description = "S3 bucket name for the client build (set as S3_BUCKET in GitHub)."
  value       = aws_s3_bucket.client.bucket
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID (set as CLOUDFRONT_DISTRIBUTION_ID in GitHub)."
  value       = aws_cloudfront_distribution.client.id
}

output "rds_endpoint" {
  description = "RDS endpoint (private; reachable only from inside the VPC)."
  value       = aws_db_instance.this.address
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC (set as AWS_ROLE_ARN). Empty if github_repo was not set."
  value       = local.create_ci ? aws_iam_role.github_actions[0].arn : ""
}
