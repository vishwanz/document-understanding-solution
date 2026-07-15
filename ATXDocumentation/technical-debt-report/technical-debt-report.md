# Technical Debt Report - Document Understanding Solution

## 🎯 AWS Transformation Recommendation

### **RECOMMENDED TRANSFORMATIONS: AWS/python-version-upgrade, AWS/nodejs-version-upgrade, AWS/nodejs-aws-sdk-v2-to-v3, AWS/java-version-upgrade**

This codebase uses Python 3.8 (EOL October 2024) across all Lambda functions, Node.js 18 (EOL April 2025) for the frontend/CDK, AWS SDK for JavaScript v2 (deprecated, in maintenance mode) for infrastructure and CI/CD code, and Java 8 for the PDF generator Lambda. These four transformations address the most critical runtime and SDK modernization needs.

---

## Executive Summary

The Document Understanding Solution (v3.0.0, SO0084) carries significant technical debt primarily in its runtime environments and infrastructure tooling. The most critical issues are EOL/deprecated runtimes (Python 3.8, Node.js 18, Java 8) and deprecated SDK versions (AWS CDK v1, AWS SDK for JavaScript v2, severely outdated boto3/botocore). The project's backend Lambda functions, infrastructure code, and CI/CD pipeline all rely on components that have reached or are approaching end-of-life.

---

## Critical Findings Summary

| # | Finding | Severity | Category |
|---|---------|----------|----------|
| 1 | Python 3.8 runtime (EOL) | High | Runtime |
| 2 | AWS CDK v1 (1.132.0) - EOL | High | Framework |
| 3 | Java 8 Lambda runtime | High | Runtime |
| 4 | Node.js 18 approaching EOL | High | Runtime |
| 5 | AWS SDK for JavaScript v2 (deprecated) | High | SDK |
| 6 | boto3 1.13.20 / botocore 1.16.20 (severely outdated) | Medium | Dependency |
| 7 | Elasticsearch 7.9.1 client library (outdated) | Medium | Dependency |
| 8 | CodeBuild image amazonlinux2-x86_64-standard:2.0 (obsolete) | Medium | Infrastructure |
| 9 | Python dependencies with known vulnerabilities | Medium | Dependency |
| 10 | Elasticsearch 7.4 domain version (outdated service) | Medium | Infrastructure |

---

## Detailed Findings

### 1. Python 3.8 Runtime — HIGH

**Status**: End-of-Life (October 2024)

All 13+ Lambda functions use `lambda.Runtime.PYTHON_3_8`. Python 3.8 no longer receives security patches.

**Affected files**:
- `source/lib/cdk-textract-stack.ts` (runtime declarations)
- `source/lambda/apiprocessor/`
- `source/lambda/asyncprocessor/`
- `source/lambda/documentprocessor/`
- `source/lambda/documentbulkprocessor/`
- `source/lambda/syncprocessor/`
- `source/lambda/jobresultprocessor/`
- `source/lambda/joberrorhandler/`
- `source/lambda/customResourceKendraIndex/`
- `source/lambda/customResourceKendraDataSource/`
- `source/lambda/kendraIndexPoller/`

**Remediation**: Upgrade to Python 3.13 using the `AWS/python-version-upgrade` transformation.

---

### 2. AWS CDK v1 (1.132.0) — HIGH

**Status**: End-of-Life (June 2023)

The infrastructure-as-code uses AWS CDK v1 with individual package imports (`@aws-cdk/core`, `@aws-cdk/aws-lambda`, etc.). CDK v1 no longer receives updates or security patches.

**Affected files**:
- `source/package.json` (22+ @aws-cdk/* v1 dependencies)
- `source/lib/cdk-textract-stack.ts`
- `source/lib/cdk-textract-client-stack.ts`
- `source/bin/deploy-backend.js`
- `source/bin/deploy-client-stack.js`

**Remediation**: Migrate to AWS CDK v2 (aws-cdk-lib). This requires manual migration as no OOB transformation exists for CDK v1→v2.

---

### 3. Java 8 Lambda Runtime — HIGH

**Status**: Java 8 is a legacy LTS release (2014). While Amazon Corretto 8 is still supported, Lambda Java 8 runtime (`java8`) is deprecated in favor of `java21`.

**Affected files**:
- `source/lib/cdk-textract-stack.ts` (pdfGenerator uses `lambda.Runtime.JAVA_8`)
- `source/lambda/pdfgenerator/` (compiled JAR)

**Remediation**: Upgrade to Java 21 using the `AWS/java-version-upgrade` transformation.

---

### 4. Node.js 18 Approaching EOL — HIGH

**Status**: Node.js 18 reaches EOL April 2025. The project engine constraint requires `>= 18.17.0`.

**Affected files**:
- `source/package.json` (engines field)
- All frontend/CDK tooling

**Remediation**: Upgrade to Node.js 22 using the `AWS/nodejs-version-upgrade` transformation.

---

### 5. AWS SDK for JavaScript v2 (deprecated) — HIGH

**Status**: AWS SDK v2 entered maintenance mode (September 2024) and will receive only critical security fixes.

**Affected files**:
- `source/package.json` (`aws-sdk: ^2.1500.0`)
- `deployment/document-understanding-cicd/package.json` (`aws-sdk: *`)
- `deployment/logger/package.json` (dev dependency `aws-sdk-mock`)

**Remediation**: Migrate to AWS SDK v3 using the `AWS/nodejs-aws-sdk-v2-to-v3` transformation.

---

### 6. boto3 1.13.20 / botocore 1.16.20 — MEDIUM

**Status**: Severely outdated (released May 2020). Over 5 years behind current releases. Missing support for newer AWS service features, bug fixes, and security patches.

**Affected files**:
- `source/lambda/boto3/requirements.txt`

**Remediation**: Update to current boto3/botocore versions. Manual update required — no OOB transformation applies (the codebase already uses boto3, not boto2).

---

### 7. Elasticsearch 7.9.1 Client Library — MEDIUM

**Status**: Outdated. The `elasticsearch` Python library 7.x is in maintenance mode. Amazon Elasticsearch Service has been rebranded to Amazon OpenSearch Service.

**Affected files**:
- `source/lambda/elasticsearch/requirements.txt` (`elasticsearch==7.9.1`, `requests==2.21.0`, `urllib3==1.25.10`, `certifi==2020.6.20`)

**Remediation**: Migrate to `opensearch-py` client library and update associated dependencies. Manual migration required.

---

### 8. CodeBuild Image (amazonlinux2-x86_64-standard:2.0) — MEDIUM

**Status**: Obsolete. This image bundles Node.js 12 and Ruby 2.6, both of which are EOL. The image itself is deprecated.

**Affected files**:
- `deployment/document-understanding-solution.template`

**Remediation**: Update to `amazonlinux2-x86_64-standard:5.0` or later. Manual update required.

---

### 9. Python Dependencies with Known Vulnerabilities — MEDIUM

**Status**: Several pinned Python dependencies are outdated and have known CVEs.

| Package | Current | Issue |
|---------|---------|-------|
| `requests` | 2.21.0 | Known vulnerabilities; current is 2.32.x |
| `urllib3` | 1.25.9 / 1.25.10 | Multiple CVEs; should be ≥2.0 |
| `certifi` | 2020.6.20 | Outdated root certificates |
| `idna` | 2.8 | Outdated |
| `chardet` | 3.0.4 | Replaced by `charset-normalizer` |

**Affected files**:
- `source/lambda/elasticsearch/requirements.txt`
- `source/lambda/boto3/requirements.txt`

**Remediation**: Update all pinned dependencies to latest compatible versions. Manual update required.

---

### 10. Elasticsearch 7.4 Domain Version — MEDIUM

**Status**: The CDK stack provisions Elasticsearch 7.4 domain. Amazon Elasticsearch Service has transitioned to Amazon OpenSearch Service. Elasticsearch 7.4 is outdated.

**Affected files**:
- `source/lib/cdk-textract-stack.ts` (`elasticsearchVersion: "7.4"`)

**Remediation**: Migrate to Amazon OpenSearch Service with a current engine version. Manual migration required.

---

## Additional Technical Debt

### Architectural Concerns

| Issue | Severity | Description |
|-------|----------|-------------|
| VPC CIDR hardcoded | Low | `172.62.0.0/16` is hardcoded in the CDK stack |
| CORS allows all origins | Low | S3 bucket CORS and API Gateway both use `"*"` for allowed origins |
| Wildcard security group ingress | Low | `Peer.anyIpv4()` allows all IPv4 traffic to the ES security group |
| No API usage plan | Low | API Gateway has no usage plan or throttling configured |
| MFA disabled for Cognito | Low | User pool has `mfaConfiguration: "OFF"` |

### Dev Dependency Debt

| Package | Current | Notes | Severity |
|---------|---------|-------|----------|
| mocha | ^8.1.3 | Current is 10.x | Low |
| eslint | ^8.56.0 | Current is 9.x | Low |

---

## Prioritized Remediation Plan

### Immediate Priority (High Severity)

1. **Upgrade Python runtime** from 3.8 to 3.13 across all Lambda functions
2. **Migrate AWS CDK v1 to v2** — infrastructure code migration
3. **Upgrade Java runtime** from 8 to 21 for PDF generator Lambda
4. **Upgrade Node.js** from 18 to 22
5. **Migrate AWS SDK for JavaScript** from v2 to v3

### Near-Term Priority (Medium Severity)

6. **Update boto3/botocore** to current versions
7. **Migrate Elasticsearch to OpenSearch** — client library and domain
8. **Update CodeBuild image** to current version
9. **Update vulnerable Python dependencies** (requests, urllib3, certifi)

### Lower Priority (Low Severity)

10. **Harden security configurations** — CORS, security groups, MFA
11. **Update dev dependencies** — mocha, eslint
12. **Parameterize hardcoded values** — VPC CIDR, etc.

---

## Navigation

- [Summary](summary.md)
- [Outdated Components](outdated-components.md)
- [Maintenance Burden](maintenance-burden.md)
- [Remediation Plan](remediation-plan.md)
