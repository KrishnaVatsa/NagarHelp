import * as tf from '@tensorflow/tfjs-node';
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let model = null;

// Path to the converted TensorFlow.js model (model.json + shard .bin files)
const MODEL_DIR = path.join(__dirname, '../../models');
const MODEL_URL = `file://${path.join(MODEL_DIR, 'model.json')}`;


// Model contract (4-class classifier, trained via Kaggle notebook v3):
// - Input: 224x224x3, pixels scaled to [0, 1] (rescale=1./255)
// - Output: 4-unit softmax. Classes assigned alphabetically by
//   flow_from_directory: ['garbage', 'normal', 'pothole', 'water_issue']
// - 'normal' = not a civic issue (negative class)
const INPUT_SIZE = 224;
const CONFIDENCE_THRESHOLD = 0.5;
const CLASS_NAMES = ['garbage', 'normal', 'pothole', 'water_issue'];
const MODEL_VERSION = 'mobilenetv2-civic-v3-4class-tfjs';

// Load the TensorFlow.js model (cached after first load)
export const loadCivicDetectorModel = async () => {
  try {
    if (model) return model;

    console.log('Loading civic detector model from:', MODEL_URL);
    model = await tf.loadLayersModel(MODEL_URL);
    console.log('✓ Civic detector model loaded successfully');

    return model;
  } catch (error) {
    console.error('Error loading civic detector model:', error);
    model = null;
    throw new Error('Failed to load civic detector model');
  }
};

// Preprocess image for the model: resize to 224x224, scale pixels to [0, 1], add batch dim
const preprocessImage = async (imagePath) => {
  let tensor = null;
  let floatTensor = null;
  let normalized = null;

  try {
    const resizedBuffer = await sharp(imagePath)
      .resize(INPUT_SIZE, INPUT_SIZE, { fit: 'cover' })
      .removeAlpha()
      .raw()
      .toBuffer();

    tensor = tf.tensor3d(new Uint8Array(resizedBuffer), [INPUT_SIZE, INPUT_SIZE, 3], 'int32');
    floatTensor = tensor.toFloat();
    normalized = floatTensor.div(tf.scalar(255.0));

    const batched = normalized.expandDims(0);
    return batched;
  } catch (error) {
    console.error('Error preprocessing image:', error);
    throw new Error('Failed to preprocess image');
  } finally {
    if (tensor) tensor.dispose();
    if (floatTensor) floatTensor.dispose();
    if (normalized) normalized.dispose();
  }
};

// Analyze a single image. expectedClass is the model class name the
// report's category maps to (e.g. 'pothole', 'garbage', 'water_issue').
export const analyzeCivicImage = async (imagePath, expectedClass) => {
  let inputTensor = null;
  let prediction = null;

  try {
    if (!model) {
      await loadCivicDetectorModel();
    }

    inputTensor = await preprocessImage(imagePath);

    prediction = model.predict(inputTensor);
    const probsArray = Array.from(await prediction.data());

    // Build a { className: probability } map
    const probabilities = {};
    CLASS_NAMES.forEach((name, i) => {
      probabilities[name] = parseFloat((probsArray[i] * 100).toFixed(2));
    });

    // Predicted class = highest probability
    const maxIndex = probsArray.indexOf(Math.max(...probsArray));
    const predictedClass = CLASS_NAMES[maxIndex];
    const predictedConfidence = probsArray[maxIndex];

    // "isReal" means: the photo's predicted class matches the category
    // the user selected, AND the model's confidence clears the threshold.
    // Also reject if model thinks the photo is 'normal' (not a civic issue).
    const matchesExpectedCategory = expectedClass ? predictedClass === expectedClass : predictedClass !== 'normal';
    const isReal = matchesExpectedCategory && predictedConfidence >= CONFIDENCE_THRESHOLD;

    return {
      isReal,
      confidence: parseFloat((predictedConfidence * 100).toFixed(2)),
      predictedClass,
      expectedClass: expectedClass || null,
      probabilities,
      modelVersion: MODEL_VERSION,
      analyzedAt: new Date()
    };
  } catch (error) {
    console.error('Error analyzing civic image:', error);
    throw error;
  } finally {
    if (inputTensor) inputTensor.dispose();
    if (prediction) prediction.dispose();
  }
};

// Analyze multiple images against the expected category class
export const analyzeMultipleCivicImages = async (imagePaths, expectedClass) => {
  const results = [];

  for (const imagePath of imagePaths) {
    try {
      const analysis = await analyzeCivicImage(imagePath, expectedClass);
      results.push({
        imagePath,
        analysis,
        success: true
      });
    } catch (error) {
      console.error(`Error analyzing image ${imagePath}:`, error);
      results.push({
        imagePath,
        error: error.message,
        success: false
      });
    }
  }

  return results;
};

// Summarize multiple image analyses
export const summarizeAnalysis = (analysisResults) => {
  const successfulAnalyses = analysisResults
    .filter(r => r.success)
    .map(r => r.analysis);

  if (successfulAnalyses.length === 0) {
    return {
      isReal: false,
      confidence: 0,
      predictedClass: null,
      summary: 'Could not analyze images',
      totalImages: analysisResults.length,
      matchingImages: 0,
      nonMatchingImages: 0
    };
  }

  const matchingCount = successfulAnalyses.filter(a => a.isReal).length;
  const nonMatchingCount = successfulAnalyses.length - matchingCount;
  const avgConfidence = successfulAnalyses.reduce((sum, a) => sum + a.confidence, 0) / successfulAnalyses.length;

  // Majority vote for the overall predicted class
  const classCounts = {};
  successfulAnalyses.forEach(a => {
    classCounts[a.predictedClass] = (classCounts[a.predictedClass] || 0) + 1;
  });
  const predictedClass = Object.keys(classCounts).reduce((a, b) =>
    classCounts[a] > classCounts[b] ? a : b
  );

  // Report considered a real match if majority of images match expected category
  const isRealMatch = matchingCount > nonMatchingCount;

  return {
    isReal: isRealMatch,
    confidence: parseFloat(avgConfidence.toFixed(2)),
    predictedClass,
    summary: `${matchingCount} of ${successfulAnalyses.length} images matched the reported category`,
    totalImages: analysisResults.length,
    matchingImages: matchingCount,
    nonMatchingImages: nonMatchingCount
  };
};

export default {
  loadCivicDetectorModel,
  analyzeCivicImage,
  analyzeMultipleCivicImages,
  summarizeAnalysis
};
