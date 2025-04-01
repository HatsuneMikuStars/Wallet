import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useCallback, useMemo } from 'react';
import { Address, beginCell, toNano } from '@ton/core';
import { CHAIN } from '@tonconnect/sdk';
import type { SendTransactionRequest, SendTransactionResponse } from '@tonconnect/ui';

// Расширяем тип из библиотеки, чтобы включить наши кастомные поля
// Это решает проблему с TypeScript ошибкой
declare module '@tonconnect/ui-react' {
  interface SendTransactionOptions {
    testMode?: boolean;
    returnToBot?: boolean;
    returnMessage?: string;
  }
  
  interface SendTransactionResponse {
    boc: string;
    externalId?: string;
  }
}

// Определение типов для Telegram WebApp API
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        sendData: (data: string) => void;
        close: () => void;
        initData: string;
        version: string;
        platform: string;
      }
    }
  }
}

/**
 * Интерфейс для отправки транзакций через TON Connect
 * 
 * @interface SendTransactionOptions
 * @property {string} recipient - Адрес получателя (в любом формате)
 * @property {number} amount - Сумма в TON (не в нано)
 * @property {string} [comment] - Комментарий к транзакции (опционально)
 * @property {CHAIN} [network] - Сеть для отправки (mainnet/testnet)
 * @property {string} [stateInit] - Base64-encoded stateInit для контракта
 * @property {Record<number, string>} [extraCurrency] - Дополнительные валюты (ID валюты -> сумма в строке)
 * @property {boolean} [returnToBot] - Вернуться к боту после завершения транзакции
 * @property {string} [returnMessage] - Сообщение для бота после завершения транзакции
 * @property {boolean} [testMode] - Тестовый режим без отправки транзакции
 */
interface SendTransactionOptions {
  recipient: string;
  amount: number;
  comment?: string;
  network?: CHAIN;
  stateInit?: string;
  extraCurrency?: Record<number, string>;
  returnToBot?: boolean;
  returnMessage?: string;
  testMode?: boolean;
}

/**
 * Хук для удобного взаимодействия с TON Connect
 * 
 * Предоставляет функции для подключения/отключения кошелька и отправки транзакций
 */
export function useTonConnect() {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();

  // Статус подключения кошелька
  const isConnected = Boolean(wallet);

  // Функция для подключения кошелька
  const connect = useCallback(async () => {
    await tonConnectUI.connectWallet();
  }, [tonConnectUI]);

  // Функция для отключения кошелька
  const disconnect = useCallback(() => {
    tonConnectUI.disconnect();
  }, [tonConnectUI]);

  // Адрес кошелька пользователя (если подключен)
  const userAddress = useMemo(() => {
    return wallet?.account.address || '';
  }, [wallet]);

  // Сеть, к которой подключен пользователь
  const network = useMemo(() => {
    if (!wallet) return undefined;
    return wallet.account.chain === CHAIN.MAINNET ? 'mainnet' : 'testnet';
  }, [wallet]);

  // Преобразование текстового комментария в формат BOC для корректной обработки
  const commentToBoc = (text?: string): string | undefined => {
    if (!text) return undefined;
    try {
      // Создаем ячейку с текстовым комментарием
      // 0 в первых 32 битах означает, что это текстовое сообщение
      const cell = beginCell().storeUint(0, 32).storeStringTail(text).endCell();
      // Возвращаем BOC в формате base64
      return cell.toBoc().toString('base64');
    } catch (e) {
      console.error('Ошибка при преобразовании комментария в BOC:', e);
      return undefined;
    }
  };

  /**
   * Нормализация адреса TON для безопасной отправки
   * @param rawAddress Адрес в любом поддерживаемом формате (EQ.., UQ.., raw)
   * @returns Нормализованный адрес в формате raw без префикса
   */
  const normalizeAddress = (rawAddress: string): string => {
    try {
      // Используем класс Address для парсинга и нормализации адреса
      const address = Address.parse(rawAddress);
      
      // Возвращаем нормализованный raw-адрес (без префикса EQ/UQ)
      // TON Connect сам определит, какой формат адреса использовать
      return address.toString();
    } catch (e) {
      console.error('Ошибка при нормализации адреса:', e);
      // В случае ошибки возвращаем исходный адрес
      return rawAddress;
    }
  };

  /**
   * Возвращает пользователя в бот с отправкой сообщения
   * @param message Сообщение для отправки боту
   */
  const returnToBot = (message: string) => {
    try {
      if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
        console.log('Подготовка к отправке данных в бота:', message);
        
        // Формируем данные для отправки
        const data = {
          event: 'transaction_completed',
          message: message,
          timestamp: Date.now()
        };
        
        try {
          // Отправляем данные и сразу проверяем результат
          window.Telegram.WebApp.sendData(JSON.stringify(data));
          console.log('Данные успешно отправлены в бота');
          
          // Увеличиваем задержку до 1000мс и добавляем промежуточное сообщение
          setTimeout(() => {
            console.log('Подготовка к закрытию WebApp...');
            
            setTimeout(() => {
              console.log('Закрытие WebApp...');
              window.Telegram?.WebApp?.close();
            }, 500);
            
          }, 500);
          
        } catch (sendError) {
          console.error('Ошибка при отправке данных в бота:', sendError);
          throw sendError;
        }
        
      } else {
        const error = 'Telegram WebApp API не доступен';
        console.warn(error, {
          window: typeof window !== 'undefined',
          TelegramWebApp: !!window?.Telegram?.WebApp,
          sendData: !!window?.Telegram?.WebApp?.sendData,
          close: !!window?.Telegram?.WebApp?.close
        });
        throw new Error(error);
      }
    } catch (e) {
      console.error('Критическая ошибка при возврате в бота:', e);
      throw e;
    }
  };

  /**
   * Отправка TON-транзакции с опциями
   * @param options Параметры транзакции
   * @returns Результат выполнения транзакции
   */
  const sendTransaction = useCallback(
    async (options: SendTransactionOptions): Promise<SendTransactionResponse | undefined> => {
      // В тестовом режиме не требуем подключенного кошелька
      if (!options.testMode && !wallet) return undefined;

      try {
        console.log('Подготовка транзакции:', options);

        // Если включен тестовый режим, симулируем транзакцию
        if (options.testMode) {
          console.log('Тестовый режим: симуляция транзакции без отправки');
          
          // Создаем фиктивный результат транзакции
          const mockResult: SendTransactionResponse = {
            boc: `test_mode_boc_${Date.now()}`,
            externalId: `test_${Math.random().toString(36).substring(7)}`
          };

          // Если запрошен возврат в бота
          if (options.returnToBot) {
            const message = options.returnMessage || 'Тестовая транзакция симулирована';
            returnToBot(message);
          }

          return mockResult;
        }

        // Преобразуем комментарий в BOC формат если он есть
        const commentBoc = options.comment ? commentToBoc(options.comment) : undefined;

        // Нормализуем адрес получателя
        const normalizedAddress = normalizeAddress(options.recipient);

        // Создаем транзакцию с полным набором параметров
        const transactionRequest: SendTransactionRequest = {
          validUntil: Math.floor(Date.now() / 1000) + 360, // 5 минут на подтверждение
          network: options.network, // Указание сети (если не указана, используется текущая в кошельке)
          messages: [
            {
              // Используем нормализованный адрес вместо исходного
              address: normalizedAddress,
              amount: toNano(options.amount.toString()).toString(),
              // Передаем BOC вместо простого текста для корректной обработки
              payload: commentBoc,
              stateInit: options.stateInit, // StateInit для деплоя контрактов
              extraCurrency: options.extraCurrency, // Дополнительные валюты (Jettons)
            },
          ],
        };

        console.log('Отправка транзакции:', transactionRequest);
        const result = await tonConnectUI.sendTransaction(transactionRequest);
        
        // Если запрошен возврат в бота
        if (options.returnToBot && result) {
          const message = options.returnMessage || 'Транзакция успешно отправлена';
          returnToBot(message);
        }
        
        return result;
      } catch (e) {
        console.error('Ошибка при отправке транзакции:', e);
        throw e;
      }
    },
    [tonConnectUI, wallet]
  );

  /**
   * Отправка нескольких транзакций в одном запросе (до 4 сообщений)
   * @param messages Массив сообщений для отправки (макс. 4)
   * @param returnToBotOptions Опции для возврата в бота
   * @returns Результат выполнения транзакции
   */
  const sendMultipleTransactions = useCallback(
    async (
      messages: SendTransactionOptions[], 
      returnToBotOptions?: { returnToBot: boolean; returnMessage?: string }
    ): Promise<SendTransactionResponse | undefined> => {
      if (!wallet || !messages.length || messages.length > 4) return undefined;

      try {
        console.log('Подготовка мульти-транзакции:', messages);

        // Преобразуем массив опций в формат TON Connect
        const formattedMessages = messages.map(msg => ({
          // Нормализуем каждый адрес получателя
          address: normalizeAddress(msg.recipient),
          amount: toNano(msg.amount.toString()).toString(),
          // Преобразуем комментарий в BOC, если он есть
          payload: msg.comment ? commentToBoc(msg.comment) : undefined,
          stateInit: msg.stateInit,
          extraCurrency: msg.extraCurrency
        }));

        const transactionRequest: SendTransactionRequest = {
          validUntil: Math.floor(Date.now() / 1000) + 360,
          messages: formattedMessages
        };

        console.log('Отправка мульти-транзакции:', transactionRequest);
        const result = await tonConnectUI.sendTransaction(transactionRequest);
        
        // Если запрошен возврат в бота после мульти-транзакции
        if (returnToBotOptions?.returnToBot && result) {
          const message = returnToBotOptions.returnMessage || 'Транзакция прошла успешно';
          returnToBot(message);
        }
        
        return result;
      } catch (e) {
        console.error('Ошибка при отправке мульти-транзакции:', e);
        throw e;
      }
    },
    [tonConnectUI, wallet]
  );

  return {
    isConnected,
    connect,
    disconnect,
    sendTransaction,
    sendMultipleTransactions,
    wallet,
    userAddress,
    network,
    returnToBot,
  };
} 