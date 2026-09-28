import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, Plus, Edit, Trash2, Play, Pause, RefreshCw, 
  Settings as SettingsIcon, MessageSquare, Users, Home as HomeIcon, Sparkles, 
  Send, X, Check, Globe, Sliders, Shield, AlertCircle, Info, ChevronRight, Upload,
  Zap, Heart, Award, ArrowRight, UserCheck
} from 'lucide-react';

const DB_NAME = 'MorphCharacterDB';
const DB_VERSION = 1;
const STORE_CHARACTERS = 'characters';
const STORE_CHATS = 'chats';

class MorphDB {
  static open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject('Failed to open database');
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_CHARACTERS)) {
          db.createObjectStore(STORE_CHARACTERS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_CHATS)) {
          db.createObjectStore(STORE_CHATS, { keyPath: 'characterId' });
        }
      };
    });
  }

  static async getAllCharacters() {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_CHARACTERS, 'readonly');
        const store = transaction.objectStore(STORE_CHARACTERS);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      });
    } catch (e) {
      console.error(e);
      return [];
    }
  }

  static async saveCharacter(character) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CHARACTERS, 'readwrite');
      const store = transaction.objectStore(STORE_CHARACTERS);
      const request = store.put(character);
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(false);
    });
  }

  static async deleteCharacter(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHARACTERS, STORE_CHATS], 'readwrite');
      transaction.objectStore(STORE_CHARACTERS).delete(id);
      transaction.objectStore(STORE_CHATS).delete(id);
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(false);
    });
  }

  static async getChatHistory(characterId) {
    try {
      const db = await this.open();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_CHATS, 'readonly');
        const store = transaction.objectStore(STORE_CHATS);
        const request = store.get(characterId);
        request.onsuccess = () => resolve(request.result?.messages || []);
        request.onerror = () => resolve([]);
      });
    } catch (e) {
      return [];
    }
  }

  static async saveChatHistory(characterId, messages) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_CHATS, 'readwrite');
      const store = transaction.objectStore(STORE_CHATS);
      const request = store.put({ characterId, messages });
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(false);
    });
  }
}

const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=600';
const DEFAULT_DIRECTOR_AVATAR = 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=600';

const INITIAL_CHARACTERS = [
  {
    id: 'char-xiba-director',
    name: 'Fr. Paulraj',
    title: 'Director of XIBA',
    image: DEFAULT_DIRECTOR_AVATAR,
    personality: 'You are Fr. Paulraj, Director of XIBA. You are a visionary, wise, deeply encouraging, and articulate educational leader. You speak with warm authority and mentor students and professionals in leadership, technology, ethics, and career growth. Respond naturally in English or Tanglish.',
    voiceType: 'male',
    language: 'auto',
    pitch: 1.0,
    rate: 0.95,
    createdAt: new Date().toISOString()
  }
];

const buildSystemPrompt = (character) => {
  return `You are Morph, an interactive AI character named ${character.name}.
Personality: "${character.personality}"

Respond instantly in 1-2 ultra-short sentences max.
Language: English or Tanglish based on user input.`;
};

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [characters, setCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [clearChatConfirm, setClearChatConfirm] = useState(false);
  const [apiKey, setApiKey] = useState(localStorage.getItem('MORPH_GEMINI_KEY') || '');

  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const [characterState, setCharacterState] = useState('IDLE');
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [speechStatusMsg, setSpeechStatusMsg] = useState('');
  const [listeningTranscript, setListeningTranscript] = useState('');

  const [speechVoices, setSpeechVoices] = useState([]);
  const recognitionRef = useRef(null);
  const synthesisRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const chatBottomRef = useRef(null);

  const [formImage, setFormImage] = useState('');
  const [formName, setFormName] = useState('');
  const [formPersonality, setFormPersonality] = useState('');
  const [formVoiceType, setFormVoiceType] = useState('male');
  const [formLanguage, setFormLanguage] = useState('auto');
  const [formPitch, setFormPitch] = useState(1.0);
  const [formRate, setFormRate] = useState(1.0);

  useEffect(() => {
    const initData = async () => {
      let storedChars = await MorphDB.getAllCharacters();
      if (storedChars.length === 0) {
        for (const char of INITIAL_CHARACTERS) {
          await MorphDB.saveCharacter(char);
        }
        storedChars = INITIAL_CHARACTERS;
      }
      setCharacters(storedChars);
      if (!selectedCharacter && storedChars.length > 0) {
        setSelectedCharacter(storedChars[0]);
      }
    };
    initData();

    const updateVoices = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        const voices = window.speechSynthesis.getVoices();
        setSpeechVoices(voices);
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleSaveApiKey = (key) => {
    setApiKey(key);
    localStorage.setItem('MORPH_GEMINI_KEY', key);
  };

  useEffect(() => {
    if (selectedCharacter) {
      MorphDB.getChatHistory(selectedCharacter.id).then((history) => {
        setMessages(history);
      });
      if (synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      setCharacterState('IDLE');
    }
  }, [selectedCharacter]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, characterState]);

  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechStatusMsg("Voice input is not supported in this browser. Please type your message below.");
      return;
    }

    if (characterState === 'SPEAKING' && synthesisRef.current) {
      synthesisRef.current.cancel();
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      setSpeechStatusMsg('');
      setListeningTranscript('');
      
      if (selectedCharacter?.language === 'ta') {
        recognition.lang = 'ta-IN';
      } else if (selectedCharacter?.language === 'en') {
        recognition.lang = 'en-US';
      } else {
        recognition.lang = navigator.language || 'en-US';
      }

      recognition.onstart = () => {
        setCharacterState('LISTENING');
        setSpeechStatusMsg('Listening... Speak now into your microphone.');
      };

      recognition.onresult = (event) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        const currentText = final || interim;
        setListeningTranscript(currentText);

        if (final.trim()) {
          setSpeechStatusMsg('');
          handleSendMessage(final.trim());
        }
      };

      recognition.onerror = (e) => {
        console.error("Speech Recognition Error:", e.error);
        if (e.error === 'not-allowed') {
          setSpeechStatusMsg('Microphone access denied. Please allow mic permissions in browser settings.');
        } else if (e.error === 'no-speech') {
          setSpeechStatusMsg('No speech detected. Click the microphone button and try again.');
        } else {
          setSpeechStatusMsg(`Voice error: ${e.error}. Try typing your question below.`);
        }
        setCharacterState('IDLE');
      };

      recognition.onend = () => {
        if (characterState === 'LISTENING') {
          setCharacterState('IDLE');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      console.error("Mic initialization failed:", e);
      setSpeechStatusMsg('Could not start microphone. Please check permissions or type below.');
      setCharacterState('IDLE');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setCharacterState('IDLE');
      setSpeechStatusMsg('');
    }
  };

  const speakText = (text) => {
    if (isAudioMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    synthesisRef.current.cancel();
    if (synthesisRef.current.paused) {
      synthesisRef.current.resume();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const charVoiceType = selectedCharacter?.voiceType || 'male';
    const charLang = selectedCharacter?.language || 'auto';

    let targetVoice = speechVoices.find(v => {
      const name = v.name.toLowerCase();
      const lang = v.lang.toLowerCase();
      if (charLang === 'ta' && lang.includes('ta')) return true;
      if (charVoiceType === 'female' && (name.includes('female') || name.includes('zira') || name.includes('samantha') || name.includes('google uk english female'))) return true;
      if (charVoiceType === 'male' && (name.includes('male') || name.includes('david') || name.includes('alex') || name.includes('google us english'))) return true;
      return false;
    });

    if (!targetVoice && speechVoices.length > 0) {
      targetVoice = speechVoices.find(v => v.lang.startsWith('en')) || speechVoices[0];
    }

    if (targetVoice) utterance.voice = targetVoice;

    utterance.pitch = selectedCharacter?.pitch || 1.0;
    utterance.rate = selectedCharacter?.rate || 1.0;

    utterance.onstart = () => {
      setCharacterState('SPEAKING');
    };

    utterance.onend = () => {
      setCharacterState('IDLE');
    };

    utterance.onerror = () => {
      setCharacterState('IDLE');
    };

    synthesisRef.current.speak(utterance);
  };

  const generateLocalCharacterResponse = (query, character) => {
    const q = query.toLowerCase();
    const name = character.name;
    const isTamil = /na|enna|eppadi|sollinga|bro|pa|vanakkam|iruku|panna/i.test(q);

    if (isTamil) {
      if (q.includes('hi') || q.includes('hello') || q.includes('vanakkam')) {
        return `Vanakkam! Naan ${name}. Ungalukku eppadi help pannanum?`;
      }
      if (q.includes('machine learning') || q.includes('ai')) {
        return `Machine Learning ngradhu AI-oda part, data vachu learn pannum.`;
      }
      if (q.includes('python')) {
        return `Python oru simple coding language, beginners-ukku romba easy.`;
      }
      return `Nalla kelvi! "${query}" pathi pesuradhukku magizhchi.`;
    }

    if (q.includes('hello') || q.includes('hi') || q.includes('hey')) {
      return `Hello! I am ${name}. How can I help you today?`;
    }
    if (q.includes('who are you') || q.includes('your name')) {
      return `I am ${name}. Great to connect with you!`;
    }

    return `That's an interesting question about "${query}". I'm happy to help you with it!`;
  };

  const handleSendMessage = async (inputMsg) => {
    if (!inputMsg.trim() || !selectedCharacter) return;

    const userMessage = { id: Date.now().toString(), sender: 'user', text: inputMsg, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setTextInput('');
    setListeningTranscript('');
    setCharacterState('THINKING');

    try {
      let aiText = '';

      if (apiKey && apiKey.trim().length > 10) {
        const systemPrompt = buildSystemPrompt(selectedCharacter);
        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...updatedMessages.slice(-4).map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }))
        ];

        // Enforce a strict 1200ms timeout for near-instant responses
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1200);

        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({ 
              contents,
              generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.7
              }
            })
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json();
            aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          }
        } catch (fetchErr) {
          console.warn("API timed out or failed, switching to instant response fallback:", fetchErr);
        }
      }

      if (!aiText) {
        aiText = generateLocalCharacterResponse(inputMsg, selectedCharacter);
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'character',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);
      await MorphDB.saveChatHistory(selectedCharacter.id, finalMessages);

      speakText(aiText);

    } catch (error) {
      console.error("Error generating response:", error);
      const fallbackText = generateLocalCharacterResponse(inputMsg, selectedCharacter);
      const fallbackMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'character',
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      const finalMessages = [...updatedMessages, fallbackMsg];
      setMessages(finalMessages);
      await MorphDB.saveChatHistory(selectedCharacter.id, finalMessages);
      speakText(fallbackText);
    }
  };

  const openAddModal = (character = null) => {
    if (character) {
      setEditingCharacter(character);
      setFormName(character.name);
      setFormPersonality(character.personality);
      setFormImage(character.image);
      setFormVoiceType(character.voiceType || 'male');
      setFormLanguage(character.language || 'auto');
      setFormPitch(character.pitch || 1.0);
      setFormRate(character.rate || 1.0);
    } else {
      setEditingCharacter(null);
      setFormName('');
      setFormPersonality('');
      setFormImage(DEFAULT_AVATAR);
      setFormVoiceType('male');
      setFormLanguage('auto');
      setFormPitch(1.0);
      setFormRate(1.0);
    }
    setIsAddModalOpen(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Please select an image smaller than 5MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCharacter = async (e) => {
    e.preventDefault();
    if (!formName.trim() || !formPersonality.trim()) {
      alert("Please fill in the character name and personality.");
      return;
    }

    const newChar = {
      id: editingCharacter ? editingCharacter.id : `char-${Date.now()}`,
      name: formName,
      image: formImage || DEFAULT_AVATAR,
      personality: formPersonality,
      voiceType: formVoiceType,
      language: formLanguage,
      pitch: formPitch,
      rate: formRate,
      createdAt: editingCharacter ? editingCharacter.createdAt : new Date().toISOString()
    };

    await MorphDB.saveCharacter(newChar);
    const updatedList = await MorphDB.getAllCharacters();
    setCharacters(updatedList);
    
    if (!selectedCharacter || selectedCharacter.id === newChar.id) {
      setSelectedCharacter(newChar);
    }

    setIsAddModalOpen(false);
  };

  const handleDeleteCharacter = async (id) => {
    await MorphDB.deleteCharacter(id);
    const updatedList = await MorphDB.getAllCharacters();
    setCharacters(updatedList);
    if (selectedCharacter?.id === id) {
      setSelectedCharacter(updatedList[0] || null);
    }
    setDeleteConfirmId(null);
  };

  const handleClearChat = async () => {
    if (selectedCharacter) {
      await MorphDB.saveChatHistory(selectedCharacter.id, []);
      setMessages([]);
      setClearChatConfirm(false);
    }
  };

  const handleTestVoice = () => {
    if (!('speechSynthesis' in window)) return;
    synthesisRef.current.cancel();
    const testUtterance = new SpeechSynthesisUtterance(`Hello! I am ${formName || 'your character'}. Ready to talk with you on Morph.`);
    testUtterance.pitch = formPitch;
    testUtterance.rate = formRate;
    synthesisRef.current.speak(testUtterance);
  };

  return (
    <div className="min-h-screen bg-[#0b0d14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <header className="border-b border-slate-800/80 bg-[#0e111a]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xl font-black tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">
                MORPH
              </span>
              <p className="text-[10px] text-slate-400 font-medium tracking-wide hidden sm:block">
                Your Character. Your AI.
              </p>
            </div>
          </div>

          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('home')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'home' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <HomeIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>

            <button
              onClick={() => setActiveTab('characters')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'characters' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Characters</span>
            </button>

            <button
              onClick={() => setActiveTab('chat')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'chat' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="hidden sm:inline">Talk / Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === 'settings' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </nav>

          <button
            onClick={() => openAddModal()}
            className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs sm:text-sm px-3.5 py-2 rounded-xl shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all transform hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden xs:inline">New Character</span>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {activeTab === 'home' && (
          <div className="space-y-12">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 via-[#111524] to-[#0c0f1a] border border-slate-800 p-8 sm:p-12 text-center shadow-2xl">
              <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Voice-to-Voice AI Companion</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-4">
                Bring Any Picture To Life with <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400">MORPH</span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto mb-8 font-light leading-relaxed">
                Upload photos of mentors, leaders, friends, or historical icons. Give them a personality, voice, and start fluid real-time voice conversations.
              </p>

              <div className="flex flex-wrap justify-center items-center gap-4">
                <button
                  onClick={() => openAddModal()}
                  className="bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:opacity-90 text-white font-bold text-base px-8 py-4 rounded-2xl shadow-xl shadow-cyan-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Your First Character</span>
                </button>

                {selectedCharacter && (
                  <button
                    onClick={() => setActiveTab('chat')}
                    className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border border-slate-700 font-semibold text-base px-6 py-4 rounded-2xl flex items-center gap-2 transition-all"
                  >
                    <MessageSquare className="w-5 h-5 text-cyan-400" />
                    <span>Talk to {selectedCharacter.name}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                  <Upload className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Custom Image Upload</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Select any JPG, PNG, or WEBP image from your device gallery or downloads.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4">
                  <Mic className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Voice-to-Voice AI</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Speak naturally into your microphone and hear immediate character audio responses.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">English & Tanglish</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Full multilingual speech intelligence supporting English, Tamil, and casual Tanglish.</p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-all">
                <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">100% Private & Local</h3>
                <p className="text-sm text-slate-400 leading-relaxed">Character data and photos are saved directly inside your browser IndexedDB.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Your AI Character Library</h2>
                  <p className="text-sm text-slate-400">Select a character to start a voice conversation</p>
                </div>
                <button
                  onClick={() => setActiveTab('characters')}
                  className="text-cyan-400 hover:text-cyan-300 text-sm font-semibold flex items-center gap-1"
                >
                  View All ({characters.length})
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {characters.map((char) => (
                  <div
                    key={char.id}
                    className="group relative rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 p-5 transition-all duration-300 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative w-full h-48 rounded-xl overflow-hidden mb-4 bg-slate-950">
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-xs font-semibold text-cyan-300 border border-cyan-500/30 capitalize">
                          {char.voiceType} Voice
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-white">{char.name}</h3>
                      <p className="text-xs text-cyan-400/90 font-medium mb-2">{char.title || 'Custom AI Character'}</p>
                      <p className="text-xs text-slate-400 line-clamp-2 italic mb-4">"{char.personality}"</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                      <button
                        onClick={() => {
                          setSelectedCharacter(char);
                          setActiveTab('chat');
                        }}
                        className="flex-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all"
                      >
                        <Mic className="w-3.5 h-3.5" />
                        Talk Now
                      </button>

                      <button
                        onClick={() => openAddModal(char)}
                        className="p-2.5 text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-800 rounded-xl transition-all"
                        title="Edit Character"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                <div
                  onClick={() => openAddModal()}
                  className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[260px] transition-all bg-slate-900/30 hover:bg-slate-900/60"
                >
                  <div className="w-14 h-14 rounded-full bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4">
                    <Plus className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">+ Add New Character</h3>
                  <p className="text-xs text-slate-400 max-w-xs">Upload photo, set persona, and start talking</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'characters' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white">Character Management</h1>
                <p className="text-sm text-slate-400">Create, edit, or remove your AI interactive avatars</p>
              </div>
              <button
                onClick={() => openAddModal()}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                Add Character
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="w-full h-52 rounded-xl overflow-hidden mb-4 bg-slate-950">
                      <img src={char.image} alt={char.name} className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-xl font-bold text-white">{char.name}</h3>
                    <p className="text-xs text-slate-400 italic mt-1 line-clamp-3">"{char.personality}"</p>
                  </div>

                  <div className="flex items-center gap-2 pt-4 mt-4 border-t border-slate-800">
                    <button
                      onClick={() => {
                        setSelectedCharacter(char);
                        setActiveTab('chat');
                      }}
                      className="flex-1 bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-xs font-bold py-2 rounded-xl"
                    >
                      Start Chat
                    </button>
                    <button
                      onClick={() => openAddModal(char)}
                      className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(char.id)}
                      className="p-2 text-rose-400 hover:text-rose-300 bg-rose-500/10 rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-[calc(100vh-8.5rem)] flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-96 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden">
              <div className={`absolute inset-0 transition-opacity duration-1000 blur-3xl pointer-events-none ${
                characterState === 'SPEAKING' ? 'bg-cyan-500/20 opacity-100' :
                characterState === 'LISTENING' ? 'bg-indigo-500/20 opacity-100' :
                characterState === 'THINKING' ? 'bg-fuchsia-500/20 opacity-100' : 'opacity-0'
              }`} />

              <div className="w-full flex items-center justify-between z-10 mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-semibold text-slate-300">MORPH ACTIVE</span>
                </div>

                <select
                  value={selectedCharacter?.id || ''}
                  onChange={(e) => {
                    const found = characters.find(c => c.id === e.target.value);
                    if (found) setSelectedCharacter(found);
                  }}
                  className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-cyan-500"
                >
                  {characters.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="relative my-auto flex flex-col items-center z-10">
                <div className={`relative rounded-full p-2 transition-all duration-500 ${
                  characterState === 'SPEAKING' ? 'ring-4 ring-cyan-400/80 scale-105 shadow-2xl shadow-cyan-500/40 animate-pulse' :
                  characterState === 'LISTENING' ? 'ring-4 ring-indigo-500/80 scale-105 shadow-2xl shadow-indigo-500/40 animate-pulse' :
                  characterState === 'THINKING' ? 'ring-4 ring-fuchsia-500/80 scale-100 animate-bounce' : 'ring-1 ring-slate-700/60'
                }`}>
                  <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-full overflow-hidden border-2 border-slate-700/80 bg-slate-950 relative">
                    <img
                      src={selectedCharacter?.image || DEFAULT_AVATAR}
                      alt={selectedCharacter?.name}
                      className={`w-full h-full object-cover object-top transition-transform duration-700 ${
                        characterState === 'SPEAKING' ? 'scale-110 animate-pulse' :
                        characterState === 'LISTENING' ? 'scale-105' : 'scale-100'
                      }`}
                    />

                    {characterState === 'SPEAKING' && (
                      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-12 h-3 bg-cyan-400/60 rounded-full blur-sm animate-ping" />
                    )}
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-white mt-5">{selectedCharacter?.name || 'Character'}</h2>
                
                <div className="mt-2 inline-flex flex-col items-center gap-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-semibold">
                    {characterState === 'IDLE' && <span className="text-slate-400">● Ready to talk</span>}
                    {characterState === 'LISTENING' && <span className="text-indigo-400 animate-pulse">🎤 Listening... Speak now</span>}
                    {characterState === 'THINKING' && <span className="text-fuchsia-400 animate-pulse">⚡ Thinking response...</span>}
                    {characterState === 'SPEAKING' && <span className="text-cyan-400 animate-pulse">🔊 Speaking...</span>}
                  </div>

                  {listeningTranscript && (
                    <p className="text-[11px] text-cyan-300 font-medium italic mt-1 max-w-xs text-center line-clamp-2">
                      "{listeningTranscript}"
                    </p>
                  )}

                  {speechStatusMsg && (
                    <p className="text-[11px] text-amber-400 font-medium max-w-xs text-center mt-1">
                      {speechStatusMsg}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-full z-10 pt-4 border-t border-slate-800/80 flex items-center justify-around">
                <button
                  onClick={() => setIsAudioMuted(!isAudioMuted)}
                  className={`p-3 rounded-2xl border transition-all ${
                    isAudioMuted ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-slate-800/60 text-slate-300 border-slate-700'
                  }`}
                  title={isAudioMuted ? "Unmute Audio" : "Mute Audio"}
                >
                  {isAudioMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>

                <button
                  onClick={characterState === 'LISTENING' ? stopListening : startListening}
                  className={`p-5 rounded-full shadow-2xl transition-all transform active:scale-95 ${
                    characterState === 'LISTENING'
                      ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/50 animate-bounce'
                      : 'bg-gradient-to-tr from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/30'
                  }`}
                  title="Click to Speak"
                >
                  {characterState === 'LISTENING' ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
                </button>

                <button
                  onClick={() => setClearChatConfirm(true)}
                  className="p-3 rounded-2xl bg-slate-800/60 text-slate-300 hover:text-white border border-slate-700 transition-all"
                  title="Clear Conversation"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-6 flex flex-col justify-between shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-950 border border-slate-800">
                    <img src={selectedCharacter?.image || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{selectedCharacter?.name}</h3>
                    <p className="text-[11px] text-slate-400">Language: English / Tamil / Tanglish</p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <span className="px-2 py-1 rounded-md bg-slate-800 text-[10px] font-mono">Gemini 1.5 Flash</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-2">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8">
                    <MessageSquare className="w-12 h-12 mb-3 text-slate-700" />
                    <p className="text-sm font-medium">No messages yet with {selectedCharacter?.name}.</p>
                    <p className="text-xs text-slate-600 mt-1">Tap the mic button or type below to start talking!</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
                        {m.sender === 'character' && (
                          <div className="w-7 h-7 rounded-full overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 mb-1">
                            <img src={selectedCharacter?.image || DEFAULT_AVATAR} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}

                        <div
                          className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                            m.sender === 'user'
                              ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-none shadow-md shadow-cyan-950/40'
                              : 'bg-slate-800/90 text-slate-200 border border-slate-700/80 rounded-bl-none'
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
                    </div>
                  ))
                )}
                
                {characterState === 'THINKING' && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs italic bg-slate-800/40 p-3 rounded-2xl w-fit">
                    <Sparkles className="w-4 h-4 animate-spin text-cyan-400" />
                    <span>{selectedCharacter?.name} is thinking...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(textInput);
                }}
                className="flex items-center gap-2 pt-3 border-t border-slate-800"
              >
                <input
                  type="text"
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`Ask ${selectedCharacter?.name || 'anything'}...`}
                  className="flex-1 bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-500 transition-all"
                />

                <button
                  type="submit"
                  disabled={!textInput.trim() || characterState === 'THINKING'}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-3 rounded-xl transition-all flex items-center justify-center"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="border-b border-slate-800 pb-4">
              <h1 className="text-2xl font-bold text-white">Application Settings</h1>
              <p className="text-sm text-slate-400">Configure AI API Keys and Speech System</p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3 text-cyan-400">
                <Shield className="w-5 h-5" />
                <h2 className="text-lg font-bold text-white">Gemini AI API Key</h2>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your Gemini API key below to power character conversations.
              </p>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-cyan-500"
                />
                <button
                  onClick={() => handleSaveApiKey(apiKey)}
                  className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm px-5 py-2.5 rounded-xl transition-all"
                >
                  Save Key
                </button>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white">System Information</h3>
              <div className="text-xs text-slate-400 space-y-1">
                <p>Application: <span className="text-slate-200">MORPH Web App v1.0.0</span></p>
                <p>Storage Engine: <span className="text-slate-200">IndexedDB Persistent Store</span></p>
                <p>Speech Engine: <span className="text-slate-200">Web Speech API</span></p>
              </div>
            </div>
          </div>
        )}
      </main>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-xl font-bold text-white">
                {editingCharacter ? 'Edit Character' : 'Create New AI Character'}
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCharacter} className="space-y-4">
              <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-950 border-2 border-dashed border-slate-700 relative group">
                  <img src={formImage || DEFAULT_AVATAR} alt="Preview" className="w-full h-full object-cover" />
                  <label className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-xs text-cyan-300 font-semibold">
                    <Upload className="w-5 h-5 mb-1" />
                    Change Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <span className="text-[11px] text-slate-400">Click avatar to select image</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Character Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Fr. Paulraj, Professor, Alex"
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Personality & Description</label>
                <textarea
                  required
                  rows={3}
                  value={formPersonality}
                  onChange={(e) => setFormPersonality(e.target.value)}
                  placeholder="You are a wise mentor who explains tech and leadership using simple, warm examples..."
                  className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl p-3 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Voice Type</label>
                  <select
                    value={formVoiceType}
                    onChange={(e) => setFormVoiceType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="male">Male Voice</option>
                    <option value="female">Female Voice</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Language</label>
                  <select
                    value={formLanguage}
                    onChange={(e) => setFormLanguage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-sm text-white rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="auto">Auto (English/Tamil/Tanglish)</option>
                    <option value="en">English</option>
                    <option value="ta">Tamil</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Speed Rate</span>
                    <span>{formRate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={formRate}
                    onChange={(e) => setFormRate(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                    <span>Pitch</span>
                    <span>{formPitch}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={formPitch}
                    onChange={(e) => setFormPitch(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleTestVoice}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs py-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition-all"
                >
                  <Volume2 className="w-4 h-4" />
                  Test Voice Audio
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-xs px-6 py-2.5 rounded-xl shadow-lg transition-all"
                >
                  {editingCharacter ? 'Save Changes' : 'Create Character'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="text-lg font-bold text-white">Delete Character?</h3>
            <p className="text-xs text-slate-400">This will permanently remove the character and chat history.</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 bg-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCharacter(deleteConfirmId)}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-xl"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {clearChatConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="text-lg font-bold text-white">Clear Conversation?</h3>
            <p className="text-xs text-slate-400">This will clear the current chat history for this character.</p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setClearChatConfirm(false)}
                className="flex-1 bg-slate-800 text-slate-300 text-xs font-semibold py-2.5 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold py-2.5 rounded-xl"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}