'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { Page } from '@/components/Page';
import { Text, Card } from '@telegram-apps/telegram-ui';

export default function SendPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const launchParams = useLaunchParams();
  
  useEffect(() => {
    // Получаем параметры из URL
    const address = searchParams.get('adress') || '';
    const amount = searchParams.get('ton') || '';
    const comment = searchParams.get('comment') || '';
    
    // Смотрим, есть ли параметры в startapp
    let startAppAddress = '';
    let startAppAmount = '';
    let startAppComment = '';
    
    if (launchParams.startParam) {
      console.log('Получен startapp параметр в send:', launchParams.startParam);
      
      // Проверяем формат параметра (address_amount_comment)
      if (launchParams.startParam.includes('_')) {
        const [paramAddress, paramAmount, paramComment] = launchParams.startParam.split('_');
        startAppAddress = paramAddress || '';
        startAppAmount = paramAmount || '';
        startAppComment = paramComment || '';
      }
    }
    
    // Создаем новые параметры для существующей страницы transfer
    const transferParams = new URLSearchParams();
    transferParams.append('address', address || startAppAddress);
    transferParams.append('amount', amount || startAppAmount);
    
    const finalComment = comment || startAppComment;
    if (finalComment) {
      transferParams.append('comment', finalComment);
    }
    
    // Перенаправляем на страницу transfer с преобразованными параметрами
    router.replace(`/transfer?${transferParams.toString()}`);
  }, [router, searchParams, launchParams.startParam]);
  
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