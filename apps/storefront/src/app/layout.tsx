import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Blender Next.js Storefront Prototype',
  description: 'Git-backed headless visual layout engine prototype',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
