import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { useCallback, useMemo } from 'react';
import { Address, beginCell, toNano } from '@ton/core';
import { CHAIN } from '@tonconnect/sdk';

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

  /**
   * Отправка TON с комментарием
   * @param recipient Адрес получателя
   * @param amount Сумма в TON (не в нано)
   * @param comment Комментарий к транзакции
   */
  const sendTon = useCallback(
    async (recipient: string, amount: number, comment?: string) => {
      if (!wallet) return;

      // Преобразуем комментарий в ячейку если он существует
      const commentPayload = comment
        ? beginCell().storeUint(0, 32).storeStringTail(comment).endCell()
        : undefined;

      try {
        return await tonConnectUI.sendTransaction({
          validUntil: Math.floor(Date.now() / 1000) + 360, // 5 минут на подтверждение
          messages: [
            {
              address: recipient,
              amount: toNano(amount.toString()).toString(),
              payload: commentPayload?.toBoc().toString('base64'),
            },
          ],
        });
      } catch (e) {
        console.error('Ошибка при отправке транзакции:', e);
        throw e;
      }
    },
    [tonConnectUI, wallet]
  );

  return {
    isConnected,
    connect,
    disconnect,
    sendTon,
    wallet,
    userAddress,
    network,
  };
} 