'use client';

import { Page } from '@/components/Page';
import { useTonConnect } from '@/hooks/useTonConnect';
import { Button, Card, Input, Spinner, List, Section, Text, Title } from '@telegram-apps/telegram-ui';
import { CHAIN } from '@tonconnect/sdk';
import { useEffect, useState } from 'react';

// Функция для проверки, выглядит ли строка как TON адрес
const isValidTonAddress = (address: string): boolean => {
  return /^(EQ|UQ)[a-zA-Z0-9_-]{46,48}$/.test(address);
};

const TonWalletPage = () => {
  const { isConnected, connect, disconnect, sendTransaction, userAddress, wallet, network } = useTonConnect();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [txResult, setTxResult] = useState('');
  const [addressError, setAddressError] = useState('');
  const [txDetails, setTxDetails] = useState<any>(null);

  // Валидация адреса при вводе
  useEffect(() => {
    if (recipient && !isValidTonAddress(recipient)) {
      setAddressError('Неверный формат адреса. Адрес должен начинаться с "EQ" или "UQ" и содержать 48 символов.');
    } else {
      setAddressError('');
    }
  }, [recipient]);

  // Сбрасываем состояние результата транзакции при размонтировании
  useEffect(() => {
    return () => {
      setTxResult('');
      setTxDetails(null);
    };
  }, []);

  // Функция для форматирования BOC для отображения
  const formatBoc = (boc: string | undefined): string => {
    if (!boc) return 'Нет данных';
    if (boc.length <= 30) return boc;
    return `${boc.slice(0, 15)}...${boc.slice(-15)}`;
  };

  // Функция для отправки TON
  const handleSend = async () => {
    if (!isConnected || !recipient || !amount) return;
    if (addressError) return;
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setTxResult('Ошибка: Сумма должна быть больше 0');
      return;
    }
    
    setLoading(true);
    setTxResult('');
    setTxDetails(null);
    
    try {
      // Полный набор параметров для транзакции с пояснениями
      const result = await sendTransaction({
        // Обязательные параметры для любой транзакции
        recipient: recipient, 
        amount: parsedAmount,
        
        // Явно указываем сеть для предотвращения ошибок
        // Используем сеть из подключенного кошелька или принудительно указываем MAINNET
        network: wallet?.account.chain || CHAIN.MAINNET,
        
        // Текстовый комментарий (SDK автоматически выполнит правильное кодирование)
        comment: comment || undefined,
        
        // Параметры для продвинутых сценариев (отключены в этом примере)
        // stateInit: undefined, // Base64-encoded stateInit для деплоя контрактов
        // extraCurrency: undefined // Для отправки Jetton'ов (токенов TON)
      });
      
      // Сохраняем результат для отображения
      setTxDetails(result);
      setTxResult(`Транзакция успешно отправлена!`);
    } catch (e) {
      console.error('Ошибка транзакции:', e);
      
      // Обрабатываем разные типы ошибок
      let errorMessage = '';
      
      if (e instanceof Error) {
        if (e.message.includes('User rejected the transaction')) {
          errorMessage = 'Вы отклонили транзакцию';
        } else if (e.message.includes('Invalid magic')) {
          errorMessage = 'Ошибка кодирования данных. Проверьте, что комментарий содержит только допустимые символы.';
        } else if (e.message.includes('not enough balance')) {
          errorMessage = 'Недостаточно средств на балансе для выполнения транзакции';
        } else if (e.message.includes('Cell overflow')) {
          errorMessage = 'Комментарий слишком длинный. Сократите его размер.';
        } else {
          errorMessage = e.message;
        }
      } else {
        errorMessage = String(e);
      }
      
      setTxResult(`Ошибка: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      <Section>
        <Title level="2" style={{ textAlign: 'center', margin: '20px 0' }}>
          TON Wallet Интеграция
        </Title>
        
        {!isConnected ? (
          <Card style={{ padding: 20 }}>
            <Text style={{ textAlign: 'center', marginBottom: 20 }}>
              Подключите TON кошелек для отправки транзакций
            </Text>
            <Button 
              size="l" 
              stretched 
              onClick={connect}
              style={{ marginBottom: 15 }}
            >
              Подключить кошелек
            </Button>
          </Card>
        ) : (
          <List>
            <Section>
              <Card style={{ padding: 20 }}>
                <Text weight="2">Адрес кошелька:</Text>
                <Text 
                  style={{ 
                    fontSize: 14, 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis',
                    marginBottom: 10 
                  }}
                >
                  {userAddress}
                </Text>
                <Text weight="2">Сеть:</Text>
                <Text style={{ marginBottom: 15 }}>
                  {network === 'mainnet' ? 'Основная сеть TON' : 'Тестовая сеть TON'}
                </Text>
                <Button 
                  size="m" 
                  onClick={disconnect} 
                  style={{ marginBottom: 20 }}
                >
                  Отключить кошелек
                </Button>
              </Card>
            </Section>
            
            <Section>
              <Card style={{ padding: 20 }}>
                <Text weight="2" style={{ marginBottom: 10 }}>
                  Отправить TON
                </Text>
                
                <div style={{ marginBottom: 10 }}>
                  <Text size={14} style={{ marginBottom: 5 }}>Адрес получателя</Text>
                  <Input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                  {addressError && (
                    <Text style={{ 
                      color: 'red', 
                      fontSize: 12,
                      marginTop: 4
                    }}>
                      {addressError}
                    </Text>
                  )}
                </div>
                
                <div style={{ marginBottom: 10 }}>
                  <Text size={14} style={{ marginBottom: 5 }}>Сумма TON</Text>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>
                
                <div style={{ marginBottom: 15 }}>
                  <Text size={14} style={{ marginBottom: 5 }}>Комментарий (опционально)</Text>
                  <Input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </div>
                
                <Button 
                  size="l" 
                  stretched 
                  disabled={loading || !recipient || !amount || !!addressError} 
                  onClick={handleSend}
                >
                  {loading ? <Spinner size="s" /> : 'Отправить TON'}
                </Button>
                
                {txResult && (
                  <div
                    style={{ 
                      marginTop: 15, 
                      padding: 12,
                      borderRadius: 8,
                      background: txResult.includes('Ошибка') 
                        ? 'rgba(255, 0, 0, 0.1)' 
                        : 'rgba(0, 255, 0, 0.1)'
                    }}
                  >
                    <Text weight="2">
                      {txResult}
                    </Text>
                    
                    {txDetails && (
                      <div style={{ marginTop: 8 }}>
                        <Text size={13} style={{ marginBottom: 4 }}>
                          BOC: {formatBoc(txDetails.boc)}
                        </Text>
                        {txDetails.externalId && (
                          <Text size={13}>
                            ID: {txDetails.externalId}
                          </Text>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            </Section>
          </List>
        )}
      </Section>
    </Page>
  );
};

export default TonWalletPage; 