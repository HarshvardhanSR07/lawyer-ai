# Deploying LawyerAI from GitHub to Amazon ECS

The repository includes a GitHub Actions workflow at `.github/workflows/deploy-ecs.yml`. Each push to `main`, or a manual workflow dispatch, builds the root `Dockerfile`, pushes the image to Amazon ECR, renders the ECS task definition, and waits for the service rollout to stabilize.

## Required AWS infrastructure

Create an ECR repository, an ECS Fargate cluster, an ECS service, an Application Load Balancer target group, a CloudWatch log group, and the two IAM roles referenced by `.aws/task-definition.json`. Configure the ECS service with `desiredCount: 1` or greater so that the Node process and its private long-lived FastAPI child do not scale to zero. The load balancer health check must use `GET /health` on port `3000` and accept HTTP `200`.

> The task definition intentionally keeps FastAPI on private port `8000` and exposes only Node on port `3000`. The public Node health endpoint forwards the private FastAPI readiness result, so an ECS task becomes healthy only after both processes are ready.

The checked-in task definition is a template. Before its first deployment, replace these placeholders with AWS resources in the same region: `REPLACE_WITH_ECS_TASK_EXECUTION_ROLE_ARN`, `REPLACE_WITH_LAWYER_AI_TASK_ROLE_ARN`, `REPLACE_WITH_CLOUDWATCH_LOG_GROUP`, `REPLACE_WITH_AWS_REGION`, and the `REPLACE_WITH_SECRETS_MANAGER_ARN` prefix. The execution role needs ECR image-pull, CloudWatch Logs, and Secrets Manager read permission. The task role should contain only the runtime permissions LawyerAI needs.

## GitHub deployment configuration

Keep deployment disabled while AWS infrastructure and GitHub configuration are incomplete. Set the `ECS_DEPLOY_ENABLED` Actions variable to `true` only after every required variable and the `AWS_DEPLOY_ROLE_ARN` secret have been configured. Until then, pushes complete without attempting an AWS deployment.

In the GitHub repository, set the following **Actions variables**: `AWS_REGION`, `ECR_REPOSITORY`, `ECS_CLUSTER`, and `ECS_SERVICE`. Add the `AWS_DEPLOY_ROLE_ARN` repository or `production` environment secret. The role must trust GitHub Actions OIDC for this repository and have narrow permissions to push to the specific ECR repository and update the selected ECS service/task definition.

The workflow uses OIDC rather than long-lived `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` values. It therefore avoids storing AWS user credentials in GitHub. Runtime application credentials belong in AWS Secrets Manager and are injected only into the ECS task through the task definition; never add them to GitHub variables, Actions logs, a committed `.env` file, or the Docker image.

| Runtime concern    | Required ECS configuration                                                                                              |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Public service     | Container port `3000`, ALB target group port `3000`, `GET /health` health check                                         |
| Private FastAPI    | `FASTAPI_PORT=8000`; do not create a public listener or target-group mapping for it                                     |
| Always-on behavior | Fargate desired count at least `1`; enable deployment circuit breaker and ECS service stability wait                    |
| Log retention      | CloudWatch log group referenced by `awslogs-group`                                                                      |
| Secrets            | One AWS Secrets Manager JSON secret with fields listed in `.aws/task-definition.json`, or equivalent individual secrets |

## First deployment verification

After all placeholders and GitHub settings are resolved, run **Actions → Deploy LawyerAI to Amazon ECS → Run workflow**. Wait for the workflow’s service-stability step to finish, then request the public load-balancer URL’s `/health` endpoint. A healthy response is HTTP 200. Finally, sign in to LawyerAI and verify a document upload, a verified text response, Rime audio, the fallback avatar, and a live Beyond Presence/LiveKit renderer session.
