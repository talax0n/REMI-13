'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download, Share2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table } from '../../components/types';

interface PlayerQRCodeProps {
  isOpen: boolean;
  onClose: () => void;
  tables?: Table[];
}

function createQrUrl(url: string, size = 400) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}`;
}

export default function PlayerQRCode({ isOpen, onClose, tables = [] }: PlayerQRCodeProps) {
  const [copied, setCopied] = useState(false);
  const [copiedTable, setCopiedTable] = useState<number | null>(null);
  const playerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/player`
    : '/player';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const getTableScoreUrl = (tableNumber: number) => `${origin}/admin?tab=scoring&table=${tableNumber}`;
  const qrDataUrl = isOpen ? createQrUrl(playerUrl) : '';

  const handleDownload = async (url = qrDataUrl, filename = 'remi13-player-qr.png') => {
    if (!url) return;

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(playerUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  const handleCopyTableLink = async (tableNumber: number) => {
    try {
      await navigator.clipboard.writeText(getTableScoreUrl(tableNumber));
      setCopiedTable(tableNumber);
      setTimeout(() => setCopiedTable(null), 2000);
    } catch (error) {
      console.error('Failed to copy table score link:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white w-[calc(100vw-2rem)] max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 overflow-x-hidden">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            QR Codes
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <section className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
            <div className="bg-white rounded-xl p-4 sm:p-6 flex items-center justify-center">
              {qrDataUrl ? (
                <motion.img
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  src={qrDataUrl}
                  alt="QR Code for Player Portal"
                  className="w-48 h-48 sm:w-56 sm:h-56"
                />
              ) : (
                <div className="w-48 h-48 sm:w-56 sm:h-56 bg-zinc-100 rounded-lg flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
                </div>
              )}
            </div>

            <div className="space-y-4 min-w-0">
              <div className="space-y-2">
                <h3 className="font-semibold text-white">Player Score Portal</h3>
                <p className="text-sm text-zinc-400">
                  Players scan this QR code to view their own scores.
                </p>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-2.5 sm:p-3 flex items-center gap-2 min-w-0">
                <code className="flex-1 min-w-0 text-xs sm:text-sm text-zinc-400 truncate">
                  {playerUrl}
                </code>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="text-zinc-400 hover:text-white h-8 w-8 p-0"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 min-w-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleDownload()}
                  disabled={!qrDataUrl}
                  className="flex-1 min-w-0 border-white/10 text-white hover:bg-white/10 h-10 sm:h-11"
                >
                  <Download className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">Download</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 min-w-0 bg-emerald-600 hover:bg-emerald-500 h-10 sm:h-11"
                >
                  <Share2 className="w-4 h-4 mr-2 shrink-0" />
                  <span className="truncate">{copied ? 'Copied!' : 'Copy Link'}</span>
                </Button>
              </div>
            </div>
          </section>

          <section className="border-t border-white/10 pt-4 sm:pt-5">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-white">Table score sheets</h3>
              <p className="text-xs text-zinc-500">
                Admin scans a table QR to open that table&apos;s score input page directly.
              </p>
            </div>

            {tables.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-zinc-800/40 px-4 py-6 text-center text-sm text-zinc-500">
                Generate tables first to create table score QR codes.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tables.map((table) => {
                  const tableUrl = getTableScoreUrl(table.number);
                  const tableQrUrl = createQrUrl(tableUrl, 220);

                  return (
                    <div key={table.id} className="rounded-xl border border-white/10 bg-zinc-800/40 p-3">
                      <div className="flex items-start gap-3">
                        <div className="bg-white rounded-lg p-2 shrink-0">
                          <img
                            src={tableQrUrl}
                            alt={`QR Code for Table ${table.number} score page`}
                            className="w-20 h-20"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-white">Table {table.number}</p>
                          <p className="text-xs text-zinc-500 mb-2">
                            {table.players.filter((player) => !player.isDummy).length} players
                          </p>
                          <code className="block truncate text-[10px] text-zinc-500 mb-2">{tableUrl}</code>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(tableQrUrl, `remi13-table-${table.number}-score-qr.png`)}
                              className="h-8 border-white/10 text-white hover:bg-white/10"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleCopyTableLink(table.number)}
                              className="h-8 bg-emerald-600 hover:bg-emerald-500"
                            >
                              {copiedTable === table.number ? 'Copied' : 'Copy'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
