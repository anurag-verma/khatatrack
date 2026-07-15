import React from 'react';
import {
  UtensilsCrossed, ShoppingCart, Home, Fuel, Coffee, Zap, Bus,
  Film, Heart, ShoppingBag, BookOpen, MoreHorizontal, Briefcase,
  Laptop, TrendingUp, Gift, LucideIcon,
} from 'lucide-react-native';

const iconMap: Record<string, LucideIcon> = {
  UtensilsCrossed, ShoppingCart, Home, Fuel, Coffee, Zap, Bus,
  Film, Heart, ShoppingBag, BookOpen, MoreHorizontal, Briefcase,
  Laptop, TrendingUp, Gift,
};

interface Props {
  name: string;
  size?: number;
  color?: string;
}

export default function Icon({ name, size = 20, color = '#fff' }: Props) {
  const IconComponent = iconMap[name];
  if (!IconComponent) return <MoreHorizontal size={size} color={color} />;
  return <IconComponent size={size} color={color} />;
}
