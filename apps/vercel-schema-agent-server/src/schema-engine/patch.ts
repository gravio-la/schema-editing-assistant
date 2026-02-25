import { enableMapSet, enablePatches, produceWithPatches } from 'immer'
import { get, set, unset } from 'lodash-es'
import type { SchemaState } from '../session/types'
import type { EditOperation } from './types'
import { validateSchema } from './validate'

enableMapSet()
enablePatches()

type PatchSuccess = {
  success: true
  newState: SchemaState
  patches: readonly unknown[]
}

type PatchFailure = {
  success: false
  error: string
}

type PatchResult = PatchSuccess | PatchFailure

/** Resolve a dot-notation path to the `properties` object for a given parent. */
const propertiesPath = (path: string): string =>
  path === '' ? 'jsonSchema.properties' : `jsonSchema.properties.${path}.properties`

/** Resolve a dot-notation path to the `required` array for a given parent. */
const requiredPath = (path: string): string =>
  path === '' ? 'jsonSchema.required' : `jsonSchema.properties.${path}.required`

/** Resolve a dot-notation path to the `properties.{name}` location. */
const propertyPath = (path: string, name: string): string =>
  path === '' ? `jsonSchema.properties.${name}` : `jsonSchema.properties.${path}.properties.${name}`

/** Resolve a dot-notation path to the uiSchema key for a property. */
const uiPropertyPath = (path: string, name: string): string =>
  path === '' ? `uiSchema.${name}` : `uiSchema.${path}.${name}`

/**
 * Apply a single EditOperation to a SchemaState using immer produceWithPatches.
 * Validates the resulting jsonSchema before returning.
 */
export function applyOperation(state: SchemaState, operation: EditOperation): PatchResult {
  const [newState, patches] = produceWithPatches(state, (draft) => {
    switch (operation.type) {
      case 'add_property': {
        const { path, name, schema, required, uiSchemaOptions } = operation
        const props = get(draft, propertiesPath(path)) as Record<string, unknown> | undefined
        if (props === undefined) {
          set(draft, propertiesPath(path), { [name]: schema })
        } else {
          set(draft, `${propertiesPath(path)}.${name}`, schema)
        }
        if (required) {
          const reqArr = get(draft, requiredPath(path)) as string[] | undefined
          if (Array.isArray(reqArr)) {
            if (!reqArr.includes(name)) reqArr.push(name)
          } else {
            set(draft, requiredPath(path), [name])
          }
        }
        if (uiSchemaOptions) {
          set(draft, uiPropertyPath(path, name), uiSchemaOptions)
        }
        break
      }

      case 'update_property': {
        const { path, schema, required, uiSchemaOptions } = operation
        const segments = path.split('.')
        const name = segments[segments.length - 1] as string
        const parentPath = segments.slice(0, -1).join('.')
        set(draft, propertyPath(parentPath, name), schema)
        if (required !== undefined) {
          const reqPath = requiredPath(parentPath)
          const reqArr = get(draft, reqPath) as string[] | undefined
          if (required) {
            if (Array.isArray(reqArr)) {
              if (!reqArr.includes(name)) reqArr.push(name)
            } else {
              set(draft, reqPath, [name])
            }
          } else if (Array.isArray(reqArr)) {
            set(
              draft,
              reqPath,
              reqArr.filter((r) => r !== name),
            )
          }
        }
        if (uiSchemaOptions) {
          set(draft, uiPropertyPath(parentPath, name), uiSchemaOptions)
        }
        break
      }

      case 'remove_property': {
        const { path } = operation
        const segments = path.split('.')
        const name = segments[segments.length - 1] as string
        const parentPath = segments.slice(0, -1).join('.')
        unset(draft, propertyPath(parentPath, name))
        const reqPath = requiredPath(parentPath)
        const reqArr = get(draft, reqPath) as string[] | undefined
        if (Array.isArray(reqArr)) {
          set(
            draft,
            reqPath,
            reqArr.filter((r) => r !== name),
          )
        }
        unset(draft, uiPropertyPath(parentPath, name))
        break
      }

      case 'replace_subtree': {
        const { path, schema, uiSchema } = operation
        if (path === '') {
          draft.jsonSchema = schema as SchemaState['jsonSchema']
          if (uiSchema) draft.uiSchema = uiSchema as SchemaState['uiSchema']
        } else {
          set(draft, `jsonSchema.${path}`, schema)
          if (uiSchema) set(draft, `uiSchema.${path}`, uiSchema)
        }
        break
      }
    }
  })

  const validation = validateSchema(newState.jsonSchema)
  if (!validation.valid) {
    return { success: false, error: `Schema validation failed: ${validation.errors.join('; ')}` }
  }

  return { success: true, newState, patches }
}
