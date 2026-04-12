import { useState, useRef, useCallback, useEffect } from "react";
import { BarcodeDetector } from "barcode-detector";
import { useToast } from "@/hooks/use-toast";

export function useBarcodeScanner(onDetected: (target: string, value: string) => void) {
  const { toast } = useToast();
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  const stopScanning = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  useEffect(() => {
    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
    };
  }, []);

  const startScanning = useCallback(async (target: string) => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const detector = new BarcodeDetector({
        formats: ["qr_code", "code_128", "code_39", "ean_13", "ean_8", "data_matrix"] as any
      });

      scanIntervalRef.current = window.setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const barcodes = await detector.detect(videoRef.current);
          if (barcodes.length > 0) {
            const value = barcodes[0].rawValue;
            onDetected(target, value);
            toast({ title: "Gescand!", description: value });
            stopScanning();
          }
        } catch { /* frame failed, continue */ }
      }, 300);
    } catch {
      toast({ title: "Camera kon niet worden geopend", variant: "destructive" });
      stopScanning();
    }
  }, [onDetected, toast, stopScanning]);

  return { scanning, videoRef, startScanning, stopScanning };
}
