# --- IAM: role App Runner uses to PULL the image from ECR ---------------------
data "aws_iam_policy_document" "apprunner_build_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_ecr_access" {
  name               = "${var.project}-apprunner-ecr-access"
  assume_role_policy = data.aws_iam_policy_document.apprunner_build_assume.json
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# --- IAM: role the running container assumes (to read the DB secret) ----------
data "aws_iam_policy_document" "apprunner_instance_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_instance" {
  name               = "${var.project}-apprunner-instance"
  assume_role_policy = data.aws_iam_policy_document.apprunner_instance_assume.json
}

data "aws_iam_policy_document" "apprunner_secrets" {
  statement {
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.db_conn.arn]
  }
}

resource "aws_iam_role_policy" "apprunner_secrets" {
  name   = "${var.project}-apprunner-secrets"
  role   = aws_iam_role.apprunner_instance.id
  policy = data.aws_iam_policy_document.apprunner_secrets.json
}

# --- VPC connector: lets App Runner reach RDS inside the VPC ------------------
resource "aws_apprunner_vpc_connector" "this" {
  vpc_connector_name = "${var.project}-conn"
  subnets            = aws_subnet.private[*].id
  security_groups    = [aws_security_group.apprunner.id]
}

# --- The API service ----------------------------------------------------------
resource "aws_apprunner_service" "api" {
  service_name = "${var.project}-api"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    # Redeploy automatically whenever a new :latest image is pushed.
    auto_deployments_enabled = true

    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:${var.image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = tostring(var.container_port)

        runtime_environment_variables = {
          ASPNETCORE_ENVIRONMENT = "Production"
          RunMigrationsOnStartup = "true"
          # Allow the CloudFront-hosted client to call the API (CORS).
          Cors__AllowedOrigins = "https://${aws_cloudfront_distribution.client.domain_name}"
        }

        runtime_environment_secrets = {
          "ConnectionStrings__Postgres" = aws_secretsmanager_secret.db_conn.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.apprunner_cpu
    memory            = var.apprunner_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.this.arn
    }
  }

  depends_on = [
    aws_db_instance.this,
    aws_secretsmanager_secret_version.db_conn,
  ]
}
