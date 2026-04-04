'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, Download, X, Share2, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface PlayerQRCodeProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerQRCode({ isOpen, onClose }: PlayerQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const playerUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/player`
    : '/player';

  useEffect(() => {
    if (isOpen) {
      generateQRCode();
    }
  }, [isOpen]);

  const generateQRCode = async () => {
    try {
      // We'll generate a simple QR code using an API service
      // In production, you might want to use a library like qrcode
      const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(playerUrl)}`;
      setQrDataUrl(qrApiUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const handleDownload = async () => {
    if (!qrDataUrl) return;
    
    try {
      const response = await fetch(qrDataUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'remi13-player-qr.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-emerald-400" />
            Player Score Portal
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* QR Code Display */}
          <div className="bg-white rounded-2xl p-6 flex items-center justify-center">
            {qrDataUrl ? (
              <motion.img
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={qrDataUrl}
                alt="QR Code for Player Portal"
                className="w-64 h-64"
              />
            ) : (
              <div className="w-64 h-64 bg-zinc-100 rounded-xl flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-zinc-300">
              Players can scan this QR code to view their scores
            </p>
            <p className="text-sm text-zinc-500">
              Place this QR code at each table or share with participants
            </p>
          </div>

          {/* URL Display */}
          <div className="bg-zinc-800/50 rounded-lg p-3 flex items-center gap-2">
            <code className="flex-1 text-sm text-zinc-400 truncate">
              {playerUrl}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyLink}
              className="text-zinc-400 hover:text-white"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!qrDataUrl}
              className="flex-1 border-white/10 text-white hover:bg-white/10"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={handleCopyLink}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500"
            >
              <Share2 className="w-4 h-4 mr-2" />
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
