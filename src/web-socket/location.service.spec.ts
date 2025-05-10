// tests/location.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';
import { getModelToken } from '@nestjs/mongoose';
import { HttpService } from '@nestjs/axios';
import { NotificationService } from 'src/common/notification.service';
import { of } from 'rxjs';
import * as turf from '@turf/turf';
import { Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';

describe('LocationService – findUsersAhead', () => {
  let service: LocationService;

  // Mocks
  const mockUserModel = {
    find: jest.fn(),
  };
  const mockSessionModel = {
    findOne: jest.fn(),
  };
  const mockDriverRideModel = {
    findById: jest.fn(),
  };
  const mockNotificationService = {
    send_notification: jest.fn(),
  };
  const mockHttpService = {
    get: jest.fn(),
  };
  const GOOGLE_API_KEY = 'FAKE_GOOGLE_KEY';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: getModelToken('Session'), useValue: mockSessionModel },
        { provide: getModelToken('DriverRide'), useValue: mockDriverRideModel },
        { provide: HttpService, useValue: mockHttpService },
        { provide: NotificationService, useValue: mockNotificationService },
        // stub ConfigService just for GOOGLE_API_KEY
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'GOOGLE_API_KEY' ? GOOGLE_API_KEY : null) },
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  it('should call send_notification for on-path users and not for off-path users', async () => {
    // 1) Set up driver & ride
    const driver = {
      _id: new Types.ObjectId(),
      location: { coordinates: [77.5946, 12.9716] },
      longitude: 77.5946,
      latitude: 12.9716,
      pre_location: { coordinates: [77.5940, 12.9720] },
    } as any;

    const ride = {
      drop_location: { latitude: 12.9352, longitude: 77.6245 },
    } as any;
    mockDriverRideModel.findById.mockResolvedValue(ride);

    // 2) Stub out ORS via HttpService (we use axios-style .get returning an Observable)
    //    Construct a straight line from driver → drop
    const straightLine = {
      data: {
        features: [{
          geometry: {
            type: 'LineString',
            coordinates: [
              [77.5946, 12.9716],
              [77.6245, 12.9352],
            ],
          },
        }],
      },
    };
    mockHttpService.get.mockReturnValue(of(straightLine));

    // 3) Create two user docs: one on the line, one off it
    //    Note: buffer radius is 6m, so “on-path” user must lie within 6m of the line
    const userOnPath = {
      _id: new Types.ObjectId(),
      latitude: 12.9535,
      longitude: 77.6070,
      pre_location: { coordinates: [77.6070, 12.9530] },
    } as any;
    const userOffPath = {
      _id: new Types.ObjectId(),
      latitude: 12.9600,
      longitude: 77.5900,
      pre_location: { coordinates: [77.5900, 12.9605] },
    } as any;

    mockUserModel.find.mockResolvedValue([userOnPath, userOffPath]);

    // 4) Stub session lookups
    //    Only userOnPath should result in a session
    mockSessionModel.findOne
      .mockResolvedValueOnce({ user_id: userOnPath._id, fcm_token: 'token123' })
      .mockResolvedValueOnce(null);

    // 5) Execute
    await service.findUsersAhead(driver, 'someRideId', 5 /*km*/, true);

    // 6) Assertions
    expect(mockNotificationService.send_notification).toHaveBeenCalledTimes(1);
    const [tokens, message, title, driverId, rideId] =
      mockNotificationService.send_notification.mock.calls[0];

    // Only the on-path user’s token should be passed
    expect(tokens).toEqual([{ fcm_token: 'token123', user_id: userOnPath._id }]);
    expect(message).toBe('An ambulance is coming. Please move aside');
    expect(title).toBe('Emergency Vehicle Alert');
    expect(driverId).toEqual(driver._id);
    expect(rideId).toBe('someRideId');
  });
});
