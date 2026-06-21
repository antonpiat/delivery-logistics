export const storageServiceMock = {
  isConfigured: jest.fn().mockReturnValue(true),
  getBucket: jest.fn().mockReturnValue('delivery-assets'),
  upload: jest.fn().mockResolvedValue({ path: 'company/shipment/file.jpg' }),
  remove: jest.fn().mockResolvedValue(undefined),
  createSignedUrl: jest
    .fn()
    .mockResolvedValue('https://example.com/signed-url'),
  onModuleInit: jest.fn(),
};
