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

### Отправка транзакции

```tsx
import { useTonConnect } from '@/hooks/useTonConnect';

function SendForm() {
  const { sendTon } = useTonConnect();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  
  const handleSend = async () => {
    try {
      // Отправить 1.5 TON на указанный адрес с комментарием
      const result = await sendTon(address, 1.5, 'Платеж за товар');
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
      <button onClick={handleSend}>Отправить</button>
    </div>
  );
}
```

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