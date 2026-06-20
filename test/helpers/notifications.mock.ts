export const notificationsServiceMock = {
  create: jest.fn().mockResolvedValue({
    id: 'notification-test-id',
    userId: 'user-id',
    type: 'STATUS_CHANGED',
    payload: {},
    read: false,
    createdAt: new Date(),
  }),
  findByUser: jest.fn().mockResolvedValue([]),
};
