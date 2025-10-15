// Enhanced TAT (Turn Around Time) calculation functions
// Handles office hours, weekends, and various TAT calculation methods

export interface TATConfig {
  officeStartHour: number;
  officeEndHour: number;
  timezone: string;
  skipWeekends: boolean;
  weekendDays?: string; // Comma-separated weekend days: "0,6" for Sun+Sat, "0" for Sun only
}

const defaultConfig: TATConfig = {
  officeStartHour: 9,  // 9 AM (customizable per organization)
  officeEndHour: 17,   // 5 PM (customizable per organization)
  timezone: "Asia/Kolkata", // IST (customizable per organization)
  skipWeekends: true,
  weekendDays: "0,6" // Sunday (0) and Saturday (6) - customizable per organization
};

// Helper function to check if a day is a weekend
function isWeekendDay(day: number, weekendDays: string = "0,6"): boolean {
  if (!weekendDays) return false;
  const weekends = weekendDays.split(',').map(d => parseInt(d.trim()));
  return weekends.includes(day);
}

export function hourTAT(
  timestamp: Date, 
  tat: number, 
  config: TATConfig = defaultConfig
): Date {
  const { officeStartHour, officeEndHour, skipWeekends, weekendDays } = config;
  let currentTime = new Date(timestamp);
  let remainingHours = tat;
  
  while (remainingHours > 0) {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentDay = currentTime.getDay();
    
    // Skip weekends if configured
    if (skipWeekends && isWeekendDay(currentDay, weekendDays)) {
      // Jump to next working day at office start
      let daysToAdd = 1;
      let nextDay = (currentDay + daysToAdd) % 7;
      while (isWeekendDay(nextDay, weekendDays)) {
        daysToAdd++;
        nextDay = (currentDay + daysToAdd) % 7;
      }
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
    // Calculate exact hours left today (considering minutes)
    const currentTimeInHours = currentHour + currentMinute / 60;
    const hoursLeftToday = officeEndHour - currentTimeInHours;
    
    if (remainingHours < hoursLeftToday) {
      // Can finish today (before office end)
      currentTime.setHours(currentHour + remainingHours, currentTime.getMinutes(), 0, 0);
      remainingHours = 0;
    } else if (remainingHours === hoursLeftToday && currentMinute === 0) {
      // Exactly finish at office end (only if starting at exact hour with no minutes)
      // This would land exactly at officeEndHour, which is not allowed
      // So we need to continue to next day
      remainingHours -= hoursLeftToday;
      currentTime.setDate(currentTime.getDate() + 1);
      currentTime.setHours(officeStartHour, 0, 0, 0);
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
  const { officeStartHour, skipWeekends, weekendDays } = config;
  const resultDate = new Date(timestamp);
  let daysAdded = 0;
  
  while (daysAdded < tat) {
    resultDate.setDate(resultDate.getDate() + 1);
    
    // Skip weekends if configured using custom weekend days
    const isWeekend = skipWeekends && isWeekendDay(resultDate.getDay(), weekendDays);
    if (!isWeekend) {
      daysAdded++;
    }
  }
  
  // OPTION: Preserve original time (e.g., 2:30 PM -> 2:30 PM next day)
  // No time modification - keeps the exact time from timestamp
  
  // ORIGINAL BEHAVIOR: Set time to office start hour (e.g., 2:30 PM -> 9:00 AM next day)
  // resultDate.setHours(officeStartHour, 0, 0, 0);
  
  return resultDate;
}

export function beforeTAT(
  timestamp: Date, 
  daysToSubtract: number,
  config: TATConfig = defaultConfig
): Date {
  const { officeStartHour, skipWeekends, weekendDays } = config;
  const resultDate = new Date(timestamp);
  let daysSubtracted = 0;
  
  while (daysSubtracted < daysToSubtract) {
    resultDate.setDate(resultDate.getDate() - 1);
    
    // Skip weekends if configured using custom weekend days
    const isWeekend = skipWeekends && isWeekendDay(resultDate.getDay(), weekendDays);
    if (!isWeekend) {
      daysSubtracted++;
    }
  }
  
  // Set time to office start hour
  resultDate.setHours(officeStartHour, 0, 0, 0);
  
  return resultDate;
}

export function specifyTAT(timestamp: Date, hour: number, config: TATConfig = defaultConfig): Date {
  const { skipWeekends, weekendDays } = config;
  
  // Validate hour is between 0-23
  if (hour < 0 || hour > 23) {
    throw new Error('Specify TAT hour must be between 0 and 23');
  }
  
  // Start with next day
  const resultDate = new Date(timestamp);
  resultDate.setDate(resultDate.getDate() + 1);
  
  // Set to the specific hour (e.g., TAT = 10 means 10:00 AM)
  resultDate.setHours(hour, 0, 0, 0);
  
  // Skip weekends if configured using custom weekend days
  if (skipWeekends) {
    while (isWeekendDay(resultDate.getDay(), weekendDays)) {
      resultDate.setDate(resultDate.getDate() + 1);
    }
  }
  
  return resultDate;
}

export function calculateTAT(
  timestamp: Date,
  tat: number,
  tatType: string,
  config: TATConfig = defaultConfig
): Date {
  // Validate inputs
  if (!timestamp || isNaN(timestamp.getTime())) {
    throw new Error('Invalid timestamp provided to calculateTAT');
  }
  
  if (typeof tat !== 'number' || isNaN(tat)) {
    throw new Error('TAT must be a valid number');
  }
  
  if (tat < 0) {
    throw new Error('TAT cannot be negative');
  }
  
  if (tat > 365) {
    throw new Error('TAT cannot exceed 365 days');
  }
  
  if (!config || typeof config.officeStartHour !== 'number' || typeof config.officeEndHour !== 'number') {
    throw new Error('Invalid TAT configuration');
  }
  
  if (config.officeEndHour <= config.officeStartHour) {
    throw new Error('Office end hour must be after start hour');
  }
  
  // Log calculation for debugging
  console.log('[TAT] Calculation started:', {
    timestamp: timestamp.toISOString(),
    tat,
    tatType,
    config
  });
  
  let result: Date;
  
  switch (tatType.toLowerCase()) {
    case "hour":
    case "hourtat":
      result = hourTAT(timestamp, tat, config);
      break;
    case "day":
    case "daytat":
      result = dayTAT(timestamp, tat, config);
      break;
    case "specify":
    case "specifytat":
      result = specifyTAT(timestamp, tat, config);
      break;
    case "before":
    case "beforetat":
      result = beforeTAT(timestamp, tat, config);
      break;
    default:
      result = hourTAT(timestamp, tat, config);
  }
  
  console.log('[TAT] Calculation completed:', {
    input: timestamp.toISOString(),
    output: result.toISOString(),
    duration: `${Math.round((result.getTime() - timestamp.getTime()) / (1000 * 60 * 60))} hours`
  });
  
  return result;
}

export function formatDateIST(date: Date): string {
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "2-digit", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).replace(/\//g, "/").replace(",", "");
}