import {
  BedDouble,
  Bus,
  Car,
  Landmark,
  MapPin,
  Plane,
  Sailboat,
  ShoppingBag,
  Ticket,
  TrainFront,
  Utensils,
  Compass,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityCategory, ItineraryType } from '../../domain/types';

export const ITINERARY_ICONS: Record<ItineraryType, LucideIcon> = {
  flight: Plane,
  train: TrainFront,
  bus: Bus,
  car: Car,
  boat: Sailboat,
  lodging: BedDouble,
  other: MapPin,
};

export const ACTIVITY_ICONS: Record<ActivityCategory, LucideIcon> = {
  attraction: Landmark,
  restaurant: Utensils,
  tour: Compass,
  shopping: ShoppingBag,
  event: Ticket,
  other: MapPin,
};
