# Интеграция TON Connect

## Описание

TON Connect - это стандартизированный протокол взаимодействия между dApps и TON кошельками. Он позволяет пользователям безопасно подключать свои кошельки к вашему приложению и выполнять транзакции в блокчейне TON.

## Структура интеграции в приложении

```
+-------------------+            +------------------+            +------------------+
|                   |            |                  |            |                  |
|    Ваше TMA       |  <------>  |   TON Connect    |  <------>  |   TON Wallet     |
|    приложение     |            |    протокол      |            |   (кошелек)      |
|                   |            |                  |            |                  |
+-------------------+            +------------------+            +------------------+
```

## Компоненты интеграции

1. **Манифест**: Файл `tonconnect-manifest.json` в папке `/public`, который описывает ваше приложение для кошельков
2. **TonConnectUIProvider**: Обертка React для всего приложения, которая настраивает среду TON Connect
3. **Хук useTonConnect**: Пользовательский хук для удобного взаимодействия с TON Connect в любом компоненте
4. **TonConnectButton**: Готовый компонент кнопки для подключения кошелька

## Использование в коде

### Подключение и отключение кошелька

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';

function MyComponent() {
  const { isConnected, connect, disconnect, userAddress } = useTonConnect();

  return (
    <div>
      {isConnected ? (
        <>
          <p>Ваш адрес: {userAddress}</p>
          <button onClick={disconnect}>Отключить</button>
        </>
      ) : (
        <button onClick={connect}>Подключить кошелек</button>
      )}
    </div>
  );
}
```

### Отправка транзакции (базовый вариант)

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';
import { CHAIN } from '@tonconnect/sdk';

function SendForm() {
  const { sendTransaction, isConnected, network } = useTonConnect();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  
  const handleSend = async () => {
    if (!isConnected) return;
    
    try {
      // Базовый вариант с обязательными параметрами
      const result = await sendTransaction({
        // Обязательные параметры
        recipient: address, 
        amount: parseFloat(amount),
        
        // Всегда рекомендуется явно указывать сеть
        network: CHAIN.MAINNET, // или CHAIN.TESTNET для тестовой сети
        
        // Опциональные параметры
        comment: comment || undefined
      });
      
      console.log('Транзакция отправлена:', result);
    } catch (error) {
      console.error('Ошибка отправки:', error);
    }
  };
  
  return (
    <div>
      <input
        value={address}
        onChange={(e) => setAddress(e.target.value)}
        placeholder="Адрес получателя"
      />
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Сумма в TON"
      />
      <input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Комментарий"
      />
      <button onClick={handleSend}>Отправить</button>
    </div>
  );
}
```

### Отправка транзакции (полный вариант со всеми параметрами)

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';
import { CHAIN } from '@tonconnect/sdk';

function FullSendForm() {
  const { sendTransaction, wallet } = useTonConnect();
  
  const handleFullSend = async () => {
    try {
      // Полный вариант со всеми доступными параметрами
      const result = await sendTransaction({
        // 1. Обязательные параметры:
        recipient: "EQВашАдрес", // Адрес получателя (начинается с EQ или UQ)
        amount: 1.5,            // Сумма в TON (не в нано)
        
        // 2. Параметры безопасности:
        network: wallet?.account.chain || CHAIN.MAINNET, // Сеть из кошелька или явно указанная
        
        // 3. Дополнительные параметры:
        comment: "Платеж за услуги",  // Текстовый комментарий к транзакции
        
        // 4. Расширенные параметры:
        stateInit: "base64EncodedStateInit", // Для деплоя контрактов (если нужен)
        extraCurrency: {                     // Для отправки Jetton'ов (токенов)
          123456: "1000000000"  // ID токена: количество в минимальных единицах
        }
      });
      
      console.log('Транзакция отправлена:', result);
      console.log('BOC:', result?.boc);           // BOC транзакции
      console.log('Внешний ID:', result?.externalId); // Внешний ID транзакции
    } catch (error) {
      console.error('Ошибка отправки:', error);
    }
  };
  
  return (
    <button onClick={handleFullSend}>Отправить полную транзакцию</button>
  );
}
```

### Отправка нескольких транзакций

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';
import { CHAIN } from '@tonconnect/sdk';

function MultiSendForm() {
  const { sendMultipleTransactions } = useTonConnect();
  
  const handleMultiSend = async () => {
    try {
      // Отправка до 4 транзакций за один вызов
      const result = await sendMultipleTransactions([
        // Транзакция 1 - основная отправка
        { 
          recipient: "EQАдрес1", 
          amount: 0.1, 
          comment: "Первый платеж",
          network: CHAIN.MAINNET // Явно указываем сеть
        },
        
        // Транзакция 2 - отправка с Jetton
        { 
          recipient: "EQАдрес2", 
          amount: 0.01, // Минимальная сумма TON
          extraCurrency: { 12345: "10000000" } // ID Jetton: количество
        },
        
        // Транзакция 3 - деплой контракта
        { 
          recipient: "EQАдрес3", 
          amount: 0.1,
          stateInit: "base64EncodedStateInit" // StateInit для деплоя
        }
      ]);
      
      console.log('Мульти-транзакция отправлена:', result);
    } catch (error) {
      console.error('Ошибка отправки:', error);
    }
  };
  
  return (
    <button onClick={handleMultiSend}>Отправить несколько транзакций</button>
  );
}
```

### Расширенные опции транзакций

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';
import { CHAIN } from '@tonconnect/sdk';

function AdvancedSendForm() {
  const { sendTransaction } = useTonConnect();
  
  // Деплой смарт-контракта через транзакцию
  const handleDeployContract = async () => {
    try {
      // StateInit для деплоя нового контракта (предполагается, что он уже сгенерирован)
      const stateInitBase64 = "ваш_base64_state_init"; 
      
      const result = await sendTransaction({
        recipient: "EQАдресКонтракта", // Адрес будущего контракта
        amount: 0.1,                  // Начальный баланс
        network: CHAIN.MAINNET,       // Сеть
        stateInit: stateInitBase64    // StateInit для деплоя
      });
      
      console.log('Контракт отправлен на деплой:', result);
    } catch (error) {
      console.error('Ошибка деплоя:', error);
    }
  };
  
  // Отправка Jetton (токена TON)
  const handleSendJetton = async () => {
    try {
      const jettonId = 123456;    // ID Jetton
      const jettonAmount = "1000000000"; // Количество в минимальных единицах
      
      const result = await sendTransaction({
        recipient: "EQАдресПолучателя",
        amount: 0.05,  // Минимальная сумма TON для оплаты комиссии
        network: CHAIN.MAINNET,
        extraCurrency: {
          [jettonId]: jettonAmount
        }
      });
      
      console.log('Отправлены токены Jetton:', result);
    } catch (error) {
      console.error('Ошибка отправки токенов:', error);
    }
  };
  
  return (
    <div>
      <button onClick={handleDeployContract}>Деплой контракта</button>
      <button onClick={handleSendJetton}>Отправить токены</button>
    </div>
  );
}
```

## Описание всех параметров транзакций

### Параметры для sendTransaction

| Параметр | Тип | Обязательный | Описание |
|----------|-----|--------------|----------|
| recipient | string | Да | Адрес получателя в формате EQ... или UQ... |
| amount | number | Да | Сумма в TON (не в нано, например 0.1 TON) |
| network | CHAIN | Рекомендуется | Сеть (CHAIN.MAINNET или CHAIN.TESTNET) |
| comment | string | Нет | Текстовый комментарий к транзакции |
| stateInit | string | Нет | Base64-закодированный StateInit для деплоя контрактов |
| extraCurrency | Record<number, string> | Нет | ID валюты -> сумма для Jetton транзакций |

### Ответ транзакции (SendTransactionResponse)

| Поле | Тип | Описание |
|------|-----|----------|
| boc | string | BOC (Bag of Cells) транзакции |
| externalId | string | Внешний ID транзакции |

## Рекомендации по пользовательскому интерфейсу

1. **Показывайте статус подключения**: Всегда отображайте, подключен ли кошелек
2. **Объясняйте пользователю действия**: Четко сообщайте, зачем нужно подключение кошелька
3. **Предоставляйте информацию о транзакциях**: Показывайте детали транзакции перед отправкой
4. **Обрабатывайте ошибки**: Корректно обрабатывайте и показывайте пользователю ошибки при взаимодействии с кошельком

## Поддерживаемые кошельки

По умолчанию поддерживаются все основные кошельки TON:

- Tonkeeper
- TON Wallet (Telegram Wallet)
- OpenMask
- MyTonWallet
- TonHub

## Безопасность

1. Приложение никогда не получает доступ к приватным ключам пользователя
2. Все транзакции подписываются только в интерфейсе кошелька пользователя
3. Пользователь всегда видит полные детали транзакции перед подписанием

## Ресурсы для разработчиков

- [Официальная документация TON Connect](https://docs.ton.org/develop/dapps/ton-connect/)
- [GitHub репозиторий TON Connect](https://github.com/ton-connect/sdk)
- [TON Connect UI React компоненты](https://github.com/ton-connect/sdk/tree/main/packages/ui-react)

## 6. Взаимодействие с Telegram Bot

Важной функцией при разработке Telegram Mini Apps является отправка данных в бота и возвращение пользователя в основной интерфейс бота после выполнения действий в TMA.

### 6.1. Возврат в бота после завершения транзакции

Хук `useTonConnect` теперь поддерживает автоматический возврат в бота после успешного завершения транзакции:

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';

function TransactionComponent() {
  const { sendTransaction } = useTonConnect();
  
  const handleSend = async () => {
    try {
      await sendTransaction({
        recipient: "EQВашАдрес",
        amount: 1.5,
        comment: "Платеж за услуги",
        
        // Автоматический возврат в бота после транзакции
        returnToBot: true,
        returnMessage: "Транзакция успешно выполнена!"
      });
      
      // Этот код не выполнится, если включен параметр returnToBot,
      // т.к. приложение будет автоматически закрыто
    } catch (error) {
      console.error('Ошибка отправки:', error);
    }
  };
  
  return (
    <button onClick={handleSend}>Отправить TON</button>
  );
}
```

### 6.2. Прямой вызов функции returnToBot

Вы также можете вызвать функцию возврата в бота напрямую в любой момент:

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';

function MyComponent() {
  const { returnToBot } = useTonConnect();
  
  const handleAction = () => {
    // Какие-то действия...
    
    // Возврат в бота с сообщением
    returnToBot("Действие успешно выполнено!");
  };
  
  return (
    <button onClick={handleAction}>Выполнить действие</button>
  );
}
```

### 6.3. Формат сообщений для бота

Сообщения, отправляемые боту, могут содержать любые данные в формате JSON. Для этого нужно передать строку, содержащую сериализованный JSON-объект:

```tsx
// Простое текстовое сообщение
returnToBot("Транзакция выполнена");

// Детальное сообщение с данными
returnToBot(JSON.stringify({
  action: "transaction_completed",
  txId: "abc123",
  amount: 1.5,
  recipient: "EQВашАдрес"
}));
```

Бот получит эти данные в виде события `web_app_data` и сможет обработать их соответствующим образом. 

## 7. Тестовый режим

Для тестирования интеграции TON Connect без отправки реальных транзакций предусмотрен специальный тестовый режим. Этот режим полезен для проверки пользовательского интерфейса, логики приложения и процесса возврата в бота Telegram.

### 7.1. Включение тестового режима через URL-параметр

Тестовый режим активируется через URL-параметр `isTest`. Для включения добавьте `?isTest=true` к URL вашего приложения:

```
https://ваш-домен.com/transfer?address=EQ...&amount=1.5&isTest=true
```

### 7.2. Поведение в тестовом режиме

В тестовом режиме:
- Транзакции **не отправляются** в блокчейн
- Не требуется подключение к кошельку
- Выполняется возврат в бота с тестовым сообщением
- Интерфейс отображает индикаторы тестового режима

### 7.3. Обработка тестовых транзакций в коде

Для программной обработки тестового режима используйте параметр `testMode` в функции `sendTransaction`:

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';

function TestModeExample() {
  const { sendTransaction } = useTonConnect();
  
  const handleTest = async () => {
    try {
      // Тестовая отправка без реальной транзакции
      await sendTransaction({
        recipient: "EQВашАдрес",
        amount: 1.5,
        comment: "Тестовый платеж",
        
        // Включаем тестовый режим
        testMode: true,
        
        // Управляем возвратом в бота
        returnToBot: true,
        returnMessage: "Тестовая транзакция симулирована"
      });
    } catch (error) {
      console.error('Ошибка:', error);
    }
  };
  
  return (
    <button onClick={handleTest}>Тестировать</button>
  );
}
```

### 7.4. Идентификация тестового режима в транзакции

В тестовом режиме результат транзакции всё равно возвращается, но с фиктивными данными:

```tsx
const result = await sendTransaction({
  recipient: address,
  amount: amount,
  testMode: true
});

// result.boc будет содержать префикс "test_mode_boc_" + временная метка
console.log(result.boc); // "test_mode_boc_1687654321123"
```

### 7.5. Рекомендации по использованию

- Используйте тестовый режим на стадии разработки для проверки UI/UX
- Добавьте явные индикаторы тестового режима, чтобы пользователи не думали, что тестовые транзакции реальны
- При разработке ботов Telegram создайте специальные команды для генерации тестовых ссылок
- Отключайте тестовый режим перед публикацией в продакшн 