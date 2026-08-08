locals {
  github_repository        = "uwazieshiloh47-bot/shiloh-portfolio"
  github_deployment_branch = "main"
}

resource "aws_iam_openid_connect_provider" "github_actions" {
  url = "https://token.actions.githubusercontent.com"

  client_id_list = [
    "sts.amazonaws.com",
  ]
}

data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    sid     = "AllowGitHubMainBranch"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type = "Federated"

      identifiers = [
        aws_iam_openid_connect_provider.github_actions.arn,
      ]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"

      values = [
        "repo:${local.github_repository}:ref:refs/heads/${local.github_deployment_branch}",
      ]
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  name                 = "shiloh-portfolio-github-deploy-${var.environment}"
  description          = "Allows the portfolio main branch to deploy static files through GitHub Actions."
  assume_role_policy   = data.aws_iam_policy_document.github_actions_trust.json
  max_session_duration = 3600
}

data "aws_iam_policy_document" "github_actions_deploy" {
  statement {
    sid    = "InspectPortfolioBucket"
    effect = "Allow"

    actions = [
      "s3:GetBucketLocation",
      "s3:ListBucket",
    ]

    resources = [
      aws_s3_bucket.portfolio.arn,
    ]
  }

  statement {
    sid    = "DeployPortfolioObjects"
    effect = "Allow"

    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]

    resources = [
      "${aws_s3_bucket.portfolio.arn}/*",
    ]
  }

  statement {
    sid    = "InvalidatePortfolioDistribution"
    effect = "Allow"

    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
    ]

    resources = [
      aws_cloudfront_distribution.portfolio.arn,
    ]
  }
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name   = "portfolio-static-deployment"
  role   = aws_iam_role.github_actions_deploy.id
  policy = data.aws_iam_policy_document.github_actions_deploy.json
}

output "github_actions_deploy_role_arn" {
  description = "IAM role assumed by the portfolio deployment workflow."
  value       = aws_iam_role.github_actions_deploy.arn
}