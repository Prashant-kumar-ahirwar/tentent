import { KirayaData } from '../types';

export const INITIAL_CLEAN_DATA: KirayaData = {
  rate: 10,
  activeRoom: 'room-1',
  rooms: [
    {
      id: 'room-1',
      name: 'Room 1',
      lastMeter: 0,
      tenant: {
        name: '',
        relationship: '',
        mobile: '',
        aadhar: '',
        voterId: '',
        address: '',
        baseRent: 2000,
      },
      entries: [],
    },
  ],
};
