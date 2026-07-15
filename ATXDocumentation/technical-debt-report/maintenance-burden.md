# Maintenance Burden Analysis

## High-Maintenance Areas

### 1. AWS CDK v1 Infrastructure Code

**Burden**: The CDK v1 fragmented package model requires managing 22+ individual `@aws-cdk/*` packages at version 1.132.0. Each package must be kept in lockstep. CDK v1 receives no updates, so any new AWS features must be implemented via CloudFormation escape hatches.

**Affected files**:
- `source/package.json` — 22+ CDK v1 dependencies
- `source/lib/cdk-textract-stack.ts` — 700+ lines of infrastructure
- `source/lib/cdk-textract-client-stack.ts`

**Impact**: Cannot adopt new AWS service features; import patterns are complex and error-prone; community support has migrated to CDK v2.

---

### 2. Lambda Layer Management

**Burden**: The project bundles custom Lambda layers (boto3, elasticsearch, helper, textractor) with pre-packaged zip files containing specific dependency versions. Updating any dependency requires rebuilding and repackaging the zip layers.

**Affected files**:
- `source/lambda/boto3/` — Custom boto3 layer with pinned 2020 dependencies
- `source/lambda/elasticsearch/` — Custom ES layer with pinned 2020 dependencies
- `source/lambda/helper/` — Shared helper layer
- `source/lambda/textractor/` — Textract utility layer

**Impact**: Dependencies are frozen at 2020 versions because updating requires manual zip repackaging and testing; no automated dependency update pipeline.

---

### 3. Monolithic CDK Stack

**Burden**: All infrastructure (VPC, Elasticsearch, Cognito, S3, DynamoDB, Lambda, API Gateway, CloudFront, SQS, SNS, KMS, Kendra) is defined in a single 700+ line TypeScript file (`cdk-textract-stack.ts`).

**Impact**: Difficult to modify individual components without risk of unintended side effects; long deployment times; no separation of concerns.

---

### 4. CI/CD Pipeline Configuration

**Burden**: The CI/CD pipeline uses a CloudFormation template with an obsolete CodeBuild image. The pipeline references hardcoded solution metadata (SO0084) and uses placeholder values (SOURCE_BUCKET, SOLUTION_NAME, CODE_VERSION) that require build-time substitution.

**Affected files**:
- `deployment/document-understanding-solution.template`
- `deployment/build-s3-dist.sh`
- `deployment/build-open-source-dist.sh`

**Impact**: Pipeline cannot leverage newer CodeBuild features; updating the build environment requires template changes.

---

### 5. VPC-Attached Lambda Functions

**Burden**: Multiple Lambda functions are attached to a VPC (for Elasticsearch access). VPC-attached Lambdas have cold start overhead and require VPC/subnet/security group management.

**Affected Lambdas**: documentProcessor, syncProcessor, asyncProcessor, jobResultProcessor, apiProcessor

**Impact**: Increased cold start latency; additional networking infrastructure to maintain; more complex debugging.

---

## Maintenance Complexity Indicators

| Component | Files | Complexity | Update Frequency |
|-----------|-------|-----------|-----------------|
| CDK v1 Infrastructure | 2 TS files | High | Cannot update (EOL) |
| Python Lambda Layers | 4 directories + zips | High | Frozen since 2020 |
| CI/CD Template | 1 YAML template | Medium | Rarely updated |
| Frontend (Next.js) | ~30+ components | Medium | Active development possible |
| Python Lambda Functions | 11 directories | Medium | Business logic stable |

## Technical Debt Accumulation Pattern

The project was initially developed in 2020 and has not undergone major dependency upgrades since. The dependency freeze is evidenced by:
- boto3 pinned at May 2020 release
- Elasticsearch client from September 2020
- CDK at version 1.132.0 (December 2021 — last update before EOL)
- Python and Java runtimes at 2020-era versions

## Related Documents

- [Summary](summary.md)
- [Outdated Components](outdated-components.md)
- [Remediation Plan](remediation-plan.md)
