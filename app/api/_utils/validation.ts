/**
 * Validates that a value is a non-empty string
 * @param value The value to validate
 * @param fieldName The name of the field (for error messages)
 * @returns An error message if invalid, undefined if valid
 */
export function validateString(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
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
 * Validates that a value is a boolean
 * @param value The value to validate
 * @param fieldName The name of the field (for error messages)
 * @returns An error message if invalid, undefined if valid
 */
export function validateBoolean(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return `${fieldName} is required`;
  }
  
  if (typeof value !== 'boolean') {
    return `${fieldName} must be a boolean`;
  }
  
  return undefined;
}

/**
 * Validates that a value is an array
 * @param value The value to validate
 * @param fieldName The name of the field (for error messages)
 * @returns An error message if invalid, undefined if valid
 */
export function validateArray(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
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
 * @param fieldName The name of the field (for error messages)
 * @returns An error message if invalid, undefined if valid
 */
export function validateEnum<T>(
  value: unknown, 
  allowedValues: readonly T[], 
  fieldName: string
): string | undefined {
  if (value === undefined || value === null) {
    return `${fieldName} is required`;
  }
  
  // Type guard to check if value is in allowedValues
  if (!allowedValues.some(allowed => allowed === value)) {
    return `${fieldName} must be one of: ${allowedValues.join(', ')}`;
  }
  
  return undefined;
}

/**
 * Validates an object against a schema of validation functions
 * @param obj The object to validate
 * @param schema An object mapping field names to validation functions
 * @returns An object with validation errors, or null if valid
 */
export function validateObject<T extends Record<string, unknown>>(
  obj: T,
  schema: Record<string, (value: unknown) => string | undefined>
): Record<string, string> | null {
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
 * Validates that an object only contains allowed properties
 * @param obj The object to validate
 * @param allowedProps Array of allowed property names
 * @returns An array of invalid property names, or null if all are valid
 */
export function validateAllowedProperties<T extends Record<string, unknown>>(
  obj: T,
  allowedProps: string[]
): string[] | null {
  const invalidProps = Object.keys(obj).filter(prop => !allowedProps.includes(prop));
  return invalidProps.length > 0 ? invalidProps : null;
}