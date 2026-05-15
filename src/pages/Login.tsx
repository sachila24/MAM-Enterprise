import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { BikeIcon, EyeIcon, EyeOffIcon, Loader2Icon } from 'lucide-react';
import { LanguageSwitcher } from '../components/layout/LanguageSwitcher';
import { signIn, isAuthenticated } from '../lib/auth';
export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate network request
    setTimeout(() => {
      setIsLoading(false);
      signIn();
      navigate('/');
    }, 1200);
  };
  return (
    <div className="flex min-h-screen w-full bg-brand-50">
      {/* Left Panel - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-between bg-brand-800 p-12 text-white">
        <div>
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white text-brand-800 font-bold text-2xl tracking-wider shadow-lg">
            MAM
          </div>
          <h1 className="mt-8 text-4xl font-bold tracking-tight">
            M A M TRADING ENTERPRISE
          </h1>
          <p className="mt-4 text-xl text-brand-200">Bike Sales & Finance</p>
        </div>

        <div className="space-y-8">
          <div className="flex items-center gap-4 text-brand-200">
            <BikeIcon className="h-8 w-8" />
            <p className="text-lg">
              Empowering your journey with flexible finance.
            </p>
          </div>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:w-1/2 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="lg:hidden mb-8 flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-800 text-white font-bold text-xl tracking-wider shadow-md">
              MAM
            </div>
            <h2 className="mt-4 text-2xl font-bold text-neutral-900">
              M A M TRADING
            </h2>
          </div>

          <div>
            <h2 className="text-2xl font-bold leading-9 tracking-tight text-neutral-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-500">
              Welcome back! Please enter your details.
            </p>
          </div>

          <div className="mt-10">
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                  Email address
                </label>
                <div className="mt-2">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                  
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium leading-6 text-neutral-900">
                  
                  Password
                </label>
                <div className="relative mt-2">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full rounded-md border-0 py-1.5 pr-10 text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 placeholder:text-neutral-400 focus:ring-2 focus:ring-inset focus:ring-brand-600 sm:text-sm sm:leading-6" />
                  
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-neutral-400 hover:text-neutral-600">
                    
                    {showPassword ?
                    <EyeOffIcon className="h-5 w-5" aria-hidden="true" /> :

                    <EyeIcon className="h-5 w-5" aria-hidden="true" />
                    }
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-600" />
                  
                  <label
                    htmlFor="remember-me"
                    className="ml-3 block text-sm leading-6 text-neutral-900">
                    
                    Remember me
                  </label>
                </div>

                <div className="text-sm leading-6">
                  <a
                    href="#"
                    className="font-semibold text-brand-600 hover:text-brand-500">
                    
                    Forgot password?
                  </a>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex w-full justify-center items-center rounded-md bg-brand-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:opacity-70 disabled:cursor-not-allowed">
                  
                  {isLoading ?
                  <Loader2Icon className="h-5 w-5 animate-spin" /> :

                  'Sign in'
                  }
                </button>
              </div>
            </form>

            <p className="mt-10 text-center text-sm text-neutral-500">
              Need access?{' '}
              <a
                href="#"
                className="font-semibold leading-6 text-brand-600 hover:text-brand-500">
                
                Ask your manager.
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>);

}