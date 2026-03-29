import { ApiError } from '../../utils/api-error';

export const VISIT_STATUS = {
  ASSIGNED: 'ASSIGNED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  NO_SHOW: 'NO_SHOW'
} as const;

export type VisitStatusValue = (typeof VISIT_STATUS)[keyof typeof VISIT_STATUS];

const allowedTransitions: Record<VisitStatusValue, VisitStatusValue[]> = {
  [VISIT_STATUS.ASSIGNED]: [
    VISIT_STATUS.ACKNOWLEDGED,
    VISIT_STATUS.CANCELLED,
    VISIT_STATUS.NO_SHOW
  ],
  [VISIT_STATUS.ACKNOWLEDGED]: [
    VISIT_STATUS.IN_PROGRESS,
    VISIT_STATUS.CANCELLED,
    VISIT_STATUS.NO_SHOW
  ],
  [VISIT_STATUS.IN_PROGRESS]: [VISIT_STATUS.COMPLETED, VISIT_STATUS.CANCELLED],
  [VISIT_STATUS.COMPLETED]: [],
  [VISIT_STATUS.CANCELLED]: [],
  [VISIT_STATUS.NO_SHOW]: []
};

export function canTransition(from: VisitStatusValue, to: VisitStatusValue): boolean {
  return allowedTransitions[from].includes(to);
}

export function assertTransition(from: VisitStatusValue, to: VisitStatusValue): void {
  if (!canTransition(from, to)) {
    throw new ApiError(400, `Invalid visit status transition: ${from} -> ${to}`);
  }
}
