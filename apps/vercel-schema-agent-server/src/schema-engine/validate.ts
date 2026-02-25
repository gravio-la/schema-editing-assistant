import Ajv from 'ajv'
import addFormats from 'ajv-formats'

const ajv = new Ajv({ allErrors: true })
addFormats(ajv)

/** Validate an object as a JSON Schema draft-07 meta-schema. */
export function validateSchema(schema: unknown): { valid: boolean; errors: string[] } {
  const valid = ajv.validateSchema(schema as object)
  if (valid) return { valid: true, errors: [] }
  const errors = (ajv.errors ?? []).map(
    (e) => `${e.instancePath || '(root)'} ${e.message ?? 'unknown error'}`,
  )
  return { valid: false, errors }
}
