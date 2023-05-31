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

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as vision from '@google-cloud/vision'
import * as logs from './logs';
import config from './config';
import {formatLabels, getTopColors, getVisionRequest, shouldLabelImage} from './util';
import {IAnnotatedImageResponse} from './types';

admin.initializeApp();

const client = new vision.ImageAnnotatorClient();

export const labelImageCustom = functions.storage
  .bucket(process.env.IMG_BUCKET)
  .object()
  .onFinalize(async object => {
    logs.functionTriggered(config);

    if (!shouldLabelImage(object)) {
      return;
    }

    const bucket = admin.storage().bucket(object.bucket);
    const imageContents = await bucket.file(object.name!).download();
    const imageBase64 = Buffer.from(imageContents[0]).toString('base64');

    const request = getVisionRequest(imageBase64);

    logs.labelingImage(object.name!);
    let results: IAnnotatedImageResponse;

    try {
      [results] = await client.annotateImage(request);
    } catch (error) {
      logs.labelingError(object.name!, error);
      return;
    }
    logs.labelingComplete(object.name!);

    let webDetection = results.webDetection;
    let logoAnnotations = results.logoAnnotations;  
    let landmarkAnnotations = results.landmarkAnnotations;
    let labelAnnotations = results.labelAnnotations;
    let fullTextAnnotation = results.fullTextAnnotation; 
    let imagePropertiesAnnotation = results.imagePropertiesAnnotation;  
    let localizedObjectAnnotations = results.localizedObjectAnnotations;

    if (!labelAnnotations) {
      logs.noLabels(object.name!);
      labelAnnotations = [];
    }

    logs.writingToFirestore(object.name!);
    // prevent from creating a document with a slash in the name

    const filePath = `gs://${object.bucket}/${object.name}`;

    const data = {
      // text: textAnnotations,
      // imageProperties: imagePropertiesAnnotation,
      file: filePath,
      name: object.name,
      logos: logoAnnotations,   
      dateTimestamp: Date.now() / 1000 | 0,         
      web: webDetection?.webEntities || null,
      landmarks: landmarkAnnotations || null,      
      fullText: fullTextAnnotation?.text || null,      
      location: object.metadata?.location || null, //this is only present when uploading from the app
      labels: formatLabels(labelAnnotations),      
      localizedObjects: localizedObjectAnnotations,
      dominantColors: getTopColors(imagePropertiesAnnotation),
      url: `https://storage.googleapis.com/${object.bucket}/${object.name}`,
    };

    const snapshot = await admin
      .firestore()
      .collection(config.collectionPath)
      .where('file', '==', filePath)
      .get();

    // if document with file field filePath already exists, overwrite it
    if (!snapshot.empty) {
      const docId = snapshot.docs[0].id;
      await admin
        .firestore()
        .collection(config.collectionPath)
        .doc(docId)
        .set(data, {merge: true});
    } else {
      await admin.firestore().collection(config.collectionPath).add(data);
    }
  });
