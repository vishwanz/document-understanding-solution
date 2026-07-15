
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

import React, { useEffect, useState, useCallback } from "react";
import Head from "next/head";
import Router, { useRouter } from "next/router";
import { Amplify } from "aws-amplify";
import { fetchAuthSession } from "aws-amplify/auth";
import { times, reject, isNil } from "ramda";
import { Provider } from "react-redux";

import { wrapper } from "../store/store";
import Header from "../components/Header/Header";

import { setSelectedTrack, dismissWalkthrough } from "../store/ui/actions";

import "../styles/global.scss";
import css from "./app.module.module.scss";

const APIGateway = process.env.NEXT_PUBLIC_API_GATEWAY || "";
const bucket = process.env.NEXT_PUBLIC_BUCKET || "";
const identityPoolId = process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || "";
const region = process.env.NEXT_PUBLIC_REGION || "";
const userPoolWebClientId = process.env.NEXT_PUBLIC_USER_POOL_WEB_CLIENT_ID || "";
const userPoolId = process.env.NEXT_PUBLIC_USER_POOL_ID || "";

Amplify.configure({
  Auth: {
    Cognito: {
      identityPoolId,
      userPoolId,
      userPoolClientId: userPoolWebClientId,
    }
  },
  Storage: {
    S3: {
      bucket,
      region
    }
  },
});

// This is a bit of a hack to ensure styles reload on client side route changes.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  Router.events.on("routeChangeComplete", () => {
    const path = "/_next/static/css/styles.chunk.css";
    const chunksSelector = `link[href*="${path}"]`;
    const chunksNodes = document.querySelectorAll(chunksSelector);
    if (chunksNodes.length > 0) {
      const timestamp = new Date().valueOf();
      chunksNodes[0].href = `${path}?${timestamp}`;
    }
  });
}

function MyApp({ Component, ...rest }) {
  const { store, props } = wrapper.useWrappedStore(rest);
  const { pageProps } = props;
  const router = useRouter();
  const pathname = router.pathname;

  useEffect(() => {
    if (typeof localStorage !== "undefined") {
      const cachedTrack = localStorage.getItem("track");
      if (cachedTrack) store.dispatch(setSelectedTrack(cachedTrack));

      const previouslyDismissedWalkthrough = localStorage.getItem("dismissedWalkthrough");
      if (previouslyDismissedWalkthrough) store.dispatch(dismissWalkthrough());
    }
  }, [store]);

  const { pageTitle } = pageProps;

  return (
    <Provider store={store}>
      <Head>
        <title>{pageTitle ? `${pageTitle} | DUS ` : `DUS`}</title>
        <link
          rel="icon"
          type="image/ico"
          href="/static/images/favicon.ico"
        />
        <link
          rel="shortcut icon"
          type="image/ico"
          href="/static/images/favicon.ico"
        />
        <link
          rel="apple-touch-icon"
          sizes="57x57"
          href="/static/images/touch-icon-iphone-114-smile.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="72x72"
          href="/static/images/touch-icon-ipad-144-smile.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="114x114"
          href="/static/images/touch-icon-iphone-114-smile.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="144x144"
          href="/static/images/touch-icon-ipad-144-smile.png"
        />
      </Head>
      <Page pathname={pathname} pageProps={pageProps}>
        <Component {...pageProps} />
      </Page>
    </Provider>
  );
}

function Page({ children, pageProps, pathname }) {
  const { showNavigation, backButton, pageTitle: heading } = pageProps;
  const showGrid = useGridOverlay();

  const isPublicRoute = ["/styleguide"].indexOf(pathname) >= 0;
  const isLoginRoute = pathname === "/";
  const [isLoggedIn, setLoggedIn] = useState("pending");

  const shouldRenderApp =
    isLoggedIn === true || isPublicRoute || (isLoginRoute && !isLoggedIn);

  useEffect(() => {
    if (isPublicRoute) return;

    fetchAuthSession()
      .then(async (session) => {
        if (session.tokens) {
          isLoginRoute && (await Router.push("/home"));
          setLoggedIn(true);
        } else {
          setLoggedIn(false);
          !isLoginRoute && Router.push("/");
        }
      })
      .catch(() => {
        setLoggedIn(false);
        !isLoginRoute && Router.push("/");
      });
  }, [isLoginRoute, isPublicRoute]);

  return (
    shouldRenderApp && (
      <div className={css.container}>
        <Header {...reject(isNil, { heading, showNavigation, backButton })} />

        <main>{children}</main>

        {showGrid && (
          <div className={css.gridContainer}>
            {times(
              i => (
                <div key={i} className={css.gridCol} />
              ),
              12
            )}
          </div>
        )}
      </div>
    )
  );
}

/**
 * This is a helper utility that will overlay a grid on top of the app.
 * (Press control + L to toggle the grid)
 */
function useGridOverlay() {
  const [showGrid, setShowGrid] = useState(false);

  const handleKeyUp = useCallback(e => {
    const L = 76;
    const { ctrlKey, keyCode } = e;

    if (ctrlKey && keyCode === L) {
      e.preventDefault();
      setShowGrid(showGrid => !showGrid);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyUp]);

  return showGrid;
}

export default wrapper.withRedux(MyApp);
