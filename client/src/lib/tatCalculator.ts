// Client-side TAT (Turn Around Time) calculation for simulator
// Matches server-side tatCalculator.ts logic

export interface TATConfig {
  officeStartHour: number;
  officeEndHour: number;
  timezone: string;
  skipWeekends: boolean;
  workStart?: string; // HH:mm format
  workEnd?: string;   // HH:mm format
}

const defaultConfig: TATConfig = {
  officeStartHour: 9,  // 9 AM
  officeEndHour: 18,   // 6 PM
  timezone: "Asia/Kolkata",
  skipWeekends: true,
  workStart: "09:00",
  workEnd: "18:00"
};

// Parse HH:mm to { hours, minutes }
const parseTime = (time: string): { hours: number; minutes: number } => {
  const [h, m] = time.split(":").map(Number);
  return { hours: h || 0, minutes: m || 0 };
};

export function hourTAT(
  timestamp: Date, 
  tat: number, 
  config: TATConfig = defaultConfig
): Date {
  const { officeStartHour, officeEndHour, skipWeekends } = config;
  let currentTime = new Date(timestamp);
  let remainingHours = tat;
  
  while (remainingHours > 0) {
    const currentHour = currentTime.getHours();
    const currentDay = currentTime.getDay();
    
    // Skip weekends if configured
    if (skipWeekends && (currentDay === 0 || currentDay === 6)) {
      // Jump to next Monday at office start
      const daysToAdd = currentDay === 0 ? 1 : 2;
      currentTime.setDate(currentTime.getDate() + daysToAdd);
      currentTime.setHours(officeStartHour, 0, 0, 0);
      continue;
    }
    
    // Before office hours - jump to office start
    if (currentHour < officeStartHour) {
      currentTime.setHours(officeStartHour, 0, 0, 0);
      continue;
    }
    
    // After office hours - jump to next day
    if (currentHour >= officeEndHour) {
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(officeStartHour, 0, 0, 0);
      continue;
    }
    
    // Within office hours - calculate remaining hours today
    const hoursLeftToday = officeEndHour - currentHour;
    
    if (remainingHours <= hoursLeftToday) {
      // Can finish today
      currentTime.setHours(currentHour + remainingHours, currentTime.getMinutes(), 0, 0);
      remainingHours = 0;
    } else {
      // Need to continue tomorrow
      remainingHours -= hoursLeftToday;
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(officeStartHour, 0, 0, 0);
    }
  }
  
  return currentTime;
}

export function dayTAT(timestamp: Date, tat: number, config: TATConfig = defaultConfig): Date {
  const { officeStartHour, skipWeekends } = config;
  const resultDate = new Date(timestamp);
  let daysAdded = 0;
  
  while (daysAdded < tat) {
    resultDate.setDate(resultDate.getDate() + 1);
    
    // Skip weekends if configured
    const isWeekend = resultDate.getDay() === 0 || resultDate.getDay() === 6;
    if (!skipWeekends || !isWeekend) {
      daysAdded++;
    }
  }
  
  return resultDate;
}

export function beforeTAT(
  timestamp: Date, 
  daysToSubtract: number,
  config: TATConfig = defaultConfig
): Date {
  const { skipWeekends } = config;
  const resultDate = new Date(timestamp);
  let daysSubtracted = 0;
  
  while (daysSubtracted < daysToSubtract) {
    resultDate.setDate(resultDate.getDate() - 1);
    
    const isWeekend = resultDate.getDay() === 0 || resultDate.getDay() === 6;
    if (!skipWeekends || !isWeekend) {
      daysSubtracted++;
    }
  }
  
  return resultDate;
}

export function specifyTAT(timestamp: Date, hours: number, config: TATConfig = defaultConfig): Date {
  // Similar to hourTAT for consistency
  return hourTAT(timestamp, hours, config);
}

// Main TAT calculation function that matches server behavior
export function calculateTAT(
  timestamp: Date,
  tat: number,
  tatType: string,
  config?: Partial<TATConfig>
): Date {
  const fullConfig = { ...defaultConfig, ...config };
  const normalizedType = (tatType || "hourtat").toLowerCase();
  
  switch (normalizedType) {
    case "hourtat":
      return hourTAT(timestamp, tat, fullConfig);
    case "daytat":
      return dayTAT(timestamp, tat, fullConfig);
    case "beforetat":
      return beforeTAT(timestamp, tat, fullConfig);
    case "specifytat":
      return specifyTAT(timestamp, tat, fullConfig);
    default:
      // Default to hour TAT
      return hourTAT(timestamp, tat, fullConfig);
  }
}

// Calculate TAT in minutes for simulator
export function tatToMinutes(
  tat: number,
  tatType: string,
  startTime: Date,
  config?: Partial<TATConfig>
): number {
  const endTime = calculateTAT(startTime, tat, tatType, config);
  const totalMinutes = (endTime.getTime() - startTime.getTime()) / 60000;
  return Math.max(1, Math.round(totalMinutes));
}

// Check if a given time is within working hours
export function isWorkingTime(date: Date, config: TATConfig = defaultConfig): boolean {
  const { officeStartHour, officeEndHour, skipWeekends, workStart, workEnd } = config;
  
  const dayOfWeek = date.getDay();
  if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
    return false;
  }
  
  const hour = date.getHours();
  const minute = date.getMinutes();
  const currentMinutes = hour * 60 + minute;
  
  // Use workStart/workEnd if available, otherwise use officeStartHour/officeEndHour
  let startMinutes: number;
  let endMinutes: number;
  
  if (workStart && workEnd) {
    const start = parseTime(workStart);
    const end = parseTime(workEnd);
    startMinutes = start.hours * 60 + start.minutes;
    endMinutes = end.hours * 60 + end.minutes;
  } else {
    startMinutes = officeStartHour * 60;
    endMinutes = officeEndHour * 60;
  }
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// Get next working time (skips to next valid working period)
export function nextWorkingTime(date: Date, config: TATConfig = defaultConfig): Date {
  const result = new Date(date);
  const { officeStartHour, skipWeekends, workStart } = config;
  
  // Parse work start time
  const startTime = workStart ? parseTime(workStart) : { hours: officeStartHour, minutes: 0 };
  
  // If already in working hours, return as-is
  if (isWorkingTime(result, config)) {
    return result;
  }
  
  // Set to work start time
  result.setHours(startTime.hours, startTime.minutes, 0, 0);
  
  // Check if current time is after work end - move to next day
  const currentHour = date.getHours();
  const endHour = config.workEnd ? parseTime(config.workEnd).hours : config.officeEndHour;
  
  if (currentHour >= endHour) {
    result.setDate(result.getDate() + 1);
    result.setHours(startTime.hours, startTime.minutes, 0, 0);
  }
  
  // Skip weekends
  if (skipWeekends) {
    while (result.getDay() === 0 || result.getDay() === 6) {
      result.setDate(result.getDate() + 1);
      result.setHours(startTime.hours, startTime.minutes, 0, 0);
    }
  }
  
  return result;
}
