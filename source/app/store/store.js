
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

import { createStore, applyMiddleware } from 'redux'
import { thunk } from 'redux-thunk'
import { createWrapper } from 'next-redux-wrapper'

import makeRootReducer from './reducer.js'

const makeStore = () => {
  const middleware = [thunk]

  const store = createStore(
    makeRootReducer(),
    applyMiddleware(...middleware)
  )

  return store
}

export const wrapper = createWrapper(makeStore, { debug: false })
