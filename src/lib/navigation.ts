import { BookOpenText, House, Settings, Users, Route } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type UiNavId = 'today' | 'versehub' | 'paths' | 'community' | 'profile';

export type UiNavItem = {
    id: UiNavId;
    label: string;
    icon: LucideIcon;
    href: string;
};

export const uiNavItems: UiNavItem[] = [
    { id: 'today', label: 'Today', icon: House, href: '/today' },
    { id: 'versehub', label: 'VerseHub', icon: BookOpenText, href: '/versehub' },
    { id: 'paths', label: 'Paths', icon: Route, href: '/paths' },
    { id: 'community', label: 'Community', icon: Users, href: '/community' },
    { id: 'profile', label: 'Profile', icon: Settings, href: '/profile' },
];

export function getUiNavItems(isAuthenticated: boolean): UiNavItem[] {
    // Unhidden: returning all items for frontend demonstration
    return uiNavItems;
}
