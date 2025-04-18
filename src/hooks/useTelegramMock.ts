import { useClientOnce } from '@/hooks/useClientOnce';
import { useEffect } from 'react';
import {
  isTMA,
  type LaunchParams,
  mockTelegramEnv,
  parseInitData,
  retrieveLaunchParams,
} from '@telegram-apps/sdk-react';

/**
 * Состояние мока Telegram WebApp
 */
let isMocked = false;

/**
 * Инициализация мока Telegram WebApp
 */
function initMock() {
  if (isMocked) {
    console.log('Мок уже инициализирован');
    return;
  }

  try {
    // Determine which launch params should be applied
    let lp: LaunchParams | undefined;
    try {
      lp = retrieveLaunchParams();
    } catch (e) {
      const initDataRaw = new URLSearchParams([
        ['user', JSON.stringify({
          id: 99281932,
          first_name: 'Andrew',
          last_name: 'Rogue',
          username: 'rogue',
          language_code: 'en',
          is_premium: true,
          allows_write_to_pm: true,
        })],
        ['hash', '89d6079ad6762351f38c6dbbc41bb53048019256a9443988af7a48bcad16ba31'],
        ['auth_date', '1716922846'],
        ['start_param', 'debug'],
        ['chat_type', 'sender'],
        ['chat_instance', '8428209589180549439'],
        ['signature', '6fbdaab833d39f54518bd5c3eb3f511d035e68cb'],
      ]).toString();

      lp = {
        themeParams: {
          accentTextColor: '#6ab2f2',
          bgColor: '#17212b',
          buttonColor: '#5288c1',
          buttonTextColor: '#ffffff',
          destructiveTextColor: '#ec3942',
          headerBgColor: '#17212b',
          hintColor: '#708499',
          linkColor: '#6ab3f3',
          secondaryBgColor: '#232e3c',
          sectionBgColor: '#17212b',
          sectionHeaderTextColor: '#6ab3f3',
          subtitleTextColor: '#708499',
          textColor: '#f5f5f5',
        },
        initData: parseInitData(initDataRaw),
        initDataRaw,
        version: '8',
        platform: 'tdesktop',
      }
    }

    mockTelegramEnv(lp);
    isMocked = true;
    console.log('Мок Telegram WebApp успешно инициализирован');
  } catch (error) {
    console.error('Ошибка при инициализации мока:', error);
  }
}

/**
 * Хук для управления моком Telegram WebApp в режиме разработки
 */
export function useTelegramMock(): void {
  useEffect(() => {
    if (!sessionStorage.getItem('env-mocked') && isTMA('simple')) {
      return;
    }

    if (typeof window !== 'undefined' && !window.Telegram?.WebApp) {
      console.log('Инициализация мока Telegram WebApp...');
      initMock();
      sessionStorage.setItem('env-mocked', '1');
    }
  }, []);
}

/**
 * Проверка состояния мока
 */
export function isTelegramMocked(): boolean {
  return isMocked;
}

/**
 * Принудительная инициализация мока
 */
export function forceMockTelegram(): void {
  initMock();
}