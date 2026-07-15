# Outdated Components Analysis

## EOL/Deprecated Runtimes (High Severity)

### Python 3.8
- **EOL Date**: October 2024
- **Usage**: All backend Lambda functions (13+ functions)
- **Risk**: No security patches, potential AWS Lambda runtime deprecation
- **Current LTS**: Python 3.13
- **Files**: `source/lib/cdk-textract-stack.ts`, all `source/lambda/*/` directories

### Java 8
- **Status**: Legacy LTS (2014). Lambda `java8` runtime deprecated.
- **Usage**: PDF Generator Lambda (`DemoLambdaV2::handleRequest`)
- **Risk**: Missing performance improvements (GC, startup), security exposure
- **Current LTS**: Java 21
- **Files**: `source/lib/cdk-textract-stack.ts`, `source/lambda/pdfgenerator/`

### Node.js 18
- **EOL Date**: April 2025
- **Usage**: Frontend build tooling, CDK deployment, CI/CD Lambda
- **Risk**: Approaching EOL, missing modern language features
- **Current LTS**: Node.js 22
- **Files**: `source/package.json`

### AWS CDK v1 (1.132.0)
- **EOL Date**: June 2023
- **Usage**: All infrastructure-as-code definitions
- **Risk**: No updates, no new service support, fragmented package model
- **Current**: AWS CDK v2 (aws-cdk-lib)
- **Files**: `source/package.json`, `source/lib/*.ts`

## Deprecated SDKs (High Severity)

### AWS SDK for JavaScript v2
- **Status**: Maintenance mode (September 2024)
- **Version**: ^2.1500.0
- **Usage**: CI/CD helper Lambda, frontend utilities
- **Risk**: Only critical security fixes; no new features
- **Current**: AWS SDK for JavaScript v3
- **Files**: `source/package.json`, `deployment/document-understanding-cicd/package.json`

## Outdated Runtime Dependencies (Medium Severity)

### boto3 / botocore
| Package | Current in Project | Latest | Age |
|---------|-------------------|--------|-----|
| boto3 | 1.13.20 | 1.35.x+ | ~5 years |
| botocore | 1.16.20 | 1.35.x+ | ~5 years |
| s3transfer | 0.3.3 | 0.10.x+ | ~5 years |

**Files**: `source/lambda/boto3/requirements.txt`

### Elasticsearch Python Client
| Package | Current | Latest | Notes |
|---------|---------|--------|-------|
| elasticsearch | 7.9.1 | 8.x (or opensearch-py) | Service renamed to OpenSearch |
| requests | 2.21.0 | 2.32.x | Multiple CVEs in older versions |
| urllib3 | 1.25.10 | 2.2.x | Multiple CVEs |
| certifi | 2020.6.20 | 2024.x | Outdated root certificates |
| requests-aws4auth | 0.9 | 1.2.x | Outdated |

**Files**: `source/lambda/elasticsearch/requirements.txt`

### Additional Python Dependencies
| Package | Current | Notes |
|---------|---------|-------|
| docutils | 0.15.2 | Current is 0.21.x |
| jmespath | 0.10.0 | Current is 1.0.x |
| python-dateutil | 2.8.1 | Current is 2.9.x |
| six | 1.15.0 | Python 2/3 compat layer, unnecessary for Python 3.13 |
| chardet | 3.0.4 | Replaced by charset-normalizer in modern requests |

**Files**: `source/lambda/boto3/requirements.txt`

## Outdated Infrastructure (Medium Severity)

### CodeBuild Image
- **Current**: `aws/codebuild/amazonlinux2-x86_64-standard:2.0`
- **Bundled Runtimes**: Node.js 12 (EOL), Ruby 2.6 (EOL)
- **Latest Available**: `aws/codebuild/amazonlinux2-x86_64-standard:5.0`
- **Files**: `deployment/document-understanding-solution.template`

### Elasticsearch Domain
- **Current**: Version 7.4
- **Status**: Amazon Elasticsearch Service → Amazon OpenSearch Service
- **Latest**: OpenSearch 2.x
- **Files**: `source/lib/cdk-textract-stack.ts`

## Outdated Dev/Build Dependencies (Low Severity)

| Package | Current | Latest | Purpose |
|---------|---------|--------|---------|
| mocha | ^8.1.3 | 10.x | Test framework |
| eslint | ^8.56.0 | 9.x | Linting |
| eslint-config-next | 14.1.0 | 15.x | Next.js linting |

**Files**: `source/package.json`, `deployment/logger/package.json`

## Related Documents

- [Summary](summary.md)
- [Technical Debt Report](technical-debt-report.md)
- [Maintenance Burden](maintenance-burden.md)
- [Remediation Plan](remediation-plan.md)
