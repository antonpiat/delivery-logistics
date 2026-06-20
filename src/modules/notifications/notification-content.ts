import { NotificationType } from '@/common/enums/notification-type.enum';

export interface NotificationContent {
  subject: string;
  html: string;
  title: string;
  body: string;
}

interface ShipmentPayload {
  shipmentId?: string;
  trackingCode?: string;
  fromStatus?: string;
  toStatus?: string;
  pickupAddress?: string;
  deliveryAddress?: string;
}

export function buildNotificationContent(
  type: string,
  payload: Record<string, unknown>,
): NotificationContent {
  const data = payload as ShipmentPayload;
  const trackingCode = data.trackingCode ?? 'your shipment';

  switch (type) {
    case NotificationType.SHIPMENT_ASSIGNED:
      return {
        title: 'New delivery assigned',
        body: `Shipment ${trackingCode} has been assigned to you.`,
        subject: `New delivery assigned — ${trackingCode}`,
        html: shipmentEmailHtml(
          'New delivery assigned',
          `<p>You have been assigned shipment <strong>${trackingCode}</strong>.</p>
           <p>Pickup: ${data.pickupAddress ?? '—'}</p>
           <p>Delivery: ${data.deliveryAddress ?? '—'}</p>`,
        ),
      };

    case NotificationType.DELIVERED:
      return {
        title: 'Shipment delivered',
        body: `Shipment ${trackingCode} has been delivered.`,
        subject: `Delivered — ${trackingCode}`,
        html: shipmentEmailHtml(
          'Shipment delivered',
          `<p>Your shipment <strong>${trackingCode}</strong> has been delivered.</p>`,
        ),
      };

    case NotificationType.STATUS_CHANGED:
    default:
      return {
        title: 'Shipment status updated',
        body: `Shipment ${trackingCode} is now ${data.toStatus ?? 'updated'}.`,
        subject: `Status update — ${trackingCode}`,
        html: shipmentEmailHtml(
          'Shipment status updated',
          `<p>Shipment <strong>${trackingCode}</strong> changed from
           <strong>${data.fromStatus ?? '—'}</strong> to
           <strong>${data.toStatus ?? '—'}</strong>.</p>`,
        ),
      };
  }
}

function shipmentEmailHtml(title: string, body: string): string {
  return `
    <h2>${title}</h2>
    ${body}
    <p>— Delivery Logistics</p>
  `;
}
