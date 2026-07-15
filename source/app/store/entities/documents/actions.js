
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

import { createAction } from "redux-actions";
import { either, isEmpty, isNil, lensPath, reject, view } from "ramda";
import { normalize } from "normalizr";
import { fetchAuthSession } from "aws-amplify/auth";
import { downloadData, getUrl } from "aws-amplify/storage";
import { v4 as uuid } from "uuid";

import {
  SUBMIT_DOCUMENTS,
  SUBMIT_DOCUMENT,
  FETCH_DOCUMENTS,
  FETCH_DOCUMENT,
  REDACT_DOCUMENT,
  HIGHLIGHT_DOCUMENT
} from "../../../constants/action-types";
import { documentsSchema, documentSchema } from "./data";

const API_GATEWAY = process.env.NEXT_PUBLIC_API_GATEWAY || "";
const REGION = process.env.NEXT_PUBLIC_REGION || "";
const API_BASE_URL = `https://${API_GATEWAY}.execute-api.${REGION}.amazonaws.com/prod/`;

async function getAuthToken() {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString() || "";
}

async function apiGet(path, queryParams = {}) {
  const token = await getAuthToken();
  const qs = new URLSearchParams(queryParams).toString();
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` }
  });
  return { data: await response.json() };
}

async function apiPost(path, body = {}) {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  return { data: await response.json() };
}

async function apiDelete(path, queryParams = {}) {
  const token = await getAuthToken();
  const qs = new URLSearchParams(queryParams).toString();
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });
  return { data: await response.json() };
}

const lensNextToken = lensPath(["data", "nextToken"]);
const lensDocumentsTotal = lensPath(["data", "Total"]);
const lensDocumentsData = lensPath(["data", "documents"]);
const lensDocumentData = lensPath(["data"]);

export const submitDocument = createAction(
  SUBMIT_DOCUMENT,
  async ({ sample, key }) => {
    const response = await apiPost("document", {
      sample: !!sample,
      key
    });

    const data = view(lensDocumentData, response);
    return data;
  }
);

export const submitDocuments = createAction(
  SUBMIT_DOCUMENTS,
  async ({ objects }) => {
    const response = await apiPost("document", {
      objects
    });

    const data = view(lensDocumentData, response);
    return data;
  }
);

/**
 * Get documents from TextractDemoTextractAPIs
 */
export const fetchDocuments = createAction(
  FETCH_DOCUMENTS,
  async ({ nextToken: nexttoken } = {}) => {
    const response = await apiGet("documents", reject(either(isNil, isEmpty), {
      nexttoken,
      type: "user"
    }));
    const documentsNextToken = view(lensNextToken, response) || null;
    const documentsTotal = view(lensDocumentsTotal, response);
    const documents = view(lensDocumentsData, response).map(document => ({
      ...document,
      documentName: document.objectName.replace(/^.*\//, "")
    }));
    const { entities } = normalize(documents, documentsSchema);
    const meta = reject(isNil, { documentsNextToken, documentsTotal });
    return { ...entities, meta };
  }
);

export const fetchSingleDocument = createAction(
  FETCH_DOCUMENT,
  async documentid => {
    const response = await apiGet("document", { documentid });

    const document = view(lensDocumentData, response);

    return normalize(document, documentSchema).entities;
  }
);

/**
 * Get document from TextractDemoTextractAPI
 */
export const fetchDocument = createAction(FETCH_DOCUMENT, async documentid => {
  const response = await apiGet("document", { documentid });

  const document = view(lensDocumentData, response);
  const { documentId, objectName, bucketName } = document;

  // Remove the last slash and everything before it
  const documentName = objectName.replace(/^.*\//, "");
  const fileNameWithoutExtension = documentName.split(".")[0]
  // Amplify prepends public/ to the path, so we have to strip it
  const documentPublicSubPath = objectName.replace("public/", "");
  const resultDirectory = `${documentId}/output`;
  const textractResponsePath = `${resultDirectory}/textract/response.json`;
  const comprehendMedicalResponsePath = `${resultDirectory}/comprehend/comprehendMedicalEntities.json` 
  const comprehendResponsePath = `${resultDirectory}/comprehend/comprehendEntities.json` 
  
  
  // Download files from S3 using Amplify v6 downloadData
  const [documentData, searchablePdfData] = await Promise.all([
    downloadData({ path: `public/${documentPublicSubPath}` }).result,
    downloadData({ path: `public/${resultDirectory}/${fileNameWithoutExtension}-searchable.pdf` }).result
  ]);

  const documentBlob = await documentData.body.blob();
  const searchablePdfBlob = await searchablePdfData.body.blob();

  // Get the raw textract response data from a json file on S3
  const s3Response = await downloadData({ path: `public/${textractResponsePath}` }).result;
  const s3ResponseText = await (await s3Response.body.blob()).text();
  const textractResponse = JSON.parse(s3ResponseText);

  // Get the raw comprehend medical response data from a json file on S3
  const s3ComprehendMedicalResponse = await downloadData({ path: `public/${comprehendMedicalResponsePath}` }).result;
  const s3ComprehendMedicalResponseText = await (await s3ComprehendMedicalResponse.body.blob()).text();
  const comprehendMedicalRespone = JSON.parse(s3ComprehendMedicalResponseText);
  // Get the raw comprehend response data from a json file on S3
  const s3ComprehendResponse = await downloadData({ path: `public/${comprehendResponsePath}` }).result;
  const s3ComprehendResponseText = await (await s3ComprehendResponse.body.blob()).text();
  const comprehendRespone = JSON.parse(s3ComprehendResponseText);

  return normalize(
    {
      ...document,
      documentURL: URL.createObjectURL(documentBlob),
      searchablePdfURL: URL.createObjectURL(searchablePdfBlob),
      documentName,
      textractResponse,
      textractFetchedAt: Date.now(),
      comprehendMedicalRespone,
      comprehendRespone,
      resultDirectory
    },
    documentSchema
  ).entities;

});

export const deleteDocument = createAction(FETCH_DOCUMENT, async documentid => {
  const response = await apiDelete("document", { documentid });

  return normalize(
    {
      documentId: documentid,
      deleted: true
    },
    documentSchema
  ).entities;
});

export const addRedactions = createAction(
  REDACT_DOCUMENT,
  (documentId, pageNumber, redactions) => {
    const keyedRedactions = redactions.reduce((acc, r) => {
      acc[uuid()] = r;
      return acc;
    }, {});


    return normalize(
      {
        documentId,
        redactions: { [pageNumber]: keyedRedactions }
      },
      documentSchema
    ).entities;
  }
);

export const addHighlights = createAction(
  HIGHLIGHT_DOCUMENT,
  
  (documentId, pageNumber, highlights) => {
    const response = normalize(
      {
        documentId,
        highlights:  highlights
      },
      documentSchema
    ).entities

    return response;
  });


export const clearRedactions = createAction(REDACT_DOCUMENT, documentId => {
  return normalize(
    {
      documentId,
      redactions: false
    },
    documentSchema
  ).entities;
});

export const clearHighlights = createAction(HIGHLIGHT_DOCUMENT, documentId => {
  return normalize(
    {
      documentId,
      highlights: []
    },
    documentSchema
  ).entities;
});
