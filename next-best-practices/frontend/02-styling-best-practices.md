# Next.js Styling Best Practices

## Table of Contents
- [CSS Approaches in Next.js](#css-approaches-in-nextjs)
- [CSS Modules](#css-modules)
- [Styled Components](#styled-components)
- [Tailwind CSS](#tailwind-css)
- [Global Styles](#global-styles)
- [Theme Management](#theme-management)
- [Responsive Design](#responsive-design)

## CSS Approaches in Next.js

Next.js supports multiple styling approaches out of the box:

1. **CSS Modules**: Scoped CSS with automatic class name uniqueness
2. **Styled Components/Emotion**: CSS-in-JS libraries
3. **Tailwind CSS**: Utility-first CSS framework
4. **Sass/SCSS**: Enhanced CSS syntax
5. **Global CSS**: Traditional CSS files

Choose the approach that best fits your team's expertise and project requirements.

## CSS Modules

CSS Modules are a great default choice for Next.js projects as they provide component-scoped styling without additional dependencies.

### File Structure

```
/components
  /Button
    Button.tsx
    Button.module.css
```

### Implementation

```css
/* Button.module.css */
.button {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  font-weight: 600;
}

.primary {
  background-color: #0070f3;
  color: white;
}

.secondary {
  background-color: #f5f5f5;
  color: #333;
}
```

```tsx
// Button.tsx
import styles from './Button.module.css';
import classNames from 'classnames';

interface ButtonProps {
  variant: 'primary' | 'secondary';
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  variant, 
  children, 
  className,
  ...props 
}) => {
  return (
    <button
      className={classNames(
        styles.button,
        variant === 'primary' ? styles.primary : styles.secondary,
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
```

### Best Practices

1. **Use classNames/clsx library** for conditional class application
2. **Keep selectors simple** - avoid deep nesting
3. **Use composition** over inheritance for styles
4. **Allow style customization** via className prop

## Styled Components

For dynamic styling based on props or theme, CSS-in-JS solutions like Styled Components work well.

### Setup

```bash
npm install styled-components
npm install --save-dev @types/styled-components
```

Add a custom `_document.js` file to enable server-side rendering of styles:

```tsx
// pages/_document.tsx
import Document, { DocumentContext, Html, Head, Main, NextScript } from 'next/document';
import { ServerStyleSheet } from 'styled-components';

export default class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const sheet = new ServerStyleSheet();
    const originalRenderPage = ctx.renderPage;

    try {
      ctx.renderPage = () =>
        originalRenderPage({
          enhanceApp: (App) => (props) =>
            sheet.collectStyles(<App {...props} />),
        });

      const initialProps = await Document.getInitialProps(ctx);
      return {
        ...initialProps,
        styles: (
          <>
            {initialProps.styles}
            {sheet.getStyleElement()}
          </>
        ),
      };
    } finally {
      sheet.seal();
    }
  }

  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}
```

### Implementation

```tsx
// components/Button/Button.tsx
import styled from 'styled-components';

interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
}

const Button = styled.button<ButtonProps>`
  border-radius: 4px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  
  /* Size variations */
  padding: ${props => {
    switch (props.size) {
      case 'small': return '0.25rem 0.5rem';
      case 'large': return '0.75rem 1.5rem';
      default: return '0.5rem 1rem';
    }
  }};
  
  /* Variant styles */
  background-color: ${props => 
    props.variant === 'primary' ? props.theme.colors.primary : 'transparent'
  };
  color: ${props => 
    props.variant === 'primary' ? 'white' : props.theme.colors.primary
  };
  border: 1px solid ${props => props.theme.colors.primary};
  
  &:hover {
    opacity: 0.9;
    transform: translateY(-1px);
  }
`;

export default Button;
```

### Best Practices

1. **Create a theme file** for consistent styling
2. **Use prop-based variations** instead of multiple components
3. **Extract common styles** into shared styled components
4. **Use the `as` prop** for semantic HTML elements

## Tailwind CSS

Tailwind CSS is a utility-first CSS framework that works well with Next.js.

### Setup

```bash
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Configure Tailwind:

```js
// tailwind.config.js
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0070f3',
        secondary: '#ff4081',
      },
    },
  },
  plugins: [],
};
```

Import Tailwind in your global CSS:

```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Implementation

```tsx
// components/Button.tsx
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children,
  className = '',
  ...props 
}) => {
  const baseClasses = 'font-semibold rounded transition-all focus:outline-none focus:ring-2';
  
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark',
    secondary: 'bg-white text-primary border border-primary hover:bg-gray-50',
  };
  
  const sizeClasses = {
    sm: 'py-1 px-2 text-sm',
    md: 'py-2 px-4 text-base',
    lg: 'py-3 px-6 text-lg',
  };
  
  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
```

### Best Practices

1. **Extract common patterns** into component classes
2. **Use consistent spacing** with Tailwind's scale
3. **Customize the theme** in tailwind.config.js
4. **Use JIT mode** for faster development
5. **Create abstractions** for repeated utility combinations

## Global Styles

For global styles that apply across your entire application:

```css
/* styles/globals.css */
:root {
  --color-primary: #0070f3;
  --color-secondary: #ff4081;
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
    'Helvetica Neue', Arial, sans-serif;
}

html,
body {
  padding: 0;
  margin: 0;
  font-family: var(--font-sans);
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

* {
  box-sizing: border-box;
}
```

Import in `_app.tsx`:

```tsx
// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';

function MyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}

export default MyApp;
```

## Theme Management

### Theme Context

Create a theme context for consistent styling:

```tsx
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('light');
  
  useEffect(() => {
    // Check if user has a preference stored
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
    } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

Apply in `_app.tsx`:

```tsx
// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from '../contexts/ThemeContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider>
      <Component {...pageProps} />
    </ThemeProvider>
  );
}

export default MyApp;
```

## Responsive Design

### Media Queries with CSS Modules

```css
/* Card.module.css */
.card {
  width: 100%;
  padding: 1rem;
}

@media (min-width: 768px) {
  .card {
    width: 50%;
    padding: 2rem;
  }
}

@media (min-width: 1024px) {
  .card {
    width: 33.333%;
  }
}
```

### Custom Hooks for Responsive Design

```tsx
// hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);
  
  return matches;
}

// Usage
const Component = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  
  return (
    <div>
      {isMobile ? <MobileView /> : <DesktopView />}
    </div>
  );
};
```