output "portfolio_bucket_name" {
  description = "Name of the S3 bucket that stores the portfolio files."
  value       = aws_s3_bucket.portfolio.id
}

output "portfolio_bucket_arn" {
  description = "Amazon Resource Name of the portfolio S3 bucket."
  value       = aws_s3_bucket.portfolio.arn
}

output "cloudfront_distribution_id" {
  description = "Identifier used to manage and invalidate the CloudFront distribution."
  value       = aws_cloudfront_distribution.portfolio.id
}

output "cloudfront_domain_name" {
  description = "AWS-generated domain name for the CloudFront distribution."
  value       = aws_cloudfront_distribution.portfolio.domain_name
}

output "portfolio_url" {
  description = "HTTPS address of the AWS-hosted portfolio."
  value       = "https://${aws_cloudfront_distribution.portfolio.domain_name}"
}