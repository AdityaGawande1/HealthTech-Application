import prisma from '../db.js';

function localParts(instant, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(instant).reduce((parts, item) => ({ ...parts, [item.type]: item.value }), {});
}

// Convert a clinic wall-clock time to UTC without assuming the server timezone.
export function localTimeToUtc(date, time, timeZone) {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let guess = desired;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const shown = localParts(new Date(guess), timeZone);
    const observed = Date.UTC(Number(shown.year), Number(shown.month) - 1, Number(shown.day), Number(shown.hour), Number(shown.minute));
    guess += desired - observed;
  }
  return new Date(guess);
}

export async function getAvailableSlots(doctorId, date, exceptAppointmentId) {
  const doctor = await prisma.doctor.findFirst({
    where: { id: doctorId, active: true, approved: true },
    include: { availability: { where: { active: true } } },
  });
  if (!doctor) return [];
  const [year, month, day] = date.split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day, 12));
  if (Number.isNaN(calendarDate.valueOf()) || calendarDate.toISOString().slice(0, 10) !== date) return [];
  const dayOfWeek = calendarDate.getUTCDay();
  const blocks = doctor.availability.filter((row) => row.dayOfWeek === dayOfWeek);
  if (!blocks.length) return [];

  const startOfDay = localTimeToUtc(date, '00:00', doctor.timezone);
  const endOfDay = localTimeToUtc(date, '23:59', doctor.timezone);
  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
      startAt: { gte: startOfDay, lte: endOfDay },
      ...(exceptAppointmentId ? { id: { not: exceptAppointmentId } } : {}),
    },
    select: { startAt: true, endAt: true },
  });
  const now = new Date();
  const slots = [];
  for (const block of blocks) {
    const [startHour, startMinute] = block.startTime.split(':').map(Number);
    const [endHour, endMinute] = block.endTime.split(':').map(Number);
    const blockStart = startHour * 60 + startMinute;
    const blockEnd = endHour * 60 + endMinute;
    for (let minute = blockStart; minute + block.slotMinutes <= blockEnd; minute += block.slotMinutes) {
      const startTime = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
      const endMinute = minute + block.slotMinutes;
      const endTime = `${String(Math.floor(endMinute / 60)).padStart(2, '0')}:${String(endMinute % 60).padStart(2, '0')}`;
      const startAt = localTimeToUtc(date, startTime, doctor.timezone);
      const endAt = localTimeToUtc(date, endTime, doctor.timezone);
      const booked = appointments.some((appointment) => appointment.startAt < endAt && appointment.endAt > startAt);
      slots.push({ startAt: startAt.toISOString(), endAt: endAt.toISOString(), startTime, available: !booked && startAt > now });
    }
  }
  return slots;
}
