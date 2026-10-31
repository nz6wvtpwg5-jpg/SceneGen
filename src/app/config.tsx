'use client';

import { usePathname } from 'next/navigation';
import { useProfileStore } from '@/store/useProfileStore';
import { useShowCount } from '@/hooks/useShowCount';
import { useTourCount } from '@/hooks/useTourCount';
import { useMessageCounts } from '@/hooks/useMessageCounts';
import { Bell, Settings, Compass, Calendar, Users, Notebook, Map, ShoppingBag, Handshake, MessageCircle } from 'lucide-react';

export const NavItems = () => {
  const pathname = usePathname();
  const { activeProfile } = useProfileStore();
  const { count: futureShowCount, totalCount: totalShowCount } = useShowCount();
  const { count: tourCount } = useTourCount();
  const { total: messageCount } = useMessageCounts();
  const provisionalAgent = activeProfile?.membershipRole === 'provisional_agent';
  const canManageWorkspace = Boolean(activeProfile?.membershipRole && ['owner', 'admin'].includes(activeProfile.membershipRole));

  function isNavItemActive(pathname: string, nav: string) {
    return pathname.includes(nav);
  }

  const items = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: <Compass size={20} />,
      active: pathname === '/dashboard',
      position: 'top',
    },
    {
      name: 'Shows',
      href: '/shows',
      icon: <Calendar size={20} />,
      active: isNavItemActive(pathname, '/shows'),
      position: 'top',
      badge: totalShowCount > 0 ? totalShowCount : undefined,
      badgeExpanded: totalShowCount > 0 ? `${totalShowCount}${futureShowCount !== totalShowCount ? ` (${futureShowCount})` : ''}` : undefined,
    },
    {
      name: 'Offers',
      href: '/show-proposals',
      icon: <Handshake size={20} />,
      active: isNavItemActive(pathname, '/show-proposals'),
      position: 'top',
    },
    {
      name: 'Tours',
      href: '/tours',
      icon: <Map size={20} />,
      active: isNavItemActive(pathname, '/tours'),
      position: 'top',
      badge: tourCount > 0 ? tourCount : undefined,
    },
    {
      name: 'Contacts',
      href: '/contacts',
      icon: <Users size={20} />,
      active: isNavItemActive(pathname, '/contacts'),
      position: 'top',
    },
    {
      name: 'Messages',
      href: '/messages',
      icon: <MessageCircle size={20} />,
      active: isNavItemActive(pathname, '/messages'),
      position: 'top',
      badge: messageCount > 0 ? messageCount : undefined,
    },
    {
      name: 'Notifications',
      href: '/notifications',
      icon: <Bell size={20} />,
      active: isNavItemActive(pathname, '/notifications'),
      position: 'top',
    },
    {
      name: 'Bookkeeping',
      href: '/bookkeeping',
      icon: <Notebook size={20} />,
      active: isNavItemActive(pathname, '/bookkeeping'),
      position: 'top',
    },
    {
      name: 'Merch',
      href: '/merch',
      icon: <ShoppingBag size={20} />,
      active: isNavItemActive(pathname, '/merch'),
      position: 'top',
    },
      {
        name: 'Settings',
        href: '/settings',
      icon: <Settings size={20} />,
        active: isNavItemActive(pathname, '/settings'),
      position: 'bottom',
    },
  ];

  // Week 5, Task 5.3: Add Touring link for artists only
  if (activeProfile?.entityType === 'artist') {
    // Insert Touring after Tours
    const toursIndex = items.findIndex(item => item.href === '/tours');
    if (toursIndex !== -1) {
      items.splice(toursIndex + 1, 0, {
        name: 'Touring',
        href: '/touring',
        icon: <Compass size={20} />,
        active: isNavItemActive(pathname, '/touring'),
        position: 'top',
      });
    }
  }

  if (!canManageWorkspace) {
    const messagesIndex=items.findIndex(item=>item.href==='/messages');
    if(messagesIndex>=0)items.splice(messagesIndex,1);
  }
  const settingsIndex = items.findIndex((item) => item.href === '/settings');
  if (!canManageWorkspace && settingsIndex >= 0) items.splice(settingsIndex, 1);
  return provisionalAgent
    ? items.filter((item) => ['/dashboard', '/shows', '/show-proposals', '/tours'].includes(item.href))
    : items;
};
