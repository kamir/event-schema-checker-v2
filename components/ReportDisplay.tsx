import React from 'react';
import { ValidationReport } from '../types';
import { Spinner } from './Spinner';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { DownloadIcon } from './icons/DownloadIcon';

interface ReportDisplayProps {
  report: ValidationReport | null;
  isLoading: boolean;
  showDownloadButton?: boolean;
  onDownload?: () => void;
}

const CheckItem: React.FC<{ title: string; pass: boolean; message?: string }> = ({ title, pass, message }) => (
  <div className={`p-4 rounded-md border ${pass ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
    <div className="flex items-center">
      {pass ? <CheckCircleIcon className="h-5 w-5 text-brand-success mr-2" /> : <XCircleIcon className="h-5 w-5 text-brand-danger mr-2" />}
      <h3 className={`font-semibold ${pass ? 'text-brand-success' : 'text-brand-danger'}`}>{title}</h3>
    </div>
    {message && <p className="text-sm text-brand-subtle mt-1 ml-7">{message}</p>}
  </div>
);


export const ReportDisplay: React.FC<ReportDisplayProps> = ({ report, isLoading, showDownloadButton, onDownload }) => {
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4">
        <Spinner />
        <p className="mt-4 text-brand-subtle">Inspecting JSON...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 text-center">
        <InformationCircleIcon className="h-12 w-12 text-brand-subtle" />
        <h2 className="mt-4 text-lg font-semibold text-brand-text">Validation Report</h2>
        <p className="mt-1 text-sm text-brand-subtle">Results will appear here after inspection.</p>
      </div>
    );
  }

  if (report.success) {
    return (
        <div className="h-full flex flex-col items-center justify-center p-4 text-center">
            <CheckCircleIcon className="h-16 w-16 text-brand-success" />
            <h2 className="mt-4 text-xl font-bold text-white">Validation Passed</h2>
            <p className="mt-1 text-brand-subtle">The JSON is well-formed and meets the selected schema criteria.</p>
            {showDownloadButton && onDownload && (
              <button
                onClick={onDownload}
                className="mt-6 flex items-center gap-2 px-4 py-2 font-semibold rounded-md text-white bg-brand-accent hover:opacity-90 transition-opacity"
              >
                <DownloadIcon className="h-5 w-5" />
                Download Schema
              </button>
            )}
        </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-4">Inspection Report</h2>
        <div className="space-y-4">
            <CheckItem title="Syntax Check" pass={report.syntaxCheck.pass} message={report.syntaxCheck.error}/>
            <CheckItem title="Schema Check" pass={report.schemaCheck.pass} message={report.schemaCheck.message}/>
        </div>
      </div>

      {report.aiAnalysis && (
        <>
        <div>
            <h3 className="text-lg font-semibold text-brand-accent mb-2">AI Interpretation</h3>
            <p className="text-sm text-brand-text bg-brand-primary p-4 rounded-md border border-brand-border">{report.aiAnalysis.interpretation}</p>
        </div>
        <div>
            <h3 className="text-lg font-semibold text-brand-accent mb-2">Proposed Solution</h3>
            <pre className="bg-brand-primary p-4 rounded-md border border-brand-border text-sm text-brand-text overflow-x-auto">
                <code>{report.aiAnalysis.solution}</code>
            </pre>
        </div>
        </>
      )}
    </div>
  );
};
