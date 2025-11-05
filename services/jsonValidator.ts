import { SchemaType, CheckResult } from '../types';

interface ValidationResult {
    success: boolean;
    syntaxCheck: CheckResult;
    schemaCheck: CheckResult;
}

const performSchemaCheck = (jsonObject: any, schema: SchemaType): CheckResult => {
    if (schema === SchemaType.NONE) {
        return { pass: true, message: "No schema selected for validation." };
    }

    try {
        switch (schema) {
            case SchemaType.JSON_API:
                if (!('data' in jsonObject)) {
                    return { pass: false, message: "Missing top-level 'data' key required by JSON:API specification." };
                }
                return { pass: true };

            case SchemaType.GEO_JSON:
                if (!('type' in jsonObject) || !(['Feature', 'FeatureCollection', 'Point', 'LineString', 'Polygon'].includes(jsonObject.type))) {
                    return { pass: false, message: "Missing or invalid 'type' key for GeoJSON object." };
                }
                if (jsonObject.type === 'FeatureCollection' && !('features' in jsonObject)) {
                    return { pass: false, message: "GeoJSON FeatureCollection is missing 'features' array." };
                }
                return { pass: true };

            case SchemaType.ODATA:
                 if (!('@odata.context' in jsonObject) && !('value' in jsonObject)) {
                    return { pass: false, message: "Missing '@odata.context' or 'value' key, common in OData JSON." };
                 }
                 if ('value' in jsonObject && !Array.isArray(jsonObject.value)) {
                    return { pass: false, message: "The 'value' key in OData should be an array." };
                 }
                return { pass: true };

            case SchemaType.CLOUD_EVENT:
                const requiredKeys = ['id', 'source', 'specversion', 'type'];
                const missingKeys = requiredKeys.filter(key => !(key in jsonObject));
        
                if (missingKeys.length > 0) {
                    return { pass: false, message: `Missing required CloudEvent keys: ${missingKeys.join(', ')}.` };
                }
                if (jsonObject.specversion !== '1.0') {
                    return { pass: false, message: `Invalid 'specversion'. CloudEvents v1.0 requires "1.0", but found "${jsonObject.specversion}".` };
                }
                return { pass: true };


            default:
                return { pass: true, message: "Schema validation not implemented for this type." };
        }
    } catch (e) {
        return { pass: false, message: `An unexpected error occurred during schema validation: ${(e as Error).message}`};
    }
};

export const validateJson = (jsonString: string, schema: SchemaType): ValidationResult => {
    if (!jsonString.trim()) {
        return {
            success: false,
            syntaxCheck: { pass: false, error: 'Input is empty.' },
            schemaCheck: { pass: false, message: 'Cannot perform schema check on empty input.' },
        }
    }

    let parsedJson: any;
    try {
        parsedJson = JSON.parse(jsonString);
    } catch (error) {
        return {
            success: false,
            syntaxCheck: { pass: false, error: (error as Error).message },
            schemaCheck: { pass: false, message: 'Schema check skipped due to syntax error.' },
        };
    }

    const schemaCheckResult = performSchemaCheck(parsedJson, schema);

    if (!schemaCheckResult.pass) {
        return {
            success: false,
            syntaxCheck: { pass: true },
            schemaCheck: schemaCheckResult,
        };
    }

    return {
        success: true,
        syntaxCheck: { pass: true },
        schemaCheck: { pass: true },
    };
};