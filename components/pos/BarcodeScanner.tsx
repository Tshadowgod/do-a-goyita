"use client";
import { useEffect, useRef, useState } from "react";
import { X, ZapOff } from "lucide-react";

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const detectedRef = useRef(false);
  const stopRef     = useRef<(() => void) | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const controls = await reader.decodeFromVideoElement(videoRef.current, (result, err) => {
          if (result && !detectedRef.current) {
            detectedRef.current = true;
            onDetected(result.getText());
          }
          if (err && (err as Error).name !== "NotFoundException") {
            console.warn(err);
          }
        });

        stopRef.current = () => controls.stop();
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg.toLowerCase().includes("permission") ? "Permite el acceso a la cámara" : "Cámara no disponible");
      }
    }

    start();

    return () => {
      stopRef.current?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full max-w-sm">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 bg-white/20 text-white rounded-full p-2 hover:bg-white/30"
        >
          <X className="h-5 w-5" />
        </button>

        {error ? (
          <div className="flex flex-col items-center gap-3 p-8 text-white text-center">
            <ZapOff className="h-12 w-12 text-red-400" />
            <p className="text-lg font-medium">Error de cámara</p>
            <p className="text-sm text-white/70">{error}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full rounded-2xl" playsInline muted />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-36 border-2 border-brand-400 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
            </div>
          </>
        )}

        <p className="text-white/70 text-sm text-center mt-4">Apunta la cámara al código de barras</p>
      </div>
    </div>
  );
}
