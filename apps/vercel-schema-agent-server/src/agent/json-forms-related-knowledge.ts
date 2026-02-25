//Part A: structured JSON metadata for all UI-schema options
export const uiSchemaOptionsMetadata = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "JSON Forms Material UI — UI Schema Options Metadata",
  "description": "Describes every UI-schema element type, its properties, and all supported options for @jsonforms/material-renderers.",

  "definitions": {

    "Rule": {
      "type": "object",
      "description": "Conditional rule attachable to any UI schema element.",
      "required": ["effect", "condition"],
      "properties": {
        "effect": {
          "type": "string",
          "enum": ["SHOW", "HIDE", "ENABLE", "DISABLE"],
          "description": "SHOW/HIDE toggle visibility; ENABLE/DISABLE toggle interactivity."
        },
        "condition": { "$ref": "#/definitions/SchemaBasedCondition" }
      }
    },

    "SchemaBasedCondition": {
      "type": "object",
      "required": ["scope", "schema"],
      "properties": {
        "scope": {
          "type": "string",
          "description": "JSON pointer to the data property to evaluate. Use '#' for root object, '#/properties/fieldName' for a specific field."
        },
        "schema": {
          "type": "object",
          "description": "Standard JSON Schema validated against data at scope. Supports const, enum, minimum, maximum, pattern, not, allOf, anyOf, oneOf, contains, required, properties, etc. If data matches → condition is true."
        },
        "failWhenUndefined": {
          "type": "boolean",
          "default": false,
          "description": "When true, condition fails if scope resolves to undefined. Default false means undefined data passes JSON Schema validation (condition = true)."
        }
      }
    },

    "GlobalConfig": {
      "type": "object",
      "description": "Options passable via the config prop on <JsonForms>. Per-element options take higher precedence.",
      "properties": {
        "restrict": {
          "type": "boolean",
          "default": false,
          "description": "Restricts input character count to JSON Schema maxLength."
        },
        "trim": {
          "type": "boolean",
          "default": false,
          "description": "When true, control does NOT grab full width. If maxLength defined, sets input size to that value."
        },
        "showUnfocusedDescription": {
          "type": "boolean",
          "default": false,
          "description": "Shows JSON Schema description text even when input is not focused."
        },
        "hideRequiredAsterisk": {
          "type": "boolean",
          "default": false,
          "description": "Hides the asterisk (*) on labels for required fields."
        },
        "readonly": {
          "type": "boolean",
          "default": false,
          "description": "Disables all controls globally."
        }
      }
    },

    "ControlElement": {
      "type": "object",
      "required": ["type", "scope"],
      "properties": {
        "type": { "const": "Control" },
        "scope": {
          "type": "string",
          "description": "JSON pointer reference to bound data property, e.g. '#/properties/name'."
        },
        "label": {
          "oneOf": [
            { "type": "string", "description": "Custom label text." },
            { "type": "boolean", "description": "false disables the label entirely." }
          ]
        },
        "i18n": {
          "type": "string",
          "description": "Custom i18n key. Overrides default path-based key. Used to resolve <key>.label, <key>.description, <key>.error.* translations."
        },
        "options": {
          "type": "object",
          "description": "Renderer-specific options. Available options depend on the JSON Schema type/format.",
          "properties": {
            "multi": {
              "type": "boolean",
              "description": "Renders string as multiline textarea. Applicable to: string controls.",
              "applicableTo": ["string"]
            },
            "slider": {
              "type": "boolean",
              "description": "Renders number/integer as MUI Slider. Requires minimum and maximum in JSON Schema. Applicable to: number, integer.",
              "applicableTo": ["number", "integer"]
            },
            "toggle": {
              "type": "boolean",
              "description": "Renders boolean as MUI Switch/Toggle instead of Checkbox. Applicable to: boolean.",
              "applicableTo": ["boolean"]
            },
            "format": {
              "type": "string",
              "enum": ["radio", "date", "time", "date-time"],
              "description": "'radio' renders enum/oneOf as radio group. 'date'/'time'/'date-time' triggers date/time pickers on plain strings.",
              "applicableTo": ["enum", "oneOfEnum", "string"]
            },
            "autocomplete": {
              "type": "boolean",
              "description": "Renders enum/oneOf as MUI Autocomplete with type-ahead filtering.",
              "applicableTo": ["enum", "oneOfEnum"]
            },
            "suggestion": {
              "type": "array",
              "items": { "type": "string" },
              "description": "Provides a suggestion list for free-text string input (autocomplete-style but allows arbitrary values).",
              "applicableTo": ["string"]
            },
            "detail": {
              "oneOf": [
                { "type": "string", "enum": ["DEFAULT", "GENERATED", "REGISTERED"], "description": "Controls array item rendering mode." },
                { "type": "object", "description": "Inline UI schema for rendering each array element." }
              ],
              "description": "Controls how array items are rendered. DEFAULT=table, GENERATED=auto-generated nested layout, REGISTERED=uses registered UI schema, or provide inline UI schema object.",
              "applicableTo": ["array"]
            },
            "showSortButtons": {
              "type": "boolean",
              "description": "Shows up/down buttons to reorder array items.",
              "applicableTo": ["array"]
            },
            "elementLabelProp": {
              "oneOf": [
                { "type": "string" },
                { "type": "array", "items": { "type": "string" } }
              ],
              "description": "Property path used as label for array items. Supports lodash _.get syntax. Default: first primitive property.",
              "applicableTo": ["array"]
            },
            "readonly": {
              "type": "boolean",
              "description": "Disables this element. Can be applied to controls and layouts."
            },
            "trim": {
              "type": "boolean",
              "description": "Controls width behavior. Per-element override of global config."
            },
            "restrict": {
              "type": "boolean",
              "description": "Restricts input to maxLength. Per-element override of global config."
            },
            "showUnfocusedDescription": {
              "type": "boolean",
              "description": "Shows description when unfocused. Per-element override."
            },
            "hideRequiredAsterisk": {
              "type": "boolean",
              "description": "Hides required asterisk. Per-element override."
            },
            "focus": {
              "type": "boolean",
              "description": "Auto-focuses this input on render."
            },
            "dateFormat": {
              "type": "string",
              "description": "Display format for date picker (dayjs format string, e.g. 'YYYY.MM.DD').",
              "applicableTo": ["date"]
            },
            "dateSaveFormat": {
              "type": "string",
              "description": "Save format for date data (dayjs format string, e.g. 'YYYY-MM-DD').",
              "applicableTo": ["date"]
            },
            "views": {
              "type": "array",
              "items": { "type": "string", "enum": ["year", "month", "day"] },
              "description": "Date picker view levels to show.",
              "applicableTo": ["date"]
            },
            "timeFormat": {
              "type": "string",
              "description": "Display format for time picker (dayjs, e.g. 'HH:mm').",
              "applicableTo": ["time"]
            },
            "timeSaveFormat": {
              "type": "string",
              "description": "Save format for time data (dayjs, e.g. 'HH:mm:ss').",
              "applicableTo": ["time"]
            },
            "ampm": {
              "type": "boolean",
              "description": "true = 12-hour AM/PM format; false = 24-hour. Applies to time and date-time pickers.",
              "applicableTo": ["time", "date-time"]
            },
            "dateTimeFormat": {
              "type": "string",
              "description": "Display format for date-time picker (dayjs).",
              "applicableTo": ["date-time"]
            },
            "dateTimeSaveFormat": {
              "type": "string",
              "description": "Save format for date-time data (dayjs).",
              "applicableTo": ["date-time"]
            },
            "clearLabel": {
              "type": "string",
              "description": "Label for 'Clear' action in date/time picker modals.",
              "applicableTo": ["date", "time", "date-time"]
            },
            "cancelLabel": {
              "type": "string",
              "description": "Label for 'Cancel' action in picker modals.",
              "applicableTo": ["date", "time", "date-time"]
            },
            "okLabel": {
              "type": "string",
              "description": "Label for 'OK'/confirm action in picker modals.",
              "applicableTo": ["date", "time", "date-time"]
            }
          }
        },
        "rule": { "$ref": "#/definitions/Rule" }
      }
    },

    "VerticalLayout": {
      "type": "object",
      "required": ["type", "elements"],
      "properties": {
        "type": { "const": "VerticalLayout" },
        "elements": {
          "type": "array",
          "items": { "$ref": "#/definitions/UISchemaElement" },
          "description": "Child UI schema elements arranged vertically."
        },
        "options": {
          "type": "object",
          "properties": {
            "readonly": { "type": "boolean", "description": "Disables all child elements." }
          }
        },
        "rule": { "$ref": "#/definitions/Rule" }
      }
    },

    "HorizontalLayout": {
      "type": "object",
      "required": ["type", "elements"],
      "properties": {
        "type": { "const": "HorizontalLayout" },
        "elements": {
          "type": "array",
          "items": { "$ref": "#/definitions/UISchemaElement" },
          "description": "Child elements arranged horizontally with equal space distribution (1/n each)."
        },
        "options": {
          "type": "object",
          "properties": {
            "readonly": { "type": "boolean" }
          }
        },
        "rule": { "$ref": "#/definitions/Rule" }
      }
    },

    "GroupLayout": {
      "type": "object",
      "required": ["type", "elements"],
      "properties": {
        "type": { "const": "Group" },
        "label": { "type": "string", "description": "Group title rendered as section header (Card title in Material UI)." },
        "i18n": { "type": "string", "description": "i18n key. Resolves <key>.label for the group title." },
        "elements": {
          "type": "array",
          "items": { "$ref": "#/definitions/UISchemaElement" }
        },
        "options": {
          "type": "object",
          "properties": {
            "readonly": { "type": "boolean" }
          }
        },
        "rule": { "$ref": "#/definitions/Rule" }
      }
    },

    "Categorization": {
      "type": "object",
      "required": ["type", "elements"],
      "properties": {
        "type": { "const": "Categorization" },
        "label": { "type": "string", "description": "Label for the categorization container." },
        "i18n": { "type": "string" },
        "elements": {
          "type": "array",
          "items": { "$ref": "#/definitions/Category" },
          "description": "Array of Category (or nested Categorization) elements."
        },
        "options": {
          "type": "object",
          "properties": {
            "variant": {
              "type": "string",
              "enum": ["stepper"],
              "description": "Set to 'stepper' to render as MUI Stepper wizard instead of tabs."
            },
            "showNavButtons": {
              "type": "boolean",
              "description": "Shows Previous/Next navigation buttons in stepper variant."
            },
            "readonly": { "type": "boolean" }
          }
        },
        "rule": { "$ref": "#/definitions/Rule" }
      }
    },

    "Category": {
      "type": "object",
      "required": ["type", "label", "elements"],
      "properties": {
        "type": { "const": "Category" },
        "label": { "type": "string", "description": "Tab or step header label." },
        "i18n": { "type": "string", "description": "i18n key for the category label." },
        "elements": {
          "type": "array",
          "items": { "$ref": "#/definitions/UISchemaElement" }
        },
        "rule": { "$ref": "#/definitions/Rule" }
      }
    },

    "LabelElement": {
      "type": "object",
      "required": ["type", "text"],
      "properties": {
        "type": { "const": "Label" },
        "text": { "type": "string", "description": "Static text content rendered as Typography." },
        "i18n": { "type": "string", "description": "i18n key. Resolves <key>.text." },
        "options": { "type": "object" },
        "rule": { "$ref": "#/definitions/Rule" }
      }
    },

    "ListWithDetail": {
      "type": "object",
      "required": ["type", "scope"],
      "properties": {
        "type": { "const": "ListWithDetail" },
        "scope": { "type": "string", "description": "Points to an array property." },
        "label": {
          "oneOf": [
            { "type": "string" },
            { "type": "boolean" }
          ]
        },
        "options": {
          "type": "object",
          "properties": {
            "detail": {
              "type": "object",
              "description": "Inline UI schema for the detail panel."
            },
            "showSortButtons": { "type": "boolean" },
            "elementLabelProp": {
              "oneOf": [
                { "type": "string" },
                { "type": "array", "items": { "type": "string" } }
              ]
            },
            "readonly": { "type": "boolean" }
          }
        },
        "rule": { "$ref": "#/definitions/Rule" }
      }
    },

    "UISchemaElement": {
      "oneOf": [
        { "$ref": "#/definitions/ControlElement" },
        { "$ref": "#/definitions/VerticalLayout" },
        { "$ref": "#/definitions/HorizontalLayout" },
        { "$ref": "#/definitions/GroupLayout" },
        { "$ref": "#/definitions/Categorization" },
        { "$ref": "#/definitions/Category" },
        { "$ref": "#/definitions/LabelElement" },
        { "$ref": "#/definitions/ListWithDetail" }
      ]
    }
  }
}

export const jsonFormsRelatedKnowledge = `
# JSON Forms Material UI renderers: complete UI-schema reference

**JSON Forms (@jsonforms/material-renderers) ships 30 renderers and 10 cell renderers** that collectively handle every JSON Schema primitive, arrays, objects, combinators, and five layout types. Every renderer responds to specific JSON Schema type/format combinations and UI-schema \`options\` flags. This reference documents the full surface area — every renderer, every option, every rule directive — structured for programmatic consumption by AI agents generating or maintaining schemas.

The Material renderer set covers booleans (checkbox/toggle), strings (text/textarea/autocomplete), numbers (input/slider), enums (dropdown/radio/autocomplete), dates and times (picker widgets), arrays (table/list/master-detail), objects (vertical grid), and combinators (oneOf/anyOf/allOf tabs). All elements support conditional rules (SHOW/HIDE/ENABLE/DISABLE), readonly cascading, i18n, and global config overrides.

---

## comprehensive renderer-by-renderer reference tables

### All 30 Material renderers with testers and priority

The table below lists every renderer in the \`materialRenderers\` export array, ordered by priority rank (highest first). When multiple renderers match a given schema + UI schema combination, **the highest-ranked renderer wins**.

| Rank | Renderer | Tester logic | Triggers when |
|------|----------|-------------|---------------|
| **20** | MaterialRadioGroupControl | \`and(isEnumControl, optionIs('format','radio'))\` | \`enum\` + \`options.format: "radio"\` |
| **20** | MaterialOneOfRadioGroupControl | \`and(isOneOfEnumControl, optionIs('format','radio'))\` | \`oneOf\` const/title + \`options.format: "radio"\` |
| **5** | MaterialOneOfEnumControl | \`isOneOfEnumControl\` | \`oneOf\` with const/title pattern |
| **5** | MaterialAnyOfStringOrEnumControl | \`and(uiTypeIs('Control'), schemaMatches(hasAnyOfWithEnumAndText))\` | \`anyOf\` containing both enum and text schema |
| **5** | MaterialEnumArrayRenderer | \`and(uiTypeIs('Control'), arrayWithUniqueEnumItems)\` | \`type:"array"\`, \`uniqueItems:true\`, items with \`enum\`/\`oneOf\` |
| **4** | MaterialDateControl | \`isDateControl\` | \`type:"string"\`, \`format:"date"\` |
| **4** | MaterialTimeControl | \`isTimeControl\` | \`type:"string"\`, \`format:"time"\` |
| **4** | MaterialSliderControl | \`isRangeControl\` | \`type:"number"\`/\`"integer"\` with \`minimum\` + \`maximum\` defined |
| **4** | MaterialArrayLayout | \`isObjectArrayWithNesting\` | Array of objects containing nested objects/arrays |
| **4** | MaterialListWithDetailRenderer | \`and(uiTypeIs('ListWithDetail'), isObjectArray)\` | UI type \`"ListWithDetail"\` + array of objects |
| **3** | MaterialArrayControlRenderer | \`or(isObjectArrayControl, isPrimitiveArrayControl)\` | Any array of objects or primitives |
| **3** | MaterialBooleanToggleControl | \`and(isBooleanControl, optionIs('toggle',true))\` | \`type:"boolean"\` + \`options.toggle: true\` |
| **3** | MaterialAllOfRenderer | \`isAllOfControl\` | Schema with \`allOf\` keyword |
| **3** | MaterialAnyOfRenderer | \`isAnyOfControl\` | Schema with \`anyOf\` keyword |
| **3** | MaterialOneOfRenderer | \`isOneOfControl\` | Schema with \`oneOf\` keyword |
| **2** | MaterialBooleanControl | \`isBooleanControl\` | \`type:"boolean"\` (checkbox) |
| **2** | MaterialNativeControl | \`or(isDateControl, isTimeControl)\` | \`format:"date"\`/\`"time"\` (native HTML fallback; overridden by rank-4 pickers) |
| **2** | MaterialEnumControl | \`isEnumControl\` | \`type:"string"\` + \`enum\` array (dropdown) |
| **2** | MaterialIntegerControl | \`isIntegerControl\` | \`type:"integer"\` |
| **2** | MaterialNumberControl | \`isNumberControl\` | \`type:"number"\` |
| **2** | MaterialDateTimeControl | \`isDateTimeControl\` | \`type:"string"\`, \`format:"date-time"\` |
| **2** | MaterialObjectRenderer | \`isObjectControl\` | \`type:"object"\` |
| **2** | MaterialGroupLayout | \`uiTypeIs('Group')\` | UI type \`"Group"\` |
| **2** | MaterialHorizontalLayout | \`uiTypeIs('HorizontalLayout')\` | UI type \`"HorizontalLayout"\` |
| **2** | MaterialCategorizationStepperLayout | \`and(uiTypeIs('Categorization'), optionIs('variant','stepper'))\` | \`"Categorization"\` + \`options.variant:"stepper"\` |
| **1** | MaterialTextControl | \`isStringControl\` | \`type:"string"\` (default fallback) |
| **1** | MaterialVerticalLayout | \`uiTypeIs('VerticalLayout')\` | UI type \`"VerticalLayout"\` |
| **1** | MaterialCategorizationLayout | \`isSingleLevelCategorization\` | \`"Categorization"\` with Category children (tabs) |
| **1** | MaterialLabelRenderer | \`uiTypeIs('Label')\` | UI type \`"Label"\` |

### All 10 Material cells (for table rendering)

| Rank | Cell | Handles |
|------|------|---------|
| 4 | MaterialNumberFormatCell | Number with custom format |
| 3 | MaterialBooleanToggleCell | Boolean with toggle option |
| 2 | MaterialBooleanCell | \`type:"boolean"\` |
| 2 | MaterialDateCell | \`format:"date"\` |
| 2 | MaterialEnumCell | \`enum\` strings |
| 2 | MaterialIntegerCell | \`type:"integer"\` |
| 2 | MaterialNumberCell | \`type:"number"\` |
| 2 | MaterialOneOfEnumCell | \`oneOf\` const/title |
| 2 | MaterialTimeCell | \`format:"time"\` |
| 1 | MaterialTextCell | \`type:"string"\` (fallback) |

---

### Control types mapped to JSON Schema triggers and available options

| Control | JSON Schema trigger | Default widget | Available \`options\` keys |
|---------|-------------------|---------------|------------------------|
| **Text** | \`{type:"string"}\` | MUI TextField | \`multi\`, \`trim\`, \`restrict\`, \`showUnfocusedDescription\`, \`hideRequiredAsterisk\`, \`readonly\`, \`focus\`, \`suggestion\` |
| **Textarea** | \`{type:"string"}\` + \`options.multi:true\` | MUI TextField multiline | Same as Text |
| **Number** | \`{type:"number"}\` | MUI TextField (number) | \`trim\`, \`restrict\`, \`showUnfocusedDescription\`, \`hideRequiredAsterisk\`, \`readonly\`, \`focus\` |
| **Integer** | \`{type:"integer"}\` | MUI TextField (number) | Same as Number |
| **Slider** | \`{type:"number"/"integer", minimum:N, maximum:N}\` | MUI Slider | \`readonly\` |
| **Boolean (Checkbox)** | \`{type:"boolean"}\` | MUI Checkbox | \`readonly\` |
| **Boolean (Toggle)** | \`{type:"boolean"}\` + \`options.toggle:true\` | MUI Switch | \`readonly\` |
| **Enum (Dropdown)** | \`{type:"string", enum:[...]}\` | MUI Select | \`autocomplete\`, \`readonly\` |
| **Enum (Radio)** | \`{type:"string", enum:[...]}\` + \`options.format:"radio"\` | MUI RadioGroup | \`readonly\` |
| **OneOf Enum** | \`{oneOf:[{const,title},...]}\` | MUI Select | \`format:"radio"\`, \`autocomplete\`, \`readonly\` |
| **Enum Autocomplete** | \`{enum:[...]}\` + \`options.autocomplete:true\` | MUI Autocomplete | \`readonly\` |
| **Date** | \`{type:"string", format:"date"}\` | MUI DatePicker | \`dateFormat\`, \`dateSaveFormat\`, \`views\`, \`clearLabel\`, \`cancelLabel\`, \`okLabel\`, \`readonly\` |
| **Time** | \`{type:"string", format:"time"}\` | MUI TimePicker | \`timeFormat\`, \`timeSaveFormat\`, \`ampm\`, \`clearLabel\`, \`cancelLabel\`, \`okLabel\`, \`readonly\` |
| **DateTime** | \`{type:"string", format:"date-time"}\` | MUI DateTimePicker | \`dateTimeFormat\`, \`dateTimeSaveFormat\`, \`ampm\`, \`clearLabel\`, \`cancelLabel\`, \`okLabel\`, \`readonly\` |
| **Object** | \`{type:"object", properties:{...}}\` | Vertical grid of sub-renderers | \`readonly\` |
| **Array (Table)** | \`{type:"array", items:{type:"object",...}}\` | MUI Table | \`readonly\` |
| **Array (List)** | Same + \`options.detail\` set | Expandable list | \`detail\`, \`showSortButtons\`, \`elementLabelProp\`, \`readonly\` |
| **Array (Nested)** | Array of objects with nested objects/arrays | Accordion panels | \`showSortButtons\`, \`elementLabelProp\`, \`readonly\` |
| **ListWithDetail** | UI type \`"ListWithDetail"\` + array scope | Master-detail split | \`detail\`, \`showSortButtons\`, \`elementLabelProp\`, \`readonly\` |
| **Multi-select Enum** | \`{type:"array", uniqueItems:true, items:{enum:[...]}}\` | Checkbox group | \`readonly\` |
| **oneOf Combinator** | \`{oneOf:[{$ref:...},...]}\`  | Tabs | \`readonly\` |
| **anyOf Combinator** | \`{anyOf:[{$ref:...},...]}\`  | Tabs | \`readonly\` |
| **allOf Combinator** | \`{allOf:[{$ref:...},...]}\`  | Merged layout | \`readonly\` |
| **AnyOf String/Enum** | \`{anyOf:[{enum},{type:"string"}]}\` | Autocomplete with free text | \`readonly\` |

---

### Layout types with all properties and options

| Layout type | Properties | Options | Notes |
|-------------|-----------|---------|-------|
| **VerticalLayout** | \`type\`, \`elements[]\`, \`rule?\`, \`options?\` | \`readonly\` | Stacks children vertically |
| **HorizontalLayout** | \`type\`, \`elements[]\`, \`rule?\`, \`options?\` | \`readonly\` | Equal-width horizontal distribution |
| **Group** | \`type\`, \`label?\`, \`i18n?\`, \`elements[]\`, \`rule?\`, \`options?\` | \`readonly\` | Card with title header. Label effectively required. |
| **Categorization** | \`type\`, \`label?\`, \`i18n?\`, \`elements[]\`, \`rule?\`, \`options?\` | \`variant:"stepper"\`, \`showNavButtons\`, \`readonly\` | Children must be Category elements. Default: tabs. |
| **Category** | \`type\`, \`label\`, \`i18n?\`, \`elements[]\`, \`rule?\` | — | Tab or step within Categorization. Rule can SHOW/HIDE entire tab/step. |
| **Label** | \`type\`, \`text\`, \`i18n?\`, \`rule?\`, \`options?\` | — | Static text. Renders as MUI Typography. |
| **ListWithDetail** | \`type\`, \`scope\`, \`label?\`, \`options?\`, \`rule?\` | \`detail\`, \`showSortButtons\`, \`elementLabelProp\`, \`readonly\` | Master list + detail panel for arrays of objects. |

---

### The rules system in full

Rules attach to **any** UI-schema element via the \`rule\` property. They evaluate a JSON Schema condition against live form data and apply an effect.

| Effect | Behavior when condition is true |
|--------|---------------------------------|
| \`SHOW\` | Element is visible |
| \`HIDE\` | Element is hidden (removed from DOM) |
| \`ENABLE\` | Element is interactive |
| \`DISABLE\` | Element is disabled/greyed out |

**Condition structure:** \`{ scope: "<JSON pointer>", schema: {<JSON Schema>}, failWhenUndefined?: boolean }\`. The \`schema\` is validated against the data at \`scope\`. Any valid JSON Schema construct works: \`const\`, \`enum\`, \`not\`, \`minimum\`, \`maximum\`, \`pattern\`, \`allOf\`, \`anyOf\`, \`oneOf\`, \`contains\`, \`required\`, \`properties\`, and so on.

**Key behavior:** When \`scope\` resolves to \`undefined\`, JSON Schema validation **succeeds by default** (condition = true). Set \`failWhenUndefined: true\` to reverse this. Use \`scope: "#"\` with \`properties\`/\`required\` to compose conditions across multiple fields.

---

### Readonly precedence cascade

JSON Forms evaluates readonly status in strict priority order (highest first):

1. **Form-wide \`readonly\` prop** on \`<JsonForms readonly />\` — disables everything
2. **Rule effect** — \`DISABLE\`/\`ENABLE\` rule on the element
3. **UI Schema \`options.readonly\`** — per-element option
4. **JSON Schema \`readOnly: true\`** — per-property (note: only \`readOnly\` is recognized, not \`readonly\`)
5. **Parent inheritance** — inherits from parent layout's enabled state

---

### Global config defaults vs per-element overrides

These five options can be set globally via the \`config\` prop and overridden per-element in \`options\`:

| Option | Type | Default | What it does |
|--------|------|---------|-------------|
| \`restrict\` | boolean | \`false\` | Hard-limits input characters to JSON Schema \`maxLength\` |
| \`trim\` | boolean | \`false\` | Prevents control from grabbing full width; sizes input to \`maxLength\` |
| \`showUnfocusedDescription\` | boolean | \`false\` | Always shows \`description\` text (default: only on focus) |
| \`hideRequiredAsterisk\` | boolean | \`false\` | Suppresses \`*\` on required field labels |
| \`readonly\` | boolean | \`false\` | Disables the element |

---
`