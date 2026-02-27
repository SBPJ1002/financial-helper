import { useTranslation } from 'react-i18next';
import Select from '../ui/Select';
import { CURRENCIES } from '../../i18n';

export default function CurrencySelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  return (
    <Select
      label={t('common.currency')}
      value={value}
      onChange={e => onChange(e.target.value)}
      options={CURRENCIES.map(c => ({
        value: c.code,
        label: `${c.flag} ${c.code}`,
      }))}
    />
  );
}
