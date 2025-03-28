'use client';

import { Section, Cell, Image, List } from '@telegram-apps/telegram-ui';
import { useTranslations } from 'next-intl';
import { useLaunchParams } from '@telegram-apps/sdk-react';
import { useEffect, useState } from 'react';

import { Link } from '@/components/Link/Link';
import { LocaleSwitcher } from '@/components/LocaleSwitcher/LocaleSwitcher';
import { Page } from '@/components/Page';
import { TransferLink } from '@/components/TransferLink';
import { Card, Text, Title } from '@telegram-apps/telegram-ui';

import tonSvg from './_assets/ton.svg';

export default function Home() {
  const t = useTranslations('i18n');
  const launchParams = useLaunchParams();
  const [startParam, setStartParam] = useState('');

  // Просто сохраняем и отображаем startParam без перенаправлений
  useEffect(() => {
    if (launchParams.startParam && typeof window !== 'undefined') {
      console.log('Параметр startapp на главной странице:', launchParams.startParam);
      setStartParam(launchParams.startParam);
    }
  }, [launchParams.startParam]);

  return (
    <Page back={false}>
      <List>
        <Section>
          <TransferLink />
        </Section>
        <Section header="Crypto">
          <Link href="/ton-connect">
            <Cell
              before={<Image style={{ width: 28, height: 28 }} src={tonSvg} />}
              subtitle="Connect your wallet via TON Connect"
            >
              TON Connect
            </Cell>
          </Link>
        </Section>
        <Section header="Navigation">
          <Link href="/counter">
            <Cell subtitle="Persisted Counter Example">Counter</Cell>
          </Link>
          <Link href="/back-button">
            <Cell subtitle="Back Button Example">Back Button</Cell>
          </Link>
          <Link href="/haptic-feedback">
            <Cell subtitle="Haptic Feedback Example">Haptic Feedback</Cell>
          </Link>
          <Link href="/qr-scanner">
            <Cell subtitle="QR Scanner Example">QR Scanner</Cell>
          </Link>
          <Link href="/main-button">
            <Cell subtitle="Main Button Example">Main Button</Cell>
          </Link>
          <Link href="/theme-params">
            <Cell subtitle="Telegram application palette information">
              Theme Parameters
            </Cell>
          </Link>
        </Section>
        <Section header={t('header')} footer={t('footer')}>
          <LocaleSwitcher/>
        </Section>
      </List>
      <Card>
        <Title level="2" className="text-center mb-4">
          TON Wallet
        </Title>
        
        <div className="text-center p-4">
          {startParam ? (
            <div className="mb-4">
              <Text className="mb-2 font-bold">Параметр startapp:</Text>
              <div className="p-3 bg-gray-100 rounded text-left">
                {startParam}
              </div>
            </div>
          ) : (
            <Text>Нет параметров запуска</Text>
          )}
        </div>
      </Card>
    </Page>
  );
}
