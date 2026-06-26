// import * as tf from '@tensorflow/tfjs';
// import sharp from 'sharp';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// let model = null;
// const MODEL_PATH = path.join(__dirname, '../../../nagarhelp_civic_detector/nagarhelp_civic_detector.keras');
// const CONFIG_PATH = path.join(__dirname, '../../../nagarhelp_civic_detector/model_config.json');

// // Load model configuration
// const loadConfig = () => {
//   try {
//     const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
//     return JSON.parse(configData);
//   } catch (error) {
//     console.error('Error loading model config:', error);
//     return null;
//   }
// };

// const config = loadConfig();

// // // Load the Keras model
// // export const loadCivicDetectorModel = async () => {
// //   try {
// //     if (model) return model;
    
// //     console.log('Loading civic detector model...');
// //     console.warn('⚠️  .keras model loading requires tfjs-node (currently disabled on Windows)');
// //     console.warn('Model analysis will be skipped, but server will run normally');
    
// //     // For now, return a stub to allow server to start
// //     // TODO: Re-enable tfjs-node or convert model to SavedModel format
// //     model = { 
// //       predict: () => { throw new Error('Model not loaded'); }
// //     };
// //     return model;
// //   } catch (error) {
// //     console.error('Error loading civic detector model:', error);
// //     throw new Error('Failed to load civic detector model');
// //   }
// // };

// //############Replaced with
// export const loadCivicDetectorModel = async () => {
//   console.warn('⚠️  ML model running in fallback mode');
//   model = {
//     predict: () => { throw new Error('Model not loaded - using fallback'); }
//   };
//   return model;
// };

// // Preprocess image for the model
// const preprocessImage = async (imagePath) => {
//   try {
//     const inputSize = config.input_size[0]; // 224
    
//     // Read and resize image using Sharp
//     const metadata = await sharp(imagePath).metadata();
//     const resizedBuffer = await sharp(imagePath)
//       .resize(inputSize, inputSize, { fit: 'cover' })
//       .raw()
//       .toBuffer();
    
//     // Create tensor from raw pixel buffer (RGB format)
//     const tensor = tf.tensor3d(
//       new Uint8Array(resizedBuffer),
//       [inputSize, inputSize, 3],
//       'uint8'
//     );
    
//     // Normalize using EfficientNet preprocessing
//     let normalized = tensor.cast('float32').div(tf.scalar(255.0));
    
//     // Add batch dimension
//     const batched = normalized.expandDims(0);
    
//     // Clean up
//     tensor.dispose();
//     normalized.dispose();
    
//     return batched;
//   } catch (error) {
//     console.error('Error preprocessing image:', error);
//     throw new Error('Failed to preprocess image');
//   }
// };

// // // Analyze image using the civic detector model
// // export const analyzeCivicImage = async (imagePath) => {
// //   let inputTensor = null;
  
// //   try {
// //     // Load model if not already loaded
// //     if (!model) {
// //       await loadCivicDetectorModel();
// //     }

// //     // Preprocess image
// //     inputTensor = await preprocessImage(imagePath);

// //     // Run prediction
// //     const prediction = model.predict(inputTensor);
// //     const predictionData = await prediction.data();

// //     // Get probabilities
// //     const notCivicProb = parseFloat(predictionData[0]);
// //     const civicProb = parseFloat(predictionData[1]);

// //     // Determine result based on threshold
// //     const threshold = config.threshold || 0.5;
// //     const isCivic = civicProb >= threshold;
// //     const confidence = Math.max(notCivicProb, civicProb);

// //     // Clean up tensors
// //     inputTensor.dispose();
// //     prediction.dispose();

// //     return {
// //       isReal: isCivic,
// //       confidence: parseFloat((confidence * 100).toFixed(2)),
// //       category: isCivic ? config.classes['1'] : config.classes['0'],
// //       probabilities: {
// //         notCivic: parseFloat((notCivicProb * 100).toFixed(2)),
// //         civic: parseFloat((civicProb * 100).toFixed(2))
// //       },
// //       modelVersion: config.model_version,
// //       analyzedAt: new Date()
// //     };
// //   } catch (error) {
// //     console.error('Error analyzing civic image:', error);
// //     if (inputTensor) inputTensor.dispose();
// //     throw error;
// //   }
// // };

// //######Replaced with
// export const analyzeCivicImage = async (imagePath) => {
//   return {
//     isReal: true,
//     confidence: 85.00,
//     category: 'civic',
//     probabilities: { notCivic: 15.00, civic: 85.00 },
//     modelVersion: 'fallback-v1',
//     analyzedAt: new Date()
//   };
// };

// // Analyze multiple images and return analysis results
// export const analyzeMultipleCivicImages = async (imagePaths) => {
//   const results = [];
  
//   for (const imagePath of imagePaths) {
//     try {
//       const analysis = await analyzeCivicImage(imagePath);
//       results.push({
//         imagePath,
//         analysis,
//         success: true
//       });
//     } catch (error) {
//       console.error(`Error analyzing image ${imagePath}:`, error);
//       results.push({
//         imagePath,
//         error: error.message,
//         success: false
//       });
//     }
//   }
  
//   return results;
// };

// // Summarize multiple image analyses
// export const summarizeAnalysis = (analysisResults) => {
//   const successfulAnalyses = analysisResults
//     .filter(r => r.success)
//     .map(r => r.analysis);

//   if (successfulAnalyses.length === 0) {
//     return {
//       isReal: false,
//       confidence: 0,
//       summary: 'Could not analyze images',
//       totalImages: analysisResults.length,
//       civicImages: 0,
//       nonCivicImages: 0
//     };
//   }

//   const civicCount = successfulAnalyses.filter(a => a.isReal).length;
//   const nonCivicCount = successfulAnalyses.length - civicCount;
//   const avgConfidence = successfulAnalyses.reduce((sum, a) => sum + a.confidence, 0) / successfulAnalyses.length;

//   // Report is considered civic if majority of images are civic
//   const isRealCivic = civicCount > nonCivicCount;

//   return {
//     isReal: isRealCivic,
//     confidence: parseFloat(avgConfidence.toFixed(2)),
//     summary: `${civicCount} of ${successfulAnalyses.length} images classified as civic issues`,
//     totalImages: analysisResults.length,
//     civicImages: civicCount,
//     nonCivicImages: nonCivicCount
//   };
// };

// export default {
//   loadCivicDetectorModel,
//   analyzeCivicImage,
//   analyzeMultipleCivicImages,
//   summarizeAnalysis
// };

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

// Model contract (confirmed from training notebook):
// - Input: 224x224x3, pixels scaled to [0, 1] (rescale=1./255, no MobileNetV2 preprocess_input)
// - Output: single sigmoid neuron. flow_from_directory assigned classes alphabetically:
//     'normal' -> 0 (not a civic issue), 'pothole' -> 1 (civic issue)
//   So a HIGH score (close to 1) means "civic issue", LOW score (close to 0) means "not civic".
const INPUT_SIZE = 224;
const THRESHOLD = 0.5;
const CLASSES = { 0: 'not_civic', 1: 'civic_issue' };
const MODEL_VERSION = 'mobilenetv2-civic-v1-tfjs';

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

// Analyze image using the civic detector model
export const analyzeCivicImage = async (imagePath) => {
  let inputTensor = null;
  let prediction = null;

  try {
    if (!model) {
      await loadCivicDetectorModel();
    }

    inputTensor = await preprocessImage(imagePath);

    prediction = model.predict(inputTensor);
    const predictionData = await prediction.data();

    // Single sigmoid output: predictionData[0] is P(civic issue)
    const civicProb = parseFloat(predictionData[0]);
    const notCivicProb = 1 - civicProb;

    const isCivic = civicProb >= THRESHOLD;
    const confidence = isCivic ? civicProb : notCivicProb;

    return {
      isReal: isCivic,
      confidence: parseFloat((confidence * 100).toFixed(2)),
      category: isCivic ? CLASSES[1] : CLASSES[0],
      probabilities: {
        notCivic: parseFloat((notCivicProb * 100).toFixed(2)),
        civic: parseFloat((civicProb * 100).toFixed(2))
      },
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

// Analyze multiple images and return analysis results
export const analyzeMultipleCivicImages = async (imagePaths) => {
  const results = [];

  for (const imagePath of imagePaths) {
    try {
      const analysis = await analyzeCivicImage(imagePath);
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
      summary: 'Could not analyze images',
      totalImages: analysisResults.length,
      civicImages: 0,
      nonCivicImages: 0
    };
  }

  const civicCount = successfulAnalyses.filter(a => a.isReal).length;
  const nonCivicCount = successfulAnalyses.length - civicCount;
  const avgConfidence = successfulAnalyses.reduce((sum, a) => sum + a.confidence, 0) / successfulAnalyses.length;

  // Report is considered civic if majority of images are civic
  const isRealCivic = civicCount > nonCivicCount;

  return {
    isReal: isRealCivic,
    confidence: parseFloat(avgConfidence.toFixed(2)),
    summary: `${civicCount} of ${successfulAnalyses.length} images classified as civic issues`,
    totalImages: analysisResults.length,
    civicImages: civicCount,
    nonCivicImages: nonCivicCount
  };
};

export default {
  loadCivicDetectorModel,
  analyzeCivicImage,
  analyzeMultipleCivicImages,
  summarizeAnalysis
};