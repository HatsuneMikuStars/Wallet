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
    };
  }, []);

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
    
    try {
      // Полный набор параметров для транзакции
      const result = await sendTransaction({
        // Обязательные параметры
        recipient: recipient, 
        amount: parsedAmount,
        
        // Специальные параметры безопасности
        network: CHAIN.MAINNET, // Явно указываем сеть для предотвращения ошибок
        
        // Опциональные параметры
        comment: comment || undefined,
        
        // Параметры для более сложных сценариев (отключены в этом примере)
        // stateInit: undefined, // Base64-encoded stateInit для деплоя контрактов
        // extraCurrency: undefined // Для отправки Jetton'ов (токенов TON)
      });
      
      setTxResult(`Транзакция успешно отправлена!\nBoc: ${result?.boc.slice(0, 30)}...`);
    } catch (e) {
      console.error(e);
      setTxResult(`Ошибка: ${e instanceof Error ? e.message : String(e)}`);
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
                  <Text 
                    style={{ 
                      marginTop: 15, 
                      padding: 10,
                      borderRadius: 8,
                      background: txResult.includes('Ошибка') 
                        ? 'rgba(255, 0, 0, 0.1)' 
                        : 'rgba(0, 255, 0, 0.1)'
                    }}
                  >
                    {txResult}
                  </Text>
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