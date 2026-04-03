const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_KEY_BACKUP = import.meta.env.VITE_GEMINI_API_KEY_BACKUP;

const GEMINI_MODEL = "gemini-1.5-flash-latest"; 

/**
 * Generates a comprehensive 7-day workout and diet plan using Gemini 3 Flash.
 * @param {Object} scanData - Biometric data from MediaPipe.
 * @param {Object} userProfile - Detailed user profile (age, weight, goal, etc.).
 * @param {string} base64Image - Optional base64 encoded image for Real AI vision analysis.
 */
export async function generateTransformationPlan(scanData, userProfile, base64Image = null) {
  // VERSION WATERMARK - Help user verify latest deployment
  console.log("FitMorph Engine: BUILD_ID_8821 - Universal Fallback Active");
  console.log("Generating Expertise-Driven Transformation Plan", { scanData, userProfile, hasImage: !!base64Image });
  
  const prompt = `
You are an expert fitness coach, certified nutritionist, and professional body-recomposition specialist.
Your goal is to provide a highly accurate assessment of a user's physique and a 7-day transformation protocol based on the provided photo and profile data.

USER PROFILE:
- Age: ${userProfile.age || "Not specified"}
- Gender: ${userProfile.gender || "Not specified"}
- Height: ${userProfile.height || "Not specified"}
- Current Weight: ${userProfile.weight || "Not specified"}
- Fitness Goal: ${userProfile.goal || "Not specified"}

PRELIMINARY HEURISTICS (From MediaPipe - potentially inaccurate):
- Estimated Body Fat: ${scanData.bodyFat || "Unknown"}%
- Estimated Muscle Mass: ${scanData.muscleMass || "Unknown"}kg
- Posture: ${scanData.posture || "Unknown"}

CORE TASK:
1. **Visual Truth**: Conduct a deep vision analysis of the uploaded photo.
2. **Prioritize Evidence**: If there is a discrepancy between the User Profile (e.g., Gender mismatch) and the image, or if the Preliminary Heuristics seem impossible (e.g., muscle mass exceeding total body weight limits), YOU MUST OVERRIDE THEM with your visual findings.
3. **AI Precision**: Provide your final, "Real AI" estimated Body Fat % and Muscle Mass.
  4. **Tri-Protocol Programming**: Create THREE distinct 7-day workout protocols:
     - **Standard Workout Plan**: Balanced training based on their goal.
     - **Muscle Focus Plan**: Intensified protocol focusing on strengths/weaknesses and top focus muscle groups. Include specific sets, reps, rest periods, and a clear strategy for progressive overload.
     - **Muscle Recovery Plan**: Comprehensive daily recovery strategy including stretching, mobility, sleep, hydration, and supplements + active recovery protocols.
  5. **Visual Aids & Instructions**: 
     - For every meal, provide a descriptive 'imageSearchTerm' AND a 'recipe' object with 'ingredients' (list) and 'instructions' (list of steps).
     - For every exercise, provide a descriptive 'imageSearchTerm' AND 'formTips' (a professional cue for proper technique).
  6. **Performance Summary**: Include 30-day progress expectations in the 'summary' section.
  7. **Naming**: You MUST name all days 'Monday' through 'Sunday'.

REQUIRED OUTPUT STRUCTURE (JSON ONLY):
{
  "aiAnalysis": {
    "predictedBodyFat": "...", // Number only
    "predictedMuscleMass": "...", // Number only
    "physiqueAssessment": "..."
  },
  "strategy": "...",
  "summary": {
    "targetBodyFat": "...",
    "expectedWeeklyProgress": "...",
    "roadmap30Day": "..."
  },
  "workoutPlan": [ 
    { "day": "...", "focus": "...", "exercises": [ { "name": "...", "sets": "...", "reps": "...", "imageSearchTerm": "...", "formTips": "..." } ] } 
  ],
  "muscleFocusPlan": [
    { "day": "...", "focus": "...", "exercises": [ { "name": "...", "sets": "...", "reps": "...", "imageSearchTerm": "...", "formTips": "..." } ] }
  ],
  "recoveryPlan": [
    { "day": "...", "focus": "...", "exercises": [ { "name": "...", "sets": "...", "reps": "...", "imageSearchTerm": "...", "formTips": "..." } ] }
  ],
  "mealPlan": {
    "days": [
      { 
        "day": "...", 
        "calories": "...", 
        "macros": { "p": "...", "c": "...", "f": "..." }, 
        "meals": { 
          "breakfast": { "title": "...", "imageSearchTerm": "...", "recipe": { "ingredients": ["..."], "instructions": ["..."] } }, 
          "lunch": { ... }, 
          "dinner": { ... } 
        } 
      }
    ],
    "guidelines": { "hydration": "...", "avoid": ["..."] }
  }
}

Format everything cleanly. Provide ONLY the JSON. No markdown backticks.`;

  try {
    return await callGemini(GEMINI_API_KEY, prompt, base64Image);
  } catch (error) {
    console.warn("Primary Gemini Key failed, trying backup...", error);
    if (GEMINI_API_KEY_BACKUP) {
      return await callGemini(GEMINI_API_KEY_BACKUP, prompt, base64Image);
    }
    throw error;
  }
}

async function callGemini(apiKey, prompt, base64Image = null) {
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Check your Vercel Environment Variables.");
  }

  // Comprehensive model pool to handle all regions and account types
  // Including common variants and the user's requested "gemini-3-flash" just in case
  const modelsToTry = [
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash", 
    "gemini-2.0-flash-exp",
    "gemini-1.5-flash-8b",
    "gemini-3-flash", // Non-standard, but specific user request
    "gemini-1.5-pro",
    "gemini-pro"
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      console.log(`Attempting Gemini (${model}) via v1beta...`);
      const parts = [{ text: prompt }];
      
      if (base64Image) {
        const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, "");
        parts.push({
          inline_data: {
            mime_type: "image/jpeg",
            data: cleanBase64
          }
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }]
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Model ${model} failed:`, errorText);
        lastError = new Error(errorText);
        continue; // Try next model
      }

      const data = await response.json();
      return processGeminiResponse(data);
    } catch (err) {
      console.warn(`Connection to ${model} failed:`, err);
      lastError = err;
    }
  }

  throw lastError || new Error("All AI models failed to respond. Please check your API key and network.");
}

function processGeminiResponse(data) {
  try {
    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    let parsedData;
    
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0]);
    } else {
      parsedData = typeof text === 'string' ? JSON.parse(text) : text;
    }
    
    // Normalize the parsed data structure
    const aiAnalysis = parsedData.aiAnalysis || {};
    
    // Clean metrics (strip %, kg, and other noise)
    const cleanMetric = (val) => val ? val.toString().replace(/[^\d.]/g, '') : "---";

    const normalizedData = {
      aiAnalysis: {
        ...aiAnalysis,
        predictedBodyFat: cleanMetric(aiAnalysis.predictedBodyFat),
        predictedMuscleMass: cleanMetric(aiAnalysis.predictedMuscleMass),
      },
      strategy: parsedData.strategy || "Maintain consistency.",
      summary: parsedData.summary || {},
      workoutPlan: parsedData.workoutPlan || parsedData.workout || [],
      muscleFocusPlan: parsedData.muscleFocusPlan || [],
      recoveryPlan: parsedData.recoveryPlan || [],
      mealPlan: parsedData.mealPlan || parsedData.dietPlan || parsedData.diet || { days: [], guidelines: {} }
    };

    // Store in global state
    if (!window.fitmorphData) window.fitmorphData = {};
    window.fitmorphData.aiResponse = normalizedData;
    window.fitmorphData.mealPlan = normalizedData.mealPlan;
    window.fitmorphData.workoutPlan = normalizedData.workoutPlan;
    window.fitmorphData.muscleFocusPlan = normalizedData.muscleFocusPlan;
    window.fitmorphData.recoveryPlan = normalizedData.recoveryPlan;
    
    return normalizedData;
  } catch (e) {
    console.error("Failed to process Gemini response:", e, data);
    throw new Error("Failed to parse AI response. The model might have returned invalid feedback.");
  }
}
