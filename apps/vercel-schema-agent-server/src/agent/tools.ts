import { tool } from 'ai'
import { z } from 'zod'

/**
 * Tool definitions WITHOUT execute handlers.
 * All tools are executed client-side via useChat's onToolCall callback,
 * which dispatches directly to the Redux store in the consumer app.
 * The only exception is request_clarification which renders as a native
 * tool-invocation part in the chat UI — the user answers via addToolResult.
 */
export const tools = {
  add_field: tool({
    description:
      'Add ONE field to the form. Call once per field — never batch multiple fields in one call. ' +
      'Build structure first (layouts), then add fields one at a time.',
    parameters: z.object({
      parentScope: z
        .string()
        .optional()
        .describe(
          'JSON Schema scope of a parent Group sub-object, e.g. "#/properties/address". ' +
          'Omit for root-level properties.',
        ),
      parentLabel: z
        .string()
        .optional()
        .describe(
          'Label of the Category or Group UI container to place this field inside, ' +
          'e.g. "Kind" for a wizard step. Use when the parent has no scope.',
        ),
      name: z.string().describe('Property key in camelCase, e.g. "vorname" or "geburtsdatum".'),
      schema: z
        .record(z.string(), z.unknown())
        .describe(
          'JSON Schema for this single field only. ' +
          'Examples: { "type": "string" }, { "type": "string", "format": "date" }, ' +
          '{ "type": "integer", "minimum": 1, "maximum": 5 }',
        ),
      required: z.boolean().optional().default(false),
      uiOptions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'JSON Forms renderer options object. ' +
          'Examples: { "multi": true } for textarea, { "toggle": true } for boolean toggle, ' +
          '{ "slider": true } for number slider, { "format": "radio" } for radio buttons.',
        ),
    }),
  }),

  add_layout: tool({
    description:
      'Add a layout container. Always add layout structure BEFORE adding fields into it. ' +
      'For a wizard: first add a Categorization, then add each Category inside it, then add fields.',
    parameters: z.object({
      parentScope: z
        .string()
        .optional()
        .describe('Scope of a Group parent to nest inside. Omit for root level.'),
      parentLabel: z
        .string()
        .optional()
        .describe('Label of a parent Category or Categorization to nest inside.'),
      layoutType: z
        .enum(['Group', 'Category', 'Categorization', 'VerticalLayout', 'HorizontalLayout'])
        .describe(
          'Group = collapsible section with optional JSON Schema sub-object. ' +
          'Category = a tab/step inside a Categorization. ' +
          'Categorization = tab strip or stepper (set options.variant). ' +
          'VerticalLayout / HorizontalLayout = simple flex containers.',
        ),
      label: z.string().optional().describe('Display label for the layout, e.g. "Kind" or "Adresse".'),
      scope: z
        .string()
        .optional()
        .describe(
          'For Group layouts backed by a JSON Schema sub-object: the scope of that object, ' +
          'e.g. "#/properties/address". This creates the sub-object in jsonSchema.',
        ),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Layout-specific options. For Categorization: { "variant": "stepper", "showNavButtons": true }. ' +
          'For Category: none needed. For Group: none (scope is set separately).',
        ),
      rule: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'JSON Forms rule placed at the TOP LEVEL of the element (NOT inside options). ' +
          'Controls visibility. Example — hide a Group when a toggle is off: ' +
          '{ "effect": "HIDE", "condition": { "scope": "#/properties/motorisiert", "schema": { "const": false } } }. ' +
          'SHOW rule (hide by default, show when true): ' +
          '{ "effect": "SHOW", "condition": { "scope": "#/properties/motorisiert", "schema": { "const": true } } }.',
        ),
    }),
  }),

  update_layout: tool({
    description:
      'Update a layout container (Group, Category, HorizontalLayout, etc.). ' +
      'Use this to set a SHOW/HIDE rule on an existing layout, rename it, or update its options. ' +
      'CRITICAL: rules must be set via this tool, NOT via update_field — update_field only handles field-level options. ' +
      'Rule goes at the TOP LEVEL of the element, not inside options.',
    parameters: z.object({
      label: z
        .string()
        .optional()
        .describe('Label of the layout to update (primary identifier, e.g. "E-Bike Details").'),
      scope: z
        .string()
        .optional()
        .describe('options.scope of a Group layout (alternative to label, e.g. "#/properties/eBike").'),
      rule: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Set/replace the JSON Forms rule on the layout element (TOP LEVEL, not inside options). ' +
          'SHOW when toggle is true: { "effect": "SHOW", "condition": { "scope": "#/properties/motorisiert", "schema": { "const": true } } }. ' +
          'HIDE when toggle is false: { "effect": "HIDE", "condition": { "scope": "#/properties/motorisiert", "schema": { "const": false } } }.',
        ),
      options: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Merge into the layout options object.'),
      newLabel: z.string().optional().describe('New label for the layout.'),
    }),
  }),

  remove_element: tool({
    description: 'Remove a field or layout by its JSON Forms scope.',
    parameters: z.object({
      scope: z
        .string()
        .describe(
          'Full JSON Forms scope of the element to remove, e.g. "#/properties/vorname".',
        ),
    }),
  }),

  move_element: tool({
    description:
      'Move an existing field (Control) to a different layout container without removing and re-adding it. ' +
      'Use this instead of remove_element + add_field when the field already exists and you just want to ' +
      'reposition it — preserves all field settings and uiOptions. ' +
      'Typical use: user asks to put two existing fields side-by-side → ' +
      '1. add_layout(HorizontalLayout, label="...") 2. move_element(scope, targetParentLabel) x2.',
    parameters: z.object({
      scope: z
        .string()
        .describe('Full JSON Forms scope of the existing Control to move, e.g. "#/properties/verfuegbarVon".'),
      targetParentLabel: z
        .string()
        .optional()
        .describe('Label of the target layout container to move the field into, e.g. "Von-Bis".'),
      targetParentScope: z
        .string()
        .optional()
        .describe('options.scope of a Group container (alternative to targetParentLabel).'),
    }),
  }),

  update_field: tool({
    description:
      'Update the JSON Schema definition and/or UI options of an existing field. ' +
      'Use to change type, add validation, or switch renderer options.',
    parameters: z.object({
      scope: z.string().describe('Full JSON Forms scope of the field to update.'),
      schema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('New or merged JSON Schema for the field.'),
      required: z.boolean().optional().describe('Set required status on the parent schema.'),
      uiOptions: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Merged JSON Forms renderer options.'),
    }),
  }),

  rename_field: tool({
    description: 'Rename an existing field (changes the property key and all scope references).',
    parameters: z.object({
      scope: z.string().describe('Current full JSON Forms scope of the field.'),
      newName: z.string().describe('New camelCase property key.'),
    }),
  }),

  request_clarification: tool({
    description:
      'Ask the user for clarification when their intent is ambiguous. ' +
      'IMPORTANT: After calling this tool you MUST stop — do not call any other tool in this response.',
    parameters: z.object({
      question: z.string().describe('The clarifying question to ask the user.'),
      options: z
        .array(z.string())
        .optional()
        .describe('Optional list of predefined answer options to show as chips.'),
      context: z
        .string()
        .optional()
        .describe('Optional additional context or explanation for the user.'),
    }),
  }),
}
