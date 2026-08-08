variable "aws_region" {
  description = "AWS region where the portfolio S3 bucket will be stored."
  type        = string
  default     = "us-east-2"
}

variable "project_name" {
  description = "Name used to identify and tag the portfolio's resources."
  type        = string
  default     = "ShilohPortfolio"
}

variable "environment" {
  description = "Deployment environment represented by this infrastructure."
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}