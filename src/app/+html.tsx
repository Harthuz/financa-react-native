import { ScrollViewStyleReset } from 'expo-router/html';
import React from 'react';

export default function HTML({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* Configurações PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0A0A0A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Finanças Pro" />

        {/* Ícone de atalho no iOS */}
        <link rel="apple-touch-icon" href="/icon-192.png" />

        <ScrollViewStyleReset />
        
        {/* Registro do Service Worker */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('ServiceWorker registrado com sucesso no escopo:', reg.scope);
              }).catch(function(err) {
                console.log('Falha ao registrar o ServiceWorker:', err);
              });
            });
          }
        ` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
