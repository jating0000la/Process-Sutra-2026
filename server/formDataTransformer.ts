/**
 * Form Data Transformer
 * 
 * Provides a single, canonical transformation for form data from column IDs
 * to human-readable field names. This replaces multiple transformation layers.
 */

interface FormQuestion {
  id: string;
  label: string;
  type: string;
  tableColumns?: Array<{ id: string; label: string }>;
}

interface TransformResult {
  transformed: Record<string, any>;
  hasLegacyFormat: boolean;
}

/**
 * Transform form data to use readable field names instead of column IDs
 * 
 * Handles:
 * - Simple fields: "col_123" -> "Customer Name"
 * - Table fields: transforms nested column IDs to readable names
 * - Legacy format detection and transformation
 * - Already-transformed data (pass-through)
 * 
 * @param formData - Raw form data (may be in any format)
 * @param questions - Form template questions with labels
 * @returns Transformed data with readable field names
 */
export function transformFormDataToReadableNames(
  formData: Record<string, any>,
  questions: FormQuestion[]
): TransformResult {
  // Quick check if data is already transformed (no column IDs)
  const hasColumnIds = Object.keys(formData).some(key => key.startsWith('col_'));
  
  if (!hasColumnIds && !hasNestedColumnIds(formData)) {
    // Data is already in readable format
    return {
      transformed: formData,
      hasLegacyFormat: false
    };
  }

  // Create mappings for transformation
  const questionMap = new Map<string, string>();
  const tableColumnMaps = new Map<string, Map<string, string>>();

  questions.forEach(question => {
    if (question.id && question.label) {
      questionMap.set(question.id, question.label);
      
      // Build column mappings for table fields
      if (question.type === 'table' && question.tableColumns) {
        const colMap = new Map<string, string>();
        question.tableColumns.forEach(col => {
          if (col.id && col.label) {
            colMap.set(col.id, col.label);
          }
        });
        tableColumnMaps.set(question.id, colMap);
      }
    }
  });

  // Transform the data
  const transformed: Record<string, any> = {};

  Object.entries(formData).forEach(([key, value]) => {
    // Get readable name for the field
    const readableName = questionMap.get(key) || key;
    
    // Handle different value types
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // Table data - transform column IDs in rows
      const columnMap = tableColumnMaps.get(key);
      if (columnMap && columnMap.size > 0) {
        transformed[readableName] = value.map(row => {
          const transformedRow: Record<string, any> = {};
          Object.entries(row).forEach(([colId, colValue]) => {
            // Skip metadata fields
            if (colId.startsWith('_')) {
              return;
            }
            const colName = columnMap.get(colId) || colId;
            transformedRow[colName] = colValue;
          });
          return transformedRow;
        });
      } else {
        transformed[readableName] = value;
      }
    } else if (value && typeof value === 'object' && 'answer' in value) {
      // Client-enhanced format: extract the answer value
      const answer = value.answer;
      
      // If answer is table data, transform it
      if (Array.isArray(answer) && answer.length > 0 && typeof answer[0] === 'object') {
        const columnMap = tableColumnMaps.get(key) || tableColumnMaps.get(value.questionId);
        if (columnMap && columnMap.size > 0) {
          transformed[readableName] = answer.map((row: any) => {
            const transformedRow: Record<string, any> = {};
            Object.entries(row).forEach(([colId, colValue]) => {
              if (colId.startsWith('_')) return;
              const colName = columnMap.get(colId) || colId;
              transformedRow[colName] = colValue;
            });
            return transformedRow;
          });
        } else {
          transformed[readableName] = answer;
        }
      } else {
        transformed[readableName] = answer;
      }
    } else {
      // Simple value - store as-is
      transformed[readableName] = value;
    }
  });

  return {
    transformed,
    hasLegacyFormat: true
  };
}

/**
 * Check if form data has nested column IDs (in table rows or enhanced format)
 */
function hasNestedColumnIds(formData: Record<string, any>): boolean {
  for (const value of Object.values(formData)) {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
      // Check table rows for column IDs
      const firstRow = value[0];
      if (Object.keys(firstRow).some(key => key.startsWith('col_'))) {
        return true;
      }
    } else if (value && typeof value === 'object' && 'answer' in value) {
      // Check enhanced format
      if (Array.isArray(value.answer) && value.answer.length > 0) {
        const firstRow = value.answer[0];
        if (typeof firstRow === 'object' && Object.keys(firstRow).some(key => key.startsWith('col_'))) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * Normalize form data format - handles all three formats and returns canonical flat format
 * This is a convenience function that handles format detection automatically
 */
export function normalizeFormData(
  formData: Record<string, any>,
  questions: FormQuestion[]
): Record<string, any> {
  const result = transformFormDataToReadableNames(formData, questions);
  return result.transformed;
}
