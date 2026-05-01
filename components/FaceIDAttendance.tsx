'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/components/LanguageProvider';

export default function FaceIDAttendance() {
  const { t } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [recognizedStudent, setRecognizedStudent] = useState<any>(null);
  const [status, setStatus] = useState<'idle' | 'scanning' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [labeledDescriptors, setLabeledDescriptors] = useState<faceapi.LabeledFaceDescriptors[]>([]);
  const [lessonNumber, setLessonNumber] = useState('1');
  const [mode, setMode] = useState<'attendance' | 'registration'>('attendance');
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Liveness detection states
  const [blinkCount, setBlinkCount] = useState(0);
  const [lastEyeOpenStatus, setLastEyeOpenStatus] = useState(true);
  const [isLivenessPassed, setIsLivenessPassed] = useState(false);

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log('Models loaded successfully');
      } catch (error) {
        console.error('Error loading models:', error);
        setMessage('Modellarni yuklashda xatolik yuz berdi');
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await fetch('/api/students');
        const data = await res.json();
        if (Array.isArray(data)) {
          const validStudents = data.filter((s: any) => s.faceDescriptor && s.faceDescriptor.length > 0);
          setStudents(validStudents);
          
          const descriptors = validStudents.map((s: any) => {
            return new faceapi.LabeledFaceDescriptors(
              s._id,
              [new Float32Array(s.faceDescriptor)]
            );
          });
          setLabeledDescriptors(descriptors);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };
    fetchStudents();
  }, []);

  const startVideo = useCallback(async () => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCapturing(true);
          setStatus('scanning');
        }
      } catch (err) {
        console.error('Error accessing webcam:', err);
        setMessage('Kameraga ruxsat berilmadi');
      }
    }
  }, []);

  const stopVideo = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCapturing(false);
      setStatus('idle');
    }
  }, []);

  const handleAttendance = useCallback(async (studentId: string) => {
    try {
      const payload = [{
        studentId,
        status: 'present',
        date: new Date().toISOString().split('T')[0],
        lessonNumber: Number(lessonNumber) || 1,
        checkInTime: new Date().toLocaleTimeString('uz-UZ', {
          hour: '2-digit',
          minute: '2-digit',
        }),
      }];

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (res.ok) {
        return true;
      }
    } catch (error) {
      console.error('Error updating attendance:', error);
    }
    return false;
  }, [lessonNumber]);

  const handleRegisterFace = useCallback(async (descriptor: Float32Array) => {
    if (!selectedStudentId) return;
    
    try {
      const res = await fetch(`/api/students/${selectedStudentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          faceDescriptor: Array.from(descriptor)
        }),
      });

      if (res.ok) {
        setMessage('Yuz muvaffaqiyatli ro\'yxatdan o\'tkazildi!');
        // Refresh students list
        const updatedRes = await fetch('/api/students');
        const updatedData = await updatedRes.json();
        if (Array.isArray(updatedData)) {
          setStudents(updatedData.filter((s: any) => s.faceDescriptor && s.faceDescriptor.length > 0));
        }
        setMode('attendance');
        return true;
      }
    } catch (error) {
      console.error('Error registering face:', error);
    }
    return false;
  }, [selectedStudentId]);

  useEffect(() => {
    let interval: any;
    if (isCapturing && modelsLoaded) {
      const faceMatcher = labeledDescriptors.length > 0 ? new faceapi.FaceMatcher(labeledDescriptors, 0.4) : null;
      
      interval = setInterval(async () => {
        if (!videoRef.current || !canvasRef.current) return;

        const detections = await faceapi.detectAllFaces(
          videoRef.current,
          new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
        ).withFaceLandmarks().withFaceDescriptors().withFaceExpressions();

        const displaySize = { width: videoRef.current.width, height: videoRef.current.height };
        faceapi.matchDimensions(canvasRef.current, displaySize);
        
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const context = canvasRef.current.getContext('2d');
        context?.clearRect(0, 0, displaySize.width, displaySize.height);

        resizedDetections.forEach(async (detection) => {
          const { descriptor, landmarks } = detection;
          
          let student = null;
          let bestMatch = null;
          
          if (faceMatcher && mode === 'attendance') {
            bestMatch = faceMatcher.findBestMatch(descriptor);
            student = students.find(s => s._id === bestMatch.label);
          }

          // Liveness Detection: Blink detection
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          
          const getEyeAspectRatio = (eye: any) => {
            const dist = (p1: any, p2: any) => Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
            const v1 = dist(eye[1], eye[5]);
            const v2 = dist(eye[2], eye[4]);
            const h = dist(eye[0], eye[3]);
            return (v1 + v2) / (2.0 * h);
          };

          const ear = (getEyeAspectRatio(leftEye) + getEyeAspectRatio(rightEye)) / 2;
          const isClosed = ear < 0.22;

          if (lastEyeOpenStatus && isClosed) {
            setBlinkCount(prev => prev + 1);
          }
          setLastEyeOpenStatus(!isClosed);

          if (blinkCount >= 1) {
            setIsLivenessPassed(true);
          }

          const box = detection.detection.box;
          let label = 'Noma\'lum';
          let color = 'red';

          if (mode === 'registration') {
            label = 'Yuz aniqlandi - Ro\'yxatga olish';
            color = 'blue';
          } else if (student && bestMatch && bestMatch.distance < 0.4) {
            label = `${student.name} (${Math.round((1 - bestMatch.distance) * 100)}%)`;
            color = 'green';
          }

          const drawBox = new faceapi.draw.DrawBox(box, { label, boxColor: color });
          drawBox.draw(canvasRef.current!);

          if (mode === 'registration' && isLivenessPassed && status !== 'success') {
            setStatus('success');
            await handleRegisterFace(descriptor);
            setTimeout(() => {
              setStatus('scanning');
              setBlinkCount(0);
              setIsLivenessPassed(false);
            }, 3000);
          } else if (mode === 'attendance' && student && bestMatch && bestMatch.distance < 0.4 && isLivenessPassed) {
            if (status !== 'success') {
              setStatus('success');
              setRecognizedStudent(student);
              const success = await handleAttendance(student._id);
              if (success) {
                setMessage(`${student.name} tanildi va davomatga belgilandi!`);
                setTimeout(() => {
                  setStatus('scanning');
                  setRecognizedStudent(null);
                  setMessage('');
                  setBlinkCount(0);
                  setIsLivenessPassed(false);
                }, 3000);
              }
            }
          }
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isCapturing, modelsLoaded, labeledDescriptors, students, status, blinkCount, lastEyeOpenStatus, isLivenessPassed, mode, selectedStudentId, handleRegisterFace, handleAttendance]);

  return (
    <DashboardLayout title="Face ID Davomat" subtitle="Yuzni aniqlash orqali davomatni avtomatlashtirish">
      <div className="flex flex-col items-center justify-center space-y-6 p-4">
        <div className="relative w-full max-w-2xl bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-hope-primary/20">
          <video
            ref={videoRef}
            autoPlay
            muted
            width="640"
            height="480"
            className="w-full h-auto"
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full"
          />
          
          {!isCapturing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <button
                onClick={startVideo}
                disabled={!modelsLoaded}
                className="px-8 py-4 bg-hope-primary text-white rounded-full font-bold text-lg hover:bg-hope-primary/90 transition-all shadow-lg disabled:opacity-50"
              >
                {modelsLoaded ? 'Kamerani yoqish' : 'Modellar yuklanmoqda...'}
              </button>
            </div>
          )}

          {status === 'success' && recognizedStudent && (
            <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-bounce">
              {recognizedStudent.name} tanildi!
            </div>
          )}

          {isCapturing && !isLivenessPassed && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-blue-500/80 text-white px-4 py-2 rounded-full text-sm">
              Iltimos, ko&apos;zingizni qising (Anti-Spoofing)
            </div>
          )}
        </div>

        <div className="w-full max-w-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-4">Sozlamalar</h3>
            <div className="flex flex-col space-y-4">
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                <button
                  onClick={() => setMode('attendance')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'attendance' ? 'bg-white dark:bg-gray-600 shadow text-hope-primary' : 'text-gray-500'}`}
                >
                  Davomat
                </button>
                <button
                  onClick={() => setMode('registration')}
                  className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'registration' ? 'bg-white dark:bg-gray-600 shadow text-hope-primary' : 'text-gray-500'}`}
                >
                  Yuzni ro&apos;yxatga olish
                </button>
              </div>

              {mode === 'attendance' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Dars raqami
                  </label>
                  <select
                    value={lessonNumber}
                    onChange={(e) => setLessonNumber(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <option key={n} value={n}>
                        {n}-dars
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Talabani tanlang
                  </label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent"
                  >
                    <option value="">Tanlang...</option>
                    {students.map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs text-gray-500">
                    Talabani tanlang va kameraga qarab ko&apos;zingizni qising.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-2">Tizim holati</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Modellar:</span>
                <span className={modelsLoaded ? 'text-green-500' : 'text-red-500'}>
                  {modelsLoaded ? 'Yuklangan' : 'Yuklanmoqda...'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Talabalar bazasi:</span>
                <span className="text-hope-primary font-bold">{students.length} ta yuz saqlangan</span>
              </div>
              <div className="flex justify-between">
                <span>Liveness Test:</span>
                <span className={isLivenessPassed ? 'text-green-500' : 'text-yellow-500'}>
                  {isLivenessPassed ? 'O&apos;tdi' : 'Kutilmoqda...'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold mb-2">Xabarlar</h3>
            <p className={`text-sm ${status === 'success' ? 'text-green-500 font-bold' : 'text-gray-500'}`}>
              {message || 'Kamera orqali talabani ko&apos;rsating'}
            </p>
            {isCapturing && (
              <button
                onClick={stopVideo}
                className="mt-4 text-red-500 text-sm hover:underline"
              >
                Kamerani o&apos;chirish
              </button>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
