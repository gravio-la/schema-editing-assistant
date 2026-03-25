import { analyzeSchema } from './schema-analyzer'
import type { FormFillingContext, SchemaAnalysis } from './types'

/**
 * Build the system prompt for the form-filling assistant.
 *
 * Convention-over-configuration: A capable model should understand the domain
 * just from the schema. Metadata (titles, descriptions, x-graviola-* extensions)
 * enriches the understanding without requiring explicit configuration.
 */
export function buildFormFillingPrompt(
  jsonSchema: Record<string, unknown>,
  context: Omit<FormFillingContext, 'analysis'>,
): string {
  const analysis = analyzeSchema(jsonSchema, context.metadata?.['entityType'] as string | undefined)
  const lang = context.language === 'de' ? 'German' : 'English'

  const sections: string[] = [
    buildRoleSection(analysis, lang),
    buildSchemaSection(analysis),
    buildMetadataSection(jsonSchema, context.uiSchema, context.metadata),
    buildFormDataSection(context.formData),
    buildRulesSection(lang),
  ]

  return sections.filter(Boolean).join('\n\n')
}

function buildRoleSection(analysis: SchemaAnalysis, lang: string): string {
  return `<role>
You are a form-filling assistant for "${analysis.entityType}" entities.
You help users fill out forms by understanding the data model and guiding them through the process.
You communicate in ${lang} and respond concisely.

Your job is to:
1. Understand what the user wants to create or edit
2. Fill form fields using tool calls (never ask the user to fill fields manually)
3. Handle reference fields (categories, tags, linked entities) by querying available options
4. Create new related entities when needed
5. Validate the form before suggesting submission
</role>`
}

function buildSchemaSection(analysis: SchemaAnalysis): string {
  const fieldLines = analysis.fields.map((f) => {
    const parts = [
      `- ${f.path}`,
      `(${f.type}${f.format ? `, format: ${f.format}` : ''})`,
      f.required ? '[REQUIRED]' : '',
      f.title ? `"${f.title}"` : '',
      f.description ? `— ${f.description}` : '',
    ]
    return parts.filter(Boolean).join(' ')
  })

  const enumSection = analysis.inlinedEnums.length > 0
    ? `\nFields with predefined options (use these values directly):\n${analysis.inlinedEnums
        .map((e) => `- ${e.path}: ${JSON.stringify(e.values)}`)
        .join('\n')}`
    : ''

  const refSection = analysis.queryableReferences.length > 0
    ? `\nReference fields (need querying/searching):\n${analysis.queryableReferences
        .map(
          (r) =>
            `- ${r.path} → ${r.referenceType} (${r.cardinality === 'handful' ? 'few options — use query_reference_options' : 'many options — use search_reference_options'})`,
        )
        .join('\n')}`
    : ''

  const defsSection = analysis.availableDefs.length > 0
    ? `\nEntity types available for cascading creation (via create_entity):\n${analysis.availableDefs
        .map((d) => `- ${d.name}${d.title ? ` ("${d.title}")` : ''}`)
        .join('\n')}`
    : ''

  return `<schema_analysis>
Entity type: ${analysis.entityType}
Required fields: ${analysis.requiredFields.join(', ') || 'none'}

All fields:
${fieldLines.join('\n')}${enumSection}${refSection}${defsSection}
</schema_analysis>`
}

function buildMetadataSection(
  jsonSchema: Record<string, unknown>,
  uiSchema?: Record<string, unknown>,
  metadata?: Record<string, unknown>,
): string {
  const parts: string[] = []

  // Schema-level metadata
  if (jsonSchema['description']) {
    parts.push(`Schema description: ${jsonSchema['description']}`)
  }

  // UI Schema hints (field ordering, labels, visibility rules)
  if (uiSchema && Object.keys(uiSchema).length > 0) {
    parts.push(`UI Schema (layout/label hints):\n${JSON.stringify(uiSchema, null, 2)}`)
  }

  // Custom metadata
  if (metadata && Object.keys(metadata).length > 0) {
    // Filter out entityType which is already used
    const extra = Object.entries(metadata).filter(([k]) => k !== 'entityType')
    if (extra.length > 0) {
      parts.push(`Additional hints:\n${extra.map(([k, v]) => `- ${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join('\n')}`)
    }
  }

  if (parts.length === 0) return ''

  return `<metadata>
${parts.join('\n\n')}
</metadata>`
}

function buildFormDataSection(formData: Record<string, unknown>): string {
  const filledFields = Object.entries(formData).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )

  if (filledFields.length === 0) {
    return `<current_form_data>
The form is empty — no fields have been filled yet.
</current_form_data>`
  }

  return `<current_form_data>
Currently filled fields (do not overwrite unless the user asks to change them):
${JSON.stringify(formData, null, 2)}
</current_form_data>`
}

function buildRulesSection(lang: string): string {
  return `<rules>
CRITICAL — read before every response:

1. ALWAYS use tools. Never tell the user to fill fields manually. Every value change must go through set_field_value or set_multiple_fields.

2. BATCH WHEN CONFIDENT. When you can infer multiple field values from the user's message, use set_multiple_fields to fill them all at once. Use individual set_field_value only when filling a single field.

3. REFERENCE FIELDS — QUERY FIRST, THEN SELECT.
   For fields that reference other entities (categories, tags, people, etc.):
   - If the field has few options: call query_reference_options to see available choices
   - If the field has many options or you know what to search for: call search_reference_options
   - After finding the right option: call select_reference to set the value
   - If no matching option exists and the type supports creation: call create_entity, then select_reference

4. CASCADING CREATION. When creating a new sub-entity via create_entity:
   - Provide complete data matching the entity's schema
   - The user will see a preview and must confirm
   - After confirmation, use select_reference to link it to the form field

5. VALIDATE BEFORE DONE. After filling all fields, call validate_form and report any issues.

6. DO NOT OVERWRITE existing values unless the user explicitly asks to change them.

7. CLARIFICATION. When user intent is ambiguous, call request_clarification. After calling it, you MUST stop — do not call any other tool in this response.

8. SELF-CORRECTION. If a tool call returns an error, read the error message carefully and retry with corrected arguments.

9. LANGUAGE. Communicate in ${lang}. Detect the user's language from their first message and respond in that language throughout.

10. CONFIRMATION. After filling fields, briefly summarize what you did and ask if the user wants to change anything or if the form is ready for submission.
</rules>`
}
