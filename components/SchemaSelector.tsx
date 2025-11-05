
import React from 'react';
import { SchemaDefinition, SchemaType } from '../types';

interface SchemaSelectorProps {
  selectedSchema: SchemaType;
  onSchemaChange: (schema: SchemaType) => void;
  schemas: SchemaDefinition[];
}

export const SchemaSelector: React.FC<SchemaSelectorProps> = ({ selectedSchema, onSchemaChange, schemas }) => {
  const currentSchema = schemas.find(s => s.key === selectedSchema);

  return (
    <div>
      <label htmlFor="schema-select" className="block text-sm font-medium text-brand-text mb-2">
        Reference Schema
      </label>
      <select
        id="schema-select"
        value={selectedSchema}
        onChange={(e) => onSchemaChange(e.target.value as SchemaType)}
        className="w-full bg-brand-secondary border border-brand-border rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-brand-orange focus:border-brand-orange sm:text-sm"
      >
        {schemas.map((schema) => (
          <option key={schema.key} value={schema.key}>
            {schema.name}
          </option>
        ))}
      </select>
      {currentSchema && (
         <p className="mt-2 text-sm text-brand-subtle">{currentSchema.description}</p>
      )}
    </div>
  );
};