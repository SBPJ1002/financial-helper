import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { DollarSign, Mail, Lock, UserPlus, User, MapPin, ChevronLeft, ChevronRight, Check, Calendar } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Card from '../components/ui/Card';
import { useAuthStore } from '../stores/useAuthStore';
import { validateCPF, maskCPFInput, cleanCPF } from '../utils/cpf';
import { fetchAddress } from '../utils/viacep';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');

  const STEPS = [
    { label: t('auth.stepAccount'), icon: Mail },
    { label: t('auth.stepPersonal'), icon: User },
    { label: t('auth.stepAddress'), icon: MapPin },
  ];

  const GENDER_OPTIONS = [
    { value: '', label: t('auth.selectOptional') },
    { value: 'MALE', label: t('auth.male') },
    { value: 'FEMALE', label: t('auth.female') },
    { value: 'OTHER', label: t('auth.other') },
    { value: 'PREFER_NOT_TO_SAY', label: t('auth.preferNotToSay') },
  ];

  // Step 1: Account
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Personal
  const [fullName, setFullName] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');

  // Step 3: Address
  const [zipCode, setZipCode] = useState('');
  const [street, setStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);

  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!email) return t('auth.emailRequired');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return t('auth.invalidEmail');
      if (!password) return t('auth.passwordRequired');
      if (!passwordChecks.length) return t('auth.passwordMinLength');
      if (!passwordChecks.uppercase) return t('auth.passwordUppercase');
      if (!passwordChecks.number) return t('auth.passwordNumber');
      if (!passwordChecks.special) return t('auth.passwordSpecial');
      if (password !== confirmPassword) return t('auth.passwordsDoNotMatch');
    }
    if (s === 1) {
      if (!fullName || fullName.trim().length < 5) return t('auth.fullNameMinLength');
      if (fullName.trim().split(/\s+/).length < 2) return t('auth.fullNameMinWords');
      if (cpf && !validateCPF(cpf)) return t('auth.invalidCpf');
      if (birthDate) {
        const bd = new Date(birthDate);
        const age = (Date.now() - bd.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
        if (age < 18) return t('auth.minAge');
      }
    }
    return null;
  }

  function handleNext() {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError('');
    setStep(s => s + 1);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Only advance step or submit on final step
    if (step < 2) {
      handleNext();
      return;
    }
    handleSubmit();
  }

  async function handleCepBlur() {
    const cleaned = zipCode.replace(/\D/g, '');
    if (cleaned.length !== 8) return;
    setCepLoading(true);
    const addr = await fetchAddress(cleaned);
    if (addr) {
      setStreet(addr.street);
      setNeighborhood(addr.neighborhood);
      setCity(addr.city);
      setState(addr.state);
      if (addr.complement) setComplement(addr.complement);
    }
    setCepLoading(false);
  }

  async function handleSubmit() {
    setError('');

    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }

    try {
      await register({
        fullName: fullName.trim(),
        email,
        password,
        cpf: cpf ? cleanCPF(cpf) : undefined,
        birthDate: birthDate || undefined,
        gender: gender || undefined,
        zipCode: zipCode.replace(/\D/g, '') || undefined,
        street: street || undefined,
        addressNumber: addressNumber || undefined,
        complement: complement || undefined,
        neighborhood: neighborhood || undefined,
        city: city || undefined,
        state: state || undefined,
      });
      navigate('/onboarding', { replace: true });
    } catch (err) {
      const message = (err as { response?: { data?: { error?: string } } }).response?.data?.error
        || t('auth.registerFailed');
      setError(message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-900 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">{t('auth.registerTitle')}</h1>
          <p className="text-sm text-surface-500 mt-1">{t('auth.getStarted')}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors
                ${i === step ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : i < step ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-400'}`}>
                {i < step ? <Check className="h-3 w-3" /> : <s.icon className="h-3 w-3" />}
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-0.5 ${i < step ? 'bg-green-400' : 'bg-surface-300 dark:bg-surface-600'}`} />
              )}
            </div>
          ))}
        </div>

        <Card>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Account */}
            {step === 0 && (
              <>
                <Input label={t('auth.email')} type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  icon={<Mail className="h-4 w-4" />} />
                <Input label={t('auth.password')} type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t('auth.passwordPlaceholder')}
                  icon={<Lock className="h-4 w-4" />} />
                <div className="space-y-1 text-xs">
                  <p className={passwordChecks.length ? 'text-green-500' : 'text-surface-400'}>
                    {passwordChecks.length ? '\u2713' : '\u25CB'} {t('auth.pwdRuleLength')}
                  </p>
                  <p className={passwordChecks.uppercase ? 'text-green-500' : 'text-surface-400'}>
                    {passwordChecks.uppercase ? '\u2713' : '\u25CB'} {t('auth.pwdRuleUppercase')}
                  </p>
                  <p className={passwordChecks.number ? 'text-green-500' : 'text-surface-400'}>
                    {passwordChecks.number ? '\u2713' : '\u25CB'} {t('auth.pwdRuleNumber')}
                  </p>
                  <p className={passwordChecks.special ? 'text-green-500' : 'text-surface-400'}>
                    {passwordChecks.special ? '\u2713' : '\u25CB'} {t('auth.pwdRuleSpecial')}
                  </p>
                </div>
                <Input label={t('auth.confirmPassword')} type="password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder={t('auth.confirmPasswordPlaceholder')}
                  icon={<Lock className="h-4 w-4" />} />
              </>
            )}

            {/* Step 2: Personal */}
            {step === 1 && (
              <>
                <Input label={t('auth.fullName')} type="text" value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder={t('auth.firstAndLastName')}
                  icon={<User className="h-4 w-4" />} />
                <Input label={t('auth.cpfOptional')} type="text" value={cpf}
                  onChange={e => setCpf(maskCPFInput(e.target.value))}
                  placeholder={t('auth.cpfPlaceholder')} maxLength={14} />
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    {t('auth.birthDateOptional')}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400 dark:text-surface-500 pointer-events-none">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <input type="date" value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 rounded-lg border border-surface-300 dark:border-surface-600
                        bg-white dark:bg-surface-700 text-surface-900 dark:text-white
                        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                        text-sm transition-colors
                        [&::-webkit-calendar-picker-indicator]:dark:invert
                        [&::-webkit-calendar-picker-indicator]:opacity-60
                        [&::-webkit-calendar-picker-indicator]:hover:opacity-100
                        [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                    />
                  </div>
                </div>
                <Select label={t('auth.gender')} value={gender}
                  onChange={e => setGender(e.target.value)}
                  options={GENDER_OPTIONS} />
              </>
            )}

            {/* Step 3: Address */}
            {step === 2 && (
              <>
                <div className="flex gap-3">
                  <div className="w-1/3">
                    <Input label={t('auth.zipCode')} type="text" value={zipCode}
                      onChange={e => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                      onBlur={handleCepBlur}
                      placeholder={t('auth.cepPlaceholder')} maxLength={8} />
                  </div>
                  <div className="flex-1">
                    <Input label={t('auth.street')} type="text" value={street}
                      onChange={e => setStreet(e.target.value)}
                      placeholder={cepLoading ? t('common.loading') : t('auth.streetPlaceholder')}
                      disabled={cepLoading} />
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-1/3">
                    <Input label={t('auth.number')} type="text" value={addressNumber}
                      onChange={e => setAddressNumber(e.target.value)}
                      placeholder={t('auth.numberPlaceholder')} />
                  </div>
                  <div className="flex-1">
                    <Input label={t('auth.complement')} type="text" value={complement}
                      onChange={e => setComplement(e.target.value)}
                      placeholder={t('auth.complementPlaceholder')} />
                  </div>
                </div>
                <Input label={t('auth.neighborhood')} type="text" value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                  placeholder={t('auth.neighborhood')}
                  disabled={cepLoading} />
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input label={t('auth.city')} type="text" value={city}
                      onChange={e => setCity(e.target.value)}
                      placeholder={t('auth.city')}
                      disabled={cepLoading} />
                  </div>
                  <div className="w-1/4">
                    <Input label={t('auth.state')} type="text" value={state}
                      onChange={e => setState(e.target.value)}
                      placeholder={t('auth.ufPlaceholder')} maxLength={2}
                      disabled={cepLoading} />
                  </div>
                </div>
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3 pt-2">
              {step > 0 && (
                <Button type="button" variant="secondary" onClick={() => { setStep(s => s - 1); setError(''); }}>
                  <ChevronLeft className="h-4 w-4" /> {t('common.back')}
                </Button>
              )}
              <div className="flex-1" />
              {step < 2 ? (
                <Button type="submit">
                  {t('common.next')} <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? t('auth.creatingAccount') : <><UserPlus className="h-4 w-4" /> {t('auth.createAccount')}</>}
                </Button>
              )}
            </div>

            {step === 2 && (
              <p className="text-xs text-center text-surface-400">
                {t('auth.addressOptionalNote')}
              </p>
            )}
          </form>

          <p className="text-center text-sm text-surface-500 mt-4">
            {t('auth.hasAccount')}{' '}
            <Link to="/login" className="text-primary-500 hover:underline font-medium">
              {t('auth.signIn')}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
