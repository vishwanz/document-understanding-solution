# Agentic Readiness Analysis Report

**Target**: document-understanding-solution
**Date**: 2025-07-15
**Analyzed by**: AWS Transform Custom — Agentic Readiness Analysis
**Repository Type**: application
**Service Archetype**: stateful-crud (auto-detected)
**Agent Scope**: read-only
**Archetype Justification**: The application owns persistent state (DynamoDB documents table, Elasticsearch index, S3 document storage), exposes CRUD endpoints via API Gateway (create/list/delete/search documents), and manages document lifecycle with status tracking (IN_PROGRESS → SUCCEEDED).

**Surface flags**:
- has_persistent_data_store: true
- has_http_rpc_surface: true
- has_auth_surface: true
- has_write_operations: true
- has_logging_of_user_data: true

---

## Readiness Profile: Pilot-Ready (Safety Concerns)

**BLOCKERs**: 0 | **RISK-SAFETY**: 9 | **RISK-QUALITY**: 11 | **INFOs**: 11

This repo has 0 BLOCKER findings and 9 RISK-SAFETY findings. Rule matched: "0 BLOCKER, ≥3 RISK-SAFETY → Pilot-Ready (Safety Concerns)".

Supervised pilot with elevated safety oversight: (1) all Pilot-Ready controls apply, (2) prioritize RISK-SAFETY remediation before expanding agent scope, (3) dedicated safety review cadence, (4) agent restricted to lowest-blast-radius operations until RISK-SAFETY count drops below 3.

---

## Summary

| Severity | Count |
|----------|-------|
| BLOCKER | 0 |
| RISK-SAFETY | 9 |
| RISK-QUALITY | 11 |
| INFO | 11 |
| N/A | 0 |
| Not Evaluated (extended) | 1 |
| **Total** | **43** |

**Core Questions Evaluated**: 25
**Extended Questions Triggered**: 17
**Extended Questions Not Triggered**: 1
**Questions N/A (repo_type: application)**: 0
**Service Archetype**: stateful-crud (auto-detected)

---

## BLOCKERs — Must Resolve Before Agent Deployment

No BLOCKERs identified.

---

## RISKs

### RISK-SAFETY — Must Address for Agent Safety

#### AUTH-Q3: Action-Level Authorization — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Finding**: All authenticated users (Cognito-authenticated) share a single IAM role (`textract-cognito-authenticated-role`) with identical API access. The API Gateway authorizer validates the Cognito JWT but does not differentiate between read and write permissions. Any authenticated caller can invoke GET, POST, and DELETE on all endpoints.
- **Gap**: No mechanism to allow an agent read-only API access while restricting destructive operations (DELETE /document) to human operators.
- **Compensating Controls**:
  - Implement a read-only agent scope at the API Gateway level using resource policies or a custom authorizer that checks a scope claim
  - Use Cognito groups with different IAM roles attached via identity pool role mappings
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Configure Cognito User Pool groups (e.g., "agent-readonly", "human-admin") and map them to separate IAM roles via the Identity Pool role mapping rules. Apply method-level authorization in API Gateway.
- **Evidence**: source/lib/cdk-textract-stack.ts (CfnIdentityPoolRoleAttachment — single "authenticated" role)

#### AUTH-Q4: Identity Propagation and Delegation — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Finding**: The API Gateway extracts the Cognito JWT but the Lambda functions do not propagate caller identity to downstream service calls (Textract, Comprehend, Elasticsearch, Lambda-to-Lambda). Internal calls use Lambda execution role credentials. There is no distinction between agent-as-self and agent-on-behalf-of-user.
- **Gap**: No identity propagation through internal service calls. Cannot distinguish whether an operation was initiated by an agent or a human user at the downstream service level.
- **Compensating Controls**:
  - Log the caller identity (sub claim from JWT) in the API processor Lambda before routing to downstream services
  - Pass the user identity as a custom header through internal service calls
- **Remediation Timeline**: 60–90 days
- **Recommendation**: Extract the `sub` and `email` claims from the Cognito JWT in the API processor Lambda and propagate them as metadata through SQS messages and DynamoDB records. Include the originating identity in all audit-relevant log entries.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py (no user identity extraction from JWT claims)

#### AUTH-Q6: Immutable Audit Logging ⚡ — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Conditional**: agent_scope is "read-only" — evaluated as RISK-SAFETY
- **Finding**: API Gateway access logging is configured with JSON standard fields (requestId, identity, httpMethod, resourcePath) to CloudWatch Logs. However, no CloudTrail configuration exists in the CDK stack. CloudWatch logs are not configured with immutable storage (no S3 export with object lock, no log group retention policy with protection).
- **Gap**: Logs are append-only in CloudWatch but not immutable or tamper-evident. No CloudTrail trail configured in IaC. Admin users could delete log groups.
- **Compensating Controls**:
  - Enable CloudTrail in the account (may exist at org level outside this stack)
  - Export CloudWatch logs to S3 with object lock enabled
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Add a CloudTrail trail to the CDK stack configured to log API Gateway and Lambda data events, with log file validation enabled and delivery to an S3 bucket with object lock.
- **Evidence**: source/lib/cdk-textract-stack.ts (DUSApiLogGroup — no retention policy, no export; no aws_cloudtrail resource)

#### STATE-Q1: Compensation and Rollback ⚡ — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Conditional**: agent_scope is "read-only" — evaluated as RISK-SAFETY
- **Finding**: The document processing pipeline (DynamoDB Streams → SQS → Lambda → Textract → S3/ES indexing) has no compensation or rollback logic. If processing fails mid-pipeline, partial outputs remain (DynamoDB record with IN_PROGRESS status, partial S3 objects). DLQs capture failed messages but do not trigger rollback of previously completed steps.
- **Gap**: No saga pattern, no compensating transactions, no explicit undo endpoints. A failed processing run leaves orphaned records.
- **Compensating Controls**:
  - DLQs provide error capture for manual investigation
  - The JobErrorHandler Lambda marks documents as failed (status update) but does not clean up partial outputs
- **Remediation Timeline**: 60–90 days
- **Recommendation**: Implement a cleanup Lambda triggered by the DLQ that removes partial outputs (S3 objects, DynamoDB output records, ES index entries) when a document processing run fails.
- **Evidence**: source/lambda/joberrorhandler/lambda_function.py, source/lib/cdk-textract-stack.ts (DLQ configuration)

#### STATE-Q4: Circuit Breakers and Resilience — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Finding**: The application relies on boto3's default retry behavior (configured to max_attempts=30 in AwsHelper) for all external service calls (Textract, Comprehend, Elasticsearch, S3, DynamoDB). No circuit breaker pattern, no exponential backoff beyond boto3 defaults, no timeout configuration on HTTP clients beyond Lambda function timeout.
- **Gap**: No circuit breaker to prevent cascading failures when downstream services (Textract, Elasticsearch) are degraded. 30 retry attempts with no circuit-open state could exhaust Lambda timeout and SQS visibility timeout simultaneously.
- **Compensating Controls**:
  - Lambda function timeouts (60–900s) act as an upper bound on retry duration
  - SQS DLQs capture messages that exceed maxReceiveCount (3)
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Implement circuit breaker logic for Elasticsearch and Textract calls using a library like `circuitbreaker` (Python). Configure exponential backoff with jitter for retries.
- **Evidence**: source/lambda/helper/python/helper.py (AwsHelper — max_attempts=30, no circuit breaker)

#### STATE-Q5: Rate Limiting and Throttling — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Finding**: Lambda reserved concurrency (30) provides a global throttle on concurrent API requests. However, no per-caller rate limiting exists. The API Gateway explicitly does NOT configure a usage plan (cfn_nag suppression W64: "No usage plan intended"). No rate limiting middleware in Lambda code.
- **Gap**: No per-caller/per-identity rate limiting. A single caller (agent or user) can consume all 30 concurrent execution slots. No API key-based usage plan or throttling configuration.
- **Compensating Controls**:
  - Lambda concurrency limit prevents total system overload
  - API Gateway inherent AWS account throttle limits apply
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Create an API Gateway Usage Plan with throttle settings (e.g., 100 requests/second burst, 50 sustained). Associate API keys with the usage plan for per-caller tracking.
- **Evidence**: source/lib/cdk-textract-stack.ts (cfn_nag suppression "No usage plan intended", reservedConcurrentExecutions: 30)

#### DATA-Q1: Sensitive Data Classification ⚡ — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Conditional**: agent_scope is "read-only" — evaluated as RISK-SAFETY
- **Finding**: The system stores user-uploaded documents (PDF, PNG, JPEG) in S3 and document metadata in DynamoDB. Documents could contain any sensitive content (PII, PHI, financial data). Stage A = Yes (persistent data store with user-specific content). B1: API responses return document metadata only (documentId, bucketName, objectName, documentStatus) — no sensitive fields exposed directly. B2: No access control differentiation — all authenticated users have identical access to all documents regardless of ownership.
- **Gap**: B2 fires: No mechanism to restrict which documents an agent can access based on ownership, classification, or sensitivity level. All authenticated callers can list and retrieve any document.
- **Compensating Controls**:
  - Limit agent scope to read metadata only (not S3 document content)
  - Implement row-level access control in the API processor based on caller identity
- **Remediation Timeline**: 60–90 days
- **Recommendation**: Add document ownership (creator user ID) to the DynamoDB table and implement access filtering in the API processor Lambda so agents can only access documents they own or are explicitly shared with them.
- **Evidence**: source/lambda/helper/python/datastore.py (getDocuments — unfiltered table scan), source/lambda/apiprocessor/lambda_function.py (no user-scoped filtering)

#### DATA-Q2: Data Residency and Sovereignty ⚡ — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Conditional**: agent_scope is "read-only" — evaluated as RISK-SAFETY
- **Finding**: The system deploys to a single AWS region (configurable at deploy time) and data does not replicate cross-region. However, there is no documentation or configuration addressing data residency requirements. User-uploaded documents could contain regulated data (GDPR, HIPAA) with no classification or residency awareness.
- **Gap**: No data residency controls, no classification of whether stored documents are subject to sovereignty requirements. An agent reading document content and sending it to an LLM endpoint in another region could violate residency requirements without any guard.
- **Compensating Controls**:
  - Deploy the solution and the LLM endpoint in the same region
  - Implement data classification at upload time to flag residency-sensitive documents
- **Remediation Timeline**: 60–90 days
- **Recommendation**: Document data residency requirements for the deployment. Add document classification metadata at upload time. Configure the agent to use region-local LLM endpoints (e.g., Amazon Bedrock in the same region).
- **Evidence**: source/lib/cdk-textract-stack.ts (no cross-region replication, no residency controls), source/lambda/helper/python/datastore.py (no residency metadata)

#### DATA-Q6: PII Redaction in Logs — RISK-SAFETY

- **Severity**: RISK-SAFETY
- **Finding**: Lambda functions use `print()` statements to log full event payloads, request bodies, and DynamoDB scan results. The API processor redacts HTTP headers but not request body content. Document IDs, S3 object names (which may contain user names or PII in filenames), and document metadata are logged without filtering.
- **Gap**: No PII masking or log scrubbing. Document names, user-specific paths, and full DynamoDB responses are logged to CloudWatch without redaction.
- **Compensating Controls**:
  - Restrict CloudWatch log access to operators only
  - Set short log retention periods to limit exposure window
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Implement structured logging with a log utility that applies PII filtering. Redact S3 object names and document metadata from production logs. Configure CloudWatch log group retention policies (e.g., 30 days).
- **Evidence**: source/lambda/apiprocessor/lambda_function.py (line: `print("Redacted Event: {}".format(redactHeadersFromLambdaEvent(event)))`), source/lambda/syncprocessor/lambda_function.py (line: `print("Request: {}".format(request))`)

### RISK-QUALITY — Address as Capacity Allows

#### API-Q2: Machine-Readable API Specification — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: No OpenAPI, AsyncAPI, GraphQL schema, or Smithy specification files exist in the repository. The API is defined programmatically in CDK code (apigateway.LambdaRestApi with manually added resources and methods).
- **Gap**: Agent tool generation requires manual analysis of CDK code and Lambda handlers. No machine-readable spec for automated tool binding.
- **Compensating Controls**:
  - Generate an OpenAPI spec from the deployed API Gateway (export feature)
  - Manually author tool definitions from the CDK route definitions
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Export the OpenAPI specification from the deployed API Gateway or add `@aws-cdk/aws-apigateway` model definitions to generate a spec at deploy time.
- **Evidence**: No files matching openapi.*, swagger.*, *.graphql, *.smithy found in repository

#### API-Q3: Structured Error Responses — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: Error responses return HTTP 400 with unstructured string messages (e.g., "Bad request, documentId is not valid", "Bad request, object key does not exist in bucket"). No error code field, no retryable indicator, no field-level validation details. The Lambda always returns statusCode 200 in the response structure regardless of the actual error.
- **Gap**: Agent cannot distinguish retriable errors from terminal errors. No machine-readable error taxonomy. Status code is always 200 (even for errors — the error is in the body).
- **Compensating Controls**:
  - Agent-side error parsing based on response body content
  - Wrapper layer that normalizes errors before presenting to agent
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Implement a structured error response format: `{"error": {"code": "VALIDATION_ERROR", "message": "...", "field": "documentId", "retryable": false}}`. Fix the Lambda to return proper HTTP status codes.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py (return block always uses statusCode: 200, error messages are plain strings)

#### HITL-Q3: Sandbox/Staging Environment — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: No separate staging or sandbox environment configuration exists. The CI/CD pipeline deploys directly to a single stack (DUS). No docker-compose for local testing. No seed data generators beyond sample document uploads.
- **Gap**: No production-equivalent environment where agents can be tested safely. First-time agent testing must occur against the production deployment.
- **Compensating Controls**:
  - Deploy a second CDK stack with a different stack name for testing
  - Use the read-only mode (isROMode parameter) for safer agent testing
- **Remediation Timeline**: 60–90 days
- **Recommendation**: Create a `staging` CDK context that deploys a separate stack with reduced capacity for agent testing. Include synthetic test documents.
- **Evidence**: source/package.json (single stack configuration, no staging scripts), deployment/document-understanding-solution.template (single pipeline, no multi-environment)

#### DATA-Q5: Temporal Metadata and Freshness — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: Documents have `documentCreatedOn` and `documentCompletedOn` timestamps stored as UTC strings (`str(datetime.datetime.utcnow())`). However, no freshness signaling exists in API responses (no Cache-Control headers, no `X-Data-Age`, no consistency_level field).
- **Gap**: Timestamps exist but agents cannot determine data freshness from API responses. No signal for cached vs. authoritative data.
- **Compensating Controls**:
  - Agents can compare documentCompletedOn against current time to assess staleness
  - Add Cache-Control headers at the API Gateway level
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Add `Last-Modified` and `Cache-Control` response headers. Include `documentCompletedOn` in all document response payloads.
- **Evidence**: source/lambda/helper/python/datastore.py (documentCreatedOn, documentCompletedOn fields), source/lambda/apiprocessor/lambda_function.py (no freshness headers in response)

#### DISC-Q1: Schema Versioning and API Contracts — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: No API versioning exists (no /v1/ URL patterns, no Accept-Version headers). No schema files, no breaking change detection in CI. No consumer-driven contract tests. The API surface can change with any CDK deployment without notice.
- **Gap**: Agent tool schemas break silently when the API changes. No mechanism to detect breaking changes before deployment.
- **Compensating Controls**:
  - Pin agent tool definitions to specific deployment versions
  - Manual validation of API changes before deployment
- **Remediation Timeline**: 60–90 days
- **Recommendation**: Add API versioning (URL path or header-based). Implement OpenAPI spec generation in CI with diff-based breaking change detection (e.g., `openapi-diff`).
- **Evidence**: source/lib/cdk-textract-stack.ts (API resource definitions with no versioning), no contract test files found

#### OBS-Q1: Distributed Tracing and Structured Logging — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: X-Ray tracing is ACTIVE on all Lambda functions (`tracing: lambda.Tracing.ACTIVE`). API Gateway access logs use JSON format with standard fields. However, Lambda function logs use unstructured `print()` statements — not JSON structured logs. No correlation_id or request_id is propagated from API Gateway into Lambda log entries.
- **Gap**: Tracing exists (X-Ray) but application logs are unstructured. Cannot correlate API Gateway request ID with Lambda execution logs without manual trace lookup.
- **Compensating Controls**:
  - X-Ray provides end-to-end trace correlation
  - API Gateway access logs provide request-level audit
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Replace `print()` with a structured logging library (e.g., `aws-lambda-powertools` Python) that emits JSON logs with X-Ray trace ID and API Gateway request ID as correlation fields.
- **Evidence**: source/lib/cdk-textract-stack.ts (tracing: lambda.Tracing.ACTIVE), source/lambda/syncprocessor/lambda_function.py (print() statements)

#### OBS-Q2: Alerting on Error Rates and Latency — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: No CloudWatch alarms are configured in the CDK stack. No anomaly detection, no PagerDuty/OpsGenie integration. The only monitoring is passive (CloudWatch logs and X-Ray traces available for manual inspection).
- **Gap**: No automated alerting when API error rates spike or latency degrades. Agent-initiated failures would go undetected until manually noticed.
- **Compensating Controls**:
  - CloudWatch Insights queries for ad-hoc investigation
  - X-Ray service map for visual monitoring
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Add CloudWatch alarms for API Gateway 4xx/5xx error rates, Lambda error rates, DLQ message count > 0, and P99 latency thresholds.
- **Evidence**: source/lib/cdk-textract-stack.ts (no aws_cloudwatch_alarm or CfnAlarm resources)

#### ENG-Q1: Infrastructure Governance — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: Infrastructure is defined as CDK code (TypeScript). CI/CD pipeline (CodePipeline + CodeBuild) deploys changes automatically from CodeCommit. However, no drift detection is configured (no AWS Config rules). No explicit peer review requirement in the pipeline (CodeCommit → CodePipeline triggers automatically on push to master).
- **Gap**: No drift detection. No mandatory peer review gate before infrastructure changes deploy. Changes to master branch deploy automatically without approval.
- **Compensating Controls**:
  - CodeCommit branch policies can be added for PR requirements
  - CDK diff can be run manually before deployment
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Add a manual approval stage in CodePipeline before the Deploy stage. Configure AWS Config rules for drift detection on API Gateway and IAM resources.
- **Evidence**: deployment/document-understanding-solution.template (DevCodePipeline — no approval stage), source/lib/cdk-textract-stack.ts (no AWS Config resources)

#### ENG-Q2: CI/CD with API Contract Testing — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: CodePipeline + CodeBuild pipeline exists and deploys via `yarn deploy-all`. The build runs minimal tests (`bash bin/run-tests.sh` — 2 Python unit tests). No API contract testing, no OpenAPI validation, no consumer-driven contract tests (Pact), no schema comparison.
- **Gap**: API changes are not validated against consumer expectations before deployment. Breaking changes reach production without detection.
- **Compensating Controls**:
  - Manual testing after deployment
  - The 2 Python unit tests validate basic datastore/helper logic
- **Remediation Timeline**: 60–90 days
- **Recommendation**: Add API integration tests to the CodeBuild buildspec that validate endpoint responses. Implement OpenAPI spec generation and diff in CI.
- **Evidence**: deployment/document-understanding-solution.template (buildspec — `yarn deploy-all` with minimal tests), source/test/ (2 Python test files only)

#### ENG-Q3: Rollback Capability — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: No rollback mechanism is configured. No blue/green deployment, no canary releases, no CodeDeploy with automatic rollback triggers. The CDK stack deploys in-place. The only recovery option is re-deploying a previous commit via CodePipeline.
- **Gap**: Cannot roll back to a known-good state within 15–30 minutes if a deployment breaks agent-facing APIs. Recovery requires a new pipeline execution.
- **Compensating Controls**:
  - Re-trigger CodePipeline with a revert commit
  - CDK supports stack rollback on CloudFormation failure (CREATE_FAILED triggers rollback)
- **Remediation Timeline**: 30–60 days
- **Recommendation**: Add a manual approval stage in the pipeline and implement API canary testing. Configure CloudFormation automatic rollback on deployment failure with monitoring.
- **Evidence**: deployment/document-understanding-solution.template (CodePipeline — no rollback configuration), source/lib/cdk-textract-stack.ts (no deployment configuration beyond CDK defaults)

#### ENG-Q4: API Test Coverage — RISK-QUALITY

- **Severity**: RISK-QUALITY
- **Finding**: Test coverage is minimal: 2 Python unit tests (test_datastore.py, test_helper.py) and 1 CDK test (custom-deployment.test.ts). No API integration tests, no endpoint-level tests, no error handling tests. The build script runs `bash bin/run-tests.sh` which executes only the Python unit tests.
- **Gap**: Agent-facing API endpoints have no automated test coverage. Input validation, error responses, and edge cases are untested.
- **Compensating Controls**:
  - Manual testing after deployment
  - Python unit tests cover datastore and helper modules
- **Remediation Timeline**: 60–90 days
- **Recommendation**: Add API integration tests using pytest with mocked AWS services (moto) that validate all endpoints, error responses, and edge cases. Target minimum 80% coverage on API processor Lambda.
- **Evidence**: source/test/test_datastore.py, source/test/test_helper.py (only 2 test files), source/bin/run-tests.sh

---

## INFOs — Architecture and Design Inputs

### API-Q4: Idempotent Write Operations ⚡

- **Severity**: INFO
- **Conditional**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: Write endpoints (POST /document, DELETE /document) do not support idempotency keys. The createDocument operation uses DynamoDB conditional writes (`attribute_not_exists(documentId)`) which prevents duplicate creation for the same documentId but does not provide a caller-supplied idempotency key.
- **Implication**: If agent scope expands to write-enabled, idempotency must be addressed. Current conditional writes provide some protection against duplicate document creation.
- **Recommendation**: When expanding to write scope, implement idempotency key support (e.g., `X-Idempotency-Key` header) for POST operations.
- **Evidence**: source/lambda/helper/python/datastore.py (ConditionExpression='attribute_not_exists(documentId)')

### API-Q5: Structured Response Format

- **Severity**: INFO
- **Finding**: All API responses are JSON with Content-Type: application/json. No XML or binary formats.
- **Implication**: JSON responses are ideal for LLM consumption. No format adaptation needed for agent integration.
- **Recommendation**: No action needed.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py (json.dumps(result), Content-Type: application/json header)

### API-Q7: Event Emission for State Changes

- **Severity**: INFO
- **Finding**: Internal event emission exists: DynamoDB Streams trigger document processing, SNS publishes Textract job completion, SQS carries processing messages. However, no external-facing webhooks or event subscription endpoints are exposed for consumers to subscribe to state changes.
- **Implication**: Agents cannot reactively respond to document processing completion. Must poll GET /document for status changes.
- **Recommendation**: Consider adding an SNS topic or EventBridge rule that publishes document-complete events for external consumers, enabling event-reactive agent patterns.
- **Evidence**: source/lib/cdk-textract-stack.ts (jobCompletionTopic — internal only, DynamoDB Streams)

### API-Q8: Rate Limit Documentation and Headers

- **Severity**: INFO
- **Finding**: No rate limit headers (X-RateLimit-Remaining, Retry-After) are returned in API responses. No usage plan documentation. Lambda concurrency (30) acts as an implicit limit but is not communicated to callers.
- **Implication**: Agents cannot self-throttle based on rate limit feedback. Must implement conservative request pacing externally.
- **Recommendation**: Configure API Gateway usage plans and return standard rate limit headers so agents can self-regulate.
- **Evidence**: source/lib/cdk-textract-stack.ts (cfn_nag W64 suppression: "No usage plan intended"), source/lambda/apiprocessor/lambda_function.py (no rate limit headers in response)

### STATE-Q3: Concurrency Controls ⚡

- **Severity**: INFO
- **Scope-Calibrated**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: DynamoDB conditional writes (ConditionExpression) provide optimistic locking for document creation. No ETags or version fields in API responses.
- **Implication**: If agent scope expands to write-enabled, concurrent agent instances could face race conditions on status updates (no version field check).
- **Recommendation**: When expanding to write scope, add version fields to DynamoDB records and implement optimistic locking with conditional updates on all state transitions.
- **Evidence**: source/lambda/helper/python/datastore.py (ConditionExpression='attribute_not_exists(documentId)')

### STATE-Q6: Blast Radius and Transaction Limits ⚡

- **Severity**: INFO
- **Scope-Calibrated**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: No configurable transaction limits exist. No maximum records per operation, no spend limits, no bulk operation caps beyond the DynamoDB scan page size (25).
- **Implication**: If agent scope expands to write-enabled, an agent could delete all documents without limit (DELETE /document has no batch cap).
- **Recommendation**: When expanding to write scope, implement configurable per-caller limits (e.g., max deletions per session, max documents created per hour).
- **Evidence**: source/lambda/apiprocessor/lambda_function.py (no transaction limits on any operation)

### HITL-Q1: Draft/Pending State ⚡

- **Severity**: INFO
- **Scope-Calibrated**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: Documents have a status lifecycle (IN_PROGRESS → SUCCEEDED/FAILED) managed by the processing pipeline. However, there is no user-facing "draft" or "pending approval" state for document creation — documents enter processing immediately upon creation.
- **Implication**: If agent scope expands to write-enabled, agents would commit documents to processing immediately with no human review opportunity.
- **Recommendation**: When expanding to write scope, add a PENDING_REVIEW status that allows human approval before processing begins.
- **Evidence**: source/lambda/helper/python/datastore.py (documentStatus: 'IN_PROGRESS' set immediately on creation)

### HITL-Q2: Configurable Approval Gates ⚡

- **Severity**: INFO
- **Scope-Calibrated**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: No approval gate mechanism exists. Document creation and deletion execute immediately without any confirmation step.
- **Implication**: If agent scope expands to write-enabled, high-risk operations (bulk delete, bulk upload) execute without human oversight.
- **Recommendation**: When expanding to write scope, implement operation-level approval gates (e.g., require confirmation for DELETE operations via a two-step API pattern).
- **Evidence**: source/lambda/apiprocessor/lambda_function.py (deleteDocument executes immediately without confirmation)

### DATA-Q7: Data Quality Awareness

- **Severity**: INFO
- **Finding**: No data quality metrics, completeness scores, or freshness SLAs exist. Document processing success/failure is tracked (documentStatus) but no quality scoring of extracted data (OCR confidence, entity detection accuracy).
- **Implication**: Agents reasoning on extracted text and entities have no quality signal — cannot determine if OCR output is reliable.
- **Recommendation**: Store Textract confidence scores and Comprehend entity confidence in the output table. Expose aggregate quality metrics via a health endpoint.
- **Evidence**: source/lambda/syncprocessor/lambda_function.py (Textract response processed but confidence not stored separately)

### DISC-Q3: Data Catalog / Metadata Layer

- **Severity**: INFO
- **Finding**: No data catalog (Glue, Collibra, DataHub) or metadata layer exists. Data schema is implicitly defined in DynamoDB table key schema and Lambda code.
- **Implication**: Agent tool builders must reverse-engineer data structures from source code rather than consulting a catalog.
- **Recommendation**: Document the data model (DynamoDB table schemas, S3 prefix structure) in a schema file or README for agent tool developers.
- **Evidence**: source/lib/cdk-textract-stack.ts (DynamoDB table definitions), no data catalog configuration

### OBS-Q3: Business Outcome Metrics

- **Severity**: INFO
- **Finding**: No custom CloudWatch metrics for business outcomes (documents processed per day, processing success rate, average processing time). Only infrastructure metrics (Lambda invocations, errors, duration) are available via default CloudWatch.
- **Implication**: Cannot measure whether agent interactions produce good business outcomes. Must rely on infrastructure metrics as proxy.
- **Recommendation**: Publish custom CloudWatch metrics: documents_processed_total, processing_success_rate, average_processing_duration_seconds.
- **Evidence**: source/lib/cdk-textract-stack.ts (no put_metric_data or custom metric configuration)

---

## Detailed Findings

### 01 — API Surface and Interface Design

#### API-Q1: Documented API Interface
- **Severity**: PASS
- **Finding**: The application exposes a documented REST API via API Gateway with Lambda backend. Routes: GET /search, POST /searchkendra, POST /feedbackkendra, GET /documents, GET|POST|DELETE /document, GET|POST /redact. All routes are authenticated via Cognito. Integration is API-based (no direct database access required by consumers).
- **Gap**: N/A — API surface exists
- **Recommendation**: N/A
- **Evidence**: source/lib/cdk-textract-stack.ts (API Gateway resource definitions), source/lambda/apiprocessor/lambda_function.py (route handler)

#### API-Q2: Machine-Readable API Specification
- **Severity**: RISK-QUALITY
- **Finding**: No OpenAPI, AsyncAPI, GraphQL schema, or Smithy specification files exist. API defined only in CDK code.
- **Gap**: No machine-readable spec for automated agent tool generation.
- **Recommendation**: Export OpenAPI spec from deployed API Gateway or generate from CDK annotations.
- **Evidence**: No spec files found in repository

#### API-Q3: Structured Error Responses
- **Severity**: RISK-QUALITY
- **Finding**: Error responses use unstructured strings. Lambda returns statusCode 200 for all responses (errors encoded in body). No error codes, no retryable indicators.
- **Gap**: Agent cannot programmatically distinguish error types.
- **Recommendation**: Implement structured error format with proper HTTP status codes.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py

#### API-Q4: Idempotent Write Operations ⚡
- **Severity**: INFO
- **Conditional**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: No idempotency keys. DynamoDB conditional writes provide partial protection against duplicate document creation.
- **Gap**: Write endpoints lack idempotency key support.
- **Recommendation**: Address when expanding to write scope.
- **Evidence**: source/lambda/helper/python/datastore.py

#### API-Q5: Structured Response Format
- **Severity**: INFO
- **Finding**: JSON responses with application/json content type. Well-suited for LLM consumption.
- **Gap**: N/A
- **Recommendation**: No action needed.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py

#### API-Q6: Asynchronous Operation Support
- **Severity**: PASS
- **Finding**: Document processing uses async patterns: submit via POST /document, poll status via GET /document. Backend uses SQS queues, DynamoDB Streams, and SNS for async job coordination. Status tracking (IN_PROGRESS → SUCCEEDED) enables polling.
- **Gap**: N/A — async patterns exist
- **Recommendation**: N/A
- **Evidence**: source/lib/cdk-textract-stack.ts (SQS queues, SNS topic), source/lambda/helper/python/datastore.py (status tracking)

#### API-Q7: Event Emission for State Changes
- **Severity**: INFO
- **Finding**: Internal events exist (DynamoDB Streams, SNS, SQS) but no external-facing webhooks or event subscriptions for consumers.
- **Gap**: Agents must poll for state changes rather than subscribing to events.
- **Recommendation**: Add external event notification capability.
- **Evidence**: source/lib/cdk-textract-stack.ts

#### API-Q8: Rate Limit Documentation and Headers
- **Severity**: INFO
- **Finding**: No rate limit headers returned. No usage plan documentation. Implicit Lambda concurrency limit (30) not communicated to callers.
- **Gap**: Agents cannot self-throttle based on rate limit feedback.
- **Recommendation**: Configure usage plan and return rate limit headers.
- **Evidence**: source/lib/cdk-textract-stack.ts

### 02 — Authentication, Authorization, and Identity

#### AUTH-Q1: Machine Identity Authentication
- **Severity**: PASS
- **Finding**: Cognito User Pool with API Gateway COGNITO_USER_POOLS authorizer provides JWT-based authentication. Machine identities can be provisioned as Cognito users (admin-only user creation). API Gateway access logs capture the authenticated principal. The mechanism supports service account patterns via programmatic user creation.
- **Gap**: N/A — authentication mechanism exists and supports machine identity
- **Recommendation**: N/A
- **Evidence**: source/lib/cdk-textract-stack.ts (CfnUserPool, CfnAuthorizer), API Gateway JSON access logging

#### AUTH-Q2: Scoped Permissions (Least Privilege)
- **Severity**: PASS
- **Finding**: The authorization model supports scoped permissions. Each Lambda function has its own execution role with specific, differentiated permissions. The Cognito authenticated role has targeted S3 bucket access (not wildcard). IAM policies demonstrate scope differentiation (e.g., syncProcessor gets textract:DetectDocumentText while asyncProcessor gets textract:StartDocumentTextDetection).
- **Gap**: N/A — scoped permission model exists
- **Recommendation**: N/A
- **Evidence**: source/lib/cdk-textract-stack.ts (per-Lambda IAM policies, cognitoPolicy with specific bucket ARNs)

#### AUTH-Q3: Action-Level Authorization
- **Severity**: RISK-SAFETY
- **Finding**: All authenticated users share a single role with identical API access. No action-level differentiation at the API surface.
- **Gap**: Cannot restrict agent to read operations while allowing humans full CRUD access.
- **Recommendation**: Implement Cognito groups with role-based API method restrictions.
- **Evidence**: source/lib/cdk-textract-stack.ts (single authenticated role, no method-level auth)

#### AUTH-Q4: Identity Propagation and Delegation
- **Severity**: RISK-SAFETY
- **Finding**: No identity propagation through internal service calls. Lambda functions use IAM roles, not caller identity, for downstream calls.
- **Gap**: Cannot distinguish agent-initiated vs. human-initiated operations at the downstream level.
- **Recommendation**: Extract JWT claims in API processor and propagate caller identity through the processing pipeline.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py

#### AUTH-Q5: Credential Management
- **Severity**: PASS
- **Finding**: Service-to-service communication uses IAM execution roles (no static credentials). No hardcoded passwords, API keys, or secrets in source code. The .env file contains non-secret configuration (pool IDs, API gateway URL, region). Lambda environment variables contain resource names, not credentials.
- **Gap**: N/A — IAM role-based authentication is the gold standard
- **Recommendation**: N/A
- **Evidence**: source/lib/cdk-textract-stack.ts (Lambda environment variables — bucket names, table names only), source/.env

#### AUTH-Q6: Immutable Audit Logging ⚡
- **Severity**: RISK-SAFETY
- **Conditional**: agent_scope is "read-only" — evaluated as RISK-SAFETY
- **Finding**: API Gateway JSON access logging configured. No CloudTrail. No immutable log storage.
- **Gap**: Logs are not immutable or tamper-evident.
- **Recommendation**: Add CloudTrail with log file validation and S3 object lock.
- **Evidence**: source/lib/cdk-textract-stack.ts

#### AUTH-Q7: Agent Identity Suspension
- **Severity**: PASS
- **Finding**: Cognito User Pool supports immediate user disabling via AdminDisableUser API. Admin-only user creation ensures controlled identity lifecycle. Individual agent identities (created as Cognito users) can be suspended without affecting other users.
- **Gap**: N/A — mechanism exists via Cognito admin APIs
- **Recommendation**: N/A
- **Evidence**: source/lib/cdk-textract-stack.ts (CfnUserPool with adminCreateUserConfig: allowAdminCreateUserOnly: true)

### 03 — State Management and Transactional Integrity

#### STATE-Q1: Compensation and Rollback ⚡
- **Severity**: RISK-SAFETY
- **Conditional**: agent_scope is "read-only" — evaluated as RISK-SAFETY
- **Finding**: No saga/compensation pattern. DLQs capture failed messages but no rollback of completed steps.
- **Gap**: Multi-step processing failures leave partial state.
- **Recommendation**: Implement cleanup Lambda triggered by DLQ messages.
- **Evidence**: source/lib/cdk-textract-stack.ts (DLQs), source/lambda/joberrorhandler/lambda_function.py

#### STATE-Q2: Queryable Current State
- **Severity**: PASS
- **Finding**: GET /documents returns paginated list with document status. GET /document returns individual document metadata including documentStatus. Agents can inspect state before taking action.
- **Gap**: N/A — queryable state endpoints exist
- **Recommendation**: N/A
- **Evidence**: source/lambda/apiprocessor/lambda_function.py, source/lambda/helper/python/datastore.py (getDocuments, getDocument)

#### STATE-Q3: Concurrency Controls ⚡
- **Severity**: INFO
- **Scope-Calibrated**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: DynamoDB conditional writes provide some concurrency protection for document creation.
- **Gap**: No ETags or version fields for API-level optimistic locking.
- **Recommendation**: Address when expanding to write scope.
- **Evidence**: source/lambda/helper/python/datastore.py

#### STATE-Q4: Circuit Breakers and Resilience
- **Severity**: RISK-SAFETY
- **Finding**: No circuit breaker pattern. Boto3 retry with max_attempts=30. No exponential backoff configuration.
- **Gap**: Cascading failure risk when downstream services degrade.
- **Recommendation**: Implement circuit breaker library for Elasticsearch and Textract calls.
- **Evidence**: source/lambda/helper/python/helper.py

#### STATE-Q5: Rate Limiting and Throttling
- **Severity**: RISK-SAFETY
- **Finding**: Lambda concurrency limit (30) provides global throttle only. No per-caller rate limiting. No usage plan.
- **Gap**: Single caller can consume all capacity.
- **Recommendation**: Add API Gateway usage plan with per-key throttling.
- **Evidence**: source/lib/cdk-textract-stack.ts

#### STATE-Q6: Blast Radius and Transaction Limits ⚡
- **Severity**: INFO
- **Scope-Calibrated**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: No transaction limits configured.
- **Gap**: No per-caller business operation caps.
- **Recommendation**: Address when expanding to write scope.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py

#### STATE-Q7: Graceful Degradation Signaling
- **Severity**: Not Evaluated (extended)
- **Finding**: Extended question not triggered for this service. Archetype: `stateful-crud`, agent_scope: `read-only`.
- **Trigger**: Service is P0 priority OR is on the critical path
- **Gap**: Not evaluated
- **Recommendation**: Not evaluated
- **Evidence**: Not evaluated

### 04 — Human-in-the-Loop and Approval Workflows

#### HITL-Q1: Draft/Pending State ⚡
- **Severity**: INFO
- **Scope-Calibrated**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: Documents enter IN_PROGRESS immediately upon creation. No draft/pending state for human review.
- **Gap**: No reviewable intermediate state before processing.
- **Recommendation**: Address when expanding to write scope.
- **Evidence**: source/lambda/helper/python/datastore.py

#### HITL-Q2: Configurable Approval Gates ⚡
- **Severity**: INFO
- **Scope-Calibrated**: agent_scope is "read-only" — evaluated as INFO
- **Finding**: No approval gate mechanism. Operations execute immediately.
- **Gap**: No human approval step configurable per operation.
- **Recommendation**: Address when expanding to write scope.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py

#### HITL-Q3: Sandbox/Staging Environment
- **Severity**: RISK-QUALITY
- **Finding**: No staging environment configuration. Single deployment stack.
- **Gap**: No safe environment for agent testing.
- **Recommendation**: Create a separate CDK context for staging.
- **Evidence**: source/package.json, deployment/document-understanding-solution.template

### 05 — Data Accessibility and Quality

#### DATA-Q1: Sensitive Data Classification ⚡
- **Severity**: RISK-SAFETY
- **Conditional**: agent_scope is "read-only" — evaluated as RISK-SAFETY
- **Finding**: System stores user documents. B1: API returns metadata only (CLEAR). B2: No access differentiation — all users access all documents (RISK-SAFETY). B3: No classification metadata (INFO).
- **Gap**: B2 fires — no mechanism to restrict document access by caller identity or sensitivity level.
- **Recommendation**: Add document ownership and implement access filtering.
- **Evidence**: source/lambda/helper/python/datastore.py, source/lambda/apiprocessor/lambda_function.py

#### DATA-Q2: Data Residency and Sovereignty ⚡
- **Severity**: RISK-SAFETY
- **Conditional**: agent_scope is "read-only" — evaluated as RISK-SAFETY
- **Finding**: Single-region deployment with no residency controls or documentation. Documents could contain regulated data.
- **Gap**: No data residency awareness for agent-accessed data.
- **Recommendation**: Document residency requirements and configure region-local LLM endpoints.
- **Evidence**: source/lib/cdk-textract-stack.ts

#### DATA-Q3: Selective Query Support
- **Severity**: PASS
- **Finding**: GET /documents supports pagination (pageSize=25, nextToken cursor). GET /search supports keyword filtering. Elasticsearch provides full-text search with result limiting.
- **Gap**: N/A — pagination and filtering exist
- **Recommendation**: N/A
- **Evidence**: source/lambda/helper/python/datastore.py (Limit=pageSize, ExclusiveStartKey), source/lambda/apiprocessor/search.py

#### DATA-Q4: Input Validation and Schema Enforcement
- **Severity**: PASS
- **Finding**: Systematic input validation exists: documentId alphanumeric validation, nextToken validation, S3 object existence check before document creation. Invalid inputs return HTTP 400 with descriptive messages.
- **Gap**: N/A — input validation exists at API boundary
- **Recommendation**: Enhance error response structure (see API-Q3).
- **Evidence**: source/lambda/apiprocessor/lambda_function.py (validate_get_documents_request, validate_get_document_request, validate_create_document_request)

#### DATA-Q5: Temporal Metadata and Freshness
- **Severity**: RISK-QUALITY
- **Finding**: Timestamps (documentCreatedOn, documentCompletedOn) stored as UTC strings. No freshness signaling in API responses.
- **Gap**: No Cache-Control or freshness indicators in responses.
- **Recommendation**: Add response headers signaling data freshness.
- **Evidence**: source/lambda/helper/python/datastore.py

#### DATA-Q6: PII Redaction in Logs
- **Severity**: RISK-SAFETY
- **Finding**: Lambda functions log full requests and DynamoDB responses without PII filtering. Document names and metadata logged unmasked.
- **Gap**: No PII masking or log scrubbing.
- **Recommendation**: Implement structured logging with PII filtering.
- **Evidence**: source/lambda/apiprocessor/lambda_function.py, source/lambda/syncprocessor/lambda_function.py

#### DATA-Q7: Data Quality Awareness
- **Severity**: INFO
- **Finding**: No data quality metrics or completeness scores.
- **Gap**: No quality signal for extracted data reliability.
- **Recommendation**: Store and expose Textract confidence scores.
- **Evidence**: source/lambda/syncprocessor/lambda_function.py

### 06 — Discoverability and Semantic Readiness

#### DISC-Q1: Schema Versioning and API Contracts
- **Severity**: RISK-QUALITY
- **Finding**: No API versioning, no schema files, no breaking change detection in CI.
- **Gap**: Agent tool schemas break silently on API changes.
- **Recommendation**: Add API versioning and breaking change detection.
- **Evidence**: source/lib/cdk-textract-stack.ts

#### DISC-Q2: Semantically Meaningful Field Names
- **Severity**: PASS
- **Finding**: Field names are human-readable and semantically meaningful: documentId, bucketName, objectName, documentStatus, documentCreatedOn, documentCompletedOn. No legacy abbreviations or codes.
- **Gap**: N/A — field names are clear
- **Recommendation**: N/A
- **Evidence**: source/lambda/helper/python/datastore.py (field names)

#### DISC-Q3: Data Catalog / Metadata Layer
- **Severity**: INFO
- **Finding**: No data catalog or metadata layer. Data schema implicitly defined in code.
- **Gap**: No discoverable data documentation for tool builders.
- **Recommendation**: Document data model in schema files.
- **Evidence**: No Glue catalog, DataHub, or schema documentation files found

### 07 — Observability of Target Systems

#### OBS-Q1: Distributed Tracing and Structured Logging
- **Severity**: RISK-QUALITY
- **Finding**: X-Ray tracing ACTIVE. API Gateway JSON access logs. But Lambda logs use unstructured print(). No correlation ID propagation.
- **Gap**: Cannot correlate requests across API Gateway and Lambda without X-Ray trace lookup.
- **Recommendation**: Use aws-lambda-powertools for structured JSON logging with trace correlation.
- **Evidence**: source/lib/cdk-textract-stack.ts, source/lambda/syncprocessor/lambda_function.py

#### OBS-Q2: Alerting on Error Rates and Latency
- **Severity**: RISK-QUALITY
- **Finding**: No CloudWatch alarms configured. No anomaly detection. Passive monitoring only.
- **Gap**: No automated alerting for agent-impacting degradation.
- **Recommendation**: Add CloudWatch alarms for error rates, latency, and DLQ depth.
- **Evidence**: source/lib/cdk-textract-stack.ts

#### OBS-Q3: Business Outcome Metrics
- **Severity**: INFO
- **Finding**: No custom business metrics published. Only default Lambda/API Gateway metrics.
- **Gap**: Cannot measure business impact of agent interactions.
- **Recommendation**: Publish custom metrics for document processing outcomes.
- **Evidence**: source/lib/cdk-textract-stack.ts

### 08 — Engineering and Deployment Maturity

#### ENG-Q1: Infrastructure Governance
- **Severity**: RISK-QUALITY
- **Finding**: CDK IaC exists. CodePipeline CI/CD exists. No drift detection. No mandatory peer review before deployment.
- **Gap**: Incomplete governance — missing drift detection and review gates.
- **Recommendation**: Add approval stage and AWS Config drift detection.
- **Evidence**: deployment/document-understanding-solution.template, source/lib/cdk-textract-stack.ts

#### ENG-Q2: CI/CD with API Contract Testing
- **Severity**: RISK-QUALITY
- **Finding**: Pipeline exists but runs minimal tests. No API contract testing or breaking change detection.
- **Gap**: API breaking changes not caught before deployment.
- **Recommendation**: Add API integration tests and OpenAPI diff in CI.
- **Evidence**: deployment/document-understanding-solution.template, source/test/

#### ENG-Q3: Rollback Capability
- **Severity**: RISK-QUALITY
- **Finding**: No rollback mechanism configured. In-place CDK deployment only.
- **Gap**: Cannot quickly roll back broken deployments.
- **Recommendation**: Add deployment monitoring and automatic rollback triggers.
- **Evidence**: deployment/document-understanding-solution.template

#### ENG-Q4: API Test Coverage
- **Severity**: RISK-QUALITY
- **Finding**: Minimal test coverage — 2 Python unit tests, no API tests, no integration tests.
- **Gap**: Agent-facing APIs have no automated test coverage.
- **Recommendation**: Add comprehensive API test suite using moto for AWS service mocking.
- **Evidence**: source/test/test_datastore.py, source/test/test_helper.py

#### ENG-Q5: Encryption at Rest
- **Severity**: PASS
- **Finding**: All persistent data stores are encrypted at rest: S3 buckets (S3_MANAGED encryption), DynamoDB tables (serverSideEncryption: true), Elasticsearch (KMS with key rotation), SQS queues (KMS_MANAGED). KMS keys have enableKeyRotation: true.
- **Gap**: N/A — encryption at rest is comprehensive
- **Recommendation**: N/A — consider upgrading from S3_MANAGED to customer-managed KMS keys for S3 buckets if compliance requires.
- **Evidence**: source/lib/cdk-textract-stack.ts (BucketEncryption.S3_MANAGED, serverSideEncryption: true, encryptionAtRestOptions: { enabled: true, kmsKeyId }, QueueEncryption.KMS_MANAGED)

---

## Evidence Index

### Infrastructure as Code
| File | Questions Referenced |
|------|---------------------|
| source/lib/cdk-textract-stack.ts | API-Q1, API-Q2, API-Q6, API-Q7, API-Q8, AUTH-Q1, AUTH-Q2, AUTH-Q3, AUTH-Q5, AUTH-Q6, AUTH-Q7, STATE-Q1, STATE-Q4, STATE-Q5, DATA-Q2, OBS-Q1, OBS-Q2, OBS-Q3, ENG-Q1, ENG-Q3, ENG-Q5, DISC-Q1 |
| deployment/document-understanding-solution.template | HITL-Q3, ENG-Q1, ENG-Q2, ENG-Q3, ENG-Q4 |

### Source Code
| File | Questions Referenced |
|------|---------------------|
| source/lambda/apiprocessor/lambda_function.py | API-Q1, API-Q3, API-Q4, API-Q5, API-Q8, AUTH-Q4, STATE-Q6, HITL-Q2, DATA-Q1, DATA-Q4, DATA-Q6 |
| source/lambda/helper/python/datastore.py | API-Q4, STATE-Q2, STATE-Q3, DATA-Q1, DATA-Q3, DATA-Q5, HITL-Q1, DISC-Q2 |
| source/lambda/helper/python/helper.py | STATE-Q4 |
| source/lambda/syncprocessor/lambda_function.py | DATA-Q6, DATA-Q7, OBS-Q1 |
| source/lambda/joberrorhandler/lambda_function.py | STATE-Q1 |

### CI/CD Configurations
| File | Questions Referenced |
|------|---------------------|
| deployment/document-understanding-solution.template | ENG-Q1, ENG-Q2, ENG-Q3 |

### Dependency Manifests
| File | Questions Referenced |
|------|---------------------|
| source/package.json | HITL-Q3 |

### Test Files
| File | Questions Referenced |
|------|---------------------|
| source/test/test_datastore.py | ENG-Q4 |
| source/test/test_helper.py | ENG-Q4 |
