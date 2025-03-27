'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Input,
  Text,
  Title,
} from '@telegram-apps/telegram-ui';

/**
 * Компонент для создания ссылки на перевод TON
 * Позволяет ввести адрес кошелька, сумму и комментарий для генерации URL
 */
export const TransferLink = () => {
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address || !amount) return;
    
    setIsLoading(true);
    
    // Формируем URL с параметрами
    const params = new URLSearchParams();
    params.append('address', address);
    params.append('amount', amount);
    
    if (comment) {
      params.append('comment', comment);
    }
    
    // Перенаправляем на страницу перевода
    router.push(`/transfer?${params.toString()}`);
  };

  return (
    <Card>
      <Title level="2">Создать ссылку на перевод TON</Title>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <Text className="mb-2">Адрес кошелька получателя:</Text>
          <Input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="EQAbc... или 0:123..."
            required
          />
        </div>
        
        <div className="mb-4">
          <Text className="mb-2">Сумма (TON):</Text>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1.5"
            type="number"
            step="0.01"
            min="0.01"
            required
          />
        </div>
        
        <div className="mb-4">
          <Text className="mb-2">Комментарий (опционально):</Text>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Оплата за услуги..."
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <Button type="submit" loading={isLoading}>
          Создать ссылку на перевод
        </Button>
      </form>
    </Card>
  );
}; 