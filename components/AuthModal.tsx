
import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, ArrowRight, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { getFirebaseErrorMessage } from '../lib/firebaseUtils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setIsLoading(false);
      setEmail('');
      setPassword('');
      setActiveTab('signin');
      setShowVerification(false);
    }
  }, [isOpen]);

  // Clear errors when switching tabs
  useEffect(() => {
    setError(null);
  }, [activeTab]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Basic Validation
    if (!email || !password) {
      setError('Please fill in all required fields.');
      setIsLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    try {
      // Create user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Close modal and navigate to dashboard on success
      onClose();
      window.location.hash = '#/dashboard';
      
    } catch (err: any) {
      console.error(err);
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      
      // Close modal and navigate to dashboard on success
      onClose();
      window.location.hash = '#/dashboard';
      
    } catch (err: any) {
      console.error(err);
      setError(getFirebaseErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all z-10"
        >
          <X size={20} />
        </button>

        {/* Header Section */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-4 text-emerald-600">
            {showVerification ? <Mail size={24} /> : <Lock size={24} />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {showVerification ? 'Verify Your Email' : (activeTab === 'signin' ? 'Welcome Back' : 'Create Account')}
          </h2>
          <p className="text-slate-500 mt-2 text-sm">
            {showVerification 
              ? `We have sent you a verification email to ${verificationEmail}. Please verify it and log in.`
              : (activeTab === 'signin' 
                ? 'Enter your credentials to access your vault.' 
                : 'Start your secure journey with VaultFlow today.')}
          </p>
        </div>

        {showVerification ? (
          <div className="p-8 pt-0">
            <button 
              onClick={() => {
                setShowVerification(false);
                setActiveTab('signin');
                setError(null);
              }}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
            >
              Login
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="px-8 flex border-b border-slate-100">
              <button
                onClick={() => setActiveTab('signin')}
                className={`flex-1 pb-3 text-sm font-semibold transition-all relative ${
                  activeTab === 'signin' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign In
                {activeTab === 'signin' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('signup')}
                className={`flex-1 pb-3 text-sm font-semibold transition-all relative ${
                  activeTab === 'signup' ? 'text-emerald-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Sign Up
                {activeTab === 'signup' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-t-full" />
                )}
              </button>
            </div>

            {/* Form Body */}
            <div className="p-8">
              <form className="space-y-4" onSubmit={activeTab === 'signup' ? handleSignUp : handleSignIn}>
                
                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-medium flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                     {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 ml-1">Email Address</label>
                  <div className="relative group">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all duration-300 pl-10 bg-slate-50 group-hover:bg-white placeholder:text-slate-400 focus:placeholder:text-slate-300/70"
                      placeholder="name@company.com"
                      required
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-xs font-semibold text-slate-700">Password</label>
                  </div>
                  <div className="relative group">
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all duration-300 pl-10 bg-slate-50 group-hover:bg-white placeholder:text-slate-400 focus:placeholder:text-slate-300/70"
                      placeholder="••••••••"
                      required
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-500 hover:shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin w-4 h-4" />
                      {activeTab === 'signin' ? 'Signing In...' : 'Creating Account...'}
                    </>
                  ) : (
                    <>
                      {activeTab === 'signin' ? 'Sign In' : 'Create Account'}
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </>
        )}
        
        {/* Footer Section */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
                By continuing, you agree to VaultFlow's <a href="#" className="text-emerald-600 hover:underline">Terms of Service</a> and <a href="#" className="text-emerald-600 hover:underline">Privacy Policy</a>.
            </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
