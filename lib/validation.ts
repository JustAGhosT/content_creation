/**
 * Validates that a value is a non-empty string
 * @param value The value to validate
 * @param fieldName The name of the field being validated
 * @returns Error message or undefined if valid
 */
export function oI(value: any, fieldName: string): string | undefined {
  if (value == null) {
    return `${fieldName} is required`;
  }
  
  if (typeof value !== 'string') {
    return `${fieldName} must be a string`;
  }
  
  if (value.trim() === '') {
    return `${fieldName} cannot be empty`;
  }
  
  return undefined;
}

/**
 * Validates that a value is an array
 * @param value The value to validate
 * @param fieldName The name of the field being validated
 * @returns Error message or undefined if valid
 */
export function I1(value: any, fieldName: string): string | undefined {
  if (value == null) {
    return `${fieldName} is required`;
  }
  
  if (!Array.isArray(value)) {
    return `${fieldName} must be an array`;
  }
  
  return undefined;
}

/**
 * Validates that a value is one of the allowed values
 * @param value The value to validate
 * @param allowedValues Array of allowed values
 * @param fieldName The name of the field being validated
 * @returns Error message or undefined if valid
 */
export function i1(value: any, allowedValues: any[], fieldName: string): string | undefined {
  if (value == null) {
    return `${fieldName} is required`;
  }
  
  if (!allowedValues.some(allowed => allowed === value)) {
    return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
  }
  
  return undefined;
}

/**
 * Validates an object against a schema of validation functions
 * @param obj The object to validate
 * @param schema Object mapping field names to validation functions
 * @returns Object with validation errors or null if valid
 */
export function Q5(obj: Record<string, any>, schema: Record<string, (value: any) => string | undefined>): Record<string, string> | null {
  const errors: Record<string, string> = {};
  
  for (const [field, validator] of Object.entries(schema)) {
    const error = validator(obj[field]);
    if (error) {
      errors[field] = error;
    }
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}

/**
 * Validates that an object doesn't have any extra fields
 * @param obj The object to validate
 * @param allowedFields Array of allowed field names
 * @returns Array of invalid field names or null if valid
 */
export function SW(obj: Record<string, any>, allowedFields: string[]): string[] | null {
  const extraFields = Object.keys(obj).filter(field => !allowedFields.includes(field));
  return extraFields.length > 0 ? extraFields : null;
}