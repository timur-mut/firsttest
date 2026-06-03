variable "region" {
  description = "AWS region for the API, database, and supporting resources."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Short name used to prefix all resource names."
  type        = string
  default     = "firsttest"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC."
  type        = string
  default     = "10.20.0.0/16"
}

# --- Database -----------------------------------------------------------------
variable "db_name" {
  description = "Initial PostgreSQL database name."
  type        = string
  default     = "firsttest"
}

variable "db_username" {
  description = "Master username for the PostgreSQL instance."
  type        = string
  default     = "firsttest"
}

variable "db_instance_class" {
  description = "RDS instance size. db.t4g.micro is the cheapest burstable option."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Storage (GiB) for the RDS instance."
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "PostgreSQL major.minor version."
  type        = string
  default     = "16.4"
}

# --- API container ------------------------------------------------------------
variable "image_tag" {
  description = "ECR image tag App Runner deploys (the CI workflow pushes :latest)."
  type        = string
  default     = "latest"
}

variable "container_port" {
  description = "Port the API listens on inside the container."
  type        = number
  default     = 8080
}

variable "apprunner_cpu" {
  description = "App Runner vCPU units (1024 = 1 vCPU)."
  type        = string
  default     = "1024"
}

variable "apprunner_memory" {
  description = "App Runner memory in MB."
  type        = string
  default     = "2048"
}

# --- CI / GitHub --------------------------------------------------------------
variable "github_repo" {
  description = "GitHub repo in 'owner/name' form, used to scope the OIDC deploy role. Leave empty to skip creating CI resources."
  type        = string
  default     = ""
}
