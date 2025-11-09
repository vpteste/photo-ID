import { GoogleGenAI, Modality, Type } from "@google/genai";
import { AiIntensity, FaceLandmarks } from "../types";

const getPromptForIntensity = (intensity: AiIntensity): string => {
  const baseInstructions = `You are a professional photo retoucher specializing in official identity documents. Your task is to enhance this photograph to meet international standards for clarity and quality. The final image must look natural.

Key Requirements:
- Adjust lighting to be even across the face, removing harsh shadows.
- Correct the color balance for natural and accurate skin tones.
- Enhance brightness and contrast for overall clarity, without overexposing highlights or losing detail in shadows.
- The subject's facial features must remain clear and their facial structure unaltered.
- CRITICAL: Do NOT crop the image. The output dimensions MUST EXACTLY match the input dimensions.
- CRITICAL: Do NOT replace the background. You can subtly clean up minor smudges or shadows in the background, but the original background must be preserved.
- Do not change the subject's hair style or eye color.
- Ensure the final image is sharp and in focus.`;

  switch (intensity) {
    case 'light':
      return `${baseInstructions}

Apply subtle adjustments:
- Gently balance the colors to achieve natural-looking skin tones.
- Make minor corrections to brightness and contrast to improve overall clarity.
- Avoid any noticeable skin smoothing or blemish removal.`;
    case 'strong':
      return `${baseInstructions}

Apply advanced professional retouching for a flawless but natural result:
- Perform precise color correction for perfect skin tones and white balance.
- Masterfully balance lighting, highlights, and shadows to create a perfectly lit portrait.
- Delicately smooth skin texture to reduce minor imperfections and wrinkles, ensuring the result looks completely natural and not airbrushed.
- Remove distracting stray hairs if possible without altering the main hairstyle.
- The goal is the highest quality official photo, ready for printing.`;
    case 'medium':
    default:
      return `${baseInstructions}

Apply standard professional retouching:
- Correct color balance and ensure skin tones are accurate and natural.
- Optimize brightness and contrast for a clear, well-lit portrait.
- Carefully remove minor, temporary blemishes (e.g., pimples) while preserving permanent features like moles or scars.
- The result should be a clean, professional-looking official photo.`;
  }
};

export const enhancePhotoWithAI = async (base64Image: string, mimeType: string, intensity: AiIntensity): Promise<string> => {
  // The API key is required when running in a browser environment.
  // It is automatically provided by the execution environment via process.env.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const textPrompt = getPromptForIntensity(intensity);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: textPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
       throw new Error(`L'IA n'a pas retourné d'image. La requête a été bloquée pour la raison suivante : ${blockReason}.`);
    }

    for (const part of response.candidates?.[0]?.content.parts || []) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    
    throw new Error("L'IA n'a pas retourné d'image. La réponse était vide ou dans un format inattendu.");

  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Gemini:", error);
    if (error instanceof Error) {
        throw new Error(`Échec de l'amélioration de l'image avec l'IA : ${error.message}`);
    }
    throw new Error("Échec de l'amélioration de l'image avec l'IA. Une erreur inconnue est survenue.");
  }
};

export const detectFaceLandmarks = async (base64Image: string, mimeType: string): Promise<FaceLandmarks> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Analyze the provided image. Your task is to identify the location of key facial features. Respond with a JSON object containing the pixel coordinates for the very top of the head (including hair) and the bottom of the chin. The origin (0,0) is the top-left corner of the image. The JSON object must match the provided schema.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            topOfHead: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
              },
            },
            chin: {
              type: Type.OBJECT,
              properties: {
                x: { type: Type.NUMBER },
                y: { type: Type.NUMBER },
              },
            },
          },
        },
      },
    });

    const blockReason = response.promptFeedback?.blockReason;
    if (blockReason) {
        throw new Error(`La requête a été bloquée pour la raison suivante : ${blockReason}.`);
    }

    const jsonText = response.text?.trim();
    if (!jsonText) {
        throw new Error("La réponse de l'IA était vide. La réponse a peut-être été bloquée.");
    }

    return JSON.parse(jsonText) as FaceLandmarks;
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API Gemini pour la détection de visage:", error);
    if (error instanceof Error) {
        throw new Error(`Échec de la détection des repères du visage : ${error.message}`);
    }
    throw new Error("Échec de la détection des repères du visage. L'IA n'a peut-être pas trouvé de visage ou la réponse a été bloquée.");
  }
};