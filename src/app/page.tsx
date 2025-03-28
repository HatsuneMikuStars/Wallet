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
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Если есть параметр startapp, то пытаемся обработать его
    if (launchParams.startParam && typeof window !== 'undefined') {
      setIsRedirecting(true);
      console.log('Параметр startapp обнаружен:', launchParams.startParam);

      setTimeout(() => {
        // Ничего не делаем, обработка уже происходит в Root компоненте
        // Эта задержка нужна для отображения информации о редиректе
      }, 1500);
    }
  }, [launchParams.startParam]);

  return (
    <Page back={false}>
      <List>
        <Section
          header="TON Transfer"
          footer="Create links with TON transfer parameters or connect your wallet"
        >
          <TransferLink />
        </Section>
        
        <Section
          header="Features"
          footer="You can use these pages to learn more about features, provided by Telegram Mini Apps and other useful projects"
        >
          <Link href="/ton-connect">
            <Cell
              before={
                <Image
                  src={tonSvg.src}
                  style={{ backgroundColor: '#007AFF' }}
                />
              }
              subtitle="Connect your TON wallet"
            >
              TON Connect
            </Cell>
          </Link>
        </Section>
        <Section
          header="Application Launch Data"
          footer="These pages help developer to learn more about current launch information"
        >
          <Link href="/init-data">
            <Cell subtitle="User data, chat information, technical data">
              Init Data
            </Cell>
          </Link>
          <Link href="/launch-params">
            <Cell subtitle="Platform identifier, Mini Apps version, etc.">
              Launch Parameters
            </Cell>
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
        
        {isRedirecting ? (
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full mx-auto mb-4"></div>
            <Text>Перенаправление на страницу перевода...</Text>
          </div>
        ) : (
          <div className="text-center">
            <Text>
              Добро пожаловать в TON Wallet.
              Используйте это приложение для отправки и получения TON.
            </Text>
          </div>
        )}
      </Card>
    </Page>
  );
}
