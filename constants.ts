import { SchemaDefinition, SchemaType } from './types';

export const SCHEMAS: SchemaDefinition[] = [
  {
    key: SchemaType.NONE,
    name: 'No Schema',
    description: 'Only basic JSON syntax will be validated.',
  },
  {
    key: SchemaType.JSON_API,
    name: 'JSON:API',
    description: 'Checks for compliance with the JSON:API specification (e.g., top-level "data" key).',
  },
  {
    key: SchemaType.GEO_JSON,
    name: 'GeoJSON',
    description: 'Validates against the GeoJSON format structure (e.g., "type", "features" or "geometry").',
  },
  {
    key: SchemaType.ODATA,
    name: 'OData JSON',
    description: 'Checks for common OData conventions (e.g., "@odata.context", "value" array).',
  },
  {
    key: SchemaType.CLOUD_EVENT,
    name: 'CloudEvent',
    description: 'Validates against the CloudEvents v1.0 spec (e.g., "id", "source", "specversion", "type").',
  },
];

export const BREADCRUMB_STEPS: string[] = ['Payload', 'Validate', 'Report', 'Compliance', 'Insights', 'Generate', 'Schema'];