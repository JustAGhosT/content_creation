import React from 'react';
import Link from 'next/link';

interface NavigationLink {
  href: string;
  label: string;
  direction: 'prev' | 'next';
}

interface NavigationLinksProps {
  links: NavigationLink[];
  className?: string;
  linkClassName?: string;
}

/**
 * Component for displaying consistent navigation links between pages
 */
const NavigationLinks: React.FC<NavigationLinksProps> = ({ 
  links, 
  className, 
  linkClassName 
}) => {
  return (
    <div className={className}>
      {links.map((link, index) => (
        <Link key={index} href={link.href} className={linkClassName}>
          {link.direction === 'prev' ? '← ' : ''}
          {link.label}
          {link.direction === 'next' ? ' →' : ''}
        </Link>
      ))}
    </div>
  );
};

export default NavigationLinks;