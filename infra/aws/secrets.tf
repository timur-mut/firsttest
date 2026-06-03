# Store the full Npgsql connection string in Secrets Manager. App Runner injects
# it into the container as the ConnectionStrings__Postgres environment variable,
# so the secret never appears in Terraform state outputs or the task definition.

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

resource "aws_secretsmanager_secret" "db_conn" {
  name        = "${var.project}/db-connection-string"
  description = "Npgsql connection string for the FirstTest API"
}

resource "aws_secretsmanager_secret_version" "db_conn" {
  secret_id     = aws_secretsmanager_secret.db_conn.id
  secret_string = local.connection_string
}
