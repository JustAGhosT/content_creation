import React from 'react';
import Link from 'next/link';

const Header = () => {
  return (
    <header>
      <nav>
        <ul>
          <li>
            <Link href="/">
              <a>Home</a>
            </Link>
          </li>
          <li>
            <Link href="/series">
              <a>Series</a>
            </Link>
          </li>
          <li>
            <Link href="/workflow">
              <a>Workflow</a>
            </Link>
          </li>
          <li>
            <Link href="/platform-analysis">
              <a>Platform Analysis</a>
            </Link>
          </li>
          <li>
            <Link href="/content-adaptation">
              <a>Content Adaptation</a>
            </Link>
          </li>
          <li>
            <Link href="/automation">
              <a>Automation</a>
            </Link>
          </li>
        </ul>
      </nav>
    </header>
  );
};

export default Header;
