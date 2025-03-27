'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Page } from '@/components/Page';
import { Text, Card } from '@telegram-apps/telegram-ui';

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Получаем параметры из URL
    const address = searchParams.get('adress') || '';
    const amount = searchParams.get('ton') || '';
    const comment = searchParams.get('comment') || '';
    
    // Создаем новые параметры для существующей страницы transfer
    const transferParams = new URLSearchParams();
    transferParams.append('address', address);
    transferParams.append('amount', amount);
    if (comment) {
      transferParams.append('comment', comment);
    }
    
    // Перенаправляем на страницу transfer с преобразованными параметрами
    router.replace(`/transfer?${transferParams.toString()}`);
  }, [router, searchParams]);
  
  return (
    <Page>
      <Card>
        <div className="text-center p-4">
          <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto mb-4"></div>
          <Text>Подготовка перевода...</Text>
        </div>
      </Card>
    </Page>
  );
} 