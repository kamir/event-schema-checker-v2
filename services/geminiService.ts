import { GoogleGenAI, Type } from "@google/genai";
import { AiAnalysis, ValidationReport } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getAiAnalysis = async (jsonString: string, errorMessage: string): Promise<AiAnalysis> => {
  const prompt = `
    You are an expert JSON and API schema developer. A user has provided a JSON payload that has failed validation.
    Your task is to analyze the error and provide a clear interpretation and a corrected JSON as a solution.

    Error Message: "${errorMessage}"

    Problematic JSON Payload:
    \`\`\`json
    ${jsonString}
    \`\`\`

    Provide your analysis in the following JSON format. Do not include any other text or markdown fences.
    The 'solution' field must contain a valid JSON string that fixes the error.
  `;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      interpretation: {
        type: Type.STRING,
        description: "A clear, concise explanation of what the error message means in the context of the provided JSON.",
      },
      solution: {
        type: Type.STRING,
        description: "The corrected JSON payload as a single string. This string should be parseable as valid JSON.",
      },
    },
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    // The model might return a JSON object for the solution, which needs to be stringified.
    if (typeof parsed.solution !== 'string') {
        parsed.solution = JSON.stringify(parsed.solution, null, 2);
    }
    return parsed;
  } catch (error) {
    console.error("Gemini API call for analysis failed:", error);
    const errorMessage = (error as any)?.response?.data?.error?.message || (error as Error).message;
    throw new Error(`Failed to get analysis from AI service: ${errorMessage}`);
  }
};

export const validateWithCustomSchema = async (jsonString: string, schemaString: string): Promise<ValidationReport> => {
    // 1. Perform initial syntax check locally
    if (!jsonString.trim()) {
        return {
            success: false,
            syntaxCheck: { pass: false, error: 'Input is empty.' },
            schemaCheck: { pass: false, message: 'Cannot perform schema check on empty input.' },
            aiAnalysis: null,
        }
    }
    try {
        JSON.parse(jsonString);
    } catch (error) {
        return {
            success: false,
            syntaxCheck: { pass: false, error: (error as Error).message },
            schemaCheck: { pass: false, message: 'Schema check skipped due to syntax error.' },
            aiAnalysis: null,
        };
    }

    // 2. Ask Gemini to perform schema validation
    const prompt = `
      You are a JSON Schema validator.
      Here is the JSON Schema to validate against:
      \`\`\`json
      ${schemaString}
      \`\`\`
      Here is the JSON object to validate:
      \`\`\`json
      ${jsonString}
      \`\`\`
      Does the JSON object validate successfully against the schema?
      Please respond ONLY with a JSON object in the specified format. Do not include any other text or markdown fences.
    `;

    const responseSchema = {
        type: Type.OBJECT,
        properties: {
            pass: { type: Type.BOOLEAN, description: "Whether the validation passed." },
            reason: { type: Type.STRING, description: "The reason for failure. Provide an empty string if it passed." },
        },
    };

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.0,
                responseMimeType: "application/json",
                responseSchema: responseSchema,
            },
        });

        const validationResult = JSON.parse(response.text || '{}');

        return {
            success: validationResult.pass,
            syntaxCheck: { pass: true },
            schemaCheck: {
                pass: validationResult.pass,
                message: validationResult.pass ? "Validation against custom schema successful." : validationResult.reason,
            },
            aiAnalysis: null, // The "reason" from AI serves as the analysis
        };
    } catch (error) {
        console.error("Gemini API call for custom validation failed:", error);
        const errorMessageStr = (error as any)?.response?.data?.error?.message || (error as Error).message;
        // Construct a failure report
        return {
            success: false,
            syntaxCheck: { pass: true },
            schemaCheck: { pass: false, message: `AI validation service failed: ${errorMessageStr}` },
            aiAnalysis: null,
        }
    }
};


const generateSchema = async (jsonInput: string, promptInstruction: string): Promise<string> => {
  const prompt = `
    ${promptInstruction}
    The output must be only the raw JSON schema string, without any explanatory text or markdown code fences like \`\`\`json.

    Here is the input JSON to process:
    \`\`\`json
    ${jsonInput}
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.1,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingBudget: 4096 },
      },
    });

    let cleanedText = (response.text || '').trim();
    // The model sometimes returns markdown fences despite the prompt.
    // This regex removes the opening and closing fences.
    cleanedText = cleanedText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');

    return cleanedText.trim();
  } catch (error) {
    console.error("Gemini API call for schema generation failed:", error);
    const errorMessage = (error as any)?.response?.data?.error?.message || (error as Error).message;
    throw new Error(`Failed to get analysis from AI service: ${errorMessage}`);
  }
};

export const extractSchema = (jsonInput: string): Promise<string> => {
  const instruction = "You are an expert API developer. Your task is to extract a valid JSON Schema from the provided example JSON event. The schema should infer data types (string, number, boolean, array, object), identify required fields, and provide a basic description for each field based on its key name.";
  return generateSchema(jsonInput, instruction);
};

export const flattenSchema = (jsonInput: string): Promise<string> => {
  const instruction = "You are an expert API developer. Your task is to analyze the provided JSON event and generate a JSON Schema for it. The schema should be 'cleaned' and 'flattened' for readability. 'Cleaned' means every property has a clear, concise description. 'Flattened' in this context means that for any nested objects, you should provide a description that clarifies its structure, but the schema itself must remain a valid, well-structured JSON Schema. Avoid overly complex nested structures if a simpler representation is possible without losing information.";
  return generateSchema(jsonInput, instruction);
};

export const generateIcebergSchema = (jsonSchemaString: string): Promise<string> => {
  const instruction = `
    You are an expert data engineer specializing in Apache Iceberg. Convert the following JSON Schema into a valid Apache Iceberg schema format, represented as a JSON object.

    Conversion Rules:
    1. Map JSON Schema types to Iceberg types (e.g., string -> string, number -> double, integer -> long, boolean -> boolean, array -> list, object -> struct).
    2. Sanitize all field names to be compatible with Avro/Iceberg: names must start with a letter or underscore and contain only letters, numbers, and underscores. Replace invalid characters (e.g., '-', ' ') with an underscore.
    3. Each field must have a unique integer 'id', a 'name', a 'type', and a 'required' boolean flag. Start IDs from 1 and increment sequentially.
    4. For arrays, the 'list' type must define its 'element' type, which also needs a unique ID and an 'element_required' flag.
    5. The top-level schema must be a struct with a "type": "struct" and a "fields" array.
    6. The output must be ONLY the raw JSON of the Iceberg schema, without any explanatory text or markdown fences.
  `;
  return generateSchema(jsonSchemaString, instruction);
};

export const performComplianceCheck = async (jsonInput: string): Promise<string> => {
  const prompt = `
    You are a data privacy and compliance expert with deep knowledge of regulations like GDPR, CCPA, and HIPAA.
    Your task is to analyze the following JSON payload for any Personally Identifiable Information (PII).
    PII includes, but is not limited to: names, email addresses, physical addresses, phone numbers, IP addresses, user IDs, geolocation data, and health information.

    Provide a detailed report in Markdown format. The report must include the following sections:
    1.  **## Summary of Findings**: A brief overview of whether PII was detected and the overall risk level.
    2.  **## Identified PII Fields**: A markdown table with the columns: "Field Path", "Value", "PII Type", and "Risk Level".
        - "Field Path": The JSON path to the field (e.g., \`user.profile.email\`).
        - "Value": The value of the identified field. Mask sensitive parts of the value (e.g., show "j***n@example.com").
        - "PII Type": The category of PII (e.g., "Email Address", "IP Address").
        - "Risk Level": Your assessment of the risk (Low, Medium, High).
    3.  **## Associated Risks**: An explanation of the potential risks if this data were exposed, such as identity theft, phishing, or regulatory fines.
    4.  **## Mitigation Recommendations**: Actionable suggestions for protecting the identified data, such as masking, tokenization, encryption, or access control.

    If no PII is found, state that clearly in the summary and omit the other sections.
    The output must be only the raw markdown string, without any explanatory text or markdown code fences like \`\`\`markdown.

    Here is the JSON payload to analyze:
    \`\`\`json
    ${jsonInput}
    \`\`\`
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });

    let cleanedText = (response.text || '').trim();
    // The model sometimes returns markdown fences despite the prompt.
    cleanedText = cleanedText.replace(/^```(markdown)?\n?/, '').replace(/\n?```$/, '');

    return cleanedText.trim();
  } catch (error) {
    console.error("Gemini API call for compliance check failed:", error);
    const errorMessage = (error as any)?.response?.data?.error?.message || (error as Error).message;
    throw new Error(`Failed to get analysis from AI service: ${errorMessage}`);
  }
};