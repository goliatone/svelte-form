import typeDetect from 'type-detect'
import { FieldProps, JSONObject, JSONSchema, JSONSchemaType } from './types'

export function createProps<T extends JSONSchemaType>(): FieldProps<T> {
  const props: FieldProps<T> = {
    value: null,
    error: null
  }

  return props
}

export function objectDefaultValue(value: JSONObject | null, schema: JSONSchema): JSONObject {
  const v: JSONObject = {}
  const { properties } = schema
  if (properties) {
    for (let k in properties) {
      const propSchema = properties[k]

      if (typeof propSchema !== 'boolean') {
        const item = value && value[k]
        v[k] = defaultValue(item, propSchema)
      }
    }
  }
  return v
}

export function defaultValue(value: JSONSchemaType, schema: JSONSchema): JSONSchemaType {
  if (value === null && schema.default !== undefined) {
    value = schema.default
  }

  if (schema.type === 'object') {
    return objectDefaultValue(<JSONObject>value, schema)
  }

  return value
}

export function normalizeObject(value: JSONObject): JSONObject | null {
  const obj: JSONObject = {}
  for (const k in value) {
    let v = value[k]
    v = typeDetect(v) === 'Object' ? normalizeObject(v as JSONObject) : v
    if (v !== null) {
      obj[k] = v
    }
  }
  return Object.keys(obj).length ? obj : null
}

export function normalizeValue(value: JSONSchemaType): JSONSchemaType {
  return typeDetect(value) === 'Object' ? normalizeObject(value as JSONObject) : value
}
