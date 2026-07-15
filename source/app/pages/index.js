
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

import React, { useState, useCallback } from "react";
import Router from "next/router";
import { signIn, confirmSignIn } from "aws-amplify/auth";

import Button from "../components/Button/Button";
import FormInput from "../components/FormInput/FormInput";
import Loading from "../components/Loading/Loading";

import css from "./login.module.scss";

Login.getInitialProps = function() {
  return {
    pageTitle: "Document Understanding Solution"
  };
};

export default function Login() {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
    passwordChangeRequired: false,
    newPassword: "",
    userInit: undefined
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const {
    username,
    password,
    passwordChangeRequired,
    newPassword,
    userInit
  } = credentials;

  let userInputForm;

  const handleLoginSubmit = useCallback(
    async e => {
      e.preventDefault();
      setIsLoading(true);
      try {
        const result = await signIn({ username, password });
        if (result.nextStep && result.nextStep.signInStep === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
          setCredentials({
            passwordChangeRequired: true,
            userInit: result
          });
          setIsLoading(false);
        } else if (result.isSignedIn) {
          Router.push("/home");
        }
      } catch (err) {
        setError(err.message || "Login failed");
        setIsLoading(false);
      }
    },
    [username, password, passwordChangeRequired, userInit]
  );

  const handlePasswordResetSubmit = useCallback(
    async e => {
      e.preventDefault();
      setIsLoading(true);
      try {
        const result = await confirmSignIn({ challengeResponse: newPassword });
        if (result.isSignedIn) {
          Router.push("/home");
        }
      } catch (err) {
        setError(err.message || "Password reset failed");
        setIsLoading(false);
      }
    },
    [userInit, newPassword]
  );

  const handleFormChange = useCallback(
    e => {
      const { name, value } = e.target;
      setCredentials(credentials => ({ ...credentials, [name]: value }));
    },
    [username, password, passwordChangeRequired, newPassword, userInit]
  );

  const loginForm = () => {
    return (
      <form onSubmit={handleLoginSubmit}>
        <p>
          <FormInput
            autoComplete="username"
            type="text"
            name="username"
            label="Username"
            value={username}
            onChange={handleFormChange}
          />
        </p>
        <p>
          <FormInput
            autoComplete="current-password"
            type="password"
            name="password"
            label="Password"
            value={password}
            onChange={handleFormChange}
          />
        </p>
        <Button disabled={isLoading}>Login</Button>
        {error && <p className={css.error}>{error}</p>}
      </form>
    );
  };

  const passwordResetForm = () => {
    return (
      <form onSubmit={handlePasswordResetSubmit}>
        <p>
          <FormInput
            autoComplete="new-password"
            type="password"
            name="newPassword"
            label="New Password"
            value={newPassword}
            onChange={handleFormChange}
          />
        </p>
        <Button disabled={isLoading}>Login</Button>
        {error && <p className={css.error}>{error}</p>}
      </form>
    );
  };

  userInputForm = passwordChangeRequired ? passwordResetForm() : loginForm();

  return (
    <article>
      <div className={css.form}>
        <h2>Login</h2>
        {userInputForm}
        {isLoading && <Loading />}
      </div>
    </article>
  );
}
