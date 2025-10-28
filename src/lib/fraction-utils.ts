// Utility functions for parsing and manipulating fractions in recipe quantities

interface Fraction {
  whole: number;
  numerator: number;
  denominator: number;
}

// Parse a quantity string that may contain whole numbers, fractions, mixed numbers, or ranges
export function parseQuantity(quantity: string): Fraction | null {
  if (!quantity || !quantity.trim()) return null;
  
  const trimmed = quantity.trim();
  
  // Handle common fraction unicode characters
  const unicodeFractions: { [key: string]: string } = {
    '½': '1/2',
    '⅓': '1/3',
    '⅔': '2/3',
    '¼': '1/4',
    '¾': '3/4',
    '⅕': '1/5',
    '⅖': '2/5',
    '⅗': '3/5',
    '⅘': '4/5',
    '⅙': '1/6',
    '⅚': '5/6',
    '⅛': '1/8',
    '⅜': '3/8',
    '⅝': '5/8',
    '⅞': '7/8'
  };
  
  let normalized = trimmed;
  for (const [unicode, fraction] of Object.entries(unicodeFractions)) {
    normalized = normalized.replace(new RegExp(unicode, 'g'), fraction);
  }
  
  // Check for range patterns first (before removing characters)
  const range = parseRange(normalized);
  if (range) {
    return range;
  }
  
  // Remove any non-numeric characters except spaces, slashes, and dashes
  normalized = normalized.replace(/[^\d\s\/\-\.]/g, '');
  
  // Try to match different patterns
  
  // Pattern 1: Mixed number (e.g., "2 1/2", "1 3/4")
  const mixedMatch = normalized.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedMatch) {
    const whole = parseInt(mixedMatch[1]);
    const numerator = parseInt(mixedMatch[2]);
    const denominator = parseInt(mixedMatch[3]);
    return { whole, numerator, denominator };
  }
  
  // Pattern 2: Simple fraction (e.g., "1/2", "3/4")
  const fractionMatch = normalized.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const numerator = parseInt(fractionMatch[1]);
    const denominator = parseInt(fractionMatch[2]);
    return { whole: 0, numerator, denominator };
  }
  
  // Pattern 3: Decimal (e.g., "1.5", "2.25")
  const decimalMatch = normalized.match(/^(\d+)\.(\d+)$/);
  if (decimalMatch) {
    const decimal = parseFloat(normalized);
    return decimalToFraction(decimal);
  }
  
  // Pattern 4: Whole number (e.g., "2", "10")
  const wholeMatch = normalized.match(/^(\d+)$/);
  if (wholeMatch) {
    const whole = parseInt(wholeMatch[1]);
    return { whole, numerator: 0, denominator: 1 };
  }
  
  return null;
}

// Parse range quantities like "1-2", "1 to 2", "1-1½", etc.
function parseRange(quantity: string): Fraction | null {
  if (!quantity) return null;
  
  // Range patterns to match
  const rangePatterns = [
    // "1-2", "1½-2", "1/2-3/4", etc.
    /^([^\s]+?)\s*[-–—]\s*([^\s]+?)$/,
    // "1 to 2", "1½ to 2", etc.
    /^([^\s]+?)\s+to\s+([^\s]+?)$/i,
    // "1 or 2", "1½ or 2", etc.
    /^([^\s]+?)\s+or\s+([^\s]+?)$/i,
  ];
  
  for (const pattern of rangePatterns) {
    const match = quantity.match(pattern);
    if (match) {
      const [, start, end] = match;
      
      // Parse both ends of the range
      const startFraction = parseQuantity(start);
      const endFraction = parseQuantity(end);
      
      if (startFraction && endFraction) {
        // Convert both to decimals
        const startDecimal = fractionToDecimal(startFraction);
        const endDecimal = fractionToDecimal(endFraction);
        
        // Use the midpoint of the range for calculations
        const midpoint = (startDecimal + endDecimal) / 2;
        
        return decimalToFraction(midpoint);
      }
    }
  }
  
  return null;
}

// Convert a decimal to a fraction
function decimalToFraction(decimal: number): Fraction {
  const whole = Math.floor(decimal);
  const fractionalPart = decimal - whole;
  
  if (fractionalPart === 0) {
    return { whole, numerator: 0, denominator: 1 };
  }
  
  // Common decimal to fraction conversions
  const commonDecimals: { [key: string]: [number, number] } = {
    '0.5': [1, 2],
    '0.25': [1, 4],
    '0.75': [3, 4],
    '0.33': [1, 3],
    '0.333': [1, 3],
    '0.67': [2, 3],
    '0.667': [2, 3],
    '0.125': [1, 8],
    '0.375': [3, 8],
    '0.625': [5, 8],
    '0.875': [7, 8]
  };
  
  const fractionalStr = fractionalPart.toFixed(3);
  if (commonDecimals[fractionalStr]) {
    const [num, den] = commonDecimals[fractionalStr];
    return { whole, numerator: num, denominator: den };
  }
  
  // Fallback: convert to fraction with reasonable precision
  const denominator = 1000;
  const numerator = Math.round(fractionalPart * denominator);
  const simplified = simplifyFraction(numerator, denominator);
  
  return { whole, numerator: simplified.numerator, denominator: simplified.denominator };
}

// Simplify a fraction by finding the GCD
function simplifyFraction(numerator: number, denominator: number): { numerator: number; denominator: number } {
  const gcd = findGCD(Math.abs(numerator), Math.abs(denominator));
  return {
    numerator: numerator / gcd,
    denominator: denominator / gcd
  };
}

// Find the Greatest Common Divisor
function findGCD(a: number, b: number): number {
  return b === 0 ? a : findGCD(b, a % b);
}

// Convert a fraction to a decimal
function fractionToDecimal(fraction: Fraction): number {
  return fraction.whole + (fraction.numerator / fraction.denominator);
}

// Multiply a fraction by a multiplier
export function multiplyQuantity(quantity: string, multiplier: number): string {
  if (!quantity || !quantity.trim() || multiplier === 1) return quantity;
  
  // Check if this is a range quantity first
  const rangeResult = multiplyRange(quantity, multiplier);
  if (rangeResult) return rangeResult;
  
  const parsed = parseQuantity(quantity);
  if (!parsed) return quantity;
  
  // Convert to decimal, multiply, then convert back to fraction
  const decimal = fractionToDecimal(parsed);
  const multiplied = decimal * multiplier;
  const result = decimalToFraction(multiplied);
  
  return formatFraction(result);
}

// Multiply range quantities while preserving the range format
function multiplyRange(quantity: string, multiplier: number): string | null {
  if (!quantity || multiplier === 1) return null;
  
  // Range patterns to match
  const rangePatterns = [
    // "1-2", "1½-2", "1/2-3/4", etc.
    { pattern: /^([^\s]+?)\s*([-–—])\s*([^\s]+?)$/, separator: (match: RegExpMatchArray) => match[2] },
    // "1 to 2", "1½ to 2", etc.
    { pattern: /^([^\s]+?)\s+(to)\s+([^\s]+?)$/i, separator: () => ' to ' },
    // "1 or 2", "1½ or 2", etc.
    { pattern: /^([^\s]+?)\s+(or)\s+([^\s]+?)$/i, separator: () => ' or ' },
  ];
  
  for (const { pattern, separator } of rangePatterns) {
    const match = quantity.match(pattern);
    if (match) {
      const [, start, , end] = match;
      
      // Parse and multiply both ends of the range
      const startParsed = parseQuantity(start);
      const endParsed = parseQuantity(end);
      
      if (startParsed && endParsed) {
        const startDecimal = fractionToDecimal(startParsed);
        const endDecimal = fractionToDecimal(endParsed);
        
        const multipliedStart = startDecimal * multiplier;
        const multipliedEnd = endDecimal * multiplier;
        
        const startResult = formatFraction(decimalToFraction(multipliedStart));
        const endResult = formatFraction(decimalToFraction(multipliedEnd));
        
        return `${startResult}${separator(match)}${endResult}`;
      }
    }
  }
  
  return null;
}

// Format a fraction as a string
function formatFraction(fraction: Fraction): string {
  const { whole, numerator, denominator } = fraction;
  
  // Simplify the fraction
  if (numerator > 0) {
    const simplified = simplifyFraction(numerator, denominator);
    const finalWhole = whole + Math.floor(simplified.numerator / simplified.denominator);
    const finalNumerator = simplified.numerator % simplified.denominator;
    
    if (finalNumerator === 0) {
      return finalWhole.toString();
    }
    
    if (finalWhole === 0) {
      return `${finalNumerator}/${simplified.denominator}`;
    }
    
    return `${finalWhole} ${finalNumerator}/${simplified.denominator}`;
  }
  
  return whole.toString();
}

// Parse a fraction string and return it as a decimal number
export function parseFraction(quantityStr: string): number {
  if (!quantityStr || !quantityStr.trim()) return 0;
  
  const parsed = parseQuantity(quantityStr.trim());
  if (!parsed) {
    // Fallback: try to parse as a simple number
    const num = parseFloat(quantityStr);
    return isNaN(num) ? 0 : num;
  }
  
  return fractionToDecimal(parsed);
}

// Parse a fraction string and return the maximum value for grocery shopping
// (uses max of range instead of midpoint for aggregation purposes)
export function parseFractionForShopping(quantityStr: string): number {
  if (!quantityStr || !quantityStr.trim()) return 0;
  
  // Check for range patterns first and return the maximum
  const range = parseRangeForShopping(quantityStr.trim());
  if (range !== null) {
    return range;
  }
  
  // Not a range, use regular parsing
  return parseFraction(quantityStr);
}

// Parse range quantities and return the maximum value for shopping
function parseRangeForShopping(quantity: string): number | null {
  if (!quantity) return null;
  
  // Range patterns to match
  const rangePatterns = [
    // "1-2", "1½-2", "1/2-3/4", etc.
    /^([^\s]+?)\s*[-–—]\s*([^\s]+?)$/,
    // "1 to 2", "1½ to 2", etc.
    /^([^\s]+?)\s+to\s+([^\s]+?)$/i,
    // "1 or 2", "1½ or 2", etc.
    /^([^\s]+?)\s+or\s+([^\s]+?)$/i,
  ];
  
  for (const pattern of rangePatterns) {
    const match = quantity.match(pattern);
    if (match) {
      const [, start, end] = match;
      
      // Parse both ends of the range
      const startFraction = parseQuantity(start);
      const endFraction = parseQuantity(end);
      
      if (startFraction && endFraction) {
        // Convert both to decimals and return the maximum
        const startDecimal = fractionToDecimal(startFraction);
        const endDecimal = fractionToDecimal(endFraction);
        
        return Math.max(startDecimal, endDecimal);
      }
    }
  }
  
  return null;
}

// Convert common fractions to unicode symbols for display
export function formatFractionWithUnicode(quantity: string): string {
  // Handle range quantities by applying unicode formatting to each part
  const rangePatterns = [
    { pattern: /^([^\s]+?)\s*([-–—])\s*([^\s]+?)$/, separator: (match: RegExpMatchArray) => match[2] },
    { pattern: /^([^\s]+?)\s+(to)\s+([^\s]+?)$/i, separator: () => ' to ' },
    { pattern: /^([^\s]+?)\s+(or)\s+([^\s]+?)$/i, separator: () => ' or ' },
  ];
  
  for (const { pattern, separator } of rangePatterns) {
    const match = quantity.match(pattern);
    if (match) {
      const [, start, , end] = match;
      const formattedStart = formatSingleFractionWithUnicode(start);
      const formattedEnd = formatSingleFractionWithUnicode(end);
      return `${formattedStart}${separator(match)}${formattedEnd}`;
    }
  }
  
  // Not a range, format as single quantity
  return formatSingleFractionWithUnicode(quantity);
}

// Helper function to format a single fraction with unicode
function formatSingleFractionWithUnicode(quantity: string): string {
  const unicodeReplacements: { [key: string]: string } = {
    ' 1/2': ' ½',
    ' 1/3': ' ⅓',
    ' 2/3': ' ⅔',
    ' 1/4': ' ¼',
    ' 3/4': ' ¾',
    ' 1/8': ' ⅛',
    ' 3/8': ' ⅜',
    ' 5/8': ' ⅝',
    ' 7/8': ' ⅞',
    '^1/2': '½',
    '^1/3': '⅓',
    '^2/3': '⅔',
    '^1/4': '¼',
    '^3/4': '¾',
    '^1/8': '⅛',
    '^3/8': '⅜',
    '^5/8': '⅝',
    '^7/8': '⅞'
  };
  
  let result = quantity;
  for (const [fraction, unicode] of Object.entries(unicodeReplacements)) {
    if (fraction.startsWith('^')) {
      const pattern = new RegExp(`^${fraction.slice(1)}`, 'g');
      result = result.replace(pattern, unicode);
    } else {
      result = result.replace(new RegExp(fraction, 'g'), unicode);
    }
  }
  
  return result;
}