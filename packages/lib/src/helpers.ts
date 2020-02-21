import typeDetect from 'type-detect'
import Ajv, { ErrorObject } from 'ajv'
import jsonSchemaDraft4 from 'ajv/lib/refs/json-schema-draft-04.json'
import { SvelteComponent } from 'svelte'

import {
  FieldProps,
  JSONObject,
  JSONSchema,
  JSONSchemaType,
  ErrorRecord,
  Errors,
  FormComponents,
  Props,
  SvelteSchema
} from './types'

export function createProps<T extends JSONSchemaType, E extends Errors = ErrorObject[]>(
  value: T | null = null
): FieldProps<T, E> {
  const props: FieldProps<T, E> = {
    value,
    errors: null
  }

  return props
}

export function objectDefaultValue(schema: JSONSchema, value: JSONObject | null): JSONObject {
  const v: JSONObject = {}
  const { properties } = schema
  if (properties) {
    for (let k in properties) {
      const propSchema = properties[k]

      if (typeof propSchema !== 'boolean') {
        const item = value && value[k]
        v[k] = defaultValue(propSchema, item)
      }
    }
  }
  return v
}

export function defaultValue<T extends JSONSchemaType>(schema: JSONSchema, value: T): T {
  if (value === null && schema.default !== undefined) {
    value = schema.default as T
  }

  switch (schema.type) {
    case 'object':
      return objectDefaultValue(schema, <JSONObject>value) as T

    case 'array':
      return (value || []) as T
  }

  return value
}

export function normalizeObject(value: JSONObject, isRoot = true): JSONObject | null {
  const obj: JSONObject = {}
  for (const k in value) {
    let v = value[k]
    v = typeDetect(v) === 'Object' ? normalizeObject(v as JSONObject, false) : v
    if (v !== null) {
      obj[k] = v
    }
  }
  return Object.keys(obj).length ? obj : isRoot ? {} : null
}

export function normalizeValue(value: JSONSchemaType): JSONSchemaType {
  return typeDetect(value) === 'Object' ? normalizeObject(value as JSONObject) : value
}

let ajv: Ajv.Ajv
export const options = {
  get ajv() {
    if (!ajv) {
      ajv = new Ajv({ schemaId: 'auto', allErrors: true })
      ajv.addMetaSchema(jsonSchemaDraft4)
    }
    return ajv
  }
}
export function validate(ajv: Ajv.Ajv, schema: JSONSchema, data: JSONSchemaType) {
  const valid = ajv.validate(schema, data) as boolean
  if (!valid) {
    return ajv.errors as Ajv.ErrorObject[]
  }
  return null
}

export function errorsToMap(errors: ErrorObject[]): ErrorRecord {
  const errorMap: ErrorRecord = {}
  return errors
    .map((error): [string[], ErrorObject] => {
      const pathSuffix =
        error.keyword === 'required' ? `.${(<Ajv.RequiredParams>error.params).missingProperty}` : ''
      const path = `${error.dataPath}${pathSuffix}`.split('.').slice(1)
      return [path, error]
    })
    .reduce((acc, [path, error]) => {
      path.reduce((obj, key, i, arr) => {
        // build tree
        if (i !== arr.length - 1) {
          return (obj[key] ? obj[key] : (obj[key] = obj[key] || {})) as ErrorRecord
        }

        // add error
        if (obj[key]) {
          ;(obj[key] as ErrorObject[]).push(error)
        } else {
          obj[key] = [error]
        }

        return obj
      }, acc)
      return acc
    }, errorMap)
}

export function getComponent(
  schema: SvelteSchema,
  components: FormComponents
): typeof SvelteComponent {
  if (typeof schema.type !== 'string') {
    throw new Error(`Type "${schema.type}" is not supported`)
  }

  return (schema.$svelte && schema.$svelte.component) || components.fields[schema.type]
}

export function getComponentProps(schema: SvelteSchema): Props {
  return (schema.$svelte && schema.$svelte.props) || {}
}
