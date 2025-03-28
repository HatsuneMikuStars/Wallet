import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useCallback, useMemo } from 'react';
import { Address, beginCell, toNano } from '@ton/core';
import { CHAIN } from '@tonconnect/sdk';
import type { SendTransactionRequest, SendTransactionResponse } from '@tonconnect/ui';

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
 */
interface SendTransactionOptions {
  recipient: string;
  amount: number;
  comment?: string;
  network?: CHAIN;
  stateInit?: string;
  extraCurrency?: Record<number, string>;
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

        // Создаем транзакцию с полным набором параметров
        const transactionRequest: SendTransactionRequest = {
          validUntil: Math.floor(Date.now() / 1000) + 360, // 5 минут на подтверждение
          network: options.network, // Указание сети (если не указана, используется текущая в кошельке)
          messages: [
            {
              address: options.recipient,
              amount: toNano(options.amount.toString()).toString(),
              // Передаем BOC вместо простого текста для корректной обработки
              payload: commentBoc,
              stateInit: options.stateInit, // StateInit для деплоя контрактов
              extraCurrency: options.extraCurrency, // Дополнительные валюты (Jettons)
            },
          ],
        };

        console.log('Отправка транзакции:', transactionRequest);
        return await tonConnectUI.sendTransaction(transactionRequest);
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
   * @returns Результат выполнения транзакции
   */
  const sendMultipleTransactions = useCallback(
    async (messages: SendTransactionOptions[]): Promise<SendTransactionResponse | undefined> => {
      if (!wallet || !messages.length || messages.length > 4) return undefined;

      try {
        console.log('Подготовка мульти-транзакции:', messages);

        // Преобразуем массив опций в формат TON Connect
        const formattedMessages = messages.map(msg => ({
          address: msg.recipient,
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
        return await tonConnectUI.sendTransaction(transactionRequest);
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
  };
} 