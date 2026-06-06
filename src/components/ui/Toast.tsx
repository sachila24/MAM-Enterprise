import React, { useCallback, useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
export type ToastType = 'success' | 'error' | 'info';
interface Toast {
  id: string;
  message: string;
  type: ToastType;
}
interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}
const ToastContext = createContext<ToastContextType | undefined>(undefined);
export function ToastProvider({ children }: {children: React.ReactNode;}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = useCallback(
    (message: string, type: ToastType = 'success') => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type
      }]
      );
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    },
    []
  );
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);
  return (
    <ToastContext.Provider
      value={{
        showToast
      }}>
      
      {children}
      <div className="mam-toast-host no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((toast) =>
          <motion.div
            key={toast.id}
            initial={{
              opacity: 0,
              y: 20,
              scale: 0.95
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              transition: {
                duration: 0.2
              }
            }}
            className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg border ${toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : toast.type === 'error' ? 'bg-danger-50 border-danger-200 text-danger-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
            
              {toast.type === 'success' &&
            <CheckCircle className="h-5 w-5 text-emerald-500" />
            }
              {toast.type === 'error' &&
            <XCircle className="h-5 w-5 text-danger-500" />
            }
              {toast.type === 'info' &&
            <Info className="h-5 w-5 text-blue-500" />
            }

              <span className="text-sm font-medium">{toast.message}</span>

              <button
              onClick={() => removeToast(toast.id)}
              className="ml-2 rounded-md p-1 hover:bg-black/5 focus:outline-none">
              
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>);

}
export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}