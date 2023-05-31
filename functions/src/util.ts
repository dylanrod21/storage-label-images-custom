import * as path from 'path';
import * as functions from 'firebase-functions';
import config from './config';
import * as logs from './logs';
import {IEntityAnnotation, ImprovedRequest} from './types';

export const startsWithArray = (
  userInputPaths: string[],
  imagePath: string
) => {
  for (const userPath of userInputPaths) {
    const trimmedUserPath = userPath
      .trim()
      .replace(/\*/g, '([a-zA-Z0-9_\\-.\\s\\/]*)?');

    const regex = new RegExp('^' + trimmedUserPath + '(?:/.*|$)');

    if (regex.test(imagePath)) {
      return true;
    }
  }
  return false;
};

export const shouldLabelImage = (
  object: functions.storage.ObjectMetadata
): boolean => {
  if (!object.name) {
    logs.noName();
    return false;
  }
  const tmpFilePath = path.resolve('/', path.dirname(object.name));

  if (
    config.includePathList &&
    !startsWithArray(config.includePathList, tmpFilePath)
  ) {
    logs.imageOutsideOfPaths(config.includePathList, tmpFilePath);
    return false;
  }

  if (
    config.excludePathList &&
    startsWithArray(config.excludePathList, tmpFilePath)
  ) {
    logs.imageInsideOfExcludedPaths(config.excludePathList, tmpFilePath);
    return false;
  }
  const {contentType} = object; // This is the image MIME type
  if (!contentType) {
    logs.noContentType();
    return false;
  }
  if (!contentType.startsWith('image/')) {
    logs.contentTypeInvalid(contentType);
    return false;
  }
  return true;
};

//function to get the top colors from the imageProperties
export function getTopColors(imagePropertiesAnnotation: any) {
  let colors = [];
  let colorCount = 0;
  let colorCountMax = 3;

  if (imagePropertiesAnnotation.dominantColors.colors) {
    for (const color of imagePropertiesAnnotation.dominantColors.colors) {
      if (colorCount < colorCountMax) {
        colors.push(
          rgbToColorName(color.color.red, color.color.green, color.color.blue)
        );
      }
      colorCount++;
    }
  }
  return colors;
}

export function rgbToColorName(r: number, g: number, b: number) {
  let names = [
    'Black',
    'White',
    'Red',
    'Lime',
    'Blue',
    'Yellow',
    'Cyan',
    'Magenta',
    'Silver',
    'Gray',
    'Maroon',
    'Olive',
    'Green',
    'Purple',
    'Teal',
    'Navy',
  ];
  let color = '#';
  let rgb = [r, g, b];
  for (let i = 0; i < 3; i++) {
    let hex = Number(rgb[i]).toString(16);
    if (hex.length < 2) {
      hex = '0' + hex;
    }
    color += hex;
  }
  let index = names.indexOf(color);
  if (index == -1) {
    return color;
  } else {
    return names[index];
  }
}

export function formatLabels(labelAnnotations: IEntityAnnotation[]) {
  const labels = [];
  for (const annotation of labelAnnotations) {
    if (annotation.description) {
      if (config.mode === 'basic') {
        labels.push(annotation.description);
      }
      if (config.mode === 'full') {
        labels.push(annotation);
      }
    }
  }
  return labels;
}

export const getVisionRequest = (imageBase64: string): ImprovedRequest => ({
  image: {
    content: imageBase64,
  },
  imageContext: {
    webDetectionParams: {
      includeGeoResults: true,
    },
  },
  features: [
    {
      type: 'WEB_DETECTION',
    },
    {
      type: 'TEXT_DETECTION'
    },
    {
      type: 'LOGO_DETECTION'
    },
    {
      type: 'LABEL_DETECTION',
    },
    {
      type: 'IMAGE_PROPERTIES'
    },
    {
      type: 'LANDMARK_DETECTION'
    },
    {
      type: 'OBJECT_LOCALIZATION'
    },
  ],
});