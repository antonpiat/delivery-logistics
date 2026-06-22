import { ShipmentStatus } from '@/common/enums/shipment-status.enum';

export const TERMINAL_STATUSES: ReadonlySet<ShipmentStatus> = new Set([
  ShipmentStatus.DELIVERED,
  ShipmentStatus.CANCELLED,
]);

export const ALLOWED_TRANSITIONS: Readonly<
  Record<ShipmentStatus, readonly ShipmentStatus[]>
> = {
  [ShipmentStatus.PENDING]: [ShipmentStatus.ASSIGNED, ShipmentStatus.CANCELLED],
  [ShipmentStatus.ASSIGNED]: [
    ShipmentStatus.IN_TRANSIT,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.IN_TRANSIT]: [
    ShipmentStatus.DELIVERED,
    ShipmentStatus.CANCELLED,
  ],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

export const DRIVER_ALLOWED_TRANSITIONS: Readonly<
  Record<ShipmentStatus, readonly ShipmentStatus[]>
> = {
  [ShipmentStatus.PENDING]: [],
  [ShipmentStatus.ASSIGNED]: [ShipmentStatus.IN_TRANSIT],
  [ShipmentStatus.IN_TRANSIT]: [ShipmentStatus.DELIVERED],
  [ShipmentStatus.DELIVERED]: [],
  [ShipmentStatus.CANCELLED]: [],
};

export interface TransitionContext {
  driverId?: string | null;
  existingDriverId?: string | null;
}

export function getAllowedTransitions(
  from: ShipmentStatus,
): readonly ShipmentStatus[] {
  return ALLOWED_TRANSITIONS[from];
}

export function assertValidTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
): void {
  if (from === to) {
    throw new Error(`Shipment is already ${to}`);
  }

  if (TERMINAL_STATUSES.has(from)) {
    throw new Error(`Cannot change status from terminal state ${from}`);
  }

  const allowed = ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(
      `Invalid status transition from ${from} to ${to}. Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }
}

export function assertDriverTransition(
  from: ShipmentStatus,
  to: ShipmentStatus,
): void {
  const allowed = DRIVER_ALLOWED_TRANSITIONS[from];
  if (!allowed.includes(to)) {
    throw new Error(`Drivers cannot transition shipment from ${from} to ${to}`);
  }
}

export function assertTransitionContext(
  to: ShipmentStatus,
  context: TransitionContext,
): void {
  const resolvedDriverId = context.driverId ?? context.existingDriverId;

  if (to === ShipmentStatus.ASSIGNED && !context.driverId) {
    throw new Error('driverId is required when assigning a shipment');
  }

  if (
    (to === ShipmentStatus.IN_TRANSIT || to === ShipmentStatus.DELIVERED) &&
    !resolvedDriverId
  ) {
    throw new Error(
      `A driver must be assigned before marking shipment as ${to}`,
    );
  }
}
