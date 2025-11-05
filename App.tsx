import React, { useState, useCallback } from 'react';
import { Header } from './components/Header';
import { JsonInput } from './components/JsonInput';
import { Spinner } from './components/Spinner';
import { getAiAnalysis, extractSchema, flattenSchema, validateWithCustomSchema, generateIcebergSchema, performComplianceCheck } from './services/geminiService';
import { ArrowLeftIcon } from './components/icons/ArrowLeftIcon';
import { ArrowRightIcon } from './components/icons/ArrowRightIcon';
import { SchemaSelector } from './components/SchemaSelector';
import { BREADCRUMB_STEPS, SCHEMAS } from './constants';
import { SchemaDefinition, SchemaType, ValidationReport } from './types';
import { validateJson } from './services/jsonValidator';
import { ReportDisplay } from './components/ReportDisplay';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Footer } from './components/Footer';
import { DownloadIcon } from './components/icons/DownloadIcon';
import { MarkdownReport } from './components/MarkdownReport';
import { InformationCircleIcon } from './components/icons/InformationCircleIcon';


type Tab = 'extracted' | 'flattened' | 'iceberg';

const App: React.FC = () => {
  const [jsonInput, setJsonInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [error, setError] = useState<string>('');
  
  const [currentStep, setCurrentStep] = useState(0);
  
  // Validation State
  const [availableSchemas, setAvailableSchemas] = useState<SchemaDefinition[]>(SCHEMAS);
  const [selectedSchema, setSelectedSchema] = useState<SchemaType>(SchemaType.CLOUD_EVENT);
  const [report, setReport] = useState<ValidationReport | null>(null);

  // Compliance State
  const [complianceReport, setComplianceReport] = useState<string>('');

  // Generation State
  const [extractedSchema, setExtractedSchema] = useState<string>('');
  const [flattenedSchema, setFlattenedSchema] = useState<string>('');
  const [icebergSchema, setIcebergSchema] = useState<string>('');
  
  // Result View State
  const [activeTab, setActiveTab] = useState<Tab>('extracted');

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const handleInspect = async () => {
    setIsLoading(true);
    setLoadingAction('Inspecting JSON...');
    setError('');
    setReport(null);

    let finalReport: ValidationReport;

    try {
        if (selectedSchema === SchemaType.CUSTOM_EXTRACTED) {
            if (!extractedSchema) throw new Error("Extracted schema is not available. Please generate it first.");
            finalReport = await validateWithCustomSchema(jsonInput, extractedSchema);
        } else if (selectedSchema === SchemaType.CUSTOM_FLATTENED) {
            if (!flattenedSchema) throw new Error("Flattened schema is not available. Please generate it first.");
            finalReport = await validateWithCustomSchema(jsonInput, flattenedSchema);
        } else {
            // Original validation logic
            const validationResult = validateJson(jsonInput, selectedSchema);
            if (validationResult.success) {
                finalReport = { ...validationResult, aiAnalysis: null };
            } else {
                const errorToAnalyze = validationResult.syntaxCheck.error || validationResult.schemaCheck.message || 'An unknown validation error occurred.';
                const aiAnalysis = await getAiAnalysis(jsonInput, errorToAnalyze);
                finalReport = { ...validationResult, aiAnalysis };
            }
        }
    } catch (err) {
        console.error("Inspection failed:", err);
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        // Create a report that shows the error
        finalReport = {
            success: false,
            syntaxCheck: { pass: jsonInput.trim() !== '', error: jsonInput.trim() === '' ? 'Input is empty.' : undefined },
            schemaCheck: { pass: false, message: errorMessage },
            aiAnalysis: null
        };
    }

    setReport(finalReport);
    setCurrentStep(2); // Move to the Report step
    setIsLoading(false);
    setLoadingAction(null);
  };

  const handleComplianceCheck = async () => {
    setIsLoading(true);
    setLoadingAction('Performing Compliance Check...');
    setError('');
    setComplianceReport('');

    try {
        const reportMarkdown = await performComplianceCheck(jsonInput);
        setComplianceReport(reportMarkdown);
        setCurrentStep(4); // Move to insights page
    } catch (err) {
        setError((err as Error).message || 'An unknown error occurred during compliance check.');
        // Stay on step 3 to show the error
    } finally {
        setIsLoading(false);
        setLoadingAction(null);
    }
  };

  const performGenerationAction = useCallback(async (action: 'extract' | 'flatten') => {
    setIsLoading(true);
    setError('');

    try {
      if (action === 'extract') {
        setLoadingAction('Extracting Schema...');
        const result = await extractSchema(jsonInput);
        setExtractedSchema(result);
        setActiveTab('extracted');

        const newSchema: SchemaDefinition = {
            key: SchemaType.CUSTOM_EXTRACTED,
            name: 'Custom - Extracted',
            description: 'Validate against the schema extracted from your payload.',
        };
        setAvailableSchemas(prev => [
            ...prev.filter(s => s.key !== SchemaType.CUSTOM_EXTRACTED),
            newSchema
        ]);

      } else { // flatten action
        setLoadingAction('Flattening Schema...');
        const flatResult = await flattenSchema(jsonInput);
        setFlattenedSchema(flatResult);
        
        setLoadingAction('Generating Iceberg Schema...');
        const icebergResult = await generateIcebergSchema(flatResult);
        setIcebergSchema(icebergResult);
        
        setActiveTab('flattened'); // Default to showing flattened schema first

        const newSchema: SchemaDefinition = {
            key: SchemaType.CUSTOM_FLATTENED,
            name: 'Custom - Flattened',
            description: 'Validate against the flattened schema from your payload.',
        };
         setAvailableSchemas(prev => [
            ...prev.filter(s => s.key !== SchemaType.CUSTOM_FLATTENED),
            newSchema
        ]);
      }
      setCurrentStep(6); // Move to Generation Results view on success
    } catch (err) {
      setError((err as Error).message || 'An unknown error occurred.');
      setCurrentStep(5); // Stay on the actions page to show the error
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }, [jsonInput]);

  const handleDownloadSchema = useCallback(() => {
    const isExtracted = selectedSchema === SchemaType.CUSTOM_EXTRACTED;
    const schemaString = isExtracted ? extractedSchema : flattenedSchema;
    if (!schemaString) return;

    const filename = isExtracted ? 'extracted-schema.json' : 'flattened-schema.json';
    const blob = new Blob([schemaString], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [selectedSchema, extractedSchema, flattenedSchema]);

   const handleDownloadIcebergSchema = useCallback(() => {
    if (!icebergSchema) return;
    try {
        const formatted = JSON.stringify(JSON.parse(icebergSchema), null, 2);
        const filename = 'iceberg-schema.json';
        const blob = new Blob([formatted], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch(e) {
        console.error("Failed to parse or download Iceberg schema", e);
    }
  }, [icebergSchema]);

  const isNextDisabled = currentStep === 0 && !jsonInput.trim();

  const getGeneratedSchemaContent = (schemaContent: string) => {
    if (!schemaContent) {
        return <p className="text-brand-subtle">No schema generated yet.</p>;
    }
    try {
        const formatted = JSON.stringify(JSON.parse(schemaContent), null, 2);
        return <pre className="text-sm text-brand-text whitespace-pre-wrap"><code>{formatted}</code></pre>;
    } catch {
        return <pre className="text-sm text-brand-danger whitespace-pre-wrap"><code>Failed to parse schema. Raw output:\n{schemaContent}</code></pre>;
    }
  };

  return (
    <div className="h-screen font-sans flex flex-col overflow-hidden">
      <Header />
      <Breadcrumbs steps={BREADCRUMB_STEPS} currentStep={currentStep} onNavigate={setCurrentStep} />
      <main className="flex-grow p-4 sm:p-6 lg:p-8 flex items-center justify-center overflow-hidden">
        <div className="w-full max-w-7xl h-full mx-auto flex items-center justify-center gap-4">
          {currentStep > 0 && (
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
              <button
                onClick={handleBack}
                className="p-3 rounded-full text-brand-subtle hover:bg-brand-secondary hover:text-brand-text transition-all"
                aria-label="Previous Step"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
            </div>
          )}


          <div className="flex-grow w-full h-full overflow-hidden">
            <div
              className="flex h-full transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${currentStep * 100}%)` }}
            >
              {/* Card 0: Input */}
              <div className="w-full h-full flex-shrink-0 px-2">
                <div className="bg-brand-secondary rounded-lg border border-brand-border h-full flex flex-col p-6">
                    <JsonInput value={jsonInput} onChange={setJsonInput} />
                </div>
              </div>

              {/* Card 1: Validate */}
              <div className="w-full h-full flex-shrink-0 px-2">
                <div className="bg-brand-secondary rounded-lg border border-brand-border h-full flex flex-col items-center justify-center p-6 gap-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-center">Validate Payload</h2>
                    <p className="text-brand-subtle text-center max-w-md">
                        Select a reference schema to check your JSON for compliance. Clicking 'Inspect' will show a report on the next page.
                    </p>
                    <div className="w-full max-w-sm flex flex-col gap-4">
                       <SchemaSelector selectedSchema={selectedSchema} onSchemaChange={setSelectedSchema} schemas={availableSchemas} />
                       <button onClick={handleInspect} disabled={isLoading || !jsonInput} className="px-6 py-3 font-semibold rounded-md text-white bg-gradient-to-r from-brand-accent to-brand-accent-secondary hover:shadow-[0_0_20px_theme(colors.brand.accent/50%)] transition-shadow disabled:bg-brand-subtle disabled:from-brand-subtle disabled:to-brand-subtle/70 disabled:shadow-none disabled:cursor-wait">
                            {loadingAction === 'Inspecting JSON...' ? <Spinner/> : 'Inspect JSON'}
                        </button>
                    </div>
                </div>
              </div>

              {/* Card 2: Validation Report */}
              <div className="w-full h-full flex-shrink-0 px-2">
                 <div className="bg-brand-secondary rounded-lg border border-brand-border h-full flex flex-col overflow-y-auto">
                    <ReportDisplay 
                      report={report} 
                      isLoading={loadingAction === 'Inspecting JSON...'} 
                      showDownloadButton={report?.success && (selectedSchema === SchemaType.CUSTOM_EXTRACTED || selectedSchema === SchemaType.CUSTOM_FLATTENED)}
                      onDownload={handleDownloadSchema}
                    />
                 </div>
              </div>

              {/* Card 3: Compliance Check */}
              <div className="w-full h-full flex-shrink-0 px-2">
                <div className="bg-brand-secondary rounded-lg border border-brand-border h-full flex flex-col items-center justify-center p-6 gap-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-center">PII Compliance Check</h2>
                    <p className="text-brand-subtle text-center max-w-md">
                        Inspect the JSON payload for Personally Identifiable Information (PII) and receive a detailed compliance report.
                    </p>
                    <div className="w-full max-w-sm flex flex-col gap-4">
                        <button onClick={handleComplianceCheck} disabled={isLoading || !jsonInput} className="px-6 py-3 font-semibold rounded-md text-white bg-gradient-to-r from-brand-accent to-brand-accent-secondary hover:shadow-[0_0_20px_theme(colors.brand.accent/50%)] transition-shadow disabled:bg-brand-subtle disabled:from-brand-subtle disabled:to-brand-subtle/70 disabled:shadow-none disabled:cursor-wait">
                            {loadingAction?.startsWith('Performing') ? <Spinner/> : 'Perform Compliance Check'}
                        </button>
                    </div>
                    {error && currentStep === 3 && <p className="text-brand-danger mt-4 text-center">{error}</p>}
                </div>
              </div>

              {/* Card 4: Compliance Insights */}
              <div className="w-full h-full flex-shrink-0 px-2">
                <div className="bg-brand-secondary rounded-lg border border-brand-border h-full flex flex-col overflow-y-auto">
                    {isLoading && loadingAction?.startsWith('Performing') ? (
                        <div className="h-full flex flex-col items-center justify-center p-4">
                            <Spinner />
                            <p className="mt-4 text-brand-subtle">Analyzing for PII...</p>
                        </div>
                    ) : complianceReport ? (
                        <MarkdownReport content={complianceReport} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                            <InformationCircleIcon className="h-12 w-12 text-brand-subtle" />
                            <h2 className="mt-4 text-lg font-semibold text-brand-text">Compliance Insights</h2>
                            <p className="mt-1 text-sm text-brand-subtle">The PII compliance report will appear here.</p>
                        </div>
                    )}
                </div>
              </div>

              {/* Card 5: Generate */}
              <div className="w-full h-full flex-shrink-0 px-2">
                <div className="bg-brand-secondary rounded-lg border border-brand-border h-full flex flex-col items-center justify-center p-6 gap-6 overflow-y-auto">
                    <h2 className="text-2xl font-bold text-center">Generate Schema</h2>
                    <p className="text-brand-subtle text-center max-w-md">
                        Use AI to generate a schema from your JSON payload. The results will appear on the next page.
                    </p>
                    <div className="w-full max-w-sm flex flex-col gap-4">
                        <button onClick={() => performGenerationAction('extract')} disabled={isLoading || !jsonInput} className="px-6 py-3 font-semibold rounded-md text-white bg-brand-accent hover:opacity-90 transition-opacity disabled:bg-brand-subtle disabled:cursor-wait">
                            {loadingAction?.startsWith('Extract') ? <Spinner/> : 'Extract Schema'}
                        </button>
                        <button onClick={() => performGenerationAction('flatten')} disabled={isLoading || !jsonInput} className="px-6 py-3 font-semibold rounded-md text-white bg-brand-accent-secondary hover:opacity-90 transition-opacity disabled:bg-brand-subtle disabled:cursor-wait">
                            {loadingAction?.startsWith('Flatten') || loadingAction?.startsWith('Generating') ? <Spinner/> : 'Flatten & Clean Schema'}
                        </button>
                    </div>
                     {error && currentStep === 5 && <p className="text-brand-danger mt-4 text-center">{error}</p>}
                </div>
              </div>

              {/* Card 6: Generation Results */}
              <div className="w-full h-full flex-shrink-0 px-2">
                 <div className="bg-brand-secondary rounded-lg border border-brand-border h-full flex flex-col">
                    {!isLoading && !extractedSchema && !flattenedSchema ? (
                         <div className="h-full flex flex-col items-center justify-center p-4 text-center">
                            <h2 className="text-lg font-semibold text-brand-text">Schema Generation Results</h2>
                            <p className="mt-1 text-sm text-brand-subtle">Generated schemas will appear here.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-grow overflow-hidden">
                             <div className="flex border-b border-brand-border">
                                <button onClick={() => setActiveTab('extracted')} className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'extracted' ? 'text-brand-text bg-brand-primary border-b-2 border-brand-orange' : 'text-brand-subtle hover:bg-brand-primary'}`}>
                                    Extracted Schema
                                </button>
                                <button onClick={() => setActiveTab('flattened')} className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'flattened' ? 'text-brand-text bg-brand-primary border-b-2 border-brand-orange' : 'text-brand-subtle hover:bg-brand-primary'}`}>
                                    Flattened & Cleaned Schema
                                </button>
                                <button onClick={() => setActiveTab('iceberg')} className={`px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'iceberg' ? 'text-brand-text bg-brand-primary border-b-2 border-brand-orange' : 'text-brand-subtle hover:bg-brand-primary'}`}>
                                    Iceberg Schema
                                </button>
                            </div>
                            <div className="p-6 flex-grow overflow-auto">
                                {isLoading && loadingAction && loadingAction !== 'Inspecting JSON...' && <div className="flex justify-center items-center h-full"><Spinner /> <span className="ml-2">{loadingAction}</span></div>}
                                {!isLoading && activeTab === 'extracted' && getGeneratedSchemaContent(extractedSchema)}
                                {!isLoading && activeTab === 'flattened' && getGeneratedSchemaContent(flattenedSchema)}
                                {!isLoading && activeTab === 'iceberg' && (
                                    icebergSchema ? (
                                        <div className="space-y-4">
                                            <button
                                                onClick={handleDownloadIcebergSchema}
                                                className="flex items-center space-x-2 px-3 py-1 text-xs font-medium text-brand-subtle border border-brand-border rounded-md hover:text-brand-text hover:border-brand-subtle transition-colors duration-200"
                                                aria-label="Download Iceberg Schema"
                                            >
                                                <DownloadIcon className="h-4 w-4" />
                                                <span>Download Schema</span>
                                            </button>
                                            {getGeneratedSchemaContent(icebergSchema)}
                                        </div>
                                    ) : (
                                        <div className="flex justify-center items-center h-full text-center">
                                            <p className="text-brand-subtle">No Iceberg schema generated. <br/> Please use the 'Flatten & Clean' action on the previous page first.</p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                    )}
                 </div>
              </div>

            </div>
          </div>
          
          {currentStep < BREADCRUMB_STEPS.length - 1 && (
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center">
              <button
                onClick={handleNext}
                disabled={isNextDisabled}
                className="p-3 rounded-full text-brand-subtle hover:bg-brand-secondary hover:text-brand-text disabled:cursor-not-allowed transition-all"
                aria-label="Next Step"
              >
                <ArrowRightIcon className="h-6 w-6" />
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;