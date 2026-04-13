import { registrationOpen } from '@/flags';
import { RegisterForm } from './register-form';
import { WaitlistForm } from './waitlist-form';

export default async function RegisterPage() {
  const isOpen = await registrationOpen();

  if (!isOpen) {
    return <WaitlistForm />;
  }

  return <RegisterForm />;
}
