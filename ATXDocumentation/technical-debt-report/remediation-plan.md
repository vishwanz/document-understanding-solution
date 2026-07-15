# Remediation Plan

## Priority 1: EOL/Deprecated Runtimes and Frameworks (High Severity)

### 1.1 Upgrade Python 3.8 → Python 3.13

**Scope**: All Lambda functions and layers  
**Approach**: Use `AWS/python-version-upgrade` transformation  
**Steps**:
1. Update CDK stack runtime declarations from `PYTHON_3_8` to `PYTHON_3_13`
2. Update all Lambda function code for Python 3.13 compatibility
3. Rebuild all Lambda layers (boto3, elasticsearch, helper, textractor) with Python 3.13
4. Update `requirements.txt` files with compatible dependency versions
5. Test all Lambda functions

**Risk**: Medium — may require code changes for deprecated Python features (e.g., `collections.abc` imports, type hint changes)

---

### 1.2 Migrate AWS CDK v1 → CDK v2

**Scope**: Infrastructure code  
**Approach**: Manual migration (no OOB transformation available)  
**Steps**:
1. Replace all `@aws-cdk/*` packages with single `aws-cdk-lib` package
2. Update all imports to use `aws-cdk-lib` and `constructs`
3. Replace `cdk.Construct` with `Construct` from `constructs` package
4. Update deprecated APIs (e.g., `Code.asset()` → `Code.fromAsset()`)
5. Update `cdk.json` for CDK v2
6. Test infrastructure synthesis and deployment

**Risk**: High — significant refactoring of import statements and some API changes

---

### 1.3 Upgrade Java 8 → Java 21

**Scope**: PDF Generator Lambda  
**Approach**: Use `AWS/java-version-upgrade` transformation  
**Steps**:
1. Update CDK runtime from `JAVA_8` to `JAVA_21`
2. Recompile JAR with Java 21 target
3. Update any deprecated Java APIs
4. Test PDF generation functionality

**Risk**: Low — JAR recompilation needed; limited code surface area

---

### 1.4 Upgrade Node.js 18 → Node.js 22

**Scope**: Frontend build, CDK deployment, CI/CD  
**Approach**: Use `AWS/nodejs-version-upgrade` transformation  
**Steps**:
1. Update `engines` field in `package.json`
2. Update dependencies for Node.js 22 compatibility
3. Update CodeBuild image to support Node.js 22
4. Verify Next.js 14 compatibility with Node.js 22
5. Run frontend build and tests

**Risk**: Low — Next.js 14 supports Node.js 22

---

### 1.5 Migrate AWS SDK for JavaScript v2 → v3

**Scope**: CI/CD Lambda, frontend utilities  
**Approach**: Use `AWS/nodejs-aws-sdk-v2-to-v3` transformation  
**Steps**:
1. Replace `aws-sdk` with modular `@aws-sdk/*` v3 packages
2. Update client instantiation patterns
3. Update API call patterns (Promises, send commands)
4. Remove `aws-sdk` from all `package.json` files
5. Test all AWS service interactions

**Risk**: Medium — API patterns differ significantly between v2 and v3

---

## Priority 2: Outdated Dependencies (Medium Severity)

### 2.1 Update boto3/botocore Lambda Layer

**Approach**: Manual update  
**Steps**:
1. Update `source/lambda/boto3/requirements.txt` to current versions
2. Remove `six` package (unnecessary for Python 3.13)
3. Rebuild boto3 layer zip
4. Test Lambda functions using the layer

---

### 2.2 Migrate Elasticsearch to OpenSearch

**Approach**: Manual migration  
**Steps**:
1. Replace `elasticsearch` Python package with `opensearch-py`
2. Update CDK to use `@aws-cdk/aws-opensearchservice` (or CDK v2 equivalent)
3. Update domain version to OpenSearch 2.x
4. Update all Lambda code referencing Elasticsearch client
5. Update `requests`, `urllib3`, `certifi` to current versions
6. Rebuild elasticsearch layer zip

---

### 2.3 Update CodeBuild Image

**Approach**: Manual template update  
**Steps**:
1. Update `deployment/document-understanding-solution.template`
2. Change image from `amazonlinux2-x86_64-standard:2.0` to `amazonlinux2-x86_64-standard:5.0`
3. Update any runtime version references in buildspec

---

### 2.4 Update Vulnerable Python Dependencies

**Approach**: Manual update  
**Steps**:
1. Update `requests` to ≥2.32.0
2. Update `urllib3` to ≥2.0.0
3. Update `certifi` to current version
4. Replace `chardet` with `charset-normalizer`
5. Rebuild affected Lambda layers

---

## Priority 3: Code Quality and Architecture (Low Severity)

### 3.1 Security Hardening

- Restrict CORS to specific origins
- Replace wildcard security group ingress with specific CIDR ranges
- Enable MFA for Cognito user pool
- Add API Gateway usage plan and throttling

### 3.2 Architecture Improvements

- Split monolithic CDK stack into separate stacks per domain
- Consider VPC endpoints for Elasticsearch to reduce Lambda cold starts
- Parameterize hardcoded VPC CIDR

### 3.3 Dev Dependency Updates

- Update mocha to 10.x
- Update eslint to 9.x
- Update eslint-config-next to match Next.js version

---

## Dependency Order

```
1.4 Node.js upgrade ─┐
1.5 AWS SDK v3      ─┤─→ 1.2 CDK v1→v2 migration
1.1 Python upgrade  ─┤─→ 2.1 boto3 update ─→ 2.2 OpenSearch migration
1.3 Java upgrade    ─┘
                         2.3 CodeBuild image (independent)
                         2.4 Python deps (can combine with 2.1)
```

## Related Documents

- [Summary](summary.md)
- [Outdated Components](outdated-components.md)
- [Maintenance Burden](maintenance-burden.md)
