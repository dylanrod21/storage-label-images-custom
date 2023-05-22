/*
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

function paramToArray(param: unknown) {
  return typeof param === 'string' ? param.split(',') : undefined;
}

//hardcoding for testing purposes 
export default {
  collectionPath: process.env.COLLECTION_PATH || 'imageLabelsCustom',
  bucketName: process.env.IMG_BUCKET || 'streetview-explorer-387404',
  includePathList: paramToArray(process.env.INCLUDE_PATH_LIST || '/gsv-images-to-custom-label'),
  excludePathList: paramToArray(process.env.EXCLUDE_PATH_LIST),
  mode: process.env.LABEL_MODE === 'basic' ? 'basic' : 'full',
};

// export default {
//   collectionPath: process.env.COLLECTION_PATH || 'imageLabels',
//   bucketName: process.env.IMG_BUCKET,
//   includePathList: paramToArray(process.env.INCLUDE_PATH_LIST),
//   excludePathList: paramToArray(process.env.EXCLUDE_PATH_LIST),
//   mode: process.env.LABEL_MODE === 'basic' ? 'basic' : 'full',
// };
