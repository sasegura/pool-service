import React, { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/ui/Common';
import { Waves, LogIn } from 'lucide-react';
import { toast } from 'sonner';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Sesión iniciada correctamente');
      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error('Error al iniciar sesión con Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 flex flex-col items-center text-center">
        <div className="bg-blue-600 p-4 rounded-3xl mb-6 shadow-lg shadow-blue-200">
          <Waves className="text-white w-12 h-12" />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">Miami Pool Care</h1>
        <p className="text-slate-500 mb-8">Gestión profesional de mantenimiento y limpieza de piscinas.</p>
        
        <Button 
          variant="primary" 
          size="xl" 
          onClick={handleGoogleLogin} 
          isLoading={loading}
          className="flex gap-3"
        >
          <LogIn className="w-6 h-6" />
          Entrar con Google
        </Button>
        
        <p className="mt-8 text-xs text-slate-400 max-w-[280px]">
          Solo personal autorizado puede acceder al sistema. Si no tienes acceso, contacta con administración.
        </p>
      </Card>
    </div>
  );
}
