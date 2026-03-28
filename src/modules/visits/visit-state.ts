import { VisitStatus } from '@prisma/client';
import { ApiError } from '../../utils/api-error';

const allowedTransitions: Record<VisitStatus, VisitStatus[]> = {
  [VisitStatus.ASSIGNED]: [VisitStatus.ACKNOWLEDGED, VisitStatus.CANCELLED, VisitStatus.NO_SHOW],
  [VisitStatus.ACKNOWLEDGED]: [VisitStatus.IN_PROGRESS, VisitStatus.CANCELLED, VisitStatus.NO_SHOW],
  [VisitStatus.IN_PROGRESS]: [VisitStatus.COMPLETED, VisitStatus.CANCELLED],
  [VisitStatus.COMPLETED]: [],
  [VisitStatus.CANCELLED]: [],
  [VisitStatus.NO_SHOW]: []
};

export function canTransition(from: VisitStatus, to: VisitStatus): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: VisitStatus, to: VisitStatus): void {
  if (!canTransition(from, to)) {
    throw new ApiError(400, `Invalid visit status transition: ${from} -> ${to}`);
  }
}
