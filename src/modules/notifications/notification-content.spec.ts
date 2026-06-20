import { NotificationType } from '@/common/enums/notification-type.enum';
import { buildNotificationContent } from './notification-content';

describe('notification-content', () => {
  const payload = {
    trackingCode: 'ABCD1234',
    fromStatus: 'ASSIGNED',
    toStatus: 'IN_TRANSIT',
    pickupAddress: '123 Main St',
    deliveryAddress: '456 Oak Ave',
  };

  it('builds assigned email for drivers', () => {
    const content = buildNotificationContent(
      NotificationType.SHIPMENT_ASSIGNED,
      payload,
    );

    expect(content.subject).toContain('ABCD1234');
    expect(content.html).toContain('123 Main St');
    expect(content.body).toContain('assigned');
  });

  it('builds delivered email for customers', () => {
    const content = buildNotificationContent(
      NotificationType.DELIVERED,
      payload,
    );

    expect(content.subject).toContain('Delivered');
    expect(content.body).toContain('delivered');
  });

  it('builds status changed email', () => {
    const content = buildNotificationContent(
      NotificationType.STATUS_CHANGED,
      payload,
    );

    expect(content.html).toContain('ASSIGNED');
    expect(content.html).toContain('IN_TRANSIT');
  });
});
