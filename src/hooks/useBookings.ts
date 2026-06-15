import { useQuery } from '@tanstack/react-query'
import { bookingService } from '@services/bookingService'

export function useMyBookingsAsTraveler() {
  return useQuery({
    queryKey: ['bookings', 'me', 'traveler'],
    queryFn: () => bookingService.myAsTraveler(),
  })
}

export function useMyBookingsAsGuide() {
  return useQuery({
    queryKey: ['bookings', 'me', 'guide'],
    queryFn: () => bookingService.myAsGuide(),
  })
}
