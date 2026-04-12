import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Send, Lock, Search, ShieldCheck, MoreVertical, Key, LogIn, UserPlus } from 'lucide-react';
import { generateRSAKeyPair, encryptMessage, decryptMessage, wrapPrivateKey, unwrapPrivateKey } from './cryptoUtils';

const socket = io('http://localhost:5000', { autoConnect: false });

function App() {
  const [user, setUser] = useState(null);
  const [privateKey, setPrivateKey] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // --- Auth & Identity Escrow ---
  useEffect(() => {
    const savedUser = localStorage.getItem('cipher_user');
    const savedKey = localStorage.getItem('cipher_priv_key');
    const savedToken = localStorage.getItem('cipher_token');
    
    if (savedUser && savedKey && savedToken) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setPrivateKey(JSON.parse(savedKey));
      setAuthToken(savedToken);
      connectSocket(u.id, savedToken);
    }
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!usernameInput.trim() || !passwordInput.trim()) return;

    try {
      if (authMode === 'register') {
        const { publicKeyJwk, privateKeyJwk } = await generateRSAKeyPair();
        const encrypted_private_key = await wrapPrivateKey(privateKeyJwk, passwordInput);
        
        const response = await fetch('http://localhost:5000/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: usernameInput,
            password: passwordInput,
            public_key: JSON.stringify(publicKeyJwk),
            encrypted_private_key
          })
        });

        if (!response.ok) throw new Error((await response.json()).error || 'Registration failed');
        const data = await response.json();
        
        setUser(data.user);
        setPrivateKey(privateKeyJwk);
        setAuthToken(data.token);
        
        localStorage.setItem('cipher_user', JSON.stringify(data.user));
        localStorage.setItem('cipher_priv_key', JSON.stringify(privateKeyJwk));
        localStorage.setItem('cipher_token', data.token);
        
        connectSocket(data.user.id, data.token);

      } else {
        // Login Flow (Key Escrow Sync)
        const response = await fetch('http://localhost:5000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        if (!response.ok) throw new Error((await response.json()).error || 'Login failed');
        const data = await response.json();
        
        // Unwrap the pulled Escrow key using the typed password
        const privateKeyJwk = await unwrapPrivateKey(data.user.encrypted_private_key, passwordInput);
        
        setUser(data.user);
        setPrivateKey(privateKeyJwk);
        setAuthToken(data.token);
        
        localStorage.setItem('cipher_user', JSON.stringify(data.user));
        localStorage.setItem('cipher_priv_key', JSON.stringify(privateKeyJwk));
        localStorage.setItem('cipher_token', data.token);
        
        connectSocket(data.user.id, data.token);
      }
      
      setUsernameInput('');
      setPasswordInput('');
    } catch (err) {
      console.error('Auth error:', err);
      setAuthError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cipher_user');
    localStorage.removeItem('cipher_priv_key');
    localStorage.removeItem('cipher_token');
    socket.disconnect();
    setUser(null);
    setPrivateKey(null);
    setAuthToken(null);
    setContacts([]);
    setActiveContact(null);
    setMessages([]);
  };

  const connectSocket = (userId, token) => {
    socket.auth = { token };
    socket.connect();
  };

  useEffect(() => {
    if (!user || !authToken) return;
    fetchContacts();

    socket.on('receive_message', async (encryptedMsg) => {
      if (activeContact && (encryptedMsg.sender_id === activeContact.id || encryptedMsg.receiver_id === activeContact.id)) {
        let text = "";
        if (encryptedMsg.sender_id === user.id) {
          text = await decryptMessage(encryptedMsg.sender_encrypted_aes_key, encryptedMsg.encrypted_payload, privateKey);
        } else {
          text = await decryptMessage(encryptedMsg.encrypted_aes_key, encryptedMsg.encrypted_payload, privateKey);
        }
        setMessages(prev => [...prev, { ...encryptedMsg, decryptedText: text }]);
      }
    });

    return () => {
      socket.off('receive_message');
    };
  }, [user, activeContact, privateKey, authToken]);

  const fetchContacts = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      setContacts(data.filter(c => c.id !== user.id));
    } catch (err) {
      console.error(err);
    }
  };

  const loadChat = async (contact) => {
    setActiveContact(contact);
    try {
      const res = await fetch(`http://localhost:5000/api/messages/${contact.id}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const encryptedHistory = await res.json();
      
      const decryptedHistory = [];
      for (const msg of encryptedHistory) {
        let text = "";
        if (msg.sender_id === user.id) {
          text = await decryptMessage(msg.sender_encrypted_aes_key, msg.encrypted_payload, privateKey);
        } else {
          text = await decryptMessage(msg.encrypted_aes_key, msg.encrypted_payload, privateKey);
        }
        decryptedHistory.push({ ...msg, decryptedText: text });
      }
      setMessages(decryptedHistory);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact) return;

    try {
      const recipientPubKey = JSON.parse(activeContact.public_key);
      const myPubKey = JSON.parse(user.public_key);
      const { encrypted_aes_key, sender_encrypted_aes_key, encrypted_payload } = await encryptMessage(inputText, recipientPubKey, myPubKey);

      const payload = {
        receiver_id: activeContact.id,
        encrypted_aes_key,
        sender_encrypted_aes_key,
        encrypted_payload
      };

      socket.emit('private_message', payload, (ack) => {
        if (ack.success) {
          setMessages(prev => [...prev, { ...ack.message, decryptedText: inputText }]);
          setInputText('');
        }
      });

    } catch (err) {
      console.error("Encryption/Sending failed", err);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- Render ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center border border-slate-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-1">CipherStream</h1>
          <p className="text-slate-500 mb-6 text-sm flex items-center justify-center gap-1">
            <Key className="w-3.5 h-3.5" /> PBKDF2 Key Escrow System
          </p>
          
          {/* Auth Toggles */}
          <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
            <button 
              onClick={() => setAuthMode('login')} 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'login' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Sign In
            </button>
            <button 
              onClick={() => setAuthMode('register')} 
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${authMode === 'register' ? 'bg-white shadow-sm text-emerald-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Secure Sign Up
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authError && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{authError}</div>}
            
            <input
              type="text" required placeholder="Display Name"
              value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-sm font-medium text-slate-700"
            />
            <input
              type="password" required placeholder={authMode === 'register' ? 'Master Password (Key Wrapper)' : 'Enter Master Password'}
              value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-sm text-slate-700"
            />
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition shadow-md shadow-emerald-200 flex items-center justify-center gap-2">
              {authMode === 'register' ? <UserPlus className="w-5 h-5"/> : <LogIn className="w-5 h-5"/>}
              {authMode === 'register' ? 'Generate Target Identity' : 'Unwrap Key & Sync'}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-xs text-slate-400">
            <Lock className="w-3 h-3" /> Zero-Trust Architecture: Your password never leaves your browser directly.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#d1d7db] flex items-center justify-center p-0 lg:p-6 drop-shadow-xl">
      <div className="flex w-full max-w-6xl h-full max-h-[900px] bg-white lg:rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Sidebar */}
        <div className="w-full md:w-[380px] bg-white flex flex-col border-r border-slate-200 shrink-0 relative z-10 shadow-[1px_0_10px_rgba(0,0,0,0.05)]">
          <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold shadow-inner">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-800 leading-tight">{user.username}</span>
                <span className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Key Unwrapped Locally</span>
              </div>
            </div>
            <button onClick={handleLogout} title="Lock Device Identity" className="p-2 text-slate-400 hover:text-red-500 transition hover:bg-red-50 rounded-full">
              <Lock className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-3 bg-white border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input type="text" placeholder="Search secure contacts..." className="w-full bg-slate-100 text-sm rounded-xl pl-10 pr-4 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition" />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white custom-scrollbar">
            {contacts.map(contact => (
              <div 
                key={contact.id} 
                onClick={() => loadChat(contact)}
                className={`flex items-center gap-4 px-4 py-3 cursor-pointer transition-colors ${activeContact?.id === contact.id ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
              >
                <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center text-slate-600 font-bold shrink-0">
                  {contact.username.charAt(0).toUpperCase()}
                </div>
                <div className="border-b border-slate-100 flex-1 pb-3 pt-1">
                  <h3 className="font-semibold text-slate-800 text-[17px]">{contact.username}</h3>
                  <p className="text-xs text-emerald-600 flex items-center gap-1 mt-1 opacity-80"><Lock className="w-3 h-3"/> Web Crypto Target Acquired</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Canvas */}
        {activeContact ? (
          <div className="flex-1 flex flex-col bg-[#efeae2] relative z-0">
            {/* Background Pattern */}
            <div className="absolute inset-0 z-0 opacity-40 mix-blend-multiply" style={{backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px'}}></div>
            
            {/* Header */}
            <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center gap-4 relative z-10">
              <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-slate-700 font-bold">
                {activeContact.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-slate-800 text-[16px]">{activeContact.username}</h2>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                   <Lock className="w-3 h-3" /> Encrypted Tunnel Active
                </div>
              </div>
            </div>

            {/* Message Feed */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 relative z-10 custom-scrollbar">
              <div className="flex justify-center mb-8 mt-2">
                <div className="bg-[#fff9c4] text-[#8a6d3b] text-xs px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-3 max-w-[85%] text-center border border-[#ece4a4]">
                  <Lock className="w-5 h-5 shrink-0" /> 
                  <span>Messages are secured with end-to-end encryption. The server only sees unintelligible ciphertext.</span>
                </div>
              </div>

              {messages.map((msg, i) => {
                const isMe = msg.sender_id === user.id;
                return (
                  <div key={msg.id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[75%] px-3.5 py-2 shadow-sm relative ${isMe ? 'bg-[#d9fdd3] text-slate-800 rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm'}`}>
                      <p className="text-[15px] leading-relaxed break-words">{msg.decryptedText}</p>
                      <span className={`text-[10px] block mt-1 leading-none ${isMe ? 'text-emerald-700 text-right' : 'text-slate-400 text-right'}`}>
                        {new Date(msg.created_at || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="bg-[#f0f2f5] px-4 py-3 pb-8 lg:pb-3 flex items-center gap-3 relative z-10">
              <form onSubmit={handleSendMessage} className="flex-1 flex gap-3">
                <input
                  type="text"
                  placeholder="Type an encrypted message..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="flex-1 px-5 py-3.5 bg-white rounded-2xl border-none focus:ring-0 focus:outline-none shadow-sm text-[15px] text-slate-800 transition placeholder:text-slate-400"
                />
                <button 
                  type="submit" 
                  disabled={!inputText.trim()}
                  className={`rounded-full p-3 shadow-sm transition-all flex items-center justify-center w-12 h-12 shrink-0 ${inputText.trim() ? 'bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-md' : 'bg-slate-300 text-slate-500'}`}
                >
                  <Send className="w-5 h-5 ml-0.5" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="flex-1 hidden md:flex flex-col items-center justify-center bg-[#f0f2f5] border-l border-slate-200 relative z-10">
            <div className="text-center max-w-sm px-6">
              <div className="bg-white p-8 rounded-full inline-block mb-6 shadow-sm border border-slate-100">
                <Lock className="w-16 h-16 text-slate-300 stroke-1" />
              </div>
              <h2 className="text-3xl font-light text-slate-700 mb-3">CipherStream Escrow</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Your private key has been unwrapped locally using your Master Password. Select a contact to establish a secure ciphertext tunnel.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Required CSS for custom scrollbar hidden inside component for simplicity */}
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(0,0,0,0.1); border-radius: 10px; }
      `}} />
    </div>
  );
}

export default App;
