'use client'; 
import { useState, useEffect } from 'react'; 
 
export default function TelegramConnect() { 
  const [showCode, setShowCode] = useState(false); 
  const [code, setCode] = useState(''); 
  const [countdown, setCountdown] = useState(300); 
  const [connected, setConnected] = useState(false); 
  const [username, setUsername] = useState(''); 
  const [loading, setLoading] = useState(false); 
 
  const generateCode = async () => { 
    setLoading(true); 
    try {
      const res = await fetch( 
        '/api/telegram/generate-code',  
        { method: 'POST' }); 
      const data = await res.json(); 
      if (data.code) {
        setCode(data.code); 
        setShowCode(true); 
        setCountdown(300);
      }
    } catch (e) {
      console.error('Code generation failed', e);
    } finally {
      setLoading(false); 
    }
  }; 
 
  useEffect(() => {
    let interval: any;
    if (showCode && countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setShowCode(false);
      setCode('');
    }
    return () => clearInterval(interval);
  }, [showCode, countdown]);

  // Poll for connection 
  useEffect(() => { 
    if (!showCode || !code) return; 
    const interval = setInterval(async () => { 
      try {
        const res = await fetch( 
          `/api/telegram/check-connection?code=${code}`); 
        const data = await res.json(); 
        if (data.connected) { 
          setConnected(true); 
          setUsername(data.username); 
          setShowCode(false); 
          clearInterval(interval); 
        } 
      } catch (e) {
        console.error('Connection check failed', e);
      }
    }, 3000); 
    return () => clearInterval(interval); 
  }, [showCode, code]); 
 
  return ( 
    <div className="max-w-md mx-auto p-4 space-y-4"> 
      <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2"> 
        <span>📱</span> Telegram Ulanish 
      </h2> 
 
      {/* Bot Card */} 
      <div className="bg-blue-50 border border-blue-200  
        rounded-2xl p-6 shadow-sm"> 
        <div className="flex items-center gap-4 mb-6"> 
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-3xl shadow-sm border border-blue-100">
            🤖
          </div>
          <div> 
            <h3 className="font-bold text-blue-900 text-lg"> 
              Hope Study Bot 
            </h3> 
            <p className="text-sm text-blue-600"> 
              Bildirishnomalar va boshqaruv 
            </p> 
          </div> 
        </div> 
 
        {connected ? ( 
          <div className="flex items-center gap-3 bg-green-100 border border-green-200 rounded-xl p-4"> 
            <span className="text-xl">✅</span> 
            <div>
              <p className="font-bold text-green-800">Ulangan</p>
              {username && ( 
                <p className="text-green-600 text-sm">@{username}</p> 
              )} 
            </div>
          </div> 
        ) : !showCode ? ( 
          <button  
            onClick={generateCode} 
            disabled={loading} 
            className="w-full bg-blue-600 text-white  
              py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 
              hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"> 
            {loading ? '⏳ Yuklanmoqda...' : '🔗 Botga ulash'} 
          </button> 
        ) : ( 
          <div className="text-center space-y-4"> 
            <p className="text-sm text-gray-600 font-medium"> 
              Quyidagi kodni botga yuboring: 
            </p> 
            <div className="text-5xl font-black  
              tracking-[0.2em] text-blue-600  
              bg-white rounded-2xl py-6  
              border-2 border-blue-200 shadow-inner"> 
              {code} 
            </div> 
            <p className="text-sm font-bold text-blue-500 bg-blue-100/50 py-1 px-3 rounded-full inline-block"> 
              ⏱ {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')} qoldi 
            </p> 
             
            <a  
              href={`https://t.me/hopenazorat_bot?start=${code}`} 
              target="_blank" 
              className="block w-full bg-blue-600  
                text-white py-4 rounded-xl  
                font-bold text-center text-lg shadow-lg shadow-blue-200
                hover:bg-blue-700 active:scale-95 transition-all"> 
              📱 Telegramda ochish 
            </a> 
            <div className="p-3 bg-white/50 rounded-xl border border-blue-100">
              <p className="text-xs text-gray-500 mb-1">Qo'lda yuborish uchun:</p>
              <code className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded">/start {code}</code>
              <p className="text-[10px] text-gray-400 mt-1">Bot: @hopenazorat_bot</p>
            </div>
          </div> 
        )} 
      </div> 
 
      {/* Channel Card */} 
      <a  
        href="https://t.me/Hope_study_chanel"  
        target="_blank" 
        className="flex items-center gap-4  
          bg-white border border-gray-100  
          rounded-2xl p-4 hover:border-blue-300 hover:shadow-md
          transition-all cursor-pointer shadow-sm"> 
        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">📢</div> 
        <div className="flex-1"> 
          <h3 className="font-bold text-gray-800"> 
            {centerName} Kanal 
          </h3> 
          <p className="text-sm text-blue-500"> 
            @Hope_study_chanel 
          </p> 
        </div> 
        <span className="text-blue-500 text-xl"> 
          → 
        </span> 
      </a> 
 
      {/* Instagram Card */} 
      <a  
        href="https://www.instagram.com/hope_study__"  
        target="_blank" 
        className="flex items-center gap-4  
          bg-white border border-gray-100  
          rounded-2xl p-4 hover:border-pink-300 hover:shadow-md
          transition-all cursor-pointer shadow-sm"> 
        <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center text-2xl">📸</div> 
        <div className="flex-1"> 
          <h3 className="font-bold text-gray-800">Instagram</h3> 
          <p className="text-sm text-pink-500"> 
            @hope_study__ 
          </p> 
        </div> 
        <span className="text-pink-500 text-xl"> 
          → 
        </span> 
      </a> 
    </div> 
  ); 
} 
