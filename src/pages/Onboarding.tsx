import { useState } from 'react';
import { useStore } from '../lib/store';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';

interface FormData {
  fullName: string;
  email: string;
  university: string;
  major: string;
  graduationDate: string;
  weeklyGoal: string;
}

export function OnboardingPage() {
  const { initUser, addToast } = useStore();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>({
    fullName: '', email: '', university: '', major: '',
    graduationDate: '', weeklyGoal: '10',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const update = (key: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: '' }));
  };

  const validateStep1 = () => {
    const newErrors: Partial<FormData> = {};
    if (!form.fullName.trim()) newErrors.fullName = 'Name is required';
    if (!form.email.trim()) newErrors.email = 'Email is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!form.fullName.trim()) {
      addToast({ type: 'error', message: 'Please enter your name' });
      return;
    }
    initUser({
      fullName: form.fullName,
      email: form.email,
      university: form.university,
      major: form.major,
      graduationDate: form.graduationDate,
      preferences: {
        defaultFollowUpDays: 7,
        reminderBeforeDeadline: 24,
        weeklyApplicationGoal: parseInt(form.weeklyGoal) || 10,
        colorScheme: 'light',
        boardView: 'comfortable',
      },
    } as never);
    addToast({ type: 'success', message: 'Welcome to InternTrack! Let\'s start tracking your applications.' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 bg-indigo-600 rounded-2xl items-center justify-center mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to InternTrack</h1>
          <p className="text-gray-500 mt-1 text-sm">Your internship application command center</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {step > s ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : s}
                </div>
                {s < 2 && (
                  <div className={`w-16 h-0.5 mx-1 ${step > s ? 'bg-indigo-600' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
            <span className="text-xs text-gray-500 ml-2">Step {step} of 2</span>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
                <p className="text-sm text-gray-500 mt-1">Tell us about yourself to personalize your experience</p>
              </div>
              <Input
                label="Full Name *"
                value={form.fullName}
                onChange={e => update('fullName', e.target.value)}
                placeholder="Jane Smith"
                error={errors.fullName}
              />
              <Input
                label="Email Address *"
                type="email"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                placeholder="jane@university.edu"
                error={errors.email}
              />
              <Input
                label="University"
                value={form.university}
                onChange={e => update('university', e.target.value)}
                placeholder="State University"
              />
              <Input
                label="Major / Field of Study"
                value={form.major}
                onChange={e => update('major', e.target.value)}
                placeholder="Computer Science"
              />
              <div className="pt-2">
                <Button
                  className="w-full"
                  onClick={() => { if (validateStep1()) setStep(2); }}
                >
                  Continue
                  <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Set Your Goals</h2>
                <p className="text-sm text-gray-500 mt-1">We'll track your progress and keep you on target</p>
              </div>
              <Input
                label="Expected Graduation Date"
                type="month"
                value={form.graduationDate}
                onChange={e => update('graduationDate', e.target.value)}
              />
              <Select
                label="Weekly Application Goal"
                value={form.weeklyGoal}
                onChange={e => update('weeklyGoal', e.target.value)}
                options={[
                  { value: '3', label: '3 applications / week (light)' },
                  { value: '5', label: '5 applications / week (moderate)' },
                  { value: '10', label: '10 applications / week (active)' },
                  { value: '15', label: '15 applications / week (intensive)' },
                  { value: '20', label: '20 applications / week (full time)' },
                ]}
              />

              <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-100">
                <h3 className="text-sm font-semibold text-indigo-900 mb-2">What InternTrack tracks for you:</h3>
                <ul className="space-y-1.5 text-sm text-indigo-700">
                  {[
                    'Kanban pipeline board with 11 stages',
                    'Interview scheduling and prep checklists',
                    'Contact relationship manager',
                    'Document library with version control',
                    'Deadline alerts and follow-up reminders',
                    'Analytics and application insights',
                  ].map(item => (
                    <li key={item} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Back
                </Button>
                <Button onClick={handleSubmit} className="flex-1">
                  Get Started
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          All data is stored locally in your browser. No account required.
        </p>
      </div>
    </div>
  );
}
