export const storageServiceMock = {
  upload: jest.fn().mockResolvedValue({ path: 'company/shipment/file.jpg' }),
  remove: jest.fn().mockResolvedValue(undefined),
  createSignedUrl: jest
    .fn()
    .mockResolvedValue('https://example.com/signed-url'),
  onModuleInit: jest.fn(),
};
