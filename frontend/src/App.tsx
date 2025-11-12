import './App.css';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle, XCircle, Loader2, FileText, LogOut, User } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function App() {
  const { user, session, loading: authLoading, signOut } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseDate = (value: any) => {
    if (!value || value === 'N/A') return null;
    
    if (typeof value === 'number') {
      const excelEpoch = new Date(1899, 11, 30);
      const date = new Date(excelEpoch.getTime() + value * 86400000);
      return date.toISOString();
    }
    
    if (typeof value === 'string') {
      const parts = value.split(' ');
      const datePart = parts[0];
      const timePart = parts[1] || '00:00:00';
      const [day, month, year] = datePart.split('/');
      
      if (day && month && year) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timePart}`;
      }
    }
    
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    return null;
  };

  const parseNumber = (value: any) => {
    if (!value || value === 'N/A') return null;
    if (typeof value === 'number') return value;
    
    if (typeof value === 'string') {
      const cleaned = value.toString().replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(cleaned);
      return isNaN(parsed) ? null : parsed;
    }
    
    return null;
  };

  const parseIntValue = (value: any) => {
    if (!value || value === 'N/A') return null;
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  };

  const cleanString = (value: any) => {
    if (!value) return null;
    return value.toString().trim() || null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel.sheet.macroEnabled.12'
      ];
      
      const isValidType = validTypes.includes(selectedFile.type) || 
                         selectedFile.name.endsWith('.xls') || 
                         selectedFile.name.endsWith('.xlsx') ||
                         selectedFile.name.endsWith('.xlsm');
      
      if (isValidType) {
        setFile(selectedFile);
        setError(null);
        setResult(null);
      } else {
        setError('Por favor, selecione um arquivo Excel válido (.xls, .xlsx)');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Nenhum arquivo selecionado');
      return;
    }

    if (!session?.access_token) {
      setError('Você precisa estar autenticado');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { 
        type: 'array',
        cellDates: true,
        cellNF: false,
        cellText: false
      });

      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const data = XLSX.utils.sheet_to_json<any[]>(worksheet, { 
        header: 1,
        raw: false,
        dateNF: 'dd/mm/yyyy hh:mm:ss'
      });

      const dataRows = data.slice(5);

      const inspections = dataRows
        .map((row: any[]) => {
          if (!row || row.length === 0 || !row[1]) return null;

          return {
            nr_inspecao: cleanString(row[1]),
            nr_sinistro: cleanString(row[2]),
            data_inclusao: parseDate(row[3]),
            prioridade: cleanString(row[4]),
            empresa_inspecao: cleanString(row[5]),
            base_empresa: cleanString(row[6]),
            inspetor: cleanString(row[7]),
            operador: cleanString(row[8]),
            agendamento: parseDate(row[9]),
            dias_cia_previa: parseIntValue(row[10]),
            data_proposta: parseDate(row[11]),
            dias_inspecao: parseIntValue(row[12]),
            dias_inspetor: parseIntValue(row[13]),
            data_atribuicao_empresa: parseDate(row[14]),
            data_atribuicao_inspetor: parseDate(row[15]),
            enquadramento: cleanString(row[16]),
            categoria: cleanString(row[17]),
            lmg: parseNumber(row[18]),
            segurado: cleanString(row[19]),
            tipo_seguro: cleanString(row[20]),
            endereco: cleanString(row[21]),
            data_ultima_atividade: parseDate(row[22]),
            atividade_atual: cleanString(row[23]),
            ultima_tarefa: parseDate(row[24]),
          };
        })
        .filter((inspection) => inspection !== null && inspection.nr_inspecao);

      if (inspections.length === 0) {
        throw new Error('Nenhuma inspeção válida encontrada no arquivo');
      }

      if (inspections.length > 10000) {
        throw new Error('Máximo de 10.000 registros por upload');
      }

      const response = await fetch(`${API_URL}/inspections/bulk`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(inspections),
      });

      const resultData = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          count: resultData.count,
          message: `${resultData.count} inspeções importadas com sucesso.`,
        });
        setFile(null);
        
        const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        setError(resultData.message || 'Erro ao enviar dados para o servidor.');
      }
    } catch (err: any) {
      console.error('Erro ao processar arquivo:', err);
      setError(err.message || 'Erro ao processar o arquivo Excel.');
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Erro ao fazer logout:', err);
    }
  };

  if (authLoading) {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <Loader2 size={48} className="spin" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '1rem', color: '#6b7280' }}>Carregando...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="container">
      <div className="card">
        {/* User Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem',
          paddingBottom: '1rem',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={20} style={{ color: '#6b7280' }} />
            <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
              {user.email}
            </span>
          </div>
          <button
            onClick={handleSignOut}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              background: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              color: '#6b7280',
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>

        {/* Header */}
        <div className="header">
          <div className="icon-circle">
            <FileText className="w-8 h-8" />
          </div>
          <h1>iRisk Inspections</h1>
          <p className="subtitle">Importar relatório de inspeções</p>
        </div>

        {/* Upload Area */}
        <div className="upload-area">
          <label htmlFor="file-upload" className="upload-label">
            <div className="upload-content">
              <Upload className="upload-icon" />
              <p className="upload-text">
                <span className="bold">Clique para selecionar</span> ou arraste o arquivo
              </p>
              <p className="upload-hint">Somente arquivos Excel (.xls, .xlsx)</p>
              {file && (
                <div className="file-selected">
                  <FileText className="file-icon" />
                  {file.name}
                </div>
              )}
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".xls,.xlsx,.xlsm"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`btn-upload ${!file || uploading ? 'disabled' : ''}`}
        >
          {uploading ? (
            <>
              <Loader2 className="spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="upload-icon" />
              Importar Inspeções
            </>
          )}
        </button>

        {/* Mensagens */}
        {result && result.success && (
          <div className="alert alert-success">
            <CheckCircle className="alert-icon" />
            <div>
              <h3>Importação concluída!</h3>
              <p>{result.message}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            <XCircle className="alert-icon" />
            <div>
              <h3>Erro na importação</h3>
              <p>{error}</p>
            </div>
          </div>
        )}

        <div className="info-box">
          <h3>📋 Formato esperado</h3>
          <ul>
            <li>• Arquivo Excel (.xls ou .xlsx) exportado do iRisk</li>
            <li>• Cabeçalho com informações do relatório</li>
            <li>• Dados das inspeções a partir da linha 6</li>
            <li>• Máximo de 10.000 registros por upload</li>
          </ul>
        </div>
      </div>

      <div className="footer">
        Sistema de importação de inspeções iRisk
      </div>
    </div>
  );
}