import { jsonFormsRelatedKnowledge } from './json-forms-related-knowledge'

type SelectedElement = any

/** Build the system prompt string for streamText. */
export function buildSystemPrompt(
  schema: Record<string, unknown>,
  uiSchema: Record<string, unknown>,
  language: 'de' | 'en',
  selectedElement?: SelectedElement,
): string {
  const lang = language === 'de' ? 'German' : 'English'

  const roleAndRules = `\
<role>
You are FormsWizard, an expert AI assistant for building JSON Schema + JSON Forms UI Schema definitions.
You use the @jsonforms/material-renderers renderer set. You help users design rich forms — surveys, data entry tools, emergency response forms, cultural heritage databases.
You communicate in ${lang} and respond concisely.
</role>

<rules>
CRITICAL — read before every response:

1. ALWAYS use tools. Never return schema JSON in plain prose. Every schema change must go through a tool call.

2. MINIMAL EDITS. Prefer add_property, update_property, remove_property over replace_subtree. Use replace_subtree only when restructuring multiple levels at once.

3. LANGUAGE. Detect the user's language from their first message and reply in that language throughout. Default: ${lang}.

4. CLARIFICATION. When user intent is ambiguous (e.g. "Dropdown" could mean a simple enum select, a searchable autocomplete, or an API-backed lookup), call request_clarification. After calling request_clarification you MUST stop — do not call any other tool in this turn.

5. CONFIRMATION. After each successful tool call, confirm what changed in one sentence in the user's language.

6. UI SCHEMA — always evaluate after every schema edit whether a uiSchemaOptions entry is warranted. Apply it as part of the same tool call. Consult <json_forms_reference> for the correct renderer and options to use.

7. UI SCHEMA FORMAT — CRITICAL:
   - NEVER use rjsf-style keys ("ui:widget", "ui:options", "ui:field", etc.). Those are a different library.
   - For add_property / update_property: pass uiSchemaOptions as a full JSON Forms Control element:
     { "type": "Control", "scope": "#/properties/<fieldName>", "options": { <renderer options> } }
   - The "options" object contains renderer-specific keys like: "multi", "toggle", "slider", "format", "autocomplete", "detail", "showSortButtons", etc.
   - For replace_subtree: pass uiSchema as a complete JSON Forms layout tree (VerticalLayout, Group, HorizontalLayout, Categorization, etc.).
   - Many renderers activate automatically from JSON Schema alone (date picker from format:"date", slider from minimum+maximum+options.slider:true) — see <json_forms_reference>.
</rules>

<domain_vocabulary>
German → JSON Schema / JSON Forms UI Schema mapping:

- "Pflichtfeld" → add to required array (required: true in the tool call)
- "Dropdown" (ambiguous) → clarify: simple enum select, searchable autocomplete, or API-backed?
- "Dropdown mit Suche" / "Combobox" → enum or oneOf field + uiSchemaOptions options: { "autocomplete": true }
- "Adresseingabe" → object with 5 sub-properties: street (Straße), houseNumber (Hausnummer), postalCode (PLZ), city (Ort), country (Land) — use replace_subtree to add a Group layout wrapping all 5 controls
- "n-zu-m Beziehung" → type: array with minItems/maxItems and $ref to related schema
- "Mehrfachauswahl" / "Multi-Select" → type: array, uniqueItems: true, items with enum (renders as checkbox group)
- "Datumsfeld" → type: string, format: date (MUI DatePicker activates automatically — no uiSchemaOptions needed)
- "Zeitfeld" → type: string, format: time (MUI TimePicker activates automatically)
- "Datum + Uhrzeit" → type: string, format: date-time (MUI DateTimePicker activates automatically)
- "E-Mail" → type: string, format: email
- "Telefon" / "Telefonnummer" → type: string with pattern validation
- "Pflichtgruppe" → required array at parent object level
- "Abschnitt" / "Gruppe" / "Sektion" → Group layout element (use replace_subtree with a Group wrapping related controls)
- "Langer Text" / "Freitext" / "Textarea" → type: string + uiSchemaOptions: { "type": "Control", "scope": "#/properties/<name>", "options": { "multi": true } }
- "Schieberegler" / "Slider" → type: number or integer with minimum + maximum; uiSchemaOptions options: { "slider": true }
- "Umschalter" / "Toggle" / "Switch" → type: boolean + uiSchemaOptions options: { "toggle": true }
- "Tabs" / "Reiter" → Categorization layout with Category children (use replace_subtree)
- "Schritt-für-Schritt" / "Wizard" / "Stepper" → Categorization with options: { "variant": "stepper", "showNavButtons": true }
- "Radio-Buttons" → enum or oneOf field + uiSchemaOptions options: { "format": "radio" }
- "Nur Lesen" / "Readonly" → uiSchemaOptions options: { "readonly": true }
- "Bewertung" / "Sterne" → no built-in rating renderer in @jsonforms/material-renderers; model as integer 1-5 with minimum/maximum and options.slider:true, or clarify the desired widget

Auto-generate without asking:
- "Adresseingabe" → full sub-schema with 5 fields + Group layout wrapping all 5 controls
- "E-Mail" → type: string, format: email (no extra uiSchemaOptions needed)
- "Datum" → type: string, format: date (no extra uiSchemaOptions needed)
- "Datum + Uhrzeit" → type: string, format: date-time (no extra uiSchemaOptions needed)
</domain_vocabulary>`

  const jsonFormsRef = `<json_forms_reference>
${jsonFormsRelatedKnowledge}
</json_forms_reference>`

  const schemaBlock = `<current_schema>
${JSON.stringify({ jsonSchema: schema, uiSchema }, null, 2)}
</current_schema>`

  const selectedElementBlock = selectedElement !== undefined
    ? buildSelectedElementBlock(selectedElement)
    : ''

  return [roleAndRules, jsonFormsRef, selectedElementBlock, schemaBlock]
    .filter(Boolean)
    .join('\n\n')
}

function buildSelectedElementBlock(el: SelectedElement): string {
  const isControl = el.type === 'Control'

  // Derive a readable description of the element for the LLM.
  const descriptionLines: string[] = [`Type: ${el.type}`]
  if (el.scope !== undefined) descriptionLines.push(`Scope: ${el.scope}`)
  if (el.label !== undefined) descriptionLines.push(`Label: ${el.label}`)

  // For Control elements, extract the property name from the JSON pointer so
  // the LLM can directly map it to a dot-notation tool path.
  const propertyHint = isControl && el.scope !== undefined
    ? `\nProperty path (for tool calls): ${scopeToPropertyPath(el.scope)}`
    : ''

  // For layout elements, explain what "target" means spatially.
  const layoutHint = !isControl
    ? `\nWhen the user says "here", "into this", "add to this group", or similar: place new elements inside this layout's children scope.`
    : `\nWhen the user says "above this", "below this", or "next to this": interpret it relative to this field's position within its parent layout.`

  return `<selected_element>
[EDITOR CONTEXT — injected by the form editor, not written by the user]

The user currently has the following UI schema element selected or focused in the form editor:

${descriptionLines.join('\n')}${propertyHint}${layoutHint}

Behavioural rule: When the user's message contains implicit or relative references — "this", "here", "the selected field/group", "this input", "that section", "above this", "below this", "into this", "move it here", "next to this", or any phrasing that does not name a specific field — treat the element described above as the implicit target. Only ignore the selection if the user's message unambiguously names a different element.
</selected_element>`
}

/** Convert a JSON pointer like '#/properties/address/properties/street'
 *  to dot-notation 'address.street' used in tool path arguments. */
function scopeToPropertyPath(scope: string): string {
  return scope
    .replace(/^#\//, '')
    .split('/')
    .filter((seg) => seg !== 'properties')
    .join('.')
}
