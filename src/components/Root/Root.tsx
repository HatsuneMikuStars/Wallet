'use client';

import { type PropsWithChildren, useEffect } from 'react';
import {
  initData,
  miniApp,
  useLaunchParams,
  useSignal,
} from '@telegram-apps/sdk-react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import { THEME } from '@tonconnect/ui';
import { AppRoot } from '@telegram-apps/telegram-ui';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorPage } from '@/components/ErrorPage';
import { useTelegramMock } from '@/hooks/useTelegramMock';
import { useDidMount } from '@/hooks/useDidMount';
import { useClientOnce } from '@/hooks/useClientOnce';
import { setLocale } from '@/core/i18n/locale';
import { init } from '@/core/init';

import './styles.css';

function RootInner({ children }: PropsWithChildren) {
  const isDev = process.env.NODE_ENV === 'development';

  // Mock Telegram environment in development mode if needed.
  if (isDev) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useTelegramMock();
  }

  const lp = useLaunchParams();
  const debug = isDev || lp.startParam === 'debug';

  // Initialize the library.
  useClientOnce(() => {
    init(debug);
  });

  const isDark = useSignal(miniApp.isDark);
  const initDataUser = useSignal(initData.user);

  // Set the user locale.
  useEffect(() => {
    initDataUser && setLocale(initDataUser.languageCode);
  }, [initDataUser]);

  // Добавляем обработку параметра startapp для перенаправления на страницу перевода
  useEffect(() => {
    if (lp.startParam && typeof window !== 'undefined') {
      console.log('Получен startapp параметр:', lp.startParam);
      
      // Обрабатываем разные форматы startapp параметра
      if (lp.startParam.includes('_')) {
        // Формат: address_amount_comment
        const [address, amount, comment] = lp.startParam.split('_');
        if (address) {
          const transferParams = new URLSearchParams();
          transferParams.append('address', address);
          if (amount) transferParams.append('amount', amount);
          if (comment) transferParams.append('comment', comment);
          
          window.location.href = `/transfer?${transferParams.toString()}`;
        }
      } else if (lp.startParam.startsWith('transfer?')) {
        // Формат: transfer?address=xxx&amount=yyy&comment=zzz
        const paramsString = lp.startParam.substring('transfer?'.length);
        window.location.href = `/transfer?${paramsString}`;
      }
    }
  }, [lp.startParam]);

  return (
    <TonConnectUIProvider 
      manifestUrl="https://raw.githubusercontent.com/GovnoStars/Wallet/refs/heads/main/public/tonconnect-manifest.json"
      uiPreferences={{
        theme: isDark ? THEME.DARK : THEME.LIGHT
      }}
    >
      <AppRoot
        appearance={isDark ? 'dark' : 'light'}
        platform={['macos', 'ios'].includes(lp.platform) ? 'ios' : 'base'}
      >
        {children}
      </AppRoot>
    </TonConnectUIProvider>
  );
}

export function Root(props: PropsWithChildren) {
  // Unfortunately, Telegram Mini Apps does not allow us to use all features of
  // the Server Side Rendering. That's why we are showing loader on the server
  // side.
  const didMount = useDidMount();

  return didMount ? (
    <ErrorBoundary fallback={ErrorPage}>
      <RootInner {...props}/>
    </ErrorBoundary>
  ) : <div className="root__loading">Loading</div>;
}
