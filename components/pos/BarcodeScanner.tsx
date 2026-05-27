"use client";
import { useEffect, useRef, useState } from "react";
import { X, ZapOff, ScanLine } from "lucide-react";

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef    = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const detectedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    detectedRef.current = false;

    async function start() {
      try {
        const { BrowserMultiFormatReader, BrowserCodeReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();

        if (!videoRef.current) return;

        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: "environment" },
              width:  { ideal: 1280 },
              height: { ideal: 720 },
            },
          },
          videoRef.current,
          (result, err, ctrl) => {
            if (result && !detectedRef.current) {
              detectedRef.current = true;
              ctrl.stop();
              onDetected(result.getText());
            }
          }
        );

        controlsRef.current = controls;
        setReady(true);
      } catch (e: unknown) {
        const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
        if (msg.includes("permission") || msg.includes("denied") || msg.includes("notallowed")) {
          setError("Debes permitir el acceso a la cámara en el navegador");
        } else if (msg.includes("notfound") || msg.includes("devicenotfound")) {
          setError("No se encontró ninguna cámara en este dispositivo");
        } else {
          setError("No se pudo iniciar la cámara");
          console.error(e);
        }
      }
    }

    start();

    return () => {
      controlsRef.current?.stop();
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full max-w-sm mx-4">
        {/* Close button */}
        <button
          onClick={() => { controlsRef.current?.stop(); onClose(); }}
          className="absolute top-3 right-3 z-20 bg-white/20 text-white rounded-full p-2 hover:bg-white/40 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {error ? (
          <div className="flex flex-col items-center gap-4 p-8 text-white text-center">
            <ZapOff className="h-14 w-14 text-red-400" />
            <p className="text-lg font-semibold">Error de cámara</p>
            <p className="text-sm text-white/70 leading-relaxed">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 px-6 py-2 bg-white/20 text-white rounded-xl hover:bg-white/30 text-sm font-medium"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <>
            <div className="relative rounded-2xl overflow-hidden bg-black">
              <video
                ref={videoRef}
                className="w-full aspect-[4/3] object-cover"
                playsInline
                muted
                autoPlay
              />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-60 h-44">
                  {/* Corner brackets */}
                  <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                  <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                  <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                  <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
                  {/* Scan line */}
                  {ready && (
                    <span className="absolute left-2 right-2 top-1/2 h-0.5 bg-brand-400 opacity-80 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Dim outside scan area */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 15rem 11rem at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 100%)"
                }}
              />
            </div>

            <p className="text-white/70 text-sm text-center mt-4">
              {ready ? "Apunta al código de barras" : "Iniciando cámara..."}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
