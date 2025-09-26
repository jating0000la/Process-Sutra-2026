// Enhanced TAT (Turn Around Time) calculation functions
// Handles office hours, weekends, and various TAT calculation methods

export interface TATConfig {
  officeStartHour: number;
  officeEndHour: number;
  timezone: string;
}

const defaultConfig: TATConfig = {
  officeStartHour: 9,  // 9 AM
  officeEndHour: 18,   // 6 PM
  timezone: "Asia/Kolkata" // IST
};

export function hourTAT(
  timestamp: Date, 
  tat: number, 
  config: TATConfig = defaultConfig
): Date {
  const { officeStartHour, officeEndHour } = config;
  const minutes = timestamp.getMinutes();
  const currentHour = timestamp.getHours();
  const combinedHour = currentHour + tat;

  let newDate = new Date(timestamp);

  if (combinedHour >= officeEndHour) {
    // If goes beyond office hours, move to next day start + tat
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(officeStartHour + tat, minutes, 0, 0);
  } else if (combinedHour <= officeStartHour) {
    // If before office hours, set to office start + tat
    newDate.setHours(officeStartHour + tat, minutes, 0, 0);
  } else {
    // Within office hours, just add the hours
    newDate.setHours(combinedHour, minutes, 0, 0);
  }

  // Skip Sunday (0 = Sunday)
  if (newDate.getDay() === 0) {
    newDate.setDate(newDate.getDate() + 1);
  }

  return newDate;
}

export function dayTAT(timestamp: Date, tat: number, config: TATConfig = defaultConfig): Date {
  const resultDate = new Date(timestamp);
  let daysAdded = 0;
  
  while (daysAdded < tat) {
    resultDate.setDate(resultDate.getDate() + 1);
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (resultDate.getDay() !== 0 && resultDate.getDay() !== 6) {
      daysAdded++;
    }
  }
  
  // Set time to office start hour
  resultDate.setHours(config.officeStartHour, 0, 0, 0);
  
  return resultDate;
}

export function beforeTAT(timestamp: Date, tat: number, beforeTat: number, config: TATConfig = defaultConfig): Date {
  const resultDate = new Date(timestamp);
  let daysSubtracted = 0;
  
  while (daysSubtracted < (tat - beforeTat)) {
    resultDate.setDate(resultDate.getDate() - 1);
    
    // Skip weekends (Saturday = 6, Sunday = 0)
    if (resultDate.getDay() !== 0 && resultDate.getDay() !== 6) {
      daysSubtracted++;
    }
  }
  
  // Set time to office start hour
  resultDate.setHours(config.officeStartHour, 0, 0, 0);
  
  return resultDate;
}

export function specifyTAT(timestamp: Date, hours: number, config: TATConfig = defaultConfig): Date {
  const resultDate = new Date(timestamp);
  resultDate.setHours(resultDate.getHours() + hours);
  
  // Skip Sunday (0 = Sunday)
  if (resultDate.getDay() === 0) {
    resultDate.setDate(resultDate.getDate() + 1);
  }
  
  return resultDate;
}

export function calculateTAT(
  timestamp: Date,
  tat: number,
  tatType: string,
  config: TATConfig = defaultConfig
): Date {
  switch (tatType.toLowerCase()) {
    case "hour":
    case "hourtat":
      return hourTAT(timestamp, tat, config);
    case "day":
    case "daytat":
      return dayTAT(timestamp, tat, config);
    case "specify":
    case "specifytat":
      return specifyTAT(timestamp, tat, config);
    case "before":
    case "beforetat":
      return beforeTAT(timestamp, tat, 2, config);
    default:
      return hourTAT(timestamp, tat, config);
  }
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