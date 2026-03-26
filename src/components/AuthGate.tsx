import React from 'react';
import { Cloud, LoaderCircle, Lock, Mail, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isAuthLoading, isFirebaseReady, signIn, signInWithGoogle, signUp } = useAuth();
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Autentikasi gagal. Coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsGoogleSubmitting(true);

    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login Google gagal. Coba lagi.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-sm w-full rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-6 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <LoaderCircle className="w-6 h-6 animate-spin" />
          </div>
          <h1 className="text-lg font-bold text-gray-900 dark:text-white">Menyiapkan Aplikasi</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Menunggu sesi masuk dan data akun diproses.
          </p>
        </div>
      </div>
    );
  }

  if (!isFirebaseReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex items-center justify-center px-6">
        <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm p-8 space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600/10 text-blue-600 flex items-center justify-center">
            <Cloud className="w-6 h-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Konfigurasi Aplikasi Belum Lengkap</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Beberapa layanan belum siap digunakan. Silakan periksa pengaturan aplikasi atau hubungi administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-xl overflow-hidden">
        <div className="bg-blue-600 px-8 pt-10 pb-8 text-white">
          <div className="w-14 h-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center mb-5">
            <Cloud className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold">DompetKu</h1>
          <p className="text-sm text-blue-100 mt-2">
            Masuk untuk menghubungkan data perangkat dengan akun Anda.
          </p>
        </div>

        <div className="p-8 space-y-6">
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMessage(null);
              }}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors',
                mode === 'signin'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400',
              )}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMessage(null);
              }}
              className={cn(
                'flex-1 py-2.5 text-sm font-medium rounded-xl transition-colors',
                mode === 'signup'
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400',
              )}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <label className="block">
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Nama</span>
                <div className="relative">
                  <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Nama kamu"
                    className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </label>
            )}

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Email</span>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@email.com"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Password</span>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 pl-10 pr-4 py-3 text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </label>

            {errorMessage && (
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-900/40 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed text-white font-medium py-3 transition-colors"
            >
              {isSubmitting ? 'Memproses...' : mode === 'signup' ? 'Buat Akun' : 'Masuk'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
            <span className="text-xs font-medium uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
              atau
            </span>
            <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isGoogleSubmitting}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-70 disabled:cursor-not-allowed text-gray-900 dark:text-white font-medium py-3 px-4 transition-colors flex items-center justify-center gap-3"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-[#4285F4] border border-gray-200 text-sm font-bold">
              G
            </span>
            <span>{isGoogleSubmitting ? 'Membuka Google...' : 'Lanjut dengan Google'}</span>
          </button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-400 leading-5">
            Login Google akan membuat akun otomatis jika user belum pernah masuk sebelumnya.
          </p>
        </div>
      </div>
    </div>
  );
}
