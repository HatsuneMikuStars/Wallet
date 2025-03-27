'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Page } from '@/components/Page';
import { TonConnectButton, useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { beginCell } from '@ton/ton';
import {
  Button,
  Card,
  Placeholder,
  Text,
  Title,
} from '@telegram-apps/telegram-ui';

/**
 * Преобразует единицы TON из человекочитаемого формата в наноТОНы
 * 1 TON = 10^9 наноТОНов
 */
const toNano = (amount: string): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return (num * 1e9).toFixed(0);
};

// Нормализует адрес TON, удаляя префикс, если он есть
const normalizeAddress = (address: string): string => {
  if (address.startsWith('EQ') || address.startsWith('UQ')) {
    return address;
  }
  // Другие преобразования, если необходимо
  return address;
};

/**
 * Страница для обработки параметров перевода из URL
 * Принимает параметры:
 * - address: адрес кошелька получателя
 * - amount: количество TON для перевода
 * - comment: комментарий к переводу
 */
export default function TransferPage() {
  const searchParams = useSearchParams();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const userAddress = useTonAddress();

  // Получаем параметры из URL
  const address = searchParams.get('address') || '';
  const amount = searchParams.get('amount') || '0';
  const comment = searchParams.get('comment') || '';

  // Логируем параметры
  useEffect(() => {
    console.log('Параметры транзакции:', {
      address,
      amount,
      comment
    });
    console.log('Кошелек пользователя:', userAddress);
  }, [address, amount, comment, userAddress]);

  // Состояния для хранения данных и ошибок
  const [isValidAddress, setIsValidAddress] = useState<boolean>(true);
  const [isValidAmount, setIsValidAmount] = useState<boolean>(true);
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [transactionStarted, setTransactionStarted] = useState<boolean>(false);

  // Проверка валидности адреса и суммы
  useEffect(() => {
    // Простая проверка валидности адреса TON (начинается с 0: или EQAA)
    setIsValidAddress(address.startsWith('0:') || address.startsWith('EQ'));
    
    // Проверка суммы
    const amountNum = parseFloat(amount);
    setIsValidAmount(!isNaN(amountNum) && amountNum > 0);
  }, [address, amount]);

  // Автоматически выполняем перевод, когда кошелек подключен и данные валидны
  useEffect(() => {
    if (wallet && isValidAddress && isValidAmount && !isTransferring && !transactionStarted) {
      handleTransfer();
    }
  }, [wallet, isValidAddress, isValidAmount, transactionStarted]);

  // Функция для выполнения перевода
  const handleTransfer = async () => {
    if (!wallet) {
      return;
    }
    
    setIsTransferring(true);
    setTransactionStarted(true);

    try {
      // Создаем комментарий к транзакции, если он есть
      let payload = undefined;
      
      if (comment) {
        const commentCell = beginCell()
          .storeUint(0, 32) // Опкод 0 для текстового комментария
          .storeStringTail(comment)
          .endCell();
        
        payload = commentCell.toBoc().toString('base64');
      }

      // Нормализуем адрес
      const normalizedAddress = normalizeAddress(address);
      console.log('Нормализованный адрес:', normalizedAddress);

      // Создаем транзакцию
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360, // Действительна 360 секунд
        messages: [
          {
            address: normalizedAddress,
            amount: toNano(amount),
            payload: payload
          }
        ]
      };

      console.log('Отправляем транзакцию:', transaction);

      // Отправляем транзакцию
      await tonConnectUI.sendTransaction(transaction);
    } catch (e) {
      console.error('Ошибка транзакции:', e);
      // Не отображаем ошибку, просто сбрасываем состояние для возможности повторения
      setTransactionStarted(false);
    } finally {
      setIsTransferring(false);
    }
  };

  // Если кошелек не подключен, показываем кнопку подключения
  if (!wallet) {
    return (
      <Page>
        <Placeholder
          header="Подключение кошелька TON"
          description={
            <>
              <Text>
                Для выполнения перевода необходимо подключить кошелек TON.
                После подключения кошелька перевод будет выполнен автоматически.
              </Text>
              <div className="mt-4">
                <pre className="p-2 bg-gray-100 text-xs rounded overflow-x-auto">
                  Адрес получателя: {address}
                </pre>
              </div>
              <TonConnectButton />
            </>
          }
        />
      </Page>
    );
  }

  // Показываем экран загрузки во время подготовки и отправки транзакции
  return (
    <Page>
      <Card>
        <Title level="2">Перевод TON</Title>
        
        <div className="mb-4 text-center">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto mb-4"></div>
          <Text>Подготовка транзакции...</Text>
          
          <div className="mt-4 text-xs bg-gray-100 p-2 rounded text-left overflow-hidden">
            <p>Адрес: {address}</p>
            <p>Сумма: {amount} TON</p>
            {comment && <p>Комментарий: {comment}</p>}
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <Button 
            onClick={() => {
              setTransactionStarted(false);
              window.location.reload();
            }}
          >
            {isTransferring ? "Ожидание..." : "Попробовать снова"}
          </Button>
          
          {/* Добавляем кнопку для отвязки кошелька */}
          <Button 
            className="ml-2"
            style={{ backgroundColor: '#f44336' }}
            onClick={async () => {
              try {
                await tonConnectUI.disconnect();
                console.log('Кошелек успешно отвязан');
                window.location.reload();
              } catch (error) {
                console.error('Ошибка при отвязке кошелька:', error);
              }
            }}
          >
            Отвязать кошелёк
          </Button>
        </div>
      </Card>
    </Page>
  );
} 