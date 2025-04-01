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
}

// Определение типов для Telegram WebApp API
declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        sendData: (data: string) => void;
        close: () => void;
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
        // Отправляем сообщение боту и закрываем WebApp
        window.Telegram.WebApp.sendData(JSON.stringify({ message: message }));
        
        // Небольшая задержка перед закрытием для гарантии отправки данных
        setTimeout(() => {
          window.Telegram?.WebApp?.close();
        }, 100);
        
        console.log('Возврат в бота с сообщением:', message);
      } else {
        console.warn('Telegram WebApp API не доступен');
      }
    } catch (e) {
      console.error('Ошибка при возврате в бота:', e);
    }
  };

  /**
   * Отправка TON-транзакции с опциями
   * @param options Параметры транзакции
   * @returns Результат выполнения транзакции
   */
  const sendTransaction = useCallback(
    async (options: SendTransactionOptions): Promise<SendTransactionResponse | undefined> => {
      if (!wallet) return undefined;

      try {
        console.log('Подготовка транзакции:', options);

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
        
        // Если запрошен возврат в бота после транзакции
        if (options.returnToBot && result) {
          const message = options.returnMessage || 'Транзакция прошла успешно';
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