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
