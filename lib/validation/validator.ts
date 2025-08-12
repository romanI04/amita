// Request validation utility
// Provides validate() function with comprehensive error handling and request ID generation

import { randomUUID } from 'crypto';
import type { ValidationSchema, ValidationResult, ValidationError } from './schemas';

// Generate unique request ID for error tracking
export function generateRequestId(): string {
  return `req_${randomUUID().replace(/-/g, '').substring(0, 16)}`;
}

// Main validation function
export function validate<T = any>(
  body: unknown, 
  schema: ValidationSchema, 
  requestId?: string
): ValidationResult<T> {
  const reqId = requestId || generateRequestId();
  
  try {
    // Check if body is an object
    if (!body || typeof body !== 'object') {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Request body must be a valid JSON object',
          details: {
            expected: 'object',
            received: typeof body,
            constraint: 'body_type'
          }
        }
      };
    }
    
    const data = body as Record<string, unknown>;
    const validatedData: Record<string, unknown> = {};
    
    // Validate each field in the schema
    for (const [fieldName, fieldSchema] of Object.entries(schema)) {
      const value = data[fieldName];
      
      // Check required fields
      if (fieldSchema.required && (value === undefined || value === null)) {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Missing required field: ${fieldName}`,
            details: {
              field: fieldName,
              expected: fieldSchema.type,
              received: value,
              constraint: 'required'
            }
          }
        };
      }
      
      // Skip validation if field is not required and not present
      if (!fieldSchema.required && (value === undefined || value === null)) {
        continue;
      }
      
      // Type validation
      const typeValidation = validateType(value, fieldSchema.type, fieldName);
      if (!typeValidation.success) {
        return typeValidation;
      }
      
      // Additional constraints validation
      const constraintValidation = validateConstraints(value, fieldSchema, fieldName);
      if (!constraintValidation.success) {
        return constraintValidation;
      }
      
      // Nested object/array validation
      if (fieldSchema.type === 'array' && fieldSchema.itemSchema && Array.isArray(value)) {
        const arrayValidation = validateArrayItems(value, fieldSchema.itemSchema, fieldName);
        if (!arrayValidation.success) {
          return arrayValidation;
        }
      }
      
      validatedData[fieldName] = value;
    }
    
    return {
      success: true,
      data: validatedData as T
    };
    
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Validation failed due to internal error',
        details: {
          constraint: 'internal_error',
          received: error instanceof Error ? error.message : 'unknown'
        }
      }
    };
  }
}

// Type validation helper
function validateType(
  value: unknown, 
  expectedType: string, 
  fieldName: string
): ValidationResult {
  const actualType = typeof value;
  
  switch (expectedType) {
    case 'string':
      if (actualType !== 'string') {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Field '${fieldName}' must be a string`,
            details: {
              field: fieldName,
              expected: 'string',
              received: actualType,
              constraint: 'type'
            }
          }
        };
      }
      break;
      
    case 'number':
      if (actualType !== 'number' || isNaN(value as number) || !isFinite(value as number)) {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Field '${fieldName}' must be a valid number`,
            details: {
              field: fieldName,
              expected: 'number',
              received: actualType,
              constraint: 'type'
            }
          }
        };
      }
      break;
      
    case 'boolean':
      if (actualType !== 'boolean') {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Field '${fieldName}' must be a boolean`,
            details: {
              field: fieldName,
              expected: 'boolean',
              received: actualType,
              constraint: 'type'
            }
          }
        };
      }
      break;
      
    case 'array':
      if (!Array.isArray(value)) {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Field '${fieldName}' must be an array`,
            details: {
              field: fieldName,
              expected: 'array',
              received: actualType,
              constraint: 'type'
            }
          }
        };
      }
      break;
      
    case 'object':
      if (actualType !== 'object' || Array.isArray(value)) {
        return {
          success: false,
          error: {
            code: 'BAD_REQUEST',
            message: `Field '${fieldName}' must be an object`,
            details: {
              field: fieldName,
              expected: 'object',
              received: Array.isArray(value) ? 'array' : actualType,
              constraint: 'type'
            }
          }
        };
      }
      break;
  }
  
  return { success: true };
}

// Constraint validation helper
function validateConstraints(
  value: unknown, 
  schema: ValidationSchema[string], 
  fieldName: string
): ValidationResult {
  // String constraints
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Field '${fieldName}' must be at least ${schema.minLength} characters long`,
          details: {
            field: fieldName,
            expected: `>= ${schema.minLength} characters`,
            received: `${value.length} characters`,
            constraint: 'minLength'
          }
        }
      };
    }
    
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Field '${fieldName}' must be at most ${schema.maxLength} characters long`,
          details: {
            field: fieldName,
            expected: `<= ${schema.maxLength} characters`,
            received: `${value.length} characters`,
            constraint: 'maxLength'
          }
        }
      };
    }
    
    if (schema.pattern && !schema.pattern.test(value)) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Field '${fieldName}' does not match required pattern`,
          details: {
            field: fieldName,
            expected: 'valid format',
            received: 'invalid format',
            constraint: 'pattern'
          }
        }
      };
    }
  }
  
  // Number constraints
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Field '${fieldName}' must be at least ${schema.min}`,
          details: {
            field: fieldName,
            expected: `>= ${schema.min}`,
            received: value,
            constraint: 'min'
          }
        }
      };
    }
    
    if (schema.max !== undefined && value > schema.max) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Field '${fieldName}' must be at most ${schema.max}`,
          details: {
            field: fieldName,
            expected: `<= ${schema.max}`,
            received: value,
            constraint: 'max'
          }
        }
      };
    }
  }
  
  // Array constraints
  if (schema.type === 'array' && Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Field '${fieldName}' must contain at least ${schema.minItems} items`,
          details: {
            field: fieldName,
            expected: `>= ${schema.minItems} items`,
            received: `${value.length} items`,
            constraint: 'minItems'
          }
        }
      };
    }
    
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Field '${fieldName}' must contain at most ${schema.maxItems} items`,
          details: {
            field: fieldName,
            expected: `<= ${schema.maxItems} items`,
            received: `${value.length} items`,
            constraint: 'maxItems'
          }
        }
      };
    }
  }
  
  // Enum validation
  if (schema.enum) {
    const enumValues = Array.isArray(schema.enum) ? schema.enum : Object.values(schema.enum);
    if (!enumValues.includes(value as any)) {
      return {
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: `Field '${fieldName}' must be one of: ${enumValues.join(', ')}`,
          details: {
            field: fieldName,
            expected: `one of [${enumValues.join(', ')}]`,
            received: value,
            constraint: 'enum'
          }
        }
      };
    }
  }
  
  return { success: true };
}

// Array item validation helper
function validateArrayItems(
  array: unknown[], 
  itemSchema: ValidationSchema[string], 
  fieldName: string
): ValidationResult {
  for (let i = 0; i < array.length; i++) {
    const item = array[i];
    const itemFieldName = `${fieldName}[${i}]`;
    
    const typeValidation = validateType(item, itemSchema.type, itemFieldName);
    if (!typeValidation.success) {
      return typeValidation;
    }
    
    const constraintValidation = validateConstraints(item, itemSchema, itemFieldName);
    if (!constraintValidation.success) {
      return constraintValidation;
    }
  }
  
  return { success: true };
}

// Nested object validation helper (for complex schemas)
export function validateNestedObject(
  obj: unknown,
  schema: ValidationSchema,
  fieldName: string,
  requestId?: string
): ValidationResult {
  if (!obj || typeof obj !== 'object') {
    return {
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: `Field '${fieldName}' must be an object`,
        details: {
          field: fieldName,
          expected: 'object',
          received: typeof obj,
          constraint: 'type'
        }
      }
    };
  }
  
  return validate(obj, schema, requestId);
}

// Format validation error for API response
export function formatValidationError(
  error: ValidationError, 
  requestId: string
): {
  error: ValidationError;
  requestId: string;
} {
  return {
    error,
    requestId
  };
}