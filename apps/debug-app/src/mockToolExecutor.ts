import type { Dispatch, SetStateAction } from 'react'
import type { ToolResult } from '@graviola/agent-chat-flow'
import { createEmptySchemaState } from './testSchema'

export interface ToolLogEntry {
  id: string
  at: string
  toolName: string
  args: Record<string, unknown>
  result: ToolResult
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function clone<T>(v: T): T {
  return structuredClone(v)
}

/** Root-only: #/properties/foo */
function scopeToRootKey(scope: string): string | null {
  const m = /^#\/properties\/([^/]+)$/.exec(scope)
  return m?.[1] ?? null
}

function ensureObjectShape(jsonSchema: Record<string, unknown>): void {
  if (jsonSchema.type !== 'object') jsonSchema.type = 'object'
  if (jsonSchema.properties == null || typeof jsonSchema.properties !== 'object' || Array.isArray(jsonSchema.properties)) {
    jsonSchema.properties = {}
  }
  if (!Array.isArray(jsonSchema.required)) {
    jsonSchema.required = []
  }
}

function ensureRootVerticalLayout(uiSchema: Record<string, unknown>): Record<string, unknown>[] {
  if (uiSchema.type !== 'VerticalLayout') {
    uiSchema.type = 'VerticalLayout'
  }
  if (!Array.isArray(uiSchema.elements)) {
    uiSchema.elements = []
  }
  return uiSchema.elements as Record<string, unknown>[]
}

function findControlIndex(elements: Record<string, unknown>[], scope: string): number {
  return elements.findIndex((el) => el.type === 'Control' && el.scope === scope)
}

function removeControlFromElements(elements: Record<string, unknown>[], scope: string): boolean {
  const i = findControlIndex(elements, scope)
  if (i >= 0) {
    elements.splice(i, 1)
    return true
  }
  for (const el of elements) {
    const nested = el.elements
    if (Array.isArray(nested) && removeControlFromElements(nested as Record<string, unknown>[], scope)) {
      return true
    }
  }
  return false
}

export type SchemaState = ReturnType<typeof createEmptySchemaState>

export function applySchemaTool(
  draft: SchemaState,
  toolName: string,
  args: Record<string, unknown>,
): ToolResult {
  const jsonSchema = draft.jsonSchema
  const uiSchema = draft.uiSchema
  ensureObjectShape(jsonSchema)
  const props = jsonSchema.properties as Record<string, unknown>
  const required = jsonSchema.required as string[]

  try {
    switch (toolName) {
      case 'add_field': {
        const name = args['name']
        const schema = args['schema']
        if (typeof name !== 'string' || schema == null || typeof schema !== 'object' || Array.isArray(schema)) {
          return { success: false, error: 'add_field: invalid name or schema' }
        }
        const req = args['required'] === true
        props[name] = schema as Record<string, unknown>
        if (req && !required.includes(name)) required.push(name)
        if (!req) {
          const ix = required.indexOf(name)
          if (ix >= 0) required.splice(ix, 1)
        }
        const uiOpts = args['uiOptions']
        const control: Record<string, unknown> = {
          type: 'Control',
          scope: `#/properties/${name}`,
        }
        if (uiOpts != null && typeof uiOpts === 'object' && !Array.isArray(uiOpts)) {
          control.options = uiOpts
        }
        const rootElements = ensureRootVerticalLayout(uiSchema)
        if (findControlIndex(rootElements, control.scope as string) < 0) {
          rootElements.push(control)
        }
        return { success: true, message: `Added field ${name}` }
      }
      case 'remove_element': {
        const scope = args['scope']
        if (typeof scope !== 'string') return { success: false, error: 'remove_element: scope required' }
        const key = scopeToRootKey(scope)
        if (!key) return { success: false, error: 'remove_element: only root #/properties/x supported in debug mock' }
        delete props[key]
        const ri = required.indexOf(key)
        if (ri >= 0) required.splice(ri, 1)
        const rootElements = ensureRootVerticalLayout(uiSchema)
        removeControlFromElements(rootElements, scope)
        return { success: true, message: `Removed ${key}` }
      }
      case 'update_field': {
        const scope = args['scope']
        if (typeof scope !== 'string') return { success: false, error: 'update_field: scope required' }
        const key = scopeToRootKey(scope)
        if (!key) return { success: false, error: 'update_field: only root scopes in debug mock' }
        const cur = props[key]
        if (cur == null || typeof cur !== 'object' || Array.isArray(cur)) {
          return { success: false, error: `update_field: unknown property ${key}` }
        }
        const next = { ...(cur as Record<string, unknown>) }
        const patch = args['schema']
        if (patch != null && typeof patch === 'object' && !Array.isArray(patch)) {
          Object.assign(next, patch)
        }
        props[key] = next
        if (typeof args['required'] === 'boolean') {
          const want = args['required']
          const ix = required.indexOf(key)
          if (want && ix < 0) required.push(key)
          if (!want && ix >= 0) required.splice(ix, 1)
        }
        const uo = args['uiOptions']
        if (uo != null && typeof uo === 'object' && !Array.isArray(uo)) {
          const rootElements = ensureRootVerticalLayout(uiSchema)
          const idx = findControlIndex(rootElements, scope)
          if (idx >= 0) {
            const c = { ...rootElements[idx] } as Record<string, unknown>
            c.options = { ...(typeof c.options === 'object' && c.options !== null ? (c.options as object) : {}), ...uo }
            rootElements[idx] = c
          }
        }
        return { success: true, message: `Updated field ${key}` }
      }
      case 'rename_field': {
        const scope = args['scope']
        const newName = args['newName']
        if (typeof scope !== 'string' || typeof newName !== 'string') {
          return { success: false, error: 'rename_field: scope and newName required' }
        }
        const oldKey = scopeToRootKey(scope)
        if (!oldKey) return { success: false, error: 'rename_field: only root scopes in debug mock' }
        if (props[newName] !== undefined) return { success: false, error: `rename_field: ${newName} already exists` }
        const val = props[oldKey]
        if (val === undefined) return { success: false, error: `rename_field: ${oldKey} not found` }
        delete props[oldKey]
        props[newName] = val
        const ri = required.indexOf(oldKey)
        if (ri >= 0) required[ri] = newName
        const rootElements = ensureRootVerticalLayout(uiSchema)
        const idx = findControlIndex(rootElements, scope)
        if (idx >= 0) {
          const c = { ...rootElements[idx] } as Record<string, unknown>
          c.scope = `#/properties/${newName}`
          rootElements[idx] = c
        }
        return { success: true, message: `Renamed ${oldKey} → ${newName}` }
      }
      case 'add_layout': {
        const layoutType = args['layoutType']
        if (typeof layoutType !== 'string') return { success: false, error: 'add_layout: layoutType required' }
        const label = typeof args['label'] === 'string' ? args['label'] : undefined
        const scope = typeof args['scope'] === 'string' ? args['scope'] : undefined
        const layout: Record<string, unknown> = {
          type: layoutType,
          elements: [],
        }
        if (label !== undefined) layout.label = label
        if (scope !== undefined) layout.scope = scope
        const opt = args['options']
        if (opt != null && typeof opt === 'object' && !Array.isArray(opt)) {
          layout.options = opt
        }
        const rule = args['rule']
        if (rule != null && typeof rule === 'object' && !Array.isArray(rule)) {
          layout.rule = rule
        }
        const rootElements = ensureRootVerticalLayout(uiSchema)
        rootElements.push(layout)
        return { success: true, message: `Added layout ${layoutType}` }
      }
      case 'update_layout': {
        const label = typeof args['label'] === 'string' ? args['label'] : undefined
        const scope = typeof args['scope'] === 'string' ? args['scope'] : undefined
        const rootElements = ensureRootVerticalLayout(uiSchema)
        const match = rootElements.find((el) => {
          if (label !== undefined && el.label === label) return true
          if (scope !== undefined && el.scope === scope) return true
          return false
        })
        if (!match) return { success: false, error: 'update_layout: layout not found' }
        const opt = args['options']
        if (opt != null && typeof opt === 'object' && !Array.isArray(opt)) {
          match.options = {
            ...(typeof match.options === 'object' && match.options !== null ? (match.options as object) : {}),
            ...opt,
          }
        }
        const rule = args['rule']
        if (rule != null && typeof rule === 'object' && !Array.isArray(rule)) {
          match.rule = rule
        }
        if (typeof args['newLabel'] === 'string') {
          match.label = args['newLabel']
        }
        return { success: true, message: 'Updated layout' }
      }
      case 'move_element': {
        const scope = args['scope']
        if (typeof scope !== 'string') return { success: false, error: 'move_element: scope required' }
        const rootElements = ensureRootVerticalLayout(uiSchema)
        const from = findControlIndex(rootElements, scope)
        if (from < 0) return { success: false, error: 'move_element: control not found at root' }
        const moved = rootElements.splice(from, 1)
        const node = moved[0]
        if (node === undefined) return { success: false, error: 'move_element: internal' }
        const targetLabel = args['targetParentLabel']
        if (typeof targetLabel === 'string') {
          const layout = rootElements.find((el) => el.label === targetLabel && Array.isArray(el.elements))
          if (layout && Array.isArray(layout.elements)) {
            ;(layout.elements as Record<string, unknown>[]).push(node)
            return { success: true, message: `Moved into layout ${targetLabel}` }
          }
        }
        rootElements.push(node)
        return { success: true, message: 'Moved (appended to root)' }
      }
      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (e) {
    return { success: false, error: String(e) }
  }
}

export function executeToolWithLog(
  setSchema: Dispatch<SetStateAction<SchemaState>>,
  appendLog: (e: ToolLogEntry) => void,
  toolName: string,
  args: Record<string, unknown>,
): ToolResult {
  let result: ToolResult = { success: false, error: 'uninitialized' }
  setSchema((prev) => {
    const next = clone(prev)
    result = applySchemaTool(next, toolName, args)
    return next
  })
  appendLog({
    id: newId(),
    at: new Date().toISOString(),
    toolName,
    args,
    result,
  })
  return result
}
