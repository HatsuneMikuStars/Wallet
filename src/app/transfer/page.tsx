'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import {
  Card,
  Text,
  Title,
  Button,
  Divider,
  Spinner,
  Section,
  Cell,
  AppRoot
} from '@telegram-apps/telegram-ui';
import { 
  useTonConnectUI, 
  useTonAddress, 
  useTonWallet
} from '@tonconnect/ui-react';

/**
 * Страница для перевода TON
 * Принимает параметры из URL или startParam в различных форматах
 */
export default function TransferPage() {
  const searchParams = useSearchParams();
  const launchParams = useLaunchParams();
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const userAddress = useTonAddress();

  // Статус транзакции
  const [txStatus, setTxStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [txHash, setTxHash] = useState<string>('');
  const [txError, setTxError] = useState<string>('');

  // Получаем параметры из URL или из startParam
  const [address, setAddress] = useState<string>('');
  const [transactionData, setTransactionData] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [startParamRaw, setStartParamRaw] = useState<string>('');
  const [parsedParts, setParsedParts] = useState<string[]>([]);
  const [parsingMethod, setParsingMethod] = useState<string>('');
  const [validationWarning, setValidationWarning] = useState<string>('');
  const [invalidComment, setInvalidComment] = useState<string>('');
  
  // Безопасное кодирование в Base64 с поддержкой Unicode
  const safeBase64Encode = (str: string): string => {
    try {
      // Преобразуем Unicode-строку в URL-кодированную форму и затем в Base64
      return window.btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      }));
    } catch (e) {
      console.error('Ошибка при кодировании в Base64:', e);
      return '';
    }
  };
  
  // Безопасное декодирование из Base64 с поддержкой Unicode
  const safeBase64Decode = (str: string): string => {
    try {
      // Декодируем Base64 и затем URL-кодирование
      return decodeURIComponent(Array.prototype.map.call(window.atob(str), (c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (e) {
      console.error('Ошибка при декодировании из Base64:', e);
      return '';
    }
  };

  // Проверка на валидность символов в startParam по документации Telegram
  const isValidStartParam = (str: string): boolean => {
    // Проверяем случай с username формата @username
    if (str.startsWith('@')) {
      // Проверяем оставшуюся часть после @ на соответствие стандартным требованиям
      const usernameWithoutAt = str.substring(1);
      return /^[\w-]{0,511}$/.test(usernameWithoutAt);
    }
    // Обычная проверка для остальных случаев
    return /^[\w-]{0,512}$/.test(str);
  };

  // Функция для проверки и установки комментария
  const validateAndSetComment = (value: string, source: string = 'unknown'): boolean => {
    if (!value) {
      return true; // Пустой комментарий считаем валидным
    }

    if (!isValidStartParam(value)) {
      const warningMessage = `Комментарий содержит недопустимые символы. Разрешены a-z, 0-9, _, - и @ в начале для @username. Будет закодирован автоматически.`;
      setValidationWarning(warningMessage);
      setInvalidComment(value); // Сохраняем невалидный комментарий для отладки
      
      // Отображаем оригинальный комментарий как есть
      setComment(value);
      
      return false;
    }
    
    // Если валидный - устанавливаем
    setComment(value);
    return true;
  };

  // Базовая функция для проверки, выглядит ли строка как TON адрес
  const looksLikeTonAddress = (str: string): boolean => {
    // TON адреса обычно начинаются с EQ, UQ или другого специального префикса
    return /^(EQ|UQ)/.test(str);
  };

  // Функция для проверки, является ли строка валидным Base64
  const isBase64 = (str: string): boolean => {
    try {
      // Проверяем базовый шаблон для Base64
      if (!/^[A-Za-z0-9+/=]+$/.test(str)) {
        return false;
      }
      // Проверяем, можно ли декодировать
      safeBase64Decode(str);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Функция для декодирования Base64 в JSON
  const tryParseBase64Json = (str: string): Record<string, any> | null => {
    try {
      const decodedStr = safeBase64Decode(str);
      const jsonObj = JSON.parse(decodedStr);
      return typeof jsonObj === 'object' ? jsonObj : null;
    } catch (e) {
      console.error('Ошибка при декодировании Base64 JSON:', e);
      return null;
    }
  };

  // Инициализируем параметры из URL или startParam
  useEffect(() => {
    // Сохраняем исходный startParam
    if (launchParams.startParam) {
      setStartParamRaw(launchParams.startParam);
      
      // Проверяем на валидность по требованиям Telegram
      // if (!isValidStartParam(launchParams.startParam)) {
      //   setValidationWarning('Некоторые параметры содержат специальные символы. Они будут закодированы автоматически.');
      // }
    }

    // Получаем параметры из URL
    const urlAddress = searchParams.get('address');
    const urlAmount = searchParams.get('amount');
    const urlComment = searchParams.get('comment');

    if (urlComment) {
      validateAndSetComment(urlComment, 'URL параметр comment');
    }

    if (urlAddress) {
      setAddress(urlAddress);
    }
    
    if (urlAmount) {
      setTransactionData(urlAmount);
    }

    // Если параметры не определены из URL, пробуем получить из startParam
    if (launchParams.startParam) {
      // Пробуем сначала распарсить как Base64 JSON
      if (isBase64(launchParams.startParam)) {
        const jsonData = tryParseBase64Json(launchParams.startParam);
        if (jsonData) {
          setParsingMethod('Base64 JSON');
          
          // Извлекаем параметры из JSON
          if (jsonData.address && !urlAddress) {
            setAddress(jsonData.address);
          }
          
          if (jsonData.amount && !urlAmount) {
            setTransactionData(jsonData.amount);
          }
          
          if (jsonData.comment && !urlComment) {
            validateAndSetComment(jsonData.comment, 'Base64 JSON comment поле');
          }
          
          // Отображаем разобранные части для отладки
          setParsedParts([
            `address: ${jsonData.address || 'не указан'}`,
            `amount: ${jsonData.amount || 'не указан'}`,
            `comment: ${jsonData.comment || 'не указан'} ${jsonData.comment && !isValidStartParam(jsonData.comment) ? '(недопустимые символы)' : ''}`
          ]);
          
          return; // Выходим, так как параметры уже обработаны
        }
      }
      
      // Если не удалось распарсить как Base64 JSON, пробуем разделитель "_"
      if (launchParams.startParam.includes('_')) {
        setParsingMethod('Разделитель "_"');
        // Разделяем startParam по символу '_'
        const parts = launchParams.startParam.split('_');
        setParsedParts(parts);
        
        // Проверяем первую часть
        if (parts[0]) {
          if (!urlAddress && looksLikeTonAddress(parts[0])) {
            // Если похоже на адрес TON, считаем адресом
            setAddress(parts[0]);
          } else if (parts.length === 1 && !urlComment) {
            // Если одна часть и не похожа на адрес, считаем комментарием
            validateAndSetComment(parts[0], 'startParam часть 1 (комментарий)');
          }
        }
        
        // Проверяем вторую часть (если есть)
        if (parts.length > 1 && parts[1]) {
          // Если первая часть - адрес, считаем вторую суммой
          if (looksLikeTonAddress(parts[0]) && !urlAmount) {
            setTransactionData(parts[1]);
          } 
          // Если первая часть не адрес, а просто текст, считаем это форматом comment_amount
          else if (!looksLikeTonAddress(parts[0]) && !urlAmount) {
            setTransactionData(parts[1]);
          }
        }
        
        // Проверяем третью часть (если есть)
        if (parts.length > 2 && parts[2] && !urlComment) {
          validateAndSetComment(parts[2], 'startParam часть 3 (комментарий)');
        }
        // Если есть две части, и первая не адрес - комментарий уже установлен из первой части
      } else {
        // Если нет символа '_'
        const param = launchParams.startParam;
        setParsedParts([param]);
        
        if (looksLikeTonAddress(param) && !urlAddress) {
          // Если похоже на адрес, считаем адресом
          setParsingMethod('Только адрес');
          setAddress(param);
        } else if (!urlComment) {
          // Иначе считаем комментарием
          setParsingMethod('Только комментарий');
          validateAndSetComment(param, 'startParam как комментарий');
        }
      }
    }
  }, [searchParams, launchParams.startParam]);

  // Функция для подключения кошелька
  const handleConnect = async () => {
    try {
      await tonConnectUI.connectWallet();
    } catch (e) {
      console.error('Ошибка при подключении кошелька:', e);
    }
  };

  // Функция для отправки транзакции
  const handleSendTransaction = async () => {
    if (!wallet) {
      console.error('Кошелек не подключен');
      return;
    }

    if (!address) {
      setTxError('Адрес получателя не указан');
      return;
    }

    if (!transactionData || isNaN(parseFloat(transactionData))) {
      setTxError('Сумма перевода не указана или указана некорректно');
      return;
    }

    try {
      setTxStatus('loading');
      setTxError('');

      // Преобразуем строковое значение суммы в наноТоны (1 TON = 10^9 наноТОН)
      const amountNano = Math.floor(parseFloat(transactionData) * 1_000_000_000);

      // Создаем транзакцию
      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360, // Действительна 5 минут
        messages: [
          {
            address: address,
            amount: amountNano.toString(),
            payload: comment ? comment : undefined, // Добавляем комментарий, если он есть
          },
        ],
      };

      // Отправляем транзакцию
      const result = await tonConnectUI.sendTransaction(transaction);
      
      console.log('Транзакция отправлена:', result);
      setTxHash(result.boc);
      setTxStatus('success');
    } catch (e) {
      console.error('Ошибка при отправке транзакции:', e);
      setTxError(e instanceof Error ? e.message : 'Неизвестная ошибка');
      setTxStatus('error');
    }
  };

  // Функция для отключения кошелька
  const handleDisconnect = () => {
    tonConnectUI.disconnect();
  };

  // Функция для форматирования адреса TON
  const formatTonAddress = (address: string): string => {
    if (!address) return '';
    
    // Если адрес слишком длинный, сокращаем его для отображения
    if (address.length > 12) {
      return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
    }
    
    return address;
  };

  return (
    <AppRoot>
      {/* Заголовок со значением суммы */}
      <header style={{ 
        padding: '18px 20px', 
        textAlign: 'center',
        background: 'var(--tg-theme-bg-color, #1c2836)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <Title level="2" style={{ 
          margin: 0, 
          marginBottom: 12,
          fontWeight: 700,
          fontSize: '28px',
          color: 'var(--tg-theme-text-color, #fff)',
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
        }}>
          Перевод TON
        </Title>
        {parseFloat(transactionData) > 0 && (
          <Text style={{ 
            fontSize: '26px', 
            fontWeight: 'bold',
            display: 'inline-block',
            padding: '8px 20px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #0088cc 0%, #8e24aa 100%)',
            color: '#ffffff',
            boxShadow: '0 4px 8px rgba(0, 136, 204, 0.3)',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
          }}>
            {transactionData} TON
          </Text>
        )}
      </header>

      {/* Предупреждение, если есть */}
      {validationWarning && (
        <div style={{ padding: '14px 16px 4px' }}>
          <Card style={{ 
            backgroundColor: 'rgba(255, 204, 0, 0.1)', 
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 204, 0, 0.3)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
          }}>
            <Text style={{ 
              color: '#ffcc00', 
              fontSize: '14px',
              lineHeight: '1.5',
              fontWeight: 500
            }}>
              ⚠️ {validationWarning}
            </Text>
          </Card>
        </div>
      )}

      {/* Секция с деталями перевода */}
      <Section 
        header={
          <Text style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--tg-theme-hint-color, #8a9aa9)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
            paddingLeft: '10px',
            borderLeft: '3px solid var(--tg-theme-button-color, #2481cc)'
          }}>
            Детали перевода
          </Text>
        }
        style={{
          margin: '14px 0'
        }}
      >
        <Cell 
          multiline
          style={{
            borderRadius: '16px',
            margin: '0 10px 10px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(255, 255, 255, 0.05) inset'
          }}
        >
          <div style={{ padding: '12px 8px' }}>
            <Text style={{ 
              color: 'var(--tg-theme-hint-color, #8a9aa9)',
              fontSize: '14px',
              marginBottom: '8px',
              display: 'block',
              fontWeight: 500
            }}>
              Адрес получателя
            </Text>
            <div style={{
              background: 'rgba(0, 136, 204, 0.1)',
              border: '1px solid rgba(0, 136, 204, 0.2)',
              padding: '8px 12px',
              borderRadius: '10px',
              display: 'inline-block'
            }}>
              <Text style={{ 
                wordBreak: 'break-all',
                fontSize: '15px',
                fontFamily: 'monospace',
                fontWeight: 600,
                color: 'var(--tg-theme-button-color, #2481cc)'
              }}>
                {formatTonAddress(address)}
              </Text>
            </div>
          </div>
        </Cell>
        
        <Cell 
          multiline
          style={{
            borderRadius: '16px',
            margin: '0 10px 10px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(255, 255, 255, 0.05) inset'
          }}
        >
          <div style={{ padding: '12px 8px' }}>
            <Text style={{ 
              color: 'var(--tg-theme-hint-color, #8a9aa9)',
              fontSize: '14px',
              marginBottom: '8px',
              display: 'block',
              fontWeight: 500
            }}>
              Сумма
            </Text>
            <Text style={{ 
              fontSize: '22px',
              fontWeight: 'bold',
              color: 'var(--tg-theme-button-color, #2481cc)',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
            }}>
              {transactionData || '0'} TON
            </Text>
          </div>
        </Cell>
        
        {comment && (
          <Cell 
            multiline
            style={{
              borderRadius: '16px',
              margin: '0 10px 10px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(255, 255, 255, 0.05) inset'
            }}
          >
            <div style={{ padding: '12px 8px' }}>
              <Text style={{ 
                color: 'var(--tg-theme-hint-color, #8a9aa9)',
                fontSize: '14px',
                marginBottom: '8px',
                display: 'block',
                fontWeight: 500
              }}>
                Комментарий
              </Text>
              <div style={{
                padding: '8px 12px',
                borderRadius: '10px',
                backgroundColor: invalidComment && comment === invalidComment 
                  ? 'rgba(255, 59, 48, 0.15)' 
                  : (comment.startsWith('@') ? 'rgba(0, 136, 204, 0.15)' : 'rgba(255, 255, 255, 0.08)'),
                border: invalidComment && comment === invalidComment 
                  ? '1px solid rgba(255, 59, 48, 0.3)'
                  : (comment.startsWith('@') ? '1px solid rgba(0, 136, 204, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'),
                display: 'inline-block',
                maxWidth: '100%'
              }}>
                <Text style={{ 
                  wordBreak: 'break-word',
                  fontSize: '15px',
                  fontWeight: comment.startsWith('@') ? 600 : 500,
                  color: invalidComment && comment === invalidComment 
                    ? 'var(--tg-theme-destructive-text-color, #ff3b30)' 
                    : (comment.startsWith('@') ? '#3a9bde' : 'var(--tg-theme-text-color, #fff)')
                }}>
                  {comment}
                </Text>
              </div>
            </div>
          </Cell>
        )}
      </Section>
      
      <Divider style={{ 
        margin: '6px 0 10px',
        opacity: 0.3,
        borderColor: 'rgba(255, 255, 255, 0.15)'
      }} />
      
      {/* Секция с кошельком */}
      <Section 
        header={
          <Text style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--tg-theme-hint-color, #8a9aa9)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
            paddingLeft: '10px',
            borderLeft: '3px solid var(--tg-theme-button-color, #2481cc)'
          }}>
            {wallet ? 'Ваш кошелёк' : 'Подключение кошелька'}
          </Text>
        }
        style={{
          margin: '14px 0'
        }}
      >
        {!wallet ? (
          <div style={{ 
            padding: '24px 20px',
            textAlign: 'center',
            background: 'linear-gradient(to bottom, rgba(0, 136, 204, 0.05), rgba(0, 0, 0, 0.1))',
            borderRadius: '16px',
            margin: '0 10px',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(255, 255, 255, 0.05) inset',
            border: '1px solid rgba(255, 255, 255, 0.08)'
          }}>
            <Text style={{ 
              textAlign: 'center', 
              marginBottom: '24px',
              color: 'var(--tg-theme-text-color, #fff)',
              fontSize: '16px',
              opacity: 0.9
            }}>
              Подключите TON Wallet для отправки транзакции
            </Text>
            <Button 
              size="l"
              stretched
              onClick={handleConnect}
              style={{
                borderRadius: '12px',
                height: '52px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: 'linear-gradient(135deg, #0088cc 0%, #0055aa 100%)',
                boxShadow: '0 4px 12px rgba(0, 136, 204, 0.4), 0 -1px 0 rgba(255, 255, 255, 0.2) inset'
              }}
            >
              Подключить TON Wallet
            </Button>
          </div>
        ) : (
          <>
            <Cell 
              multiline
              style={{
                borderRadius: '16px',
                margin: '0 10px 14px',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15), 0 1px 1px rgba(255, 255, 255, 0.05) inset'
              }}
            >
              <div style={{ padding: '12px 8px' }}>
                <Text style={{ 
                  color: 'var(--tg-theme-hint-color, #8a9aa9)',
                  fontSize: '14px',
                  marginBottom: '8px',
                  display: 'block',
                  fontWeight: 500
                }}>
                  Адрес кошелька
                </Text>
                <div style={{
                  background: 'rgba(0, 136, 204, 0.1)',
                  border: '1px solid rgba(0, 136, 204, 0.2)',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  display: 'inline-block'
                }}>
                  <Text style={{ 
                    wordBreak: 'break-all',
                    fontSize: '15px',
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    color: 'var(--tg-theme-button-color, #2481cc)'
                  }}>
                    {formatTonAddress(userAddress)}
                  </Text>
                </div>
              </div>
            </Cell>
            
            <div style={{ padding: '10px 20px 24px' }}>
              <Button 
                size="l"
                stretched
                onClick={handleSendTransaction}
                disabled={!address || !transactionData || txStatus === 'loading'}
                style={{ 
                  marginBottom: '16px',
                  borderRadius: '12px',
                  height: '54px',
                  fontSize: '17px',
                  fontWeight: 'bold',
                  background: !(!address || !transactionData || txStatus === 'loading') 
                    ? 'linear-gradient(135deg, #0088cc 0%, #0076b8 100%)' 
                    : 'rgba(128, 128, 128, 0.2)',
                  boxShadow: !(!address || !transactionData || txStatus === 'loading')
                    ? '0 6px 16px rgba(0, 136, 204, 0.3), 0 -1px 0 rgba(255, 255, 255, 0.2) inset'
                    : 'none'
                }}
              >
                {txStatus === 'loading' ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Spinner size="s" style={{ marginRight: '8px' }} />
                    <span>Отправка...</span>
                  </div>
                ) : (
                  'Отправить TON'
                )}
              </Button>
              
              <Button 
                size="l"
                stretched
                onClick={handleDisconnect}
                mode="outline"
                style={{ 
                  borderRadius: '12px',
                  height: '48px',
                  fontSize: '16px',
                  borderColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}
              >
                Отключить кошелёк
              </Button>
            </div>
          </>
        )}
        
        {/* Уведомления об успехе/ошибке */}
        {txStatus === 'success' && (
          <div style={{ padding: '0 16px 20px' }}>
            <Card style={{ 
              backgroundColor: 'rgba(36, 138, 51, 0.15)', 
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid rgba(36, 138, 51, 0.3)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(36, 138, 51, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '10px'
                }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>✓</span>
                </div>
                <Text style={{ 
                  fontWeight: 'bold', 
                  color: '#26a63a',
                  fontSize: '16px'
                }}>
                  Транзакция успешно отправлена!
                </Text>
              </div>
              {txHash && (
                <Text style={{ 
                  fontSize: '13px', 
                  color: '#26a63a',
                  background: 'rgba(36, 138, 51, 0.15)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  display: 'inline-block',
                  fontFamily: 'monospace',
                  border: '1px solid rgba(36, 138, 51, 0.2)'
                }}>
                  ID: {txHash.slice(0, 6)}...{txHash.slice(-6)}
                </Text>
              )}
            </Card>
          </div>
        )}
        
        {txStatus === 'error' && (
          <div style={{ padding: '0 16px 20px' }}>
            <Card style={{ 
              backgroundColor: 'rgba(255, 59, 48, 0.15)', 
              padding: '16px',
              borderRadius: '16px',
              border: '1px solid rgba(255, 59, 48, 0.3)',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                <div style={{ 
                  width: '24px', 
                  height: '24px', 
                  borderRadius: '50%', 
                  backgroundColor: 'rgba(255, 59, 48, 0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: '10px'
                }}>
                  <span style={{ color: '#fff', fontSize: '14px' }}>✗</span>
                </div>
                <Text style={{ 
                  fontWeight: 'bold', 
                  color: '#ff3b30',
                  fontSize: '16px'
                }}>
                  Ошибка при отправке
                </Text>
              </div>
              <Text style={{ 
                fontSize: '14px', 
                color: '#ff3b30',
                lineHeight: '1.5'
              }}>
                {txError}
              </Text>
            </Card>
          </div>
        )}
      </Section>
      
      <div style={{ 
        textAlign: 'center', 
        padding: '10px 0 20px',
        opacity: 0.6,
        color: 'var(--tg-theme-hint-color, #8a9aa9)',
        fontSize: '13px'
      }}>
        @rustgpt_bot
      </div>
    </AppRoot>
  );
} 