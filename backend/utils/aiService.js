const { GoogleGenerativeAI } = require('@google/generative-ai');

const MODELS_FALLBACK_SEQUENCE = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-flash-latest'
];

const safeJsonParse = (text) => {
  if (typeof text !== 'string') return text;
  let cleanText = text.trim();

  // Try parsing directly first
  try {
    return JSON.parse(cleanText);
  } catch (_) {
    // continue
  }

  // Remove markdown code fences if present (e.g. ```json ... ``` or ``` ... ```)
  const strippedFence = cleanText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(strippedFence);
  } catch (_) {
    // continue
  }

  // Find the first JSON array or object inside the text
  const arrayMatch = cleanText.match(/\[\s*[\s\S]*\s*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch (_) {
      // continue
    }
  }

  const objMatch = cleanText.match(/\{\s*[\s\S]*\s*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch (_) {
      // continue
    }
  }

  throw new Error('Malformed AI response. Failed to parse valid JSON payload.');
};

/**
 * Executes a prompt using user preferences with fallback support across multiple Gemini models.
 * Handles timeouts, rate limits (429), and service outages (503).
 */
const generateContentWithFallback = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment variables.');
  }

  const temperature = 0.2; // Internal default temperature
  // Primary model pehla configured model hai
  const primaryModel = MODELS_FALLBACK_SEQUENCE[0];
  const modelsToTry = [...MODELS_FALLBACK_SEQUENCE];

  const genAI = new GoogleGenerativeAI(apiKey);
  let lastError = null;

  for (const modelName of modelsToTry) {
    // Har model ke liye attempt karenge
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[AI-Service] Calling ${modelName} (Attempt ${attempt}/2)...`);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: { temperature }
        });

        const result = await model.generateContent(prompt);
        const responseText = result.response.text();
        if (!responseText) {
          throw new Error('Received empty response from Gemini API.');
        }

        // Agar primary model ke alawa kisi fallback model ne answer diya toh switched = true
        const switched = modelName !== primaryModel;
        return {
          text: responseText,
          usedModel: modelName,
          switched
        };
      } catch (err) {
        lastError = err;
        console.warn(
          `[AI-Service] Model ${modelName} Attempt ${attempt} failed: ${err.message}`
        );

        // Agar rate limit (429) ya model availability issue hai toh turant agla model try karo
        const isRateLimit = err.message?.includes('429') || err.message?.includes('quota') || err.message?.includes('ResourceExhausted');
        const isNotFound = err.message?.includes('404') || err.message?.includes('not found');
        if (isRateLimit || isNotFound) {
          console.warn(`[AI-Service] Fast fallback triggered for ${modelName} due to quota/availability.`);
          break;
        }

        if (attempt < 2) {
          console.log(`[AI-Service] Retrying in 1 second...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    console.warn(`[AI-Service] Model ${modelName} failed. Trying next fallback model in sequence...`);
  }

  console.error('[AI-Service] All fallback models failed. Final error details:', lastError);
  throw new Error('The AI analysis service is temporarily unavailable or experiencing high demand. Please try again shortly.');
};

/**
 * Runs fallback content generation and validates JSON schema output.
 */
const generateJSONContentWithFallback = async (prompt) => {
  const result = await generateContentWithFallback(prompt);
  try {
    const parsed = safeJsonParse(result.text);
    return {
      data: parsed,
      usedModel: result.usedModel,
      switched: result.switched
    };
  } catch (err) {
    // If JSON parsing failed, try once more with a clearer instruction to output JSON
    console.warn(`[AI-Service] JSON parsing failed. Retrying prompt with strict formatting...`);
    const retryPrompt = `${prompt}\n\nSTRICT JSON DIRECTIVE: You MUST return a valid JSON payload matching the requested format. Avoid markdown formatting blocks.`;
    const secondResult = await generateContentWithFallback(retryPrompt);
    const parsed = safeJsonParse(secondResult.text);
    return {
      data: parsed,
      usedModel: secondResult.usedModel,
      switched: secondResult.switched
    };
  }
};

module.exports = {
  MODELS_FALLBACK_SEQUENCE,
  generateContentWithFallback,
  generateJSONContentWithFallback,
  safeJsonParse
};
