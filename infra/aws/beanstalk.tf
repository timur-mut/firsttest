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
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
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
