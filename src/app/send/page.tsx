'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { Page } from '@/components/Page';
import { Text, Card, Title } from '@telegram-apps/telegram-ui';

export default function SendPage() {
  const searchParams = useSearchParams();
  const launchParams = useLaunchParams();
  
  // Состояния для хранения параметров
  const [address, setAddress] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [comment, setComment] = useState<string>('');
  const [startParamRaw, setStartParamRaw] = useState<string>('');
  
  useEffect(() => {
    // Получаем параметры из URL
    const urlAddress = searchParams.get('adress') || '';
    const urlAmount = searchParams.get('ton') || '';
    const urlComment = searchParams.get('comment') || '';
    
    setAddress(urlAddress);
    setAmount(urlAmount);
    setComment(urlComment);
    
    // Сохраняем startParam, если он есть
    if (launchParams.startParam) {
      setStartParamRaw(launchParams.startParam);
      console.log('Получен startapp параметр в send:', launchParams.startParam);
    }
    
    // ОТКЛЮЧЕНО: перенаправление на страницу transfer
    // // Смотрим, есть ли параметры в startapp
    // let startAppAddress = '';
    // let startAppAmount = '';
    // let startAppComment = '';
    
    // if (launchParams.startParam) {
    //   console.log('Получен startapp параметр в send:', launchParams.startParam);
    //   
    //   // Проверяем формат параметра (address_amount_comment)
    //   if (launchParams.startParam.includes('_')) {
    //     const [paramAddress, paramAmount, paramComment] = launchParams.startParam.split('_');
    //     startAppAddress = paramAddress || '';
    //     startAppAmount = paramAmount || '';
    //     startAppComment = paramComment || '';
    //   }
    // }
    
    // // Создаем новые параметры для существующей страницы transfer
    // const transferParams = new URLSearchParams();
    // transferParams.append('address', address || startAppAddress);
    // transferParams.append('amount', amount || startAppAmount);
    
    // const finalComment = comment || startAppComment;
    // if (finalComment) {
    //   transferParams.append('comment', finalComment);
    // }
    
    // // Перенаправляем на страницу transfer с преобразованными параметрами
    // router.replace(`/transfer?${transferParams.toString()}`);
  }, [searchParams, launchParams.startParam]);
  
  return (
    <Page>
      <Card>
        <Title level="2" className="mb-4">Параметры отправки TON</Title>
        
        <div className="mb-4">
          <Text className="mb-2 font-bold">Параметры, полученные из URL:</Text>
          
          <div className="p-3 bg-gray-100 rounded text-left mb-3">
            <p><b>Адрес получателя:</b> {address || 'не указан'}</p>
            <p><b>Сумма:</b> {amount || '0'} TON</p>
            <p><b>Комментарий:</b> {comment || 'не указан'}</p>
          </div>
          
          <Text className="mb-2 font-bold">Исходные данные:</Text>
          
          <div className="p-3 bg-gray-100 rounded text-left">
            <p><b>URL параметры:</b></p>
            <p>adress: {searchParams.get('adress') || 'не указан'}</p>
            <p>ton: {searchParams.get('ton') || 'не указан'}</p>
            <p>comment: {searchParams.get('comment') || 'не указан'}</p>
            <hr className="my-2" />
            <p><b>startParam из Telegram:</b></p>
            <p>{startParamRaw || 'не указан'}</p>
          </div>
        </div>
        
        <div className="text-center text-gray-500 text-sm mt-4">
          <p>Данные для отладки параметров TMA</p>
        </div>
      </Card>
    </Page>
  );
} 