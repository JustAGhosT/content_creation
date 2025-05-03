import React from 'react';
import Link from 'next/link';

const Header: React.FC = () => {
  return (
    <header>
      <nav>
        <ul>
          <li>
            <Link href="/">Home</Link>
          </li>
          <li>
            <Link href="/series">Series</Link>
          </li>
          <li>
            <Link href="/workflow">Workflow</Link>
          </li>
          <li>
            <Link href="/platform-analysis">Platform Analysis</Link>
          </li>
          <li>
            <Link href="/content-adaptation">Content Adaptation</Link>
          </li>
          <li>
            <Link href="/automation">Automation</Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;