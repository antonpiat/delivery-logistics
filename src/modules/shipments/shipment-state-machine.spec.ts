import { ShipmentStatus } from '@/common/enums/shipment-status.enum';
import {
  assertDriverTransition,
  assertTransitionContext,
  assertValidTransition,
  getAllowedTransitions,
  TERMINAL_STATUSES,
} from './shipment-state-machine';

describe('shipment-state-machine', () => {
  describe('getAllowedTransitions', () => {
    it('returns valid next states from PENDING', () => {
      expect(getAllowedTransitions(ShipmentStatus.PENDING)).toEqual([
        ShipmentStatus.ASSIGNED,
        ShipmentStatus.CANCELLED,
      ]);
    });

    it('returns empty array for terminal states', () => {
      expect(getAllowedTransitions(ShipmentStatus.DELIVERED)).toEqual([]);
      expect(getAllowedTransitions(ShipmentStatus.CANCELLED)).toEqual([]);
    });
  });

  describe('assertValidTransition', () => {
    it('allows PENDING to ASSIGNED', () => {
      expect(() =>
        assertValidTransition(ShipmentStatus.PENDING, ShipmentStatus.ASSIGNED),
      ).not.toThrow();
    });

    it('allows ASSIGNED to IN_TRANSIT', () => {
      expect(() =>
        assertValidTransition(
          ShipmentStatus.ASSIGNED,
          ShipmentStatus.IN_TRANSIT,
        ),
      ).not.toThrow();
    });

    it('allows IN_TRANSIT to DELIVERED', () => {
      expect(() =>
        assertValidTransition(
          ShipmentStatus.IN_TRANSIT,
          ShipmentStatus.DELIVERED,
        ),
      ).not.toThrow();
    });

    it('rejects skipping states', () => {
      expect(() =>
        assertValidTransition(ShipmentStatus.PENDING, ShipmentStatus.DELIVERED),
      ).toThrow('Invalid status transition');
    });

    it('rejects transitions from terminal states', () => {
      expect(() =>
        assertValidTransition(
          ShipmentStatus.DELIVERED,
          ShipmentStatus.IN_TRANSIT,
        ),
      ).toThrow('terminal state');
    });

    it('rejects no-op transitions', () => {
      expect(() =>
        assertValidTransition(ShipmentStatus.PENDING, ShipmentStatus.PENDING),
      ).toThrow('already PENDING');
    });
  });

  describe('assertDriverTransition', () => {
    it('allows driver to start transit', () => {
      expect(() =>
        assertDriverTransition(
          ShipmentStatus.ASSIGNED,
          ShipmentStatus.IN_TRANSIT,
        ),
      ).not.toThrow();
    });

    it('blocks driver from assigning shipments', () => {
      expect(() =>
        assertDriverTransition(ShipmentStatus.PENDING, ShipmentStatus.ASSIGNED),
      ).toThrow('Drivers cannot transition');
    });

    it('blocks driver from cancelling', () => {
      expect(() =>
        assertDriverTransition(
          ShipmentStatus.ASSIGNED,
          ShipmentStatus.CANCELLED,
        ),
      ).toThrow('Drivers cannot transition');
    });
  });

  describe('assertTransitionContext', () => {
    it('requires driverId when assigning', () => {
      expect(() =>
        assertTransitionContext(ShipmentStatus.ASSIGNED, {}),
      ).toThrow('driverId is required');
    });

    it('requires driver before in transit', () => {
      expect(() =>
        assertTransitionContext(ShipmentStatus.IN_TRANSIT, {}),
      ).toThrow('driver must be assigned');
    });

    it('accepts existing driver for in transit', () => {
      expect(() =>
        assertTransitionContext(ShipmentStatus.IN_TRANSIT, {
          existingDriverId: 'driver-1',
        }),
      ).not.toThrow();
    });
  });

  describe('TERMINAL_STATUSES', () => {
    it('includes delivered and cancelled', () => {
      expect(TERMINAL_STATUSES.has(ShipmentStatus.DELIVERED)).toBe(true);
      expect(TERMINAL_STATUSES.has(ShipmentStatus.CANCELLED)).toBe(true);
    });
  });
});
