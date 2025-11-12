import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, UserPlus, AlertCircle } from 'lucide-react';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setSuccess('Conta criada! Verifique seu email para confirmar.');
        setEmail('');
        setPassword('');
        setIsSignUp(false);
      } else {
        await signIn(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="card" style={{ maxWidth: '400px' }}>
        <div className="header">
          <div className="icon-circle">
            {isSignUp ? <UserPlus size={32} /> : <LogIn size={32} />}
          </div>
          <h1>{isSignUp ? 'Criar Conta' : 'Login'}</h1>
          <p className="subtitle">iRisk Inspections</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
              }}
              placeholder="seu@email.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
              }}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`btn-upload ${loading ? 'disabled' : ''}`}
            style={{ marginBottom: '1rem' }}
          >
            {loading ? 'Carregando...' : isSignUp ? 'Criar Conta' : 'Entrar'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setSuccess(null);
            }}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#2563eb',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              textDecoration: 'underline',
            }}
          >
            {isSignUp ? 'Já tem conta? Entrar' : 'Não tem conta? Criar'}
          </button>
        </form>

        {error && (
          <div className="alert alert-error" style={{ marginTop: '1rem' }}>
            <AlertCircle className="alert-icon" size={20} />
            <div>
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="alert alert-success" style={{ marginTop: '1rem' }}>
            <AlertCircle className="alert-icon" size={20} />
            <div>
              <p>{success}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}