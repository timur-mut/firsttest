# A small dedicated VPC with two PRIVATE subnets across two AZs.
# - RDS lives in these private subnets (never exposed to the internet).
# - App Runner reaches RDS through a VPC connector attached to the same subnets.
# No Internet/NAT gateway is needed: App Runner's inbound traffic is managed by
# AWS, it pulls the image from ECR on the AWS side, and the app only talks to RDS.

data "aws_availability_zones" "available" {
  state = "available"
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.project}-vpc" }
}

resource "aws_subnet" "private" {
  count             = 2
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = { Name = "${var.project}-private-${count.index}" }
}

resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${var.project}-private-rt" }
}

resource "aws_route_table_association" "private" {
  count          = length(aws_subnet.private)
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private.id
}

# --- Security groups ----------------------------------------------------------

# Attached to the App Runner VPC connector (the app's egress side).
resource "aws_security_group" "apprunner" {
  name        = "${var.project}-apprunner-sg"
  description = "App Runner egress to RDS"
  vpc_id      = aws_vpc.main.id

  egress {
    description = "All outbound (only RDS is reachable in this VPC)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.project}-apprunner-sg" }
}

# Attached to RDS; only allows Postgres traffic from the App Runner SG.
resource "aws_security_group" "rds" {
  name        = "${var.project}-rds-sg"
  description = "Postgres access from App Runner only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "Postgres from App Runner"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.apprunner.id]
  }

  tags = { Name = "${var.project}-rds-sg" }
}
