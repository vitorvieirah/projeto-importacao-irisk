import './App.css';

import React, { useState } from 'react';
import Papa from 'papaparse';
import { Upload, CheckCircle, XCircle, Loader2, FileText } from 'lucide-react';

const API_URL = 'http://localhost:3000';

export default function CSVUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const parseDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'N/A') return null;
    const parts = dateStr.split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    const [day, month, year] = datePart.split('/');
    return `${year}-${month}-${day}T${timePart}`;
  };

  const parseNumber = (value: string | number | null) => {
    if (!value || value === 'N/A') return null;
    const cleaned = value.toString().replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  };

  const parseIntValue = (value: string | number | null) => {
    if (!value || value === 'N/A') return null;
    const parsed = Number(value);
    return isNaN(parsed) ? null : parsed;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError(null);
      setResult(null);
    } else {
      setError('Por favor, selecione um arquivo CSV válido');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Nenhum arquivo selecionado');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    Papa.parse<string[]>(file, {
      header: false,
      skipEmptyLines: true,
      complete: async (results) => {
        const dataRows = results.data.slice(5);

        const inspections = dataRows
          .map((row: string[]) => ({
            nr_inspecao: row[1] || null,
            nr_sinistro: row[2] || null,
            data_inclusao: parseDate(row[3]),
            prioridade: row[4] || null,
            empresa_inspecao: row[5] || null,
            base_empresa: row[6] || null,
            inspetor: row[7] || null,
            operador: row[8] || null,
            agendamento: parseDate(row[9]),
            dias_cia_previa: parseIntValue(row[10]),
            data_proposta: parseDate(row[11]),
            dias_inspecao: parseIntValue(row[12]),
            dias_inspetor: parseIntValue(row[13]),
            data_atribuicao_empresa: parseDate(row[14]),
            data_atribuicao_inspetor: parseDate(row[15]),
            enquadramento: row[16] || null,
            categoria: row[17] || null,
            lmg: parseNumber(row[18]),
            segurado: row[19]?.trim() || null,
            tipo_seguro: row[20] || null,
            endereco: row[21] || null,
            data_ultima_atividade: parseDate(row[22]),
            atividade_atual: row[23] || null,
            ultima_tarefa: parseDate(row[24]),
            uploaded_by: 'system',
          }))
          .filter((inspection) => inspection.nr_inspecao);

        try {
          const response = await fetch(`${API_URL}/inspections/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inspections),
          });

          const resultData = await response.json();

          if (response.ok) {
            setResult({
              success: true,
              count: resultData.count,
              message: `${resultData.count} inspeções importadas com sucesso.`,
            });
          } else {
            setError(resultData.message || 'Erro ao enviar dados para o servidor.');
          }
        } catch (err) {
          setError('Erro ao conectar ao servidor.');
        } finally {
          setUploading(false);
        }
      },
    });
  };

  return (
    <div className="container">
      <div className="card">
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
              <p className="upload-text"><span className="bold">Clique para selecionar</span> ou arraste o arquivo</p>
              <p className="upload-hint">Somente arquivos CSV (formato iRisk)</p>
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
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className={`btn-upload ${uploading ? 'disabled' : ''}`}
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
            <li>• Arquivo CSV exportado do iRisk</li>
            <li>• Cabeçalho com informações do relatório</li>
            <li>• Dados das inspeções a partir da linha 6</li>
          </ul>
        </div>
      </div>

      <div className="footer">
        Sistema de importação de inspeções iRisk
      </div>
    </div>
  );
}
