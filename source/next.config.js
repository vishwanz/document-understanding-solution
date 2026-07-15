
/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the License). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

const dotenv = require('dotenv')

// Environment configs
const envResult = dotenv.config()
const parsed = envResult.parsed || {}

const {
  APIGateway = '',
  FileBucketName: bucket = '',
  IdentityPoolId: identityPoolId = '',
  region = '',
  UserPoolClientId: userPoolWebClientId = '',
  UserPoolId: userPoolId = '',
  isROMode = 'false'
} = parsed

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_GATEWAY: APIGateway,
    NEXT_PUBLIC_BUCKET: bucket,
    NEXT_PUBLIC_IDENTITY_POOL_ID: identityPoolId,
    NEXT_PUBLIC_REGION: region,
    NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID: userPoolWebClientId,
    NEXT_PUBLIC_USER_POOL_ID: userPoolId,
    NEXT_PUBLIC_IS_RO_MODE: isROMode,
  },
  sassOptions: {
    includePaths: ['./app/styles'],
  },
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
