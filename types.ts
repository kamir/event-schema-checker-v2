export enum SchemaType {
    NONE = 'none',
    JSON_API = 'json-api',
    GEO_JSON = 'geojson',
    ODATA = 'odata',
    CLOUD_EVENT = 'cloudevent',
    CUSTOM_EXTRACTED = 'custom-extracted',
    CUSTOM_FLATTENED = 'custom-flattened',
}

export interface SchemaDefinition {
    key: SchemaType;
    name: string;
    description: string;
}

export interface CheckResult {
    pass: boolean;
    error?: string;
    message?: string;
}

export interface AiAnalysis {
    interpretation: string;
    solution: string;
}

export interface ValidationReport {
    success: boolean;
    syntaxCheck: CheckResult;
    schemaCheck: CheckResult;
    aiAnalysis: AiAnalysis | null;
}
