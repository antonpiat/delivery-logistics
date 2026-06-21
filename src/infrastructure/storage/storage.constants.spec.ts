import { buildShipmentStoragePath } from '@/infrastructure/storage/storage.constants';

describe('buildShipmentStoragePath', () => {
  it('builds a company-scoped shipment path', () => {
    const path = buildShipmentStoragePath(
      'company-1',
      'shipment-1',
      'proof photo.jpg',
    );

    expect(path).toMatch(/^company-1\/shipments\/shipment-1\/.+-proof_photo\.jpg$/);
  });
});
