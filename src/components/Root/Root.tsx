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
import { useTelegramMock, isTelegramMocked } from '@/hooks/useTelegramMock';
import { useDidMount } from '@/hooks/useDidMount';
import { useClientOnce } from '@/hooks/useClientOnce';
import { setLocale } from '@/core/i18n/locale';
import { init } from '@/core/init';

import './styles.css';

function RootInner({ children }: PropsWithChildren) {
  const isDev = process.env.NODE_ENV === 'development';
  const lp = useLaunchParams();
  const debug = isDev || lp.startParam === 'debug';

  // Используем хук для мока в режиме разработки
  useTelegramMock();

  // Initialize the library.
  useClientOnce(() => {
    try {
      console.log('Инициализация приложения...', {
        isDev,
        debug,
        launchParams: lp,
        telegramWebApp: typeof window !== 'undefined' ? !!window.Telegram?.WebApp : false,
        isMocked: isTelegramMocked()
      });
      
      init(debug);
      
      // Проверяем успешность инициализации
      if (typeof window !== 'undefined') {
        console.log('Проверка инициализации WebApp:', {
          webApp: !!window.Telegram?.WebApp,
          initData: window.Telegram?.WebApp?.initData,
          version: window.Telegram?.WebApp?.version,
          platform: window.Telegram?.WebApp?.platform,
          isMocked: isTelegramMocked()
        });
      }
    } catch (error) {
      console.error('Ошибка при инициализации приложения:', error);
    }
  });

  const isDark = useSignal(miniApp.isDark);
  const initDataUser = useSignal(initData.user);

  // Set the user locale.
  useEffect(() => {
    initDataUser && setLocale(initDataUser.languageCode);
  }, [initDataUser]);

  // Логируем изменения состояния Telegram WebApp
  useEffect(() => {
    const checkWebApp = () => {
      if (typeof window !== 'undefined') {
        console.log('Состояние Telegram WebApp:', {
          webApp: !!window.Telegram?.WebApp,
          initData: window.Telegram?.WebApp?.initData,
          version: window.Telegram?.WebApp?.version,
          platform: window.Telegram?.WebApp?.platform,
          isMocked: isTelegramMocked(),
          time: new Date().toISOString()
        });
      }
    };

    // Проверяем сразу после монтирования
    checkWebApp();

    // И затем каждые 2 секунды
    const interval = setInterval(checkWebApp, 2000);

    return () => clearInterval(interval);
  }, []);

  // Только логируем параметр startParam без перенаправлений
  useEffect(() => {
    if (lp.startParam && typeof window !== 'undefined') {
      console.log('Получен startapp параметр в Root:', lp.startParam);
    }
  }, [lp.startParam]);

  return (
    <TonConnectUIProvider 
      manifestUrl="https://wallet-git-main-skulidropeks-projects.vercel.app/tonconnect-manifest.json"
      uiPreferences={{
        theme: isDark ? THEME.DARK : THEME.LIGHT,
      }}
      actionsConfiguration={{
        returnStrategy: 'back',
        twaReturnUrl: typeof window !== 'undefined' 
          ? `https://${window.location.host}` 
          : 'https://wallet-git-main-skulidropeks-projects.vercel.app',
      }}
      walletsListConfiguration={{
        includeWallets: [
          {
            appName: "telegram-wallet",
            name: "TON Wallet",
            imageUrl: "https://wallet.tg/images/logo-288.png",
            aboutUrl: "https://wallet.tg/",
            universalLink: "https://t.me/wallet/start",
            bridgeUrl: "https://bridge.tonapi.io/bridge",
            platforms: ["ios", "android", "macos", "windows", "linux"]
          }
        ]
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
