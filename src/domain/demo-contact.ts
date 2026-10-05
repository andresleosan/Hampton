export interface DemoContact { name: string; email: string; message: string }
export type DemoContactErrors = Partial<Record<keyof DemoContact, string>>;

/** Pure validation only. No submission, persistence or personal data in its result. */
export function validateDemoContact(input: DemoContact): DemoContactErrors {
  const errors: DemoContactErrors = {};
  if (!input.name.trim()) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim())) errors.email = 'Enter a valid email address.';
  if (!input.message.trim()) errors.message = 'Enter a message.';
  else if (input.message.length > 2000) errors.message = 'Use 2,000 characters or fewer.';
  return errors;
}
