"use client";
import { useEffect, useRef, useState } from "react";
import { X, ZapOff } from "lucide-react";

interface Props {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const detectedRef   = useRef(false);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    detectedRef.current = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width:  { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        streamRef.current = stream;

        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setReady(true);

        // Use native BarcodeDetector (Chrome Android) when available
        if ("BarcodeDetector" in window) {
          const detector = new (window as any).BarcodeDetector({
            formats: [
              "ean_13", "ean_8", "upc_a", "upc_e",
              "code_128", "code_39", "code_93",
              "qr_code", "itf", "codabar",
            ],
          });

          const scan = async () => {
            if (detectedRef.current) return;
            try {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && !detectedRef.current) {
                  detectedRef.current = true;
                  stopStream();
                  onDetectedRef.current(barcodes[0].rawValue);
                  return;
                }
              }
            } catch { /* frame not ready */ }
            if (!detectedRef.current) requestAnimationFrame(scan);
          };

          requestAnimationFrame(scan);

        } else {
          // Fallback: ZXing
          const { BrowserMultiFormatReader } = await import("@zxing/browser");
          const reader = new BrowserMultiFormatReader();
          const controls = await reader.decodeFromConstraints(
            { video: { facingMode: { ideal: "environment" } } },
            videoRef.current!,
            (result) => {
              if (result && !detectedRef.current) {
                detectedRef.current = true;
                controls?.stop();
                stopStream();
                onDetectedRef.current(result.getText());
              }
            }
          );
        }

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

    function stopStream() {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    }

    start();

    return () => {
      detectedRef.current = true; // stop scan loop
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleClose() {
    detectedRef.current = true;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <div className="relative w-full max-w-sm mx-4">
        <button
          onClick={handleClose}
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
              onClick={handleClose}
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
              />

              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="relative w-60 h-44">
                  <span className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                  <span className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                  <span className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                  <span className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />
                  {ready && (
                    <span className="absolute left-2 right-2 top-1/2 h-0.5 bg-brand-400 opacity-80 animate-pulse" />
                  )}
                </div>
              </div>

              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: "radial-gradient(ellipse 15rem 11rem at 50% 50%, transparent 0%, rgba(0,0,0,0.55) 100%)",
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
