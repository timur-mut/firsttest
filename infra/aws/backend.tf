terraform {
  backend "s3" {
    bucket = "firsttest-tfstate-998948942669"
    key    = "infra/aws/terraform.tfstate"
    region = "eu-north-1"
  }
}
