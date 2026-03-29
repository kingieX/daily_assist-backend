import { VisitStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';

async function getDashboardSummary(staffUserId: string) {
  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);
  const endOfToday = new Date(startOfToday);
  endOfToday.setUTCDate(endOfToday.getUTCDate() + 1);

  const [todayVisits, nextVisit, recentCompleted, totalVisits, completedVisits] = await Promise.all([
    prisma.visit.findMany({
      where: {
        staffId: staffUserId,
        scheduledStartAt: { gte: startOfToday, lt: endOfToday }
      },
      select: {
        id: true,
        status: true,
        scheduledStartAt: true,
        scheduledEndAt: true
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }]
    }),
    prisma.visit.findFirst({
      where: {
        staffId: staffUserId,
        status: { in: [VisitStatus.ASSIGNED, VisitStatus.ACKNOWLEDGED] },
        scheduledStartAt: { gte: new Date() }
      },
      select: {
        id: true,
        status: true,
        scheduledStartAt: true,
        scheduledEndAt: true,
        bookingId: true
      },
      orderBy: [{ scheduledStartAt: 'asc' }, { id: 'asc' }]
    }),
    prisma.visit.findMany({
      where: {
        staffId: staffUserId,
        status: VisitStatus.COMPLETED
      },
      select: {
        id: true,
        checkOutAt: true,
        completionSummary: true,
        bookingId: true
      },
      orderBy: [{ checkOutAt: 'desc' }, { id: 'desc' }],
      take: 5
    }),
    prisma.visit.count({ where: { staffId: staffUserId } }),
    prisma.visit.count({ where: { staffId: staffUserId, status: VisitStatus.COMPLETED } })
  ]);

  const statusCounts = todayVisits.reduce(
    (acc, visit) => {
      acc[visit.status] += 1;
      return acc;
    },
    {
      ASSIGNED: 0,
      ACKNOWLEDGED: 0,
      IN_PROGRESS: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      NO_SHOW: 0
    } as Record<VisitStatus, number>
  );

  return {
    today: {
      date: startOfToday.toISOString().slice(0, 10),
      totalVisits: todayVisits.length,
      statusCounts
    },
    nextVisit,
    recentCompleted,
    performance: {
      totalVisits,
      completedVisits,
      completionRate: totalVisits === 0 ? 0 : Number(((completedVisits / totalVisits) * 100).toFixed(2))
    }
  };
}

export const staffService = {
  getDashboardSummary
};
