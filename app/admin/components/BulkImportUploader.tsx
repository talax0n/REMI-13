'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AdminParticipant, ImportStatus, ImportValidation } from '../types';
import { toast } from 'sonner';

interface BulkImportUploaderProps {
  existingParticipants: AdminParticipant[];
  onImport: (participants: Omit<AdminParticipant, 'id'>[]) => Promise<void>;
}

interface CSVRow {
  name: string;
  team: string;
}

export default function BulkImportUploader({ existingParticipants, onImport }: BulkImportUploaderProps) {
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [previewData, setPreviewData] = useState<CSVRow[]>([]);
  const [validation, setValidation] = useState<ImportValidation>({
    valid: true,
    errors: [],
    duplicates: [],
    missingFields: [],
  });
  const [fileName, setFileName] = useState<string>('');

  const parseCSV = (content: string): CSVRow[] => {
    const lines = content.trim().split('\n');
    const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
    const nameIndex = headers.indexOf('name');
    const teamIndex = headers.indexOf('team');
    const legacyChurchIndex = headers.indexOf('church');
    const groupingIndex = teamIndex !== -1 ? teamIndex : legacyChurchIndex;

    if (nameIndex === -1 || groupingIndex === -1) {
      throw new Error('CSV must have "name" and "team" columns');
    }

    return lines.slice(1).map((line) => {
      const values = line.split(',').map(v => v.trim());
      return {
        name: values[nameIndex] || '',
        team: values[groupingIndex] || '',
      };
    }).filter(row => row.name || row.team);
  };

  const validateData = (data: CSVRow[]): ImportValidation => {
    const errors: string[] = [];
    const duplicates: string[] = [];
    const missingFields: string[] = [];
    const existingNames = new Set(existingParticipants.map(p => p.name.toLowerCase()));

    data.forEach((row, index) => {
      const rowNum = index + 2;
      
      if (!row.name) {
        missingFields.push(`Row ${rowNum}: Missing name`);
      }
      if (!row.team) {
        missingFields.push(`Row ${rowNum}: Missing team`);
      }
      
      if (row.name && existingNames.has(row.name.toLowerCase())) {
        duplicates.push(row.name);
      }
    });

    return {
      valid: errors.length === 0 && missingFields.length === 0,
      errors,
      duplicates,
      missingFields,
    };
  };

  async function processFile(file: File) {
    if (!file.name.endsWith('.csv')) {
      toast.error('Invalid file type', { description: 'Please upload a CSV file' });
      return;
    }

    setStatus('validating');
    setFileName(file.name);

    try {
      const content = await file.text();
      const data = parseCSV(content);
      const validationResult = validateData(data);
      
      setPreviewData(data.slice(0, 10)); // Preview first 10
      setValidation(validationResult);
      setStatus('preview');

      if (!validationResult.valid) {
        toast.warning('Validation issues found', {
          description: `${validationResult.missingFields.length} rows have missing fields`,
        });
      }
    } catch (error) {
      toast.error('Failed to parse CSV', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setStatus('error');
    }
  }

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    setStatus('importing');
    
    try {
      const participants = previewData.map(row => ({
        name: row.name,
        team: row.team,
        score: 0,
        matchesPlayed: 0,
        status: 'active' as const,
      }));

      await onImport(participants);
      
      toast.success('Import successful', {
        description: `Successfully imported ${participants.length} participants`,
      });
      
      setStatus('success');
      setPreviewData([]);
      setFileName('');
    } catch (error) {
      toast.error('Import failed');
      setStatus('error');
    }
  };

  const resetUpload = () => {
    setStatus('idle');
    setPreviewData([]);
    setValidation({ valid: true, errors: [], duplicates: [], missingFields: [] });
    setFileName('');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Card className="bg-zinc-900/50 border-white/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-white">
            <FileSpreadsheet className="w-5 h-5 text-purple-500" />
            Bulk Import
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AnimatePresence mode="wait">
            {status === 'idle' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div
                  onDrop={handleFileDrop}
                  onDragOver={(e) => e.preventDefault()}
                  className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-white/40 transition-colors cursor-pointer bg-zinc-800/30"
                >
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="csv-upload"
                  />
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <Upload className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-white mb-2">
                      Drop CSV file here or click to upload
                    </p>
                    <p className="text-sm text-zinc-500">
                      Required columns: name, team
                    </p>
                  </label>
                </div>
              </motion.div>
            )}

            {(status === 'preview' || status === 'importing') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                {/* File Info */}
                <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-purple-500" />
                    <span className="text-white font-medium">{fileName}</span>
                    <Badge variant="secondary" className="bg-zinc-700">
                      {previewData.length} rows
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={resetUpload}
                    className="text-zinc-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Validation Alerts */}
                {validation.duplicates.length > 0 && (
                  <Alert className="bg-yellow-500/10 border-yellow-500/30 text-yellow-400">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      {validation.duplicates.length} duplicate names found
                    </AlertDescription>
                  </Alert>
                )}

                {validation.missingFields.length > 0 && (
                  <Alert className="bg-red-500/10 border-red-500/30 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      {validation.missingFields.length} rows have missing fields
                    </AlertDescription>
                  </Alert>
                )}

                {/* Preview Table */}
                <div className="border border-white/10 rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-zinc-800">
                      <TableRow className="border-white/10">
                        <TableHead className="text-zinc-300">Name</TableHead>
                        <TableHead className="text-zinc-300">Team</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.map((row, index) => (
                        <TableRow key={index} className="border-white/5">
                          <TableCell className="text-white">{row.name}</TableCell>
                          <TableCell className="text-zinc-400">{row.team}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <Separator className="bg-white/10" />

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={resetUpload}
                    className="flex-1 border-white/20 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={status === 'importing' || !validation.valid}
                    className="flex-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
                  >
                    {status === 'importing' ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Import Participants
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {status === 'validating' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12"
              >
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                <p className="text-white font-medium">Validating CSV...</p>
              </motion.div>
            )}

            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center py-8"
              >
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mb-4" />
                <p className="text-xl font-bold text-white mb-2">Import Successful!</p>
                <p className="text-zinc-400 mb-6">Participants have been added to the tournament</p>
                <Button
                  onClick={resetUpload}
                  variant="outline"
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Import More
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
