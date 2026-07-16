# Modernization Readiness Analysis Report

| Field | Value |
|-------|-------|
| **Repository** | document-understanding-solution |
| **Date** | 2025-07-15 |
| **TD Version** | modernization-readiness-analysis |
| **Repo Type** | application |
| **Service Archetype** | event-processor (auto-detected) |
| **Priority** | — |
| **Tags** | — |
| **Context** | — |
| **Overall Score** | 2.46 / 4.0 |

Repo type defaulted to `application` (not specified in analysis context).

**Archetype Justification**: Primary workload pattern is event-driven document processing — Lambda functions triggered by DynamoDB Streams, SQS queues, and S3 notifications. The API surface (API Gateway) exists but is secondary to the core event-processing pipeline that routes documents through Textract, Comprehend, and Elasticsearch indexing.

**Surface Flags**: has_persistent_data_store=true, has_at_rest_data_surface=true, has_deployed_workload=true, has_api_surface=true, has_multi_instance_deployment=true, has_iac_provisioning_aws_resources=true

---

## Score Summary

| Category | Score | Rating | Severity Status |
|----------|-------|--------|-----------------|
| Infrastructure & DevOps (INF) | 2.73 / 4.0 | 🟡 Partial | Needs Work |
| Application Architecture (APP) | 2.67 / 4.0 | 🟡 Partial | Needs Work |
| Data Platform (DATA) | 3.25 / 4.0 | 🟡 Partial | Needs Work |
| Security Baseline (SEC) | 2.33 / 4.0 | 🟠 Needs Work | Needs Work |
| Operations & Observability (OPS) | 1.33 / 4.0 | ❌ Not Ready | Critical |
| **Overall** | **2.46 / 4.0** | **🟠 Needs Work** | — |

**Scoring Notes**:
- INF: (4+3+2+4+2+3+3+1+3+3+2) / 11 = 30/11 = 2.73
- APP: (2+3+4+4+1+2) / 6 = 16/6 = 2.67
- DATA: (4+3+2+4) / 4 = 13/4 = 3.25
- SEC: (3+4+2+2+2+1) / 6 = 14/6 = 2.33 (SEC-Q1 excluded — Not Evaluated)
- OPS: (4+1+1+1+1+1+1+1+1) / 9 = 12/9 = 1.33
- Overall: (2.73 + 2.67 + 3.25 + 2.33 + 1.33) / 5 = 12.31/5 = 2.46

### Classification

**Tier: 🟠 Remediation Required**

This repo has 2 High findings, 20 Medium findings, 8 Low findings. The matched rule is "2-11 High → Remediation Required." MOD classification maps 1 High to Pilot-Ready (a single modernization gap), whereas ARA maps 1 High to a deployment blocker. With 2 High findings (OPS-Q5 deployment strategy, OPS-Q6 integration testing), this service requires remediation before it can be considered modernization-ready.

Classification consistency check: Score 2.46 falls in the Needs Work band (1.5–2.4), which maps to Remediation Required tier. Count-based tier is also Remediation Required (2 High). **Consistent.**

---

## Top 5 Gaps

| # | Question | Score | Gap Summary | Impact |
|---|----------|-------|-------------|--------|
| 1 | OPS-Q5: Deployment Strategy | 1 | Direct-to-production CDK deploy with no staged rollout | High risk of production incidents with no ability to canary or rollback |
| 2 | OPS-Q6: Integration Testing | 1 | Only 2 basic unit test files; no integration or end-to-end tests in CI | Regressions reach production undetected |
| 3 | INF-Q8: Backup and Recovery | 1 | No backup configuration for DynamoDB (no PITR) or Elasticsearch; S3 versioning disabled | Data loss risk with no recovery path |
| 4 | INF-Q11: CI/CD Automation | 2 | Single-stage CodePipeline (Source→Deploy) with minimal test coverage | Limited quality gates before production |
| 5 | SEC-Q5: Secrets Management | 2 | No Secrets Manager or Vault; config via environment variables with no rotation | No credential rotation or audit trail |

---

## AWS Modernization Pathways

| # | Pathway | Status | Priority | Est. Effort | Key Trigger Criteria |
|---|---------|--------|----------|-------------|---------------------|
| 1 | Move to Cloud Native | Not Triggered | — | — | APP-Q2 = 3 — application already has modular serverless architecture |
| 2 | Move to Containers | Not Triggered | — | — | INF-Q1 = 4 — compute already on Lambda (serverless); container pathway does not apply |
| 3 | Move to Open Source | Not Triggered | — | — | DATA-Q4 = 4 — no stored procedures or proprietary SQL |
| 4 | Move to Managed Databases | Not Triggered | — | — | INF-Q2 = 3 — databases already use managed services (DynamoDB, Elasticsearch Service) |
| 5 | Move to Managed Analytics | Not Triggered | — | — | INF-Q4 = 4 — messaging already on managed services (SQS, SNS); no data processing workloads requiring analytics migration |
| 6 | Move to Modern DevOps | Triggered | High | Medium | INF-Q11 = 2 (primary); OPS-Q5 = 1, OPS-Q6 = 1 (supporting) |
| 7 | Move to AI | Not Triggered | — | — | No AI/agent intent detected in portfolio or service context |

---

### Pathway: Move to Modern DevOps

**Status:** Triggered
**Priority:** High
**Estimated Effort:** Medium

**Current State:**
- **IaC Coverage (INF-Q10 = 3):** Core infrastructure defined in CDK v1, but no operational resources (CloudWatch alarms, backup plans, health checks) in IaC.
- **CI/CD Automation (INF-Q11 = 2):** Custom CloudFormation-based CodePipeline with single-stage Source→Deploy. Inline buildspec runs `npm run run:tests` but no separate test stage, no quality gates, no IaC-specific pipeline.
- **Deployment Strategy (OPS-Q5 = 1):** CDK deploy directly updates production CloudFormation stack. No canary, blue/green, or traffic shifting.
- **Integration Testing (OPS-Q6 = 1):** Only 2 Python unit test files (test_datastore.py, test_helper.py). No API integration tests, no end-to-end tests.

**Recommendations:**
1. Migrate from CDK v1 to CDK v2 (CDK v1 is end-of-life)
2. Implement multi-stage pipeline: Source → Build → Test → Staging → Production
3. Add Lambda traffic shifting (CodeDeploy with Linear10PercentEvery1Minute or Canary10Percent5Minutes)
4. Add integration test suite covering document upload → processing → retrieval workflow
5. Add CloudWatch alarms and dashboards as IaC (CDK constructs)
6. Implement automated rollback on CloudWatch alarm breach

**Representative AWS Services:** CodePipeline, CodeBuild, CodeDeploy (Lambda deployments), CloudFormation, CDK v2, CloudWatch, X-Ray

**Learning Materials:**
- [Move to Modern DevOps](https://skillbuilder.aws/learning-plan/1FGEQKGPQD)
- [Getting Started with DevOps on AWS](https://skillbuilder.aws/learn/R4B13K95YQ)

---

## Detailed Findings

### Infrastructure & DevOps (INF)

#### INF-Q1: Managed Compute

| Field | Value |
|-------|-------|
| **Score** | 4 ✅ Mature |
| **Finding** | All compute workloads run on AWS Lambda (serverless). 12+ Lambda functions handle document processing, API serving, and Kendra integration. CloudFront serves the frontend. No EC2 used for application compute (VPC/EC2 constructs exist only to provide network connectivity to Elasticsearch). |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | source/lib/cdk-textract-stack.ts — all `lambda.Function` definitions with PYTHON_3_8 and JAVA_8 runtimes |

#### INF-Q2: Managed Databases

| Field | Value |
|-------|-------|
| **Score** | 3 🟡 Partial |
| **Finding** | DynamoDB (fully managed, PAY_PER_REQUEST) for document metadata and output storage. Amazon Elasticsearch Service (managed) for search indexing. Both are managed services. However, the non-CICD deployment path deploys Elasticsearch as a single-instance cluster without zone awareness or Multi-AZ failover. |
| **Gap** | Elasticsearch deployed single-AZ in non-CICD mode. Amazon Elasticsearch Service is legacy naming (now OpenSearch Service). |
| **Recommendation** | Migrate from Amazon Elasticsearch Service to Amazon OpenSearch Service. Ensure all deployment paths use zone-awareness with ≥2 AZs for production workloads. |
| **Evidence** | source/lib/cdk-textract-stack.ts — `es.CfnDomain` with `elasticsearchVersion: "7.4"`, `zoneAwarenessEnabled: true` only in CICD path |

#### INF-Q3: Workflow Orchestration

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | This service is an `event-processor`. The document processing pipeline (upload → route → Textract → results → Elasticsearch indexing) is implemented as ad hoc Lambda-to-SQS routing with no dedicated orchestration service. The documentProcessor Lambda acts as a manual router, checking file types and dispatching to sync or async queues. Error handling relies on DLQs and a separate jobErrorHandler Lambda with timeout-based detection. The archetype calibration for `event-processor` Score 2 applies: "Multi-step event processing is ad hoc in handler code." |
| **Gap** | No Step Functions, Temporal, or EventBridge Pipes orchestrating the multi-step document processing workflow. Error recovery is timeout-based rather than orchestrated. |
| **Recommendation** | Adopt AWS Step Functions to orchestrate the document processing pipeline. Benefits: visual workflow monitoring, built-in retry/error handling, parallel processing control, and elimination of timeout-based error detection. |
| **Evidence** | source/lib/cdk-textract-stack.ts — SQS queues with Lambda event sources; source/lambda/documentprocessor/lambda_function.py — manual routing logic |

#### INF-Q4: Async Messaging and Streaming

| Field | Value |
|-------|-------|
| **Score** | 4 ✅ Mature |
| **Finding** | This service is an `event-processor`. The primary input is asynchronous — DynamoDB Streams trigger the documentProcessor, S3 event notifications trigger bulk processing via SQS, and SNS-to-SQS handles Textract job completion callbacks. All messaging uses managed AWS services: SNS (with KMS encryption), SQS (with KMS encryption and DLQs), DynamoDB Streams, and S3 event notifications. Consumer patterns are structured with explicit batch sizes and visibility timeouts. The archetype calibration for `event-processor` Score 4 applies: "Managed event source with structured consumer patterns." |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | source/lib/cdk-textract-stack.ts — SNS Topic with KMS, 7 SQS queues with DLQs and KMS, DynamoDB Stream event source, S3 event notifications |

#### INF-Q5: Network Security

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | VPC with private subnets configured for Lambda functions and Elasticsearch. Security group created for Elasticsearch access. However, the security group has an overly permissive ingress rule: `securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic())` — allowing ALL traffic from ANY IPv4 address. |
| **Gap** | Security group allows 0.0.0.0/0 on all ports. Should be restricted to Lambda security group or specific CIDR ranges. |
| **Recommendation** | Replace `Peer.anyIpv4()` with a self-referencing security group rule or restrict to the VPC CIDR. Use `Peer.ipv4(vpc.vpcCidrBlock)` or reference the Lambda security group directly. |
| **Evidence** | source/lib/cdk-textract-stack.ts line: `securityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic(), "allow lambda ingress", false)` |

#### INF-Q6: API Entry Point

| Field | Value |
|-------|-------|
| **Score** | 3 🟡 Partial |
| **Finding** | API Gateway (LambdaRestApi) configured with Cognito User Pool authorizer, request validation, access logging to CloudWatch, and structured JSON access log format. CloudFront serves as CDN for the frontend. |
| **Gap** | No throttling configured — usage plan explicitly suppressed (`cfn_nag` rule W64: "No usage plan intended"). No WAF integration. |
| **Recommendation** | Add API Gateway usage plan with rate limiting and burst throttling. Consider WAF integration for additional protection against abuse. |
| **Evidence** | source/lib/cdk-textract-stack.ts — `apigateway.LambdaRestApi` with `CfnAuthorizer` (COGNITO_USER_POOLS), `RequestValidator`, `LogGroupLogDestination` |

#### INF-Q7: Auto-Scaling

| Field | Value |
|-------|-------|
| **Score** | 3 🟡 Partial |
| **Finding** | Lambda automatically scales within reserved concurrency limits (API_CONCURRENT_REQUESTS = 30). DynamoDB uses PAY_PER_REQUEST billing (auto-scaling built-in). Elasticsearch has fixed instance type (m5.large) with no auto-scaling configured. |
| **Gap** | Elasticsearch has no auto-scaling. Lambda reserved concurrency is a static cap (30) that may be insufficient under load. |
| **Recommendation** | Enable UltraWarm or auto-scaling for OpenSearch. Review Lambda reserved concurrency limits against expected peak load. Consider Application Auto Scaling for the OpenSearch domain. |
| **Evidence** | source/lib/cdk-textract-stack.ts — `reservedConcurrentExecutions: API_CONCURRENT_REQUESTS`, `billingMode: ddb.BillingMode.PAY_PER_REQUEST`, ES `instanceType: "m5.large.elasticsearch"` |

#### INF-Q8: Backup and Recovery

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No backup configuration found for any data store. DynamoDB tables do not have Point-in-Time Recovery (PITR) enabled. Elasticsearch has no snapshot lifecycle configured. S3 buckets explicitly disable versioning (`versioned: false`). No AWS Backup plans defined. |
| **Gap** | Complete absence of backup and recovery configuration. Data loss from accidental deletion, corruption, or service failure has no recovery path. |
| **Recommendation** | Enable DynamoDB PITR on both tables. Enable S3 versioning on the documents bucket. Configure automated Elasticsearch snapshots. Create an AWS Backup plan covering all data stores with defined retention periods. |
| **Evidence** | source/lib/cdk-textract-stack.ts — `versioned: false` on all S3 buckets; no `pointInTimeRecovery` on DynamoDB tables; no `aws_backup_plan` resources |

#### INF-Q9: High Availability and Fault Isolation

| Field | Value |
|-------|-------|
| **Score** | 3 🟡 Partial |
| **Finding** | Lambda is inherently multi-AZ. DynamoDB is inherently multi-AZ with automatic replication. VPC spans multiple AZs with private subnets. In the CICD deployment path, Elasticsearch is configured with zone-awareness across 2 AZs. In the non-CICD path, Elasticsearch is single-instance. |
| **Gap** | Non-CICD deployment path has single-AZ Elasticsearch — no fault isolation for the search layer. |
| **Recommendation** | Ensure all deployment paths use multi-AZ Elasticsearch/OpenSearch. Remove the single-instance non-CICD configuration or mark it as development-only with production requiring CICD deploy. |
| **Evidence** | source/lib/cdk-textract-stack.ts — CICD path: `zoneAwarenessEnabled: true, availabilityZoneCount: 2`; non-CICD path: single instance, no zone awareness |

#### INF-Q10: Infrastructure as Code Coverage

| Field | Value |
|-------|-------|
| **Score** | 3 🟡 Partial |
| **Finding** | Core infrastructure comprehensively defined in CDK: Lambda functions, DynamoDB tables, Elasticsearch domain, S3 buckets, SQS/SNS messaging, API Gateway, Cognito, CloudFront, VPC, IAM roles/policies, KMS keys. CICD pipeline defined in separate CloudFormation template. |
| **Gap** | No operational/DR resources in IaC — no CloudWatch alarms, no CloudWatch dashboards, no AWS Backup plans, no Route 53 health checks. These are provisioned manually or not at all. |
| **Recommendation** | Add CloudWatch alarms (Lambda errors, DLQ message count, API 5xx rate), CloudWatch dashboards, and AWS Backup plans as CDK constructs alongside the application resources. |
| **Evidence** | source/lib/cdk-textract-stack.ts (1862 lines covering all core resources); deployment/document-understanding-solution.template (940 lines for CICD) |

#### INF-Q11: CI/CD Automation

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | CloudFormation-based CodePipeline with two stages: Source (CodeCommit) → Deploy (CodeBuild running CDK deploy). The CodeBuild buildspec installs dependencies and runs `npm run run:tests` within the same deploy stage. No separate test stage, no quality gates, no approval steps. |
| **Gap** | Single-stage pipeline combines build, test, and deploy in one CodeBuild step. No separate test stage with pass/fail gate. No IaC-specific validation (cdk diff, cfn-lint). No multi-environment promotion. |
| **Recommendation** | Restructure pipeline: Source → Build/Test (with gate) → Staging Deploy → Integration Test → Production Deploy. Add CDK diff as a review step. Add cfn-lint and cdk-nag for IaC validation. |
| **Evidence** | deployment/document-understanding-solution.template — `DevCodePipeline` with stages: Source, Deploy; CodeBuild inline buildspec |

---

### Application Architecture (APP)

#### APP-Q1: Programming Languages

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | Backend: Python 3.8 (Lambda runtime — past EOL Oct 2024), Java 8 (pdfgenerator Lambda — legacy), boto3 1.13.20 (significantly outdated, current is 1.35+). Frontend: Next.js 14.1, React 18, TypeScript 5.3 (modern). IaC: CDK v1.132.0 (end-of-life, must migrate to v2). JavaScript aws-sdk v2 (should be v3). |
| **Gap** | Compound legacy signals across backend — Python 3.8 EOL, Java 8 EOL, CDK v1 EOL, boto3 severely outdated, aws-sdk v2. The frontend is modern but the backend and IaC layers have significant version debt. |
| **Recommendation** | Priority migration path: (1) CDK v1 → v2, (2) Python 3.8 → 3.12+ runtime, (3) boto3 layer update, (4) aws-sdk v2 → v3 in deployment scripts, (5) Java 8 → Java 21 for pdfgenerator or rewrite in Python. |
| **Evidence** | source/package.json — `"@aws-cdk/core": "1.132.0"`, `"aws-sdk": "^2.1500.0"`; source/lambda/boto3/requirements.txt — `boto3==1.13.20`; CDK stack — `lambda.Runtime.PYTHON_3_8`, `lambda.Runtime.JAVA_8` |

#### APP-Q2: Monolith vs Microservices

| Field | Value |
|-------|-------|
| **Score** | 3 🟡 Partial |
| **Finding** | Modular serverless architecture with 12+ independently deployable Lambda functions. Each function has a distinct responsibility: documentProcessor (routing), syncProcessor (sync Textract), asyncProcessor (async Textract), jobResultProcessor (results indexing), apiProcessor (API serving), documentBulkProcessor (batch processing), jobErrorHandler (error handling). Communication via managed messaging (SQS, SNS, DynamoDB Streams). |
| **Gap** | All functions deployed as a single CDK stack — no independent deployment of individual functions. Shared DynamoDB tables (outputTable, documentsTable) accessed by multiple Lambdas. Shared Lambda layers (helperLayer, boto3Layer). |
| **Recommendation** | Consider splitting into independent stacks: API stack, processing pipeline stack, and shared resources stack. This enables independent deployment cadence for API vs processing changes. |
| **Evidence** | source/lib/cdk-textract-stack.ts — single `CdkTextractStack` class deploying all resources; shared `outputTable` and `documentsTable` granted to multiple Lambdas |

#### APP-Q3: Async vs Sync Communication

| Field | Value |
|-------|-------|
| **Score** | 4 ✅ Mature |
| **Finding** | This service is an `event-processor`. Primary input is asynchronous: DynamoDB Streams trigger document routing, SQS queues feed all processors (syncProcessor, asyncProcessor, jobResultProcessor, documentBulkProcessor, jobErrorHandler), SNS carries Textract job completion notifications, and S3 event notifications trigger bulk processing. Outbound calls to Textract appropriately use both sync API (for small images) and async API (for PDFs), with results flowing back asynchronously via SNS→SQS. The archetype calibration for `event-processor` Score 4 applies. |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | source/lib/cdk-textract-stack.ts — DynamoEventSource, SqsEventSource on all processors; source/lambda/documentprocessor/lambda_function.py — routes by file type to sync/async queues |

#### APP-Q4: Long-Running Process Handling

| Field | Value |
|-------|-------|
| **Score** | 4 ✅ Mature |
| **Finding** | This service is an `event-processor`. Event handlers are async by design. Large documents (PDFs) are routed to the async Textract API, which processes them asynchronously and sends completion notifications via SNS→SQS→jobResultProcessor. Lambda timeouts are appropriately configured (up to 900 seconds for processors). Error handling uses timeout-based DLQ routing (ASYNC_JOB_TIMEOUT_SECONDS = 900, SYNC_JOB_TIMEOUT_SECONDS = 180). The archetype calibration for `event-processor` Score 4 applies. |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | source/lambda/documentprocessor/lambda_function.py — file-type routing to async queue for PDFs; source/lib/cdk-textract-stack.ts — SNS topic subscription to SQS for job completion |

#### APP-Q5: API Versioning Strategy

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No API versioning strategy. API endpoints are unversioned: /search, /documents, /document, /redact, /feedbackkendra, /searchkendra. No /v1/ prefix, no version headers, no versioning annotations. |
| **Gap** | Breaking changes to the API would affect all consumers simultaneously with no migration path. |
| **Recommendation** | Implement URL-path versioning (e.g., /v1/documents, /v1/search) for all API Gateway resources. Define a backward-compatibility policy for API changes. |
| **Evidence** | source/lib/cdk-textract-stack.ts — `api.root.addResource("search")`, `api.root.addResource("documents")`, `api.root.addResource("document")`, `api.root.addResource("redact")` |

#### APP-Q6: Service Discovery

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | Service endpoints passed as environment variables at deploy time via CDK. Lambda functions receive queue URLs (SYNC_QUEUE_URL, ASYNC_QUEUE_URL), table names (DOCUMENTS_TABLE, OUTPUT_TABLE), bucket names (CONTENT_BUCKET), and Elasticsearch domain endpoint (ES_DOMAIN) via environment variables. No dynamic service discovery. |
| **Gap** | All service references are static environment variables resolved at deploy time. No ability to route dynamically or discover services at runtime. |
| **Recommendation** | For this serverless architecture, environment variables are an acceptable pattern since Lambda function configuration is atomic with deployment. Consider AWS Systems Manager Parameter Store for shared configuration that may change between deployments without requiring redeployment. |
| **Evidence** | source/lib/cdk-textract-stack.ts — `environment: { SYNC_QUEUE_URL: syncJobsQueue.queueUrl, ES_DOMAIN: elasticSearch.attrDomainEndpoint, ... }` |

---

### Data Platform (DATA)

#### DATA-Q1: Unstructured Data Storage

| Field | Value |
|-------|-------|
| **Score** | 4 ✅ Mature |
| **Finding** | Unstructured documents (PDFs, images) stored in S3 with a comprehensive parsing pipeline: Amazon Textract for OCR and document analysis, Amazon Comprehend for entity extraction, Amazon Comprehend Medical for medical entity detection, and Amazon Kendra for semantic search and FAQ capabilities. Documents are indexed in Elasticsearch for full-text search. |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | source/lib/cdk-textract-stack.ts — documentsS3Bucket, Textract policies, Comprehend policies, Kendra integration; source/lambda/syncprocessor/, source/lambda/jobresultprocessor/ |

#### DATA-Q2: Unified Data Access Layer

| Field | Value |
|-------|-------|
| **Score** | 3 🟡 Partial |
| **Finding** | Centralized `DocumentStore` class in `source/lambda/helper/python/datastore.py` provides a unified interface for DynamoDB operations (create, update, get, delete, list documents). This is shared via the helperLayer Lambda Layer across all processors. However, Elasticsearch access is scattered — directly used in apiprocessor, syncprocessor, and jobresultprocessor without a centralized abstraction. |
| **Gap** | Elasticsearch access is not centralized — direct HTTP calls to ES domain from multiple Lambda functions without a shared data access abstraction. |
| **Recommendation** | Create a centralized Elasticsearch/OpenSearch access layer (similar to DocumentStore) and include it in the helper layer. This would centralize index management, query patterns, and connection handling. |
| **Evidence** | source/lambda/helper/python/datastore.py — DocumentStore class; source/lambda/elasticsearch/requirements.txt — elasticsearch client used directly in multiple Lambdas |

#### DATA-Q3: Database Engine Version and EOL

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | Elasticsearch version 7.4 is explicitly pinned in CDK (`elasticsearchVersion: "7.4"`). Amazon Elasticsearch Service has been rebranded as Amazon OpenSearch Service, and ES 7.4 is a legacy version. The `@aws-cdk/aws-elasticsearch` construct itself is deprecated in favor of `@aws-cdk/aws-opensearchservice`. DynamoDB has no version concept (always current). |
| **Gap** | Elasticsearch 7.4 is an old version on a deprecated service namespace. Migration to OpenSearch Service with a current engine version is needed. EOL status of the legacy ES naming is confirmed. |
| **Recommendation** | Migrate from Amazon Elasticsearch Service 7.4 to Amazon OpenSearch Service 2.x. Update CDK construct from `@aws-cdk/aws-elasticsearch` to the OpenSearch construct (in CDK v2: `aws-cdk-lib/aws-opensearchservice`). |
| **Evidence** | source/lib/cdk-textract-stack.ts — `es.CfnDomain` with `elasticsearchVersion: "7.4"` |

#### DATA-Q4: Stored Procedures and Schema Complexity

| Field | Value |
|-------|-------|
| **Score** | 4 ✅ Mature |
| **Finding** | No stored procedures, triggers, or proprietary SQL. All business logic resides in Lambda functions (Python application layer). DynamoDB is schemaless NoSQL — no SQL dialect dependency. Elasticsearch uses standard REST API queries. No database-coupled business logic. |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | source/lambda/ — all business logic in Python Lambda functions; source/lambda/helper/python/datastore.py — DynamoDB access via boto3 SDK |

---

### Security Baseline (SEC)

#### SEC-Q1: Audit Logging

| Field | Value |
|-------|-------|
| **Score** | Not Evaluated (archetype-N/A) |
| **Finding** | Audit logging (CloudTrail) is an AWS account-level service provisioned once per account or organization — not per-application. This repo contains application-level IaC only (Lambda, DynamoDB, S3, API Gateway, Cognito, Elasticsearch for this service) which is the correct scope for an application repo. CloudTrail evaluation belongs in the foundation/account-level infrastructure repo. |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | N/A |

#### SEC-Q2: Encryption at Rest

| Field | Value |
|-------|-------|
| **Score** | 3 🟡 Partial |
| **Finding** | Encryption at rest configured across all data stores: S3 buckets use SSE-S3 (BucketEncryption.S3_MANAGED), DynamoDB has `serverSideEncryption: true` (AWS-owned key), SQS queues use KMS encryption (QueueEncryption.KMS_MANAGED and KMS with customer-managed keys), Elasticsearch has `encryptionAtRestOptions` with customer-managed KMS key and key rotation enabled, plus node-to-node encryption. |
| **Gap** | S3 and DynamoDB use AWS-managed/owned encryption rather than customer-managed KMS keys. No centralized key management strategy — mixed encryption types across services. |
| **Recommendation** | Migrate S3 bucket encryption from SSE-S3 to SSE-KMS with a customer-managed key for sensitive document buckets. Enable DynamoDB customer-managed CMK encryption for audit and compliance requirements. |
| **Evidence** | source/lib/cdk-textract-stack.ts — `BucketEncryption.S3_MANAGED`, `serverSideEncryption: true`, `QueueEncryption.KMS`, `encryptionAtRestOptions: { enabled: true, kmsKeyId: esEncryptionKey.keyId }` |

#### SEC-Q3: API Authentication

| Field | Value |
|-------|-------|
| **Score** | 4 ✅ Mature |
| **Finding** | All API endpoints authenticated via Cognito User Pool authorizer. Authorizer configured with `identitySource: "method.request.header.Authorization"` and `type: "COGNITO_USER_POOLS"`. Every non-OPTIONS method uses `authorizationType: apigateway.AuthorizationType.COGNITO`. Frontend uses AWS Amplify for Cognito integration. Identity pool configured with `allowUnauthenticatedIdentities: false`. |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | source/lib/cdk-textract-stack.ts — `apigateway.CfnAuthorizer` with COGNITO_USER_POOLS; `addCorsOptionsAndMethods` applying auth to all methods |

#### SEC-Q4: Centralized Identity Integration

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | Application-specific Cognito User Pool created solely for this solution. Admin-create-only users with email verification. Advanced security mode enforced. However, no federation with organizational IdP (Okta, Azure AD, SAML). No SSO integration. The Cognito pool is isolated to this application. |
| **Gap** | No integration with a centralized organizational identity provider. Users are managed independently in this application's Cognito pool. |
| **Recommendation** | Configure Cognito federation with the organization's centralized IdP (SAML/OIDC provider). Enable SSO for seamless access alongside other organizational applications. |
| **Evidence** | source/lib/cdk-textract-stack.ts — `CfnUserPool` with `adminCreateUserConfig: { allowAdminCreateUserOnly: true }`, no federation configuration |

#### SEC-Q5: Secrets Management

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | No plaintext credentials in source code. Configuration values (bucket names, table names, queue URLs, ES domain) are passed via CDK-generated environment variables. The .env file contains only empty placeholders. Authentication uses IAM roles (no database passwords needed for DynamoDB/ES). No Secrets Manager or Vault usage. No credential rotation mechanism. |
| **Gap** | No secrets management service in use. While the architecture minimizes secrets (IAM-based auth), there is no formal secrets management strategy, no rotation capability, and environment variables are the sole configuration mechanism. |
| **Recommendation** | Adopt AWS Secrets Manager for any future credentials (third-party API keys, Kendra data source credentials). Implement SSM Parameter Store (SecureString) for sensitive configuration values. Add rotation policies where applicable. |
| **Evidence** | source/.env — empty placeholder values; source/lib/cdk-textract-stack.ts — environment variables for resource identifiers only |

#### SEC-Q6: Compute Hardening and Patching

| Field | Value |
|-------|-------|
| **Score** | 2 🟠 Needs Work |
| **Finding** | Lambda runtime patching is managed by AWS automatically. However, the Lambda runtime version (Python 3.8) is past end-of-life and no longer receives patches. Java 8 runtime for pdfgenerator is also deprecated. No vulnerability scanning configured (no AWS Inspector, no Snyk, no Dependabot). Dependency versions are pinned but significantly outdated (boto3 1.13.20, elasticsearch 7.9.1). |
| **Gap** | Deprecated Lambda runtimes (Python 3.8, Java 8) no longer receiving security patches. No vulnerability scanning for dependencies or runtime. |
| **Recommendation** | Upgrade Lambda runtimes to Python 3.12+ and Java 21. Enable AWS Inspector for Lambda function scanning. Add dependency vulnerability scanning (Dependabot or Snyk). |
| **Evidence** | source/lib/cdk-textract-stack.ts — `lambda.Runtime.PYTHON_3_8`, `lambda.Runtime.JAVA_8`; source/lambda/boto3/requirements.txt — outdated dependencies |

#### SEC-Q7: Application Security Pipeline

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No security scanning tools configured in the CI/CD pipeline. No SAST (SonarQube, Semgrep, CodeGuru). No dependency scanning (Dependabot, npm audit, pip-audit). No container scanning (N/A — serverless). No security gates in the pipeline. No `.snyk` policy file. |
| **Gap** | Complete absence of automated security validation. Vulnerabilities in dependencies or application code reach production undetected. |
| **Recommendation** | Add `cdk-nag` for CDK security best-practice validation. Add `npm audit` and `pip-audit` to the build pipeline. Configure Dependabot or Snyk for dependency monitoring. Add Semgrep or CodeGuru Reviewer for SAST. Gate deployments on critical security findings. |
| **Evidence** | deployment/document-understanding-solution.template — CodeBuild buildspec has no security scanning steps; no .github/dependabot.yml |

---

### Operations & Observability (OPS)

#### OPS-Q1: Distributed Tracing

| Field | Value |
|-------|-------|
| **Score** | 4 ✅ Mature |
| **Finding** | All Lambda functions have X-Ray active tracing enabled (`tracing: lambda.Tracing.ACTIVE`). X-Ray propagation through SQS, SNS, DynamoDB Streams, and API Gateway is automatic with active tracing. This provides end-to-end distributed tracing across the entire document processing pipeline. |
| **Gap** | N/A |
| **Recommendation** | N/A |
| **Evidence** | source/lib/cdk-textract-stack.ts — `tracing: lambda.Tracing.ACTIVE` on all Lambda functions |

#### OPS-Q2: SLO Definitions

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No SLO definitions found. No CloudWatch alarms defined in IaC. No error budget tracking. No p99/p95 latency monitoring. No availability targets defined. |
| **Gap** | No formal definition of acceptable service levels for document processing latency, API response time, or system availability. |
| **Recommendation** | Define SLOs for: (1) API response time (p99 < 1s for GET, p99 < 5s for POST), (2) Document processing completion time (p95 < 60s for images, p95 < 5min for PDFs), (3) System availability (99.9%). Implement as CloudWatch alarms and dashboards. |
| **Evidence** | source/lib/cdk-textract-stack.ts — no CloudWatch alarm resources defined |

#### OPS-Q3: Business Metrics

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No custom business metrics published. Lambda functions use only `print()` statements for logging. No `cloudwatch.put_metric_data` calls. No tracking of documents processed per hour, processing success rate, average processing time, or search query performance. |
| **Gap** | Only default Lambda/API Gateway infrastructure metrics available. No visibility into business outcomes. |
| **Recommendation** | Publish custom CloudWatch metrics: documents_processed (count), processing_duration (timer), processing_errors (count by error type), search_queries (count), documents_by_type (dimensions). |
| **Evidence** | source/lambda/*/lambda_function.py — only print() logging, no CloudWatch metrics publishing |

#### OPS-Q4: Anomaly Detection and Alerting

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No alerting configured. No CloudWatch alarms. No anomaly detection. No PagerDuty/OpsGenie integration. DLQ messages accumulate silently with no notification. |
| **Gap** | No alerting on Lambda errors, DLQ depth, API 5xx rates, or Elasticsearch cluster health. Failures are completely silent. |
| **Recommendation** | Implement CloudWatch alarms for: Lambda error rate > 1%, DLQ ApproximateNumberOfMessagesVisible > 0, API Gateway 5XXError > 0, Elasticsearch cluster status != green. Enable CloudWatch anomaly detection on API latency. |
| **Evidence** | source/lib/cdk-textract-stack.ts — no `aws_cloudwatch.Alarm` or equivalent resources |

#### OPS-Q5: Deployment Strategy

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | CDK deploy directly updates the CloudFormation stack in production. No blue/green deployment. No canary releases. No traffic shifting for Lambda functions. No staged rollout. The CodePipeline goes directly from source to production deploy. |
| **Gap** | All changes go directly to production with no staged validation. A bad deployment affects all users immediately with no automatic rollback. |
| **Recommendation** | Implement Lambda deployment preferences with CodeDeploy: `deploymentConfig: lambda.DeploymentConfig.CANARY_10PERCENT_5MINUTES`. Add pre/post deployment hooks for validation. Configure automatic rollback on CloudWatch alarm breach. |
| **Evidence** | deployment/document-understanding-solution.template — CodePipeline stages: Source → Deploy (no staging); source/lib/cdk-textract-stack.ts — no DeploymentConfig on Lambda functions |

#### OPS-Q6: Integration Testing

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | Only 2 Python test files found: test_datastore.py and test_helper.py in source/test/. These appear to be unit tests for the helper layer. No integration tests covering the document processing workflow. No API integration tests. No end-to-end tests. The buildspec runs tests but they are minimal unit tests only. |
| **Gap** | No integration test coverage for the critical document processing pipeline (upload → route → process → index → retrieve). No API contract tests. |
| **Recommendation** | Create integration test suite: (1) Upload document via API → verify processing completes → verify search returns results, (2) Bulk upload → verify batch processing, (3) API contract tests for all endpoints. Run in CI pipeline against a staging environment. |
| **Evidence** | source/test/test_datastore.py, source/test/test_helper.py — only 2 test files; bin/run-tests.sh |

#### OPS-Q7: Incident Response Automation

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No runbooks, no automation documents, no self-healing patterns. DLQs capture failed messages but no automated remediation or notification exists. No SSM Automation documents. No Lambda-based remediation functions. |
| **Gap** | Incident response is entirely ad hoc. Failed documents sit in DLQs indefinitely with no alerting or automated retry/recovery. |
| **Recommendation** | Create DLQ redrive automation (Lambda triggered on DLQ messages for retry with exponential backoff). Create SSM runbooks for common incidents (Elasticsearch cluster red, Lambda throttling, API Gateway 5xx spike). Implement CloudWatch alarm → SNS → Lambda self-healing for known failure modes. |
| **Evidence** | source/lib/cdk-textract-stack.ts — DLQs defined but no processing logic for DLQ messages |

#### OPS-Q8: Observability Ownership

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No per-service dashboards defined in IaC. No CODEOWNERS file. No named alarm owners. No team attribution on observability assets. API Gateway access logging configured but no dashboards consuming it. |
| **Gap** | No observability ownership model. Monitoring is fragmented — X-Ray traces exist but no dashboards, no alarm owners, no team attribution. |
| **Recommendation** | Create CloudWatch dashboard in CDK with key metrics per Lambda function. Add CODEOWNERS file for observability configuration. Define alarm ownership and escalation paths. |
| **Evidence** | source/lib/cdk-textract-stack.ts — no Dashboard resources; no .github/CODEOWNERS file |

#### OPS-Q9: Resource Tagging Governance

| Field | Value |
|-------|-------|
| **Score** | 1 ❌ Not Ready |
| **Finding** | No tags on any resources in the CDK stack. No default_tags configuration. No tagging strategy. No cost allocation tags. Resources have only CDK-generated logical IDs as identifiers. |
| **Gap** | No ability to track costs per workload, identify resource ownership, or enforce budget controls. All resources are untagged. |
| **Recommendation** | Add CDK `Tags.of(this).add()` for mandatory tags: Environment, Service, Owner, CostCenter. Implement tag enforcement via AWS Config rule `required-tags`. Enable cost allocation tags in AWS Billing. |
| **Evidence** | source/lib/cdk-textract-stack.ts — no `Tags` or `cdk.Tags` usage on any resource |

---

## Learning Materials

### Move to Modern DevOps (Triggered)
- [Move to Modern DevOps](https://skillbuilder.aws/learning-plan/1FGEQKGPQD)
- [Getting Started with DevOps on AWS](https://skillbuilder.aws/learn/R4B13K95YQ)

---

## Evidence Index

| File Path | Referenced By | Context |
|-----------|--------------|---------|
| source/lib/cdk-textract-stack.ts | INF-Q1–Q11, APP-Q2–Q6, DATA-Q1–Q3, SEC-Q2–Q5, OPS-Q1–Q9 | Main CDK stack (1862 lines) defining all AWS infrastructure |
| source/package.json | APP-Q1 | Dependency manifest — CDK v1.132.0, aws-sdk v2, Next.js 14.1 |
| source/lambda/boto3/requirements.txt | APP-Q1, SEC-Q6 | Python dependencies — boto3 1.13.20 (outdated) |
| source/lambda/elasticsearch/requirements.txt | DATA-Q3 | Elasticsearch client 7.9.1 |
| source/lambda/helper/python/datastore.py | DATA-Q2 | Centralized DocumentStore class for DynamoDB access |
| source/lambda/documentprocessor/lambda_function.py | INF-Q3, APP-Q3 | Document routing logic — DynamoDB stream → SQS |
| source/.env | SEC-Q5 | Empty placeholder configuration file |
| source/test/test_datastore.py | OPS-Q6 | Unit test file |
| source/test/test_helper.py | OPS-Q6 | Unit test file |
| deployment/document-understanding-solution.template | INF-Q11, OPS-Q5 | CloudFormation CICD pipeline template |
