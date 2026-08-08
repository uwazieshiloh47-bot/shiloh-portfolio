locals {
  github_repository_owner    = "uwazieshiloh47-bot"
  github_repository_owner_id = "258136748"
  github_repository_name     = "shiloh-portfolio"
  github_repository_id       = "1314528041"
  github_deployment_branch   = "main"

  # New GitHub repositories include immutable owner and repository IDs in
  # their default OIDC subject so renames cannot transfer AWS trust.
  github_oidc_subject = "repo:${local.github_repository_owner}@${local.github_repository_owner_id}/${local.github_repository_name}@${local.github_repository_id}:ref:refs/heads/${local.github_deployment_branch}"
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
        local.github_oidc_subject,
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
