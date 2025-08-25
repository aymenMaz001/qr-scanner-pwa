import React, { useState, useRef, useEffect } from 'react';
import { Camera, RotateCcw, Settings, Zap, ZapOff } from 'lucide-react';

const QRCodeScanner = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState('environment'); // 'user' pour avant, 'environment' pour arrière
  const [scannedData, setScannedData] = useState('');
  const [error, setError] = useState('');
  const [stream, setStream] = useState(null);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [devices, setDevices] = useState([]);

  // Fonction pour détecter les QR codes
  const detectQRCode = (imageData) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const ctx = canvas.getContext('2d');
    
    // Dessiner l'image sur le canvas
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    ctx.putImageData(imageData, 0, 0);
    
    // Analyser l'image pour détecter des patterns QR (simulation basique)
    // Dans une vraie application, vous utiliseriez une bibliothèque comme jsQR
    try {
      // Cette partie simule la détection de QR code
      // En réalité, vous utiliseriez jsQR ou une autre bibliothèque
      const imageDataArray = imageData.data;
      
      // Recherche de patterns sombres/clairs typiques des QR codes
      let darkPixels = 0;
      let lightPixels = 0;
      
      for (let i = 0; i < imageDataArray.length; i += 4) {
        const brightness = (imageDataArray[i] + imageDataArray[i + 1] + imageDataArray[i + 2]) / 3;
        if (brightness < 128) darkPixels++;
        else lightPixels++;
      }
      
      // Simulation d'une détection réussie (à remplacer par jsQR)
      const ratio = darkPixels / (darkPixels + lightPixels);
      if (ratio > 0.3 && ratio < 0.7 && Math.random() > 0.95) {
        return 'QR Code détecté - ' + new Date().toLocaleTimeString();
      }
    } catch (err) {
      console.error('Erreur lors de l\'analyse:', err);
    }
    
    return null;
  };

  // Fonction pour scanner en continu
  const scanFrame = () => {
    if (videoRef.current && canvasRef.current && isScanning) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrData = detectQRCode(imageData);
        
        if (qrData) {
          setScannedData(qrData);
          setIsScanning(false);
        }
      }
      
      if (isScanning) {
        requestAnimationFrame(scanFrame);
      }
    }
  };

  // Démarrer la caméra
  const startCamera = async () => {
    try {
      setError('');
      
      if (stream) {
        stream.getTracks().forEach(function(track) {
          track.stop();
        });
      }

      // Vérifier la compatibilité des APIs
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('API mediaDevices non supportée par ce navigateur');
      }

      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }
      
      setIsScanning(true);
    } catch (err) {
      setError('Erreur d\'accès à la caméra: ' + err.message);
      console.error('Erreur caméra:', err);
    }
  };

  // Arrêter la caméra
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(function(track) {
        track.stop();
      });
      setStream(null);
    }
    setIsScanning(false);
  };

  // Basculer entre caméras avant et arrière
  const switchCamera = () => {
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    if (isScanning) {
      stopCamera();
      setTimeout(function() {
        startCamera();
      }, 100);
    }
  };

  // Contrôler le flash (si supporté)
  const toggleFlash = async () => {
    if (stream) {
      const track = stream.getVideoTracks()[0];
      
      // Vérifier la compatibilité avant d'utiliser getCapabilities
      if (track && typeof track.getCapabilities === 'function') {
        try {
          const capabilities = track.getCapabilities();
          
          if (capabilities.torch) {
            await track.applyConstraints({
              advanced: [{ torch: !flashEnabled }]
            });
            setFlashEnabled(!flashEnabled);
          }
        } catch (err) {
          console.error('Erreur flash:', err);
        }
      }
    }
  };

  // Obtenir les périphériques disponibles
  useEffect(function() {
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices()
        .then(function(deviceList) {
          const videoDevices = deviceList.filter(function(device) {
            return device.kind === 'videoinput';
          });
          setDevices(videoDevices);
        })
        .catch(function(err) {
          console.error('Erreur énumération:', err);
        });
    }
  }, []);

  // Scanner en continu quand la vidéo est prête
  useEffect(function() {
    if (isScanning) {
      scanFrame();
    }
  }, [isScanning]);

  // Nettoyer les ressources
  useEffect(function() {
    return function() {
      if (stream) {
        stream.getTracks().forEach(function(track) {
          track.stop();
        });
      }
    };
  }, [stream]);

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 p-4 shadow-lg">
        <h1 className="text-white text-xl font-bold text-center flex items-center justify-center">
          <Camera className="mr-2" />
          Scanner QR Code
        </h1>
      </div>

      {/* Zone de scan */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        
        {/* Overlay de visée */}
        {isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="border-2 border-green-400 w-64 h-64 rounded-lg bg-transparent relative">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-lg"></div>
            </div>
          </div>
        )}

        {/* Canvas caché pour l'analyse */}
        <canvas ref={canvasRef} style={{display: 'none'}} />
      </div>

      {/* Contrôles */}
      <div className="bg-gray-800 p-4">
        <div className="flex justify-center space-x-4 mb-4">
          <button
            onClick={isScanning ? stopCamera : startCamera}
            className={'px-6 py-3 rounded-full font-semibold ' + (
              isScanning 
                ? 'bg-red-600 text-white' 
                : 'bg-green-600 text-white'
            )}
          >
            {isScanning ? 'Arrêter' : 'Démarrer'}
          </button>

          <button
            onClick={switchCamera}
            className="p-3 bg-gray-600 text-white rounded-full"
            title="Changer de caméra"
          >
            <RotateCcw size={24} />
          </button>

          <button
            onClick={toggleFlash}
            className={'p-3 rounded-full text-white ' + (
              flashEnabled ? 'bg-yellow-500' : 'bg-gray-600'
            )}
            title="Flash"
          >
            {flashEnabled ? <Zap size={24} /> : <ZapOff size={24} />}
          </button>
        </div>

        {/* Informations */}
        <div className="text-center text-sm text-gray-300 mb-2">
          Caméra: {facingMode === 'user' ? 'Avant' : 'Arrière'}
          {devices.length > 0 && (' (' + devices.length + ' disponible' + (devices.length > 1 ? 's' : '') + ')')}
        </div>
      </div>

      {/* Résultats */}
      {scannedData && (
        <div className="bg-green-800 p-4">
          <h2 className="text-white font-semibold mb-2">QR Code détecté:</h2>
          <p className="text-green-100 bg-green-900 p-2 rounded break-all">
            {scannedData}
          </p>
          <button
            onClick={function() { setScannedData(''); }}
            className="mt-2 px-4 py-2 bg-green-600 text-white rounded"
          >
            Effacer
          </button>
        </div>
      )}

      {/* Erreurs */}
      {error && (
        <div className="bg-red-800 p-4">
          <h2 className="text-white font-semibold mb-2">Erreur:</h2>
          <p className="text-red-100">{error}</p>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-700 p-4 text-center">
        <p className="text-gray-300 text-sm">
          Pointez la caméra vers un QR code pour le scanner automatiquement
        </p>
      </div>
    </div>
  );
};

export default QRCodeScanner;