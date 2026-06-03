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
