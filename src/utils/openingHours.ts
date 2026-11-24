export interface DaySchedule {
  open: string; // formato HH:MM
  close: string; // formato HH:MM
  isClosed: boolean;
}

export interface OpeningHours {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { open: "08:00", close: "18:00", isClosed: false },
  tuesday: { open: "08:00", close: "18:00", isClosed: false },
  wednesday: { open: "08:00", close: "18:00", isClosed: false },
  thursday: { open: "08:00", close: "18:00", isClosed: false },
  friday: { open: "08:00", close: "18:00", isClosed: false },
  saturday: { open: "08:00", close: "16:00", isClosed: false },
  sunday: { open: "08:00", close: "16:00", isClosed: true },
};

export const DAY_NAMES: Record<string, string> = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira", 
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo"
};

export function isEstablishmentOpen(openingHours: any): boolean {
  if (!openingHours || typeof openingHours !== 'object') {
    return true; // Se não há horários definidos, assume que está sempre aberto
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes(); // minutos desde meia-noite

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[currentDay];
  const todaySchedule = openingHours[todayKey];

  if (!todaySchedule || todaySchedule.isClosed) {
    return false;
  }

  if (!todaySchedule.open || !todaySchedule.close) {
    return false;
  }

  try {
    const [openHour, openMinute] = todaySchedule.open.split(':').map(Number);
    const [closeHour, closeMinute] = todaySchedule.close.split(':').map(Number);

    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    // Verifica se o horário cruza a meia-noite (ex: 22:00 - 02:00)
    if (closeTime < openTime) {
      return currentTime >= openTime || currentTime <= closeTime;
    } else {
      return currentTime >= openTime && currentTime <= closeTime;
    }
  } catch (error) {
    console.error('Erro ao verificar horário de funcionamento:', error);
    return true; // Em caso de erro, assume que está aberto
  }
}

export function formatOpeningHours(openingHours: any): string {
  if (!openingHours || typeof openingHours !== 'object') {
    return "Consulte o estabelecimento";
  }

  const today = new Date().getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[today];
  const todaySchedule = openingHours[todayKey];

  if (!todaySchedule) {
    return "Horário não definido";
  }

  if (todaySchedule.isClosed) {
    return "Fechado hoje";
  }

  if (!todaySchedule.open || !todaySchedule.close) {
    return "Horário não definido";
  }

  return `Hoje: ${todaySchedule.open} às ${todaySchedule.close}`;
}

export function getFullScheduleText(openingHours: any): string[] {
  if (!openingHours || typeof openingHours !== 'object') {
    return ["Horários não definidos"];
  }

  const schedule: string[] = [];
  const dayOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of dayOrder) {
    const daySchedule = openingHours[day];
    const dayName = DAY_NAMES[day];

    if (!daySchedule) {
      schedule.push(`${dayName}: Não definido`);
    } else if (daySchedule.isClosed) {
      schedule.push(`${dayName}: Fechado`);
    } else if (!daySchedule.open || !daySchedule.close) {
      schedule.push(`${dayName}: Não definido`);
    } else {
      schedule.push(`${dayName}: ${daySchedule.open} às ${daySchedule.close}`);
    }
  }

  return schedule;
}

export function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

export function isValidOpeningHours(openingHours: any): boolean {
  if (!openingHours || typeof openingHours !== 'object') {
    return false;
  }

  const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  
  for (const day of dayKeys) {
    const schedule = openingHours[day];
    if (!schedule || typeof schedule !== 'object') {
      return false;
    }

    if (!schedule.isClosed) {
      if (!schedule.open || !schedule.close || 
          !validateTimeFormat(schedule.open) || 
          !validateTimeFormat(schedule.close)) {
        return false;
      }
    }
  }

  return true;
}