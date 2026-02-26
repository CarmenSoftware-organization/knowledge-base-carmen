(function(_,C){typeof exports=="object"&&typeof module<"u"?C(exports):typeof define=="function"&&define.amd?define(["exports"],C):(_=typeof globalThis<"u"?globalThis:_||self,C(_.CarmenBot={}))})(this,(function(_){"use strict";class C{constructor(t){this.baseUrl=t.replace(/\/$/,"")}async getRooms(t,e){return[]}async createRoom(t,e,i="บทสนทนาใหม่"){return{room_id:"loc_"+Math.random().toString(36).substring(2,10),title:i}}async getRoomHistory(t){return{messages:[]}}async deleteRoom(t){return{status:"success"}}async sendMessage(t){const e=await fetch(`${this.baseUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!e.ok){let i="Unknown Error";try{const o=await e.json();i=o.detail||JSON.stringify(o)}catch{i=await e.text()}throw new Error(`API Error ${e.status}: ${i}`)}return await e.json()}async sendFeedback(t,e){try{await fetch(`${this.baseUrl}/api/chat/feedback/${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({score:e})})}catch(i){console.error("Feedback Error:",i)}}async clearHistory(t){try{if(!t)return;await fetch(`${this.baseUrl}/api/chat/clear/${t}`,{method:"DELETE"})}catch(e){console.warn("ClearHistory Error:",e)}}async getHistory(t,e,i){try{const o=new URLSearchParams({bu:t,username:e,session_id:i||""}),a=await fetch(`${this.baseUrl}/chat/history?${o.toString()}`,{method:"GET"});return a.ok?await a.json():[]}catch(o){return console.warn("API Error:",o),[]}}}function j(s="#34558b"){return`
    :host {
        display: block !important;
        position: fixed !important; 
        bottom: 32px !important; 
        right: 32px !important; 
        z-index: 2000000 !important;
        width: 0 !important; height: 0 !important;
        background: transparent !important;
        pointer-events: none !important; /* Allow clicking through host except where children are */
        --primary-color: ${s};
        --primary-gradient: linear-gradient(135deg, ${s} 0%, ${s} 110%);
        --glass-bg: rgba(255, 255, 255, 0.75);
        --glass-border: rgba(255, 255, 255, 0.5);
        --glass-shadow: 0 12px 48px rgba(0, 0, 0, 0.12);
        
        /* Sidebar Colors */
        --sidebar-bg: #0f172a;
        --sidebar-hover: #1e293b;
        --sidebar-text: #f1f5f9;
        
        /* Chat Colors */
        --bg-light: #f8fafc;
        --text-dark: #0f172a;
        --text-gray: #64748b;
        
        --radius-xl: 32px;
        --radius-lg: 24px;
        --radius-md: 16px;
        
        --font-inter: 'Inter', system-ui, -apple-system, sans-serif;
        --font-sarabun: 'Sarabun', sans-serif;
        
        --transition-snappy: all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1);
        --transition-sidebar: width 0.5s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease;

        font-family: var(--font-inter) !important;
        line-height: 1.5 !important; 
        text-align: left !important; color: var(--text-dark) !important;
    }
    
    /* Ensure children can receive pointer events */
    .chat-btn, .chat-box, .chat-tooltip {
        pointer-events: auto !important;
    }

    
    * { box-sizing: border-box !important; }

    /* Custom Scrollbar */
    ::-webkit-scrollbar { width: 5px !important; height: 5px !important; }
    ::-webkit-scrollbar-track { background: transparent !important; }
    ::-webkit-scrollbar-thumb { 
        background: rgba(0,0,0,0.1) !important; 
        border-radius: 10px !important; 
        transition: background 0.3s !important;
    }
    .chat-sidebar ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1) !important; }
    *:hover::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.2) !important; }
    .chat-sidebar:hover::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2) !important; }
    
    /* Launcher Button */
    .chat-btn { 
        width: 70px !important; height: 70px !important; 
        background: var(--primary-gradient) !important; 
        border-radius: 50% !important;
        box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 
                    inset 0 -4px 0 rgba(0,0,0,0.1),
                    0 0 0 2px rgba(255, 255, 255, 0.1) !important; 
        cursor: pointer !important; 
        display: flex !important; justify-content: center !important; align-items: center !important; 
        transition: all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        position: absolute !important; bottom: 0 !important; right: 0 !important;
        z-index: 2000002 !important;
        overflow: hidden !important;
    }
    
    .chat-btn::before {
        content: '' !important; position: absolute !important; inset: 0 !important;
        background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent) !important;
        transform: translateX(-100%) !important; transition: 0.8s !important;
    }
    
    .chat-btn:hover { 
        transform: translateY(-10px) scale(1.05) !important; 
        box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35),
                    0 0 0 4px rgba(52, 85, 139, 0.2) !important;
        border-radius: 45% !important; /* Slight organic morphing on hover */
    }
    
    .chat-btn:hover::before { transform: translateX(100%) !important; }
    
    .chat-btn svg { width: 28px !important; height: 28px !important; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2)) !important; }
    .chat-btn:hover svg { transform: scale(1.15) rotate(5deg) !important; }

    /* Pulsing Glow - Enhanced for circular feel */
    .chat-btn:not(:hover) {
        animation: launcherPulseCircular 4s infinite cubic-bezier(0.4, 0, 0.2, 1) !important;
    }
    
    @keyframes launcherPulseCircular {
        0% { box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(52, 85, 139, 0.4); }
        50% { box-shadow: 0 16px 40px rgba(0, 0, 0, 0.25), 0 0 0 20px rgba(52, 85, 139, 0); }
        100% { box-shadow: 0 12px 32px rgba(0, 0, 0, 0.2), 0 0 0 0 rgba(52, 85, 139, 0); }
    }

    /* Chat Window */
    .chat-box { 
        position: absolute !important; bottom: 84px; right: 0; 
        width: 360px !important; height: 600px !important; max-height: 85vh !important; 
        background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.98) 0%, 
                    rgba(250, 250, 252, 0.98) 50%,
                    rgba(255, 255, 255, 0.98) 100%) !important; 
        border-radius: var(--radius-xl) !important; 
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 
                    0 8px 24px rgba(0, 0, 0, 0.1),
                    0 0 0 1px rgba(0, 0, 0, 0.05) !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
        display: none !important; flex-direction: row !important; overflow: hidden !important; 
        transform-origin: bottom right !important;
        animation: fadeIn 0.4s ease-out forwards !important;
        transition: width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1),
                    opacity 0.6s ease, top 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    left 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    bottom 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    right 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), 
                    border-radius 0.6s ease !important;
        z-index: 1000000 !important;
        backface-visibility: hidden !important;
    }
    
    /* Content transition masking to prevent "jitter" during reflow */
    .chat-box.resizing {
        overflow: hidden !important;
        pointer-events: none !important;
        display: flex !important; /* Force flex during transition */
    }
    .chat-box.resizing #carmenChatBody,
    .chat-box.resizing .suggestions-container {
        opacity: 0.1 !important;
        filter: blur(8px) !important;
        transition: opacity 0.3s ease, filter 0.3s ease !important;
    }
    .chat-box.open { display: flex !important; }
    
    @keyframes fadeIn { 
        from { opacity: 0; transform: scale(0.95); filter: blur(4px); } 
        to { opacity: 1; transform: scale(1); filter: blur(0); } 
    }
    
    @keyframes fadeOut { 
        from { opacity: 1; transform: scale(1); filter: blur(0); }
        to { opacity: 0; transform: scale(0.95); filter: blur(4px); } 
    }

    .chat-box.closing {
        animation: fadeOut 0.3s ease-out forwards !important;
        pointer-events: none !important;
    }

    /* Floating Glass Card Menu */
    .chat-sidebar {
        position: absolute !important;
        left: 10px !important;
        top: 70px !important; 
        bottom: auto !important;
        height: auto !important;
        max-height: calc(100% - 90px) !important;
        width: 200px !important; 
        
        display: flex !important; 
        flex-direction: column !important;
        
        /* Glass Effect */
        background: rgba(30, 41, 59, 0.95) !important; 
        backdrop-filter: blur(16px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
        
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 20px !important;
        box-shadow: 0 20px 40px rgba(0,0,0,0.4), 
                    0 0 0 1px rgba(255,255,255,0.05) inset !important;
        
        overflow: hidden !important; 
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
        
        transform: translateX(-20px) scale(0.9) !important;
        opacity: 0 !important;
        visibility: hidden !important;
        
        z-index: 150 !important;
    }
    
    .chat-box.expanded .chat-sidebar.sidebar-visible { 
        transform: translateX(0) scale(1) !important;
        opacity: 1 !important;
        visibility: visible !important;
    }

    /* Extra safety: Never show sidebar in Small Mode */
    .chat-box:not(.expanded) .chat-sidebar {
        transform: translateX(-20px) scale(0.9) !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
    
    .sidebar-header { 
        padding: 28px 20px 20px 20px !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        margin-bottom: 8px !important;
    }
    .new-chat-btn {
        width: 100% !important; padding: 14px !important;
        background: var(--primary-gradient) !important; 
        border: none !important;
        color: white !important; border-radius: 14px !important;
        cursor: pointer !important; font-size: 14px !important; font-weight: 700 !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        box-shadow: 0 8px 20px rgba(52, 85, 139, 0.3) !important;
    }
    .new-chat-btn:hover { transform: translateY(-2px) !important; box-shadow: 0 12px 24px rgba(52, 85, 139, 0.4) !important; filter: brightness(1.1) !important; }

    .room-list { 
        flex: 1 !important; 
        overflow-y: auto !important; 
        padding: 16px 12px !important; 
        display: flex !important; flex-direction: column !important; gap: 8px !important;
    }
    .room-item {
        padding: 14px 16px !important; border-radius: 14px !important;
        color: #94a3b8 !important; cursor: pointer !important;
        display: flex !important; align-items: center !important; gap: 8px !important;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; 
        position: relative !important;
        background: rgba(255,255,255,0.03) !important;
        border: 1px solid rgba(255,255,255,0.05) !important;
    }
    .room-item:hover { 
        background: rgba(255,255,255,0.08) !important; 
        color: white !important; 
        transform: translateX(4px) !important;
        border-color: rgba(255,255,255,0.1) !important;
    }
    .room-item.active { 
        background: rgba(52, 85, 139, 0.15) !important; 
        color: white !important; 
        border-color: var(--primary-color) !important;
        box-shadow: inset 0 0 0 1px var(--primary-color) !important;
    }
    .room-item.active::before {
        content: '' !important; position: absolute !important; left: 0 !important; top: 25% !important; bottom: 25% !important;
        width: 3px !important; background: var(--primary-color) !important; border-radius: 0 4px 4px 0 !important;
        box-shadow: 0 0 10px var(--primary-color) !important;
    }
    .room-title { font-size: 13.5px !important; font-weight: 500 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; flex: 1 !important; }
    .delete-room-btn { opacity: 0; color: #f87171 !important; font-size: 18px !important; border: none !important; background: transparent !important; cursor: pointer !important; transition: 0.2s !important; }
    .room-item:hover .delete-room-btn { opacity: 1 !important; }

    /* Main Content Area */
    .chat-main { 
        flex: 1 !important; 
        display: flex !important; 
        flex-direction: column !important; 
        min-width: 0 !important; 
        height: 100% !important; 
        background: transparent !important; 
        position: relative !important; 
    }

    /* Glass Header */
    .chat-header { 
        background: var(--primary-gradient) !important; 
        padding: 24px 28px !important; 
        display: flex !important; justify-content: space-between !important; align-items: center !important; 
        color: white !important; flex-shrink: 0 !important;
        position: relative !important;
        z-index: 100 !important;
        user-select: none !important;
        -webkit-user-select: none !important;
    }
    .header-info { display: flex !important; align-items: center !important; gap: 14px !important; }
    .avatar-wrapper {
        width: 48px !important; height: 48px !important; 
        background: linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.1)) !important; 
        border-radius: 16px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        backdrop-filter: blur(12px) !important;
        border: 1px solid rgba(255,255,255,0.3) !important;
        box-shadow: 0 8px 16px rgba(0,0,0,0.1) !important;
        animation: avatarFloat 4s infinite ease-in-out !important;
    }
    @keyframes avatarFloat {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-4px); }
    }
    .avatar-inner svg { width: 28px !important; height: 28px !important; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.1)) !important; }

    .chat-header h3 { font-size: 19px !important; font-weight: 700 !important; letter-spacing: -0.02em !important; margin: 0 !important; text-shadow: 0 2px 4px rgba(0,0,0,0.1) !important; }
    .status-indicator { font-size: 11px !important; font-weight: 500 !important; opacity: 0.8 !important; display: flex !important; align-items: center !important; gap: 6px !important; margin-top: 4px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; }
    .status-indicator .dot { width: 7px !important; height: 7px !important; background: #22c55e !important; border-radius: 50% !important; display: inline-block !important; border: 1.5px solid rgba(255,255,255,0.4) !important; box-shadow: 0 0 8px #22c55e !important; }

    /* Header Tools */
    .header-tools { display: flex !important; gap: 10px !important; align-items: center !important; }
    .icon-btn { 
        width: 36px !important; height: 36px !important; border-radius: 14px !important; 
        display: flex !important; align-items: center !important; justify-content: center !important;
        background: rgba(255,255,255,0.15) !important; cursor: pointer !important; transition: 0.2s !important;
    }
    .icon-btn:hover { background: rgba(255,255,255,0.25) !important; transform: scale(1.05) !important; }
    .icon-btn svg { width: 22px !important; height: 22px !important; fill: white !important; }
    #carmen-menu-btn { display: none !important; margin-right: 4px !important; }

    /* Chat Body */
    .chat-body { 
        flex: 1 !important; padding: 24px !important; overflow-y: auto !important; 
        background: linear-gradient(to bottom, rgba(252, 252, 254, 0.5) 0%, rgba(248, 249, 252, 0.5) 100%) !important; 
        background-image: radial-gradient(circle at 2px 2px, rgba(0, 0, 0, 0.02) 1px, transparent 0) !important;
        background-size: 24px 24px !important;
        display: flex !important; flex-direction: column !important; gap: 20px !important; 
        scroll-behavior: smooth !important;
    }

    /* Message Bubbles */
    .msg { 
        width: fit-content !important; max-width: 88% !important; 
        padding: 14px 20px !important; font-size: 15px !important; 
        box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important;
        font-family: var(--font-sarabun) !important;
        position: relative !important;
        animation: msgPop 0.5s cubic-bezier(0.22, 1, 0.36, 1) backwards !important;
        will-change: transform, opacity !important;
    }
    @keyframes msgPop { from { opacity: 0; transform: scale(0.9) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
    
    .msg img { 
        max-width: 100% !important; 
        height: auto !important; 
        border-radius: 12px !important; 
        margin: 8px 0 !important;
        display: block !important;
    }

    .msg.user { 
        background: #0f172a !important; color: white !important; 
        align-self: flex-end !important; margin-left: auto !important; 
        border-radius: 20px 20px 4px 20px !important;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15) !important;
    }
    .msg.bot { 
        background: white !important; color: var(--text-dark) !important; 
        align-self: flex-start !important; margin-right: auto !important; 
        border-radius: 20px 20px 20px 4px !important; 
        border: 1px solid #f1f5f9 !important;
        padding-bottom: 38px !important;
    }

    /* Message Content extras */
    .video-container { width: 100% !important; margin: 12px 0 !important; border-radius: 12px !important; overflow: hidden !important; }
    .video-ratio-box { position: relative !important; padding-top: 56.25% !important; background: #000 !important; }
    .video-ratio-box iframe { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; height: 100% !important; border: 0 !important; }

    .typing-indicator { display: flex; align-items: center !important; gap: 4px !important; padding: 12px 18px !important; background: white !important; border-radius: 16px 16px 16px 4px !important; width: fit-content !important; border: 1px solid #f1f5f9 !important; margin-top: 10px !important; }
    .typing-indicator.hidden { display: none !important; }
    .typing-dot { width: 6px !important; height: 6px !important; background-color: #cbd5e1 !important; border-radius: 50% !important; animation: bounce 1.4s infinite ease-in-out both !important; }
    .typing-dot:nth-child(1) { animation-delay: -0.32s !important; } 
    .typing-dot:nth-child(2) { animation-delay: -0.16s !important; }
    @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }

    /* Suggestions */
    .suggestions-container { 
        display: flex !important; flex-wrap: wrap !important; align-items: flex-start !important; 
        gap: 6px !important; margin: 8px 0 !important; 
        padding: 0 4px !important;
    }
    .suggestion-chip { 
        background: rgba(255,255,255,0.8) !important; 
        backdrop-filter: blur(4px) !important;
        border: 1px solid #e2e8f0 !important; 
        border-radius: 10px !important; 
        padding: 6px 12px !important; 
        font-size: 13px !important; color: var(--text-dark) !important; 
        cursor: pointer !important; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.02) !important; 
        max-width: 100% !important;
        animation: chipEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) backwards !important;
    }
    .suggestion-chip:hover { 
        background: white !important; 
        border-color: var(--primary-color) !important; 
        color: var(--primary-color) !important; 
        transform: translateY(-2px) !important; 
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.08) !important; 
    }
    @keyframes chipEnter {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }

    /* Welcome Hero */
    .welcome-hero {
        padding: 32px 20px 16px 20px !important;
        text-align: center !important;
        animation: heroFade 0.8s ease-out !important;
    }
    .welcome-hero .hero-icon {
        width: 64px !important; height: 64px !important;
        background: var(--primary-gradient) !important;
        border-radius: 22px !important;
        margin: 0 auto 16px auto !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        box-shadow: 0 16px 32px rgba(52, 85, 139, 0.2) !important;
        animation: heroIconPop 1s cubic-bezier(0.16, 1, 0.3, 1) !important;
    }
    .welcome-hero .hero-icon svg { width: 32px !important; height: 32px !important; }
    .welcome-hero h2 { font-size: 20px !important; font-weight: 700 !important; color: var(--text-dark) !important; margin-bottom: 8px !important; }
    .welcome-hero p { color: var(--text-gray) !important; font-size: 14px !important; line-height: 1.5 !important; max-width: 260px !important; margin: 0 auto !important; }

    @keyframes heroFade { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes heroIconPop { from { transform: scale(0.5) rotate(-20deg); opacity: 0; } to { transform: scale(1) rotate(0); opacity: 1; } }

    /* Footer & Input */
    .chat-footer { 
        padding: 20px 24px 24px 24px !important; 
        background: var(--glass-bg) !important; 
        backdrop-filter: blur(12px) !important;
        border-top: 1px solid var(--glass-border) !important; 
        display: flex !important; gap: 12px !important; align-items: center !important; 
    }
    .chat-input { 
        flex: 1 !important; padding: 14px 20px !important; 
        border-radius: 16px !important; 
        border: 1px solid #e2e8f0 !important; 
        outline: none !important; background: white !important; 
        font-family: var(--font-sarabun) !important; font-size: 15px !important; 
        transition: border-color 0.2s, box-shadow 0.2s !important; 
        resize: none !important;
        min-height: 50px !important;
        max-height: 120px !important;
        overflow-y: auto !important;
        line-height: 1.5 !important;
    }
    .chat-input:focus { 
        border-color: var(--primary-color) !important; 
        box-shadow: 0 0 0 4px rgba(52, 85, 139, 0.1), 0 4px 12px rgba(52, 85, 139, 0.05) !important;
        background: white !important;
    }
    
    .send-btn { 
        width: 48px !important; height: 48px !important; 
        background: #0f172a !important; color: white !important; 
        border-radius: 14px !important; cursor: pointer !important; 
        display: flex !important; align-items: center !important; justify-content: center !important; 
        transition: var(--transition-snappy) !important; 
    }
    .send-btn:hover { background: var(--primary-color) !important; transform: scale(1.05) !important; }
    .send-btn svg { width: 24px !important; height: 24px !important; fill: white !important; }

    /* Modals & Overlays */
    .alert-overlay {
        position: absolute !important; inset: 0 !important;
        background: rgba(15, 23, 42, 0.4) !important;
        backdrop-filter: blur(8px) !important;
        z-index: 10000 !important; display: none;
        justify-content: center !important; align-items: center !important;
        padding: 24px !important; animation: fadeIn 0.3s ease !important;
    }
    .alert-box {
        background: white !important; width: 100% !important; max-width: 320px !important;
        padding: 32px !important; border-radius: 28px !important;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important;
        text-align: center !important; transform: scale(1) !important;
        border: 1px solid rgba(0,0,0,0.05) !important;
        animation: scaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) !important;
        font-family: var(--font-sarabun) !important;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .alert-icon { font-size: 32px !important; margin-bottom: 16px !important; }
    .alert-title { font-weight: 700 !important; font-size: 18px !important; margin-bottom: 8px !important; }
    .alert-desc { color: var(--text-gray) !important; font-size: 14px !important; margin-bottom: 24px !important; }
    .btn-alert { 
        padding: 12px 24px !important; border-radius: 12px !important; font-weight: 600 !important; cursor: pointer !important; transition: 0.2s !important; width: 100% !important;
    }
    .btn-confirm { background: #0f172a !important; color: white !important; margin-bottom: 8px !important; }
    .btn-cancel { background: #f1f5f9 !important; color: var(--text-dark) !important; }

    /* Tooltip */
    .chat-tooltip {
        position: absolute !important; bottom: 88px !important; right: 0 !important;
        background: rgba(255,255,255,0.9) !important; 
        backdrop-filter: blur(12px) !important;
        padding: 12px 18px !important;
        border-radius: 20px !important; 
        box-shadow: 0 20px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04) !important;
        display: none; align-items: center !important; gap: 14px !important;
        animation: tooltipEnter 0.6s cubic-bezier(0.16, 1, 0.3, 1) backwards !important;
        z-index: 2000001 !important;
        width: max-content !important; cursor: pointer !important;
        max-width: 320px !important;
    }
    .chat-tooltip.show { display: flex !important; }
    
    @keyframes tooltipEnter { 
        0% { opacity: 0; transform: translateY(20px) scale(0.9); filter: blur(4px); } 
        100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); } 
    }
    
    .tooltip-avatar {
        width: 38px !important; height: 38px !important;
        flex-shrink: 0 !important;
    }
    .tooltip-avatar .avatar-inner {
        width: 100% !important; height: 100% !important;
        background: var(--primary-gradient) !important;
        border-radius: 12px !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        box-shadow: 0 4px 8px rgba(52, 85, 139, 0.2) !important;
    }
    .tooltip-avatar .avatar-inner svg { width: 22px !important; height: 22px !important; }

    .tooltip-content { display: flex !important; flex-direction: column !important; gap: 3px !important; }
    .tooltip-greet { font-weight: 700 !important; font-size: 13px !important; color: var(--primary-color) !important; letter-spacing: 0.02em !important; }
    .tooltip-text { font-size: 13px !important; font-weight: 500 !important; color: var(--text-dark) !important; line-height: 1.4 !important; }
    
    .tooltip-close { 
        position: absolute !important; top: -8px !important; right: -8px !important;
        width: 24px !important; height: 24px !important;
        background: white !important; color: #94a3b8 !important;
        border-radius: 50% !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
        cursor: pointer !important; transition: 0.2s !important;
        border: 1px solid rgba(0,0,0,0.05) !important;
    }
    .tooltip-close:hover { color: #f87171 !important; transform: scale(1.1) !important; }

    /* Image Preview */
    .image-preview-container { 
        padding: 12px 24px !important; background: #f8fafc !important; 
        border-top: 1px solid #e2e8f0 !important; position: relative !important;
    }
    .preview-box { width: 60px !important; height: 60px !important; border-radius: 10px !important; overflow: hidden !important; border: 2px solid white !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
    .preview-box img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
    #clear-image-btn { position: absolute !important; top: 6px !important; left: 66px !important; background: #fee2e2 !important; color: #ef4444 !important; border: none !important; border-radius: 50% !important; width: 24px !important; height: 24px !important; display: flex !important; align-items: center !important; justify-content: center !important; cursor: pointer !important; }

    /* Message Tools (Copy/Feedback) */
    .tools-container { 
        position: absolute !important; bottom: 8px !important; left: 20px !important; 
        display: flex !important; align-items: center !important; gap: 8px !important;
        opacity: 0.6 !important; transition: 0.2s !important;
    }
    .msg:hover .tools-container { opacity: 1 !important; }
    .copy-btn, .feedback-btn { 
        background: transparent !important; border: none !important; cursor: pointer !important; 
        padding: 4px !important; display: flex !important; align-items: center !important; 
        color: var(--text-gray) !important; transition: 0.2s !important;
    }
    .copy-btn:hover { color: var(--primary-color) !important; }
    .feedback-btn:hover { color: #f59e0b !important; }
    .separator { width: 1px !important; height: 12px !important; background: #e2e8f0 !important; }
    .feedback-group { display: flex !important; gap: 4px !important; }

    /* Footer Extras */
    .icon-btn-footer {
        background: transparent !important; border: none !important; color: var(--text-gray) !important;
        cursor: pointer !important; transition: 0.2s !important; display: flex !important; align-items: center !important;
    }
    .icon-btn-footer:hover { color: var(--primary-color) !important; transform: scale(1.1) !important; }

    /* Expanded View */
    .chat-box.expanded {
        position: fixed !important; 
        top: 20px !important; bottom: 84px !important; left: 20px !important; right: 20px !important;
        width: calc(100vw - 40px) !important; height: auto !important; 
        max-height: calc(100vh - 120px) !important; 
        border-radius: 24px !important; 
        box-shadow: 0 40px 100px rgba(0,0,0,0.5) !important;
    }
    .chat-box.expanded #carmen-menu-btn { display: flex !important; }
    
    /* Responsive */
    @media (max-width: 480px) {
        .chat-box {
            width: 100% !important;
            height: 100% !important;
            max-height: 100dvh !important;
            bottom: 0 !important;
            right: 0 !important;
            top: 0 !important;
            left: 0 !important;
            border-radius: 0 !important;
            transform: none !important;
        }
        
        .chat-box.open {
            display: flex !important;
        }
        
        .chat-sidebar {
            width: 80% !important;
            height: auto !important;
            top: 70px !important;
            max-height: calc(100% - 100px) !important;
        }
    }

    /* Typing Indicator */
    .typing-indicator-container { padding: 16px 20px !important; width: fit-content !important; min-width: 60px !important; display: flex !important; align-items: center !important; justify-content: center !important; }
    .typing-dots { display: flex !important; gap: 4px !important; align-items: center !important; height: 100% !important; }
    .typing-dots span {
        width: 8px !important; height: 8px !important;
        background: #94a3b8 !important; border-radius: 50% !important;
        animation: typingBounce 1.4s infinite ease-in-out !important;
        display: block !important;
    }
    .typing-dots span:nth-child(1) { animation-delay: -0.32s !important; }
    .typing-dots span:nth-child(2) { animation-delay: -0.16s !important; }
    
    @keyframes typingBounce {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
    }

    /* Markdown Styles */
    .msg ul, .msg ol { margin: 8px 0 !important; padding-left: 24px !important; }
    .msg li { margin-bottom: 4px !important; line-height: 1.5 !important; }
    .msg ul { list-style-type: disc !important; }
    .msg ol { list-style-type: decimal !important; }
    .carmen-link { color: var(--primary-color) !important; text-decoration: none !important; font-weight: 500 !important; }
    .carmen-link:hover { text-decoration: underline !important; }
    /* Markdown Styles */
    .msg ul, .msg ol { margin: 8px 0 !important; padding-left: 24px !important; }
    .msg li { margin-bottom: 4px !important; line-height: 1.5 !important; }
    .msg ul { list-style-type: disc !important; }
    .msg ol { list-style-type: decimal !important; }
    .carmen-link { color: var(--primary-color) !important; text-decoration: none !important; font-weight: 500 !important; }
    .carmen-link:hover { text-decoration: underline !important; }
    `}const w={launcher:`<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 8V4H8"></path>
        <rect width="16" height="12" x="4" y="8" rx="2"></rect>
        <path d="M2 14h2"></path>
        <path d="M20 14h2"></path>
        <path d="M15 13v2"></path>
        <path d="M9 13v2"></path>
    </svg>`,botAvatar:`
        <div class="avatar-inner">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
            </svg>
        </div>`,clear:'<svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>',close:'<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',send:'<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',copy:'<svg viewBox="0 0 24 24" width="14" height="14" style="display:block;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#64748b"/></svg>',check:'<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#16a34a"/></svg>',thumbsUp:"👍",thumbsDown:"👎",clip:'<svg viewBox="0 0 24 24" width="24" height="24" fill="#64748b"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>'};function L(s,t=!1){return`
        <div class="room-item ${t?"active":""}" data-id="${s.room_id}">
            <div class="room-title" title="${s.title||"บทสนทนาใหม่"}">
                ${s.title||"บทสนทนาใหม่"}
            </div>
            <button class="delete-room-btn" data-id="${s.room_id}" title="ลบห้อง">×</button>
        </div>
    `}function I(){return`
        <div class="msg bot-msg typing-indicator-container">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `}function z(s={showClear:!0,showAttach:!0}){const{showClear:t,showAttach:e}=s;return`
        <div class="chat-btn" id="carmen-launcher">${w.launcher}</div>
        
        <div class="chat-box" id="carmenChatWindow">
            
            <div class="chat-sidebar" id="carmenSidebar" style="display: none !important;">
                <div class="sidebar-header">
                    <button id="new-chat-btn" class="new-chat-btn">+ เริ่มแชทใหม่</button>
                </div>
                <div class="room-list" id="carmenRoomList">
                    </div>
            </div>

            <div class="chat-main">
                
                <div id="carmen-alert-overlay" class="alert-overlay">
                    <div class="alert-box">
                        <div class="alert-icon" id="carmen-alert-icon">⚠️</div>
                        <div class="alert-title" id="carmen-alert-title">แจ้งเตือน</div>
                        <div class="alert-desc" id="carmen-alert-desc">ข้อความแจ้งเตือน</div>
                        <div class="alert-actions" id="carmen-alert-actions"></div>
                    </div>
                </div>

                <div class="chat-header">
                    <div class="header-info">
                        <!-- Menu button hidden out: <div class="icon-btn" id="carmen-menu-btn" title="เมนู">☰</div> -->
                        
                        <div class="avatar-wrapper">
                            ${w.botAvatar}
                        </div>
                        
                        <div class="title-wrapper">
                            <h3>Carmen AI Specialist</h3>
                            <div class="status-indicator">
                                <span class="dot"></span> คลังความรู้ AI พร้อมบริการ
                            </div>
                        </div>
                    </div>
                    
                    <div class="header-tools">
                        <div class="icon-btn" id="carmen-expand-btn" title="ขยายหน้าจอ">⛶</div>
                        ${t?`<div class="icon-btn" id="carmen-clear-btn" title="ล้างแชท">${w.clear}</div>`:""}
                        <div class="icon-btn" id="carmen-close-btn" title="ปิด">${w.close}</div>
                    </div>
                </div>

                <div class="chat-body" id="carmenChatBody">
                    </div>

                <div id="carmenImagePreview" class="image-preview-container" style="display:none;">
                    <div class="preview-box">
                        <img id="preview-img-element" src="" />
                    </div>
                    <button id="clear-image-btn" type="button" title="ลบรูป">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>

                <div class="chat-footer">
                    ${e?`
                        <input type="file" id="carmen-file-input" accept="image/*" style="display: none;">
                        <button class="icon-btn-footer" id="carmen-attach-btn" title="แนบรูป">${w.clip}</button>
                    `:""}
                    <textarea id="carmenUserInput" class="chat-input" rows="1" placeholder="พิมพ์ข้อความที่นี่..."></textarea>
                    <button class="send-btn" id="carmen-send-btn" title="ส่งข้อความ">${w.send}</button>
                </div>
            </div>
        </div>
    `}function R(){return`
        <div class="tooltip-avatar">
            ${w.botAvatar}
        </div>
        <div class="tooltip-content">
            <span class="tooltip-greet">ผู้ช่วย AI พร้อมให้คำแนะนำ</span>
            <span class="tooltip-text">สอบถามข้อมูลคู่มือหรือการใช้งานได้ทันที!</span>
        </div>
        <div class="tooltip-close" id="carmen-tooltip-close">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </div>
    `}function B(s,t,e){return s!=="bot"?"":`
        <div class="tools-container">
            <button class="copy-btn" title="คัดลอกข้อมูล">
                ${w.copy}
            </button>
            ${t?`
                <div class="separator"></div>
                <div class="feedback-group">
                    <button class="feedback-btn" onclick="window.carmenRate('${t}', 1, this)" title="มีประโยชน์">${w.thumbsUp}</button>
                    <button class="feedback-btn" onclick="window.carmenRate('${t}', -1, this)" title="ไม่ถูกต้อง">${w.thumbsDown}</button>
                </div>
            `:""}
        </div>
    `}const F=Object.freeze(Object.defineProperty({__proto__:null,createMessageExtras:B,createRoomItemHTML:L,createTooltipHTML:R,createTypingIndicatorHTML:I,createWidgetHTML:z},Symbol.toStringTag,{value:"Module"}));function H(s){if(!s)return null;try{const t=/^.*((youtu.be\/)|(v\/)|(\/(u)\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/,e=s.match(t);return e&&e[7]&&e[7].trim()?e[7].trim():null}catch{return null}}function N(s){const t=/\[(.*?)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)\)/g;s=s.replace(t,(i,o,a)=>{const r=H(a);return r?`<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${r}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`:i});const e=/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;return s=s.replace(e,(i,o,a,r)=>{const n=r.substring(Math.max(0,a-10),a);if(/src=['"]$|href=['"]$|\($/.test(n)||r.substring(Math.max(0,a-100),a).includes("carmen-processed-video"))return i;const u=H(i);return u?`<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${u}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`:i}),s}function U(s,t){const e=i=>{let o=i.trim();if(o.includes("youtube.com")||o.includes("youtu.be")||o.startsWith("data:"))return o;const a=r=>r.replace(/^https?:\/\/[^\/]+/,"").split("?")[0].replace(/^\/images\//,"").replace(/^\.\//,"").replace(/^\/+/,"");if(/^(http|https):/.test(o)){if(!(o.includes("127.0.0.1")||o.includes("localhost")||t&&o.startsWith(t))){const n=o.split("/").pop().split("?")[0];return`${t}/images/${n}`}return o.includes("/images/")?o:`${t}/images/${a(o)}`}return`${t}/images/${a(o)}`};return s=s.replace(/!\[(.*?)\]\((.*?)\)/g,(i,o,a)=>{if(a.includes("youtube.com")||a.includes("youtu.be"))return i;const r=e(a);return`<br><a href="${r}" target="_blank"><img src="${r}" alt="${o}" class="carmen-processed-img"></a><br>`}),s=s.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi,(i,o)=>{if(i.includes("carmen-processed-img")||o.includes("youtube"))return i;const a=e(o);return`<br><a href="${a}" target="_blank"><img src="${a}" class="carmen-processed-img"></a><br>`}),s=s.replace(/(?:^|[\s>])(?:ดูรูป\s*)?`?((?:[\w\-\u2010\u2011\u2012\u2013]+\/)*[\w\-\u2010\u2011\u2012\u2013]+\.(?:png|jpg|jpeg|gif|svg|webp))`?/gi,(i,o)=>{const r=o.replace(/[\u2010\u2011\u2012\u2013\u2014]/g,"-").replace(/^carmen_cloud\//,""),n=`${t}/images/${r}`;return`<br><a href="${n}" target="_blank"><img src="${n}" alt="${r}" class="carmen-processed-img"></a><br>`}),s=s.replace(/<img[^>]*$/gi,""),s}function O(s){const t=/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;return s=s.replace(t,(e,i,o,a)=>{const r=a.substring(Math.max(0,o-10),o);return/src=['"]$|href=['"]$|>$/.test(r)?e:`<a href="${e}" target="_blank" style="color:#2563eb; text-decoration:underline;">${e}</a>`}),s}function P(s){const t=s.split(`
`);let e=[],i=!1,o=0,a=0;for(let r of t){let n=r.trim();if(/^---+$/.test(n)){i&&(e.push("</ul>"),i=!1),o=0,a=0,e.push('<hr style="border:none; border-top:1px solid #e2e8f0; margin:12px 0;">');continue}if(/^### (.+)$/.test(n)){i&&(e.push("</ul>"),i=!1),o=0,a=0,e.push(`<div style="font-weight:700; font-size:15px; margin:12px 0 6px 0;">${n.replace(/^### /,"")}</div>`);continue}if(/^## (.+)$/.test(n)){i&&(e.push("</ul>"),i=!1),o=0,a=0,e.push(`<div style="font-weight:700; font-size:16px; margin:14px 0 6px 0;">${n.replace(/^## /,"")}</div>`);continue}if(/^[-*] (.+)$/.test(n)){a=0,i||(e.push("<ul>"),i=!0),e.push(`<li>${n.replace(/^[-*] /,"")}</li>`);continue}const p=n.match(/^(\d+)\.\s+(.+)$/);if(p){i&&(e.push("</ul>"),i=!1),o++,a=0;const u=p[1],f=p[2];e.push(`<div style="display:flex; gap:8px; margin:6px 0 2px 0;"><b style="min-width:20px; color:#1e40af;">${u}.</b><span>${f}</span></div>`);continue}i&&!/^[-*] /.test(n)&&(e.push("</ul>"),i=!1),n===""?(a++,a>=2&&(o=0),e.length>0&&e[e.length-1]!=="<br>"&&e.push("<br>")):(a=0,/^\*\*.+\*\*/.test(n)&&(o=0),o>0?n.startsWith("<br><a href=")||n.startsWith("<img")||n.includes("carmen-processed-video")?e.push(`<div style="margin:2px 0 8px 28px;">${n}</div>`):e.push(`<div style="margin:2px 0 6px 28px; color:#475569;">${n}</div>`):e.push(n+"<br>"))}return i&&e.push("</ul>"),e.join("")}function Y(s){return s=s.replace(/`([^`]+)`/g,'<code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:13px;">$1</code>'),s=s.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>"),s=s.replace(new RegExp("(?<!\\*)\\*([^*]+)\\*(?!\\*)","g"),"<i>$1</i>"),s}function A(s,t){if(!s)return"";let e=String(s);const i=t?t.replace(/\/$/,""):"";return e=N(e),e=U(e,i),e=O(e),e=P(e),e=e.replace(/(<br>){3,}/g,"<br><br>"),e=Y(e),e}const M={theme:"#34558b",title:"Carmen AI Specialist",showClearHistoryButton:!1,showAttachFileButton:!1,apiBase:""},W=["กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง","บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่","program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่","ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Tax Invoice ได้หรือไม่","ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่"],b={error_missing_config:"❌ CarmenBot Error: กรุณาระบุ 'bu', 'user' และ 'apiBase' ใน Config ด้วยครับ (Required)",welcome_title:"สวัสดีค่ะ Carmen พร้อมช่วย!",welcome_desc:"สอบถามข้อมูลจากคู่มือบริษัท หรือเริ่มบทสนทนาใหม่ได้ทันทีด้านล่างนี้ค่ะ",history_loading:"⏳ กำลังโหลด...",history_empty:"ยังไม่มีประวัติการแชท",alert_confirm:"ตกลง",alert_cancel:"ยกเลิก",delete_room_confirm_title:"ยืนยันลบห้องแชท?",delete_room_confirm_desc:"บทสนทนาที่เลือกจะถูกลบถาวร และไม่สามารถกู้คืนได้",clear_history_confirm_title:"ล้างประวัติห้องนี้?",clear_history_confirm_desc:"ข้อความในห้องนี้จะถูกลบทั้งหมด",file_too_large:"ไฟล์ใหญ่เกินไป",file_too_large_desc:"ไม่เกิน 5MB ครับ"};class D{constructor(t){this.bot=t,this.theme=t.theme,this.title=t.title||"Carmen AI Specialist",this.shadow=null}findElement(t){if(!this.shadow)return document.getElementById(t)||document.querySelector(t);if(!t.includes(" ")&&!t.includes(".")&&!t.startsWith("#")){const e=this.shadow.getElementById(t);return e||this.shadow.querySelector(`#${t}`)}return this.shadow.querySelector(t)}injectStyles(){if(this.shadow&&this.shadow.getElementById("carmen-style"))return;const t=document.createElement("link");t.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600&display=swap",t.rel="stylesheet",document.head.appendChild(t);const e=document.createElement("style");e.id="carmen-style",e.innerText=j(this.theme),this.shadow?this.shadow.appendChild(e):document.head.appendChild(e)}createDOM(){if(document.getElementById("carmen-chat-widget"))return;const t=document.createElement("div");t.id="carmen-chat-widget",Object.assign(t.style,{position:"fixed",bottom:"32px",right:"32px",zIndex:"2000000",width:"0",height:"0",display:"block",pointerEvents:"none"}),document.body.appendChild(t),this.shadow=t.attachShadow({mode:"open"}),this.shadow.innerHTML=z({showClear:this.bot.showClearHistoryButton,showAttach:this.bot.showAttachFileButton}),this.injectStyles();const e=this.findElement(".title-wrapper h3");e&&(e.textContent=this.title)}showWelcomeMessage(){const t=this.findElement("carmenChatBody");if(!t)return;t.innerHTML="";const e=document.createElement("div");e.className="welcome-hero";const i=b.welcome_title;e.innerHTML=`
            <div class="hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <h2 id="welcome-typing-title"></h2>
            <p style="opacity: 0; transform: translateY(10px); transition: all 0.8s ease;" id="welcome-desc-text">${b.welcome_desc}</p>
        `,t.appendChild(e);const o=this.findElement("welcome-typing-title"),a=this.findElement("welcome-desc-text");let r=0;const n=()=>{r<i.length?(o.textContent+=i.charAt(r),r++,setTimeout(n,40)):a&&(a.style.opacity="1",a.style.transform="translateY(0)")};setTimeout(n,300),setTimeout(()=>this.addSuggestions(),1200)}showModal({title:t,text:e,icon:i="💡",confirmText:o=b.alert_confirm,cancelText:a=null,onConfirm:r=null}){const n=this.findElement("carmen-alert-overlay"),p=this.findElement("carmen-alert-icon"),u=this.findElement("carmen-alert-title"),f=this.findElement("carmen-alert-desc"),g=this.findElement("carmen-alert-actions");if(!n)return;if(p.textContent=i,u.textContent=t,f.innerHTML=e,g.innerHTML="",a){const h=document.createElement("button");h.className="btn-alert btn-cancel",h.textContent=a,h.onclick=()=>{n.style.display="none"},g.appendChild(h)}const c=document.createElement("button");c.className="btn-alert btn-confirm",c.textContent=o,c.onclick=()=>{n.style.display="none",r&&r()},g.appendChild(c),n.style.display="flex"}scrollToBottom(){const t=this.findElement("carmenChatBody");t&&(t.scrollTop=t.scrollHeight)}addMessage(t,e,i=null,o=null){const a=this.findElement("carmenChatBody");if(!a)return;const r=document.createElement("div");r.className=`msg ${e}`;const n=A(t||"",this.bot.apiBase),p=typeof B=="function"?B(e,i):"";r.innerHTML=n+p,a.appendChild(r),this.scrollToBottom(),e==="bot"&&this.bot.bindCopyEvent(r)}addStreamingMessage(){const t=this.findElement("carmenChatBody");if(!t)return{};const e=document.createElement("div");e.className="msg bot";const i=Date.now();return e.innerHTML=`
            <div class="typing-indicator" id="loading-${i}">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span id="streaming-content-${i}" style="display:none;"></span>
        `,t.appendChild(e),this.scrollToBottom(),{container:e,loader:e.querySelector(`#loading-${i}`),span:e.querySelector(`#streaming-content-${i}`)}}addSuggestions(t){this.shadow&&this.shadow.querySelectorAll(".suggestions-container").forEach(a=>a.remove());const e=t||this.bot.suggestedQuestions;if(!e||e.length===0)return;const i=this.findElement("carmenChatBody"),o=document.createElement("div");o.className="suggestions-container",e.forEach((a,r)=>{const n=document.createElement("button");n.innerText=a,n.className="suggestion-chip",n.style.animationDelay=`${r*.1}s`,n.onclick=()=>{this.bot.sendMessage(a),o.remove()},o.appendChild(n)}),i.appendChild(o),this.scrollToBottom()}clearImageSelection(){this.bot.currentImageBase64=null;const t=this.findElement("carmen-file-input");t&&(t.value="");const e=this.findElement("carmenImagePreview");e&&(e.style.display="none")}renderRoomList(t,e){const i=this.findElement("carmenRoomList");i&&(t&&t.length>0?(i.innerHTML="",t.forEach(o=>{const a=o.room_id===e,r=document.createElement("div");r.innerHTML=L(o,a),i.appendChild(r.firstElementChild)})):i.innerHTML=`<div style="padding:20px; text-align:center; color:#64748b; font-size:13px;">${b.history_empty}</div>`)}showTooltip(){if(localStorage.getItem(`carmen_tooltip_seen_${this.bot.bu}`))return;const e=document.getElementById("carmen-chat-widget"),i=document.createElement("div");i.className="chat-tooltip",i.id="carmen-tooltip",i.innerHTML=R(),this.shadow?this.shadow.appendChild(i):e.appendChild(i),setTimeout(()=>i.classList.add("show"),2e3);const o=this.findElement("carmen-tooltip-close"),a=this.findElement("carmen-launcher"),r=()=>{i.classList.remove("show"),setTimeout(()=>i.remove(),500),localStorage.setItem(`carmen_tooltip_seen_${this.bot.bu}`,"true")};o&&(o.onclick=n=>{n.stopPropagation(),r()}),i&&(i.onclick=()=>{a&&a.click(),r()}),a&&a.addEventListener("click",r)}setupGlobalFunctions(){window.carmenRate=async(t,e,i)=>{const o=i.parentElement;o.innerHTML=e===1?'<span style="font-size:11px; color:#16a34a;">ขอบคุณค่ะ ❤️</span>':'<span style="font-size:11px; color:#991b1b;">ขอบคุณค่ะ 🙏</span>',await this.bot.api.sendFeedback(t,e)}}bindCopyEvent(t){const e=t.querySelector(".copy-btn");if(!e)return;e.onclick=()=>{const o=t.querySelector(".msg-bubble span")||t.querySelector(".msg-bubble")||t,a=o.innerText||o.textContent,r=()=>{const n=e.innerHTML;e.innerHTML=w.check,setTimeout(()=>{e.innerHTML=n},2e3)};navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(a).then(r).catch(()=>i(a,r)):i(a,r)};function i(o,a){const r=document.createElement("textarea");r.value=o,r.style.cssText="position:fixed;left:-9999px",document.body.appendChild(r),r.select();try{document.execCommand("copy"),a()}catch(n){console.error("Fallback copy failed",n)}document.body.removeChild(r)}}showLauncher(){const t=this.findElement("carmen-launcher");t&&(t.style.display="flex")}}class V{constructor(t){this.bot=t,this.api=t.api,this.roomKey=`carmen_room_${t.bu}_${t.username}`,this.typingBuffer="",this.isTyping=!1}async createNewChat(){this.bot.currentRoomId&&await this.api.clearHistory(this.bot.currentRoomId),this.bot.currentRoomId=null,localStorage.removeItem(this.roomKey),this.bot.ui.showWelcomeMessage(),await this.loadRoomList()}async switchRoom(t){this.bot.currentRoomId!==t&&(this.bot.currentRoomId=t,localStorage.setItem(this.roomKey,t),await this.loadHistory(t),await this.loadRoomList())}async deleteChatRoom(t){this.bot.ui.showModal({icon:"🗑️",title:b.delete_room_confirm_title,text:b.delete_room_confirm_desc,confirmText:"ลบทิ้ง",cancelText:b.alert_cancel,onConfirm:async()=>{try{await this.api.deleteRoom(t),this.bot.currentRoomId===t?this.createNewChat():await this.loadRoomList()}catch(e){console.error("Delete Error:",e)}}})}async loadRoomList(){try{const t=await this.api.getRooms(this.bot.bu,this.bot.username);this.bot.ui.renderRoomList(t,this.bot.currentRoomId)}catch(t){console.error("Room List Error:",t)}}async loadHistory(t){const e=this.bot.ui.findElement("carmenChatBody");if(e){e.children.length===0&&(e.innerHTML=`<div style="text-align:center; padding:20px; color:#94a3b8;">${b.history_loading}</div>`);try{const i=await this.api.getRoomHistory(t);e.innerHTML="",i.messages&&i.messages.length>0?(i.messages.forEach(o=>{this.bot.ui.addMessage(o.message,o.sender,o.id,o.sources)}),setTimeout(()=>this.bot.ui.scrollToBottom(),100)):this.bot.ui.showWelcomeMessage()}catch(i){console.warn("History Load Error:",i),this.createNewChat()}}}async sendMessage(t=null){const e=this.bot.ui.findElement("carmenUserInput"),i=t||e.value.trim();if(!i&&!this.bot.currentImageBase64)return;if(!this.bot.currentRoomId)try{const c=i.substring(0,30)+(i.length>30?"...":""),h=await this.api.createRoom(this.bot.bu,this.bot.username,c);this.bot.currentRoomId=h.room_id,localStorage.setItem(this.roomKey,this.bot.currentRoomId),await this.loadRoomList()}catch{this.bot.ui.addMessage("⚠️ สร้างห้องสนทนาไม่สำเร็จ","bot");return}let o=i;this.bot.currentImageBase64&&(o=`<img src="${this.bot.currentImageBase64}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${i}`),this.bot.ui.addMessage(o,"user"),e.value="";const a=this.bot.currentImageBase64;this.bot.ui.clearImageSelection(),this.bot.ui.shadow&&this.bot.ui.shadow.querySelectorAll(".suggestions-container").forEach(c=>c.remove());const r=this.bot.ui.addStreamingMessage();r.loader&&(r.loader.style.display="none");const n=I(),p=document.createElement("div");p.innerHTML=n;const u=p.firstElementChild;r.container.appendChild(u),this.bot.ui.scrollToBottom();let f=null,g=null;try{const h=(await fetch(`${this.bot.apiBase}/api/chat/stream`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:i,image:a,bu:this.bot.bu,username:this.bot.username,room_id:this.bot.currentRoomId,prompt_extend:this.bot.prompt_extend})})).body.getReader(),v=new TextDecoder("utf-8");this.typingBuffer="";let x="",l=!0;const d=()=>{if(this.typingBuffer.length>0){l&&(u&&u.remove(),r.span&&(r.span.style.display="block"),l=!1);const m=this.typingBuffer.length>50?5:this.typingBuffer.length>10?2:1;x+=this.typingBuffer.substring(0,m),this.typingBuffer=this.typingBuffer.substring(m),r.span&&(r.span.innerHTML=A(x,this.bot.apiBase),this.bot.ui.scrollToBottom())}(this.isTyping||this.typingBuffer.length>0)&&requestAnimationFrame(()=>setTimeout(d,15))};for(this.isTyping=!0,d();;){const{done:m,value:y}=await h.read();if(m)break;const T=v.decode(y,{stream:!0}).split(`
`);for(const E of T)if(E.trim())try{const k=JSON.parse(E);k.type==="chunk"?this.typingBuffer+=k.data:k.type==="sources"?f=k.data:k.type==="done"&&(g=k.id,this.loadRoomList())}catch{}}if(this.isTyping=!1,r.loader&&r.loader.remove(),g&&r.container){const{createMessageExtras:m}=await Promise.resolve().then(()=>F),y=m("bot",g,f);r.container.insertAdjacentHTML("beforeend",y),this.bot.bindCopyEvent(r.container)}}catch(c){console.error("Stream Error:",c)}}}class q{constructor(t){this.bot=t,this.closeTimeout=null}attach(){const t=this.bot.ui.findElement("carmenChatWindow"),e=this.bot.ui.findElement("carmen-launcher"),i=this.bot.ui.findElement("carmen-close-btn"),o=this.bot.ui.findElement("carmen-expand-btn"),a=this.bot.ui.findElement("new-chat-btn"),r=this.bot.ui.findElement("carmenRoomList"),n=this.bot.ui.findElement("carmen-menu-btn"),p=this.bot.ui.findElement("carmenSidebar"),u=this.bot.ui.findElement(".chat-header"),f=()=>{t.classList.contains("closing")||(t.classList.add("closing"),p&&p.classList.remove("sidebar-visible"),localStorage.setItem(`carmen_open_${this.bot.bu}`,"false"),localStorage.setItem(`carmen_expanded_${this.bot.bu}`,"false"),this.closeTimeout=setTimeout(()=>{t.classList.remove("open","expanded","closing"),this.closeTimeout=null},800))};if(e&&(e.onclick=()=>{const l=t.classList.contains("open"),d=t.classList.contains("closing");l&&!d?f():(this.closeTimeout&&(clearTimeout(this.closeTimeout),this.closeTimeout=null),t.classList.remove("closing"),t.classList.add("open"),localStorage.setItem(`carmen_open_${this.bot.bu}`,"true"),p&&p.classList.remove("sidebar-visible"),setTimeout(()=>this.bot.ui.scrollToBottom(),100))}),u&&t){const l=localStorage.getItem(`carmen_chat_pos_${this.bot.bu}`);if(l)try{const d=JSON.parse(l);t.style.bottom=d.bottom,t.style.right=d.right}catch{}this._setupDraggable(u,t)}i&&(i.onclick=f),o&&(o.onclick=()=>{const l=!t.classList.contains("expanded");if(t.classList.add("resizing"),t.classList.toggle("expanded"),localStorage.setItem(`carmen_expanded_${this.bot.bu}`,l?"true":"false"),l)t.style.bottom="",t.style.right="";else{const d=localStorage.getItem(`carmen_chat_pos_${this.bot.bu}`);if(d)try{const m=JSON.parse(d);t.style.bottom=m.bottom,t.style.right=m.right}catch{}}!l&&p&&p.classList.remove("sidebar-visible"),setTimeout(()=>{t.classList.remove("resizing"),this.bot.ui.scrollToBottom()},600)}),a&&(a.onclick=()=>this.bot.chat.createNewChat()),r&&(r.onclick=async l=>{const d=l.target.closest(".delete-room-btn"),m=l.target.closest(".room-item");if(d){l.stopPropagation();const y=d.getAttribute("data-id");this.bot.chat.deleteChatRoom(y);return}if(m){const y=m.getAttribute("data-id");this.bot.chat.switchRoom(y)}}),n&&p&&(n.onclick=()=>p.classList.toggle("sidebar-visible"));const g=this.bot.ui.findElement("carmen-clear-btn");g&&(g.onclick=()=>{this.bot.currentRoomId&&this.bot.ui.showModal({icon:"🗑️",title:b.clear_history_confirm_title,text:b.clear_history_confirm_desc,confirmText:"ลบเลย",cancelText:b.alert_cancel,onConfirm:async()=>{await this.bot.api.clearHistory(this.bot.bu,this.bot.username,this.bot.currentRoomId),await this.bot.chat.loadHistory(this.bot.currentRoomId)}})});const c=this.bot.ui.findElement("carmen-attach-btn");if(c){const l=this.bot.ui.findElement("carmen-file-input");c.onclick=()=>l.click(),l.onchange=d=>{const m=d.target.files[0];if(!m)return;if(m.size>5*1024*1024){this.bot.ui.showModal({icon:"⚠️",title:b.file_too_large,text:b.file_too_large_desc}),l.value="";return}const y=new FileReader;y.onload=$=>{this.bot.currentImageBase64=$.target.result;const T=this.bot.ui.findElement("carmenImagePreview"),E=this.bot.ui.findElement("preview-img-element");T&&E&&(E.src=this.bot.currentImageBase64,T.style.display="flex")},y.readAsDataURL(m)}}const h=this.bot.ui.findElement("clear-image-btn");h&&(h.onclick=()=>this.bot.ui.clearImageSelection());const v=this.bot.ui.findElement("carmen-send-btn"),x=this.bot.ui.findElement("carmenUserInput");v&&(v.onclick=()=>{this.bot.chat.sendMessage(),x&&(x.style.height="auto")}),x&&(x.addEventListener("input",function(){this.style.height="auto",this.style.height=this.scrollHeight+"px"}),x.addEventListener("keydown",l=>{l.key==="Enter"&&!l.shiftKey&&(l.preventDefault(),this.bot.chat.sendMessage(),x.style.height="auto")}))}_setupDraggable(t,e){let i=0,o=0,a=0,r=0,n=!1,p=null;const u=c=>{if(e.classList.contains("expanded"))return;const h=c.type.startsWith("touch")?c.touches[0]:c;i=h.clientX,o=h.clientY;const v=window.getComputedStyle(e);a=parseInt(v.bottom)||84,r=parseInt(v.right)||0,window.addEventListener("mousemove",f,{passive:!1}),window.addEventListener("mouseup",g),window.addEventListener("touchmove",f,{passive:!1}),window.addEventListener("touchend",g),n=!1,e.style.transition="none",document.body.style.userSelect="none",document.body.style.webkitUserSelect="none"},f=c=>{const h=c.type.startsWith("touch")?c.touches[0]:c,v=h.clientX,x=h.clientY;!n&&Math.abs(v-i)<5&&Math.abs(x-o)<5||(n||(n=!0,e.style.top="auto",e.style.left="auto"),c.cancelable&&c.preventDefault(),p&&cancelAnimationFrame(p),p=requestAnimationFrame(()=>{const l=i-v,d=o-x,m=a+d,y=r+l,$=e.getBoundingClientRect(),T=-22,E=window.innerHeight-$.height-42,k=-22,G=window.innerWidth-$.width-42;e.style.bottom=Math.min(Math.max(T,m),E)+"px",e.style.right=Math.min(Math.max(k,y),G)+"px"}))},g=()=>{window.removeEventListener("mousemove",f),window.removeEventListener("mouseup",g),window.removeEventListener("touchmove",f),window.removeEventListener("touchend",g),p&&cancelAnimationFrame(p),e.style.transition="",document.body.style.userSelect="",document.body.style.webkitUserSelect="",n&&localStorage.setItem(`carmen_chat_pos_${this.bot.bu}`,JSON.stringify({bottom:e.style.bottom,right:e.style.right}))};t.addEventListener("mousedown",u),t.addEventListener("touchstart",u,{passive:!0}),t.style.cursor="move"}}class S{constructor(t={}){if(Object.keys(t).length===0&&(t=this._getConfigFromScript()),!t.bu||!t.user||!t.apiBase){console.error(b.error_missing_config),t.isCustomElement||alert(b.error_missing_config);return}this.apiBase=(t.apiBase||M.apiBase).replace(/\/$/,""),this.bu=t.bu,this.username=t.user,this.theme=t.theme||M.theme,this.title=t.title||M.title,this.prompt_extend=t.prompt_extend||null,this.showClearHistoryButton=t.showClearHistoryButton??M.showClearHistoryButton,this.showAttachFileButton=t.showAttachFileButton??M.showAttachFileButton,this.suggestedQuestions=W,this.currentImageBase64=null,this.currentRoomId=null,localStorage.removeItem(`carmen_room_${this.bu}_${this.username}`),this.api=new C(this.apiBase),this.ui=new D(this),this.chat=new V(this),this.events=new q(this),this.init()}_getConfigFromScript(){const t=document.currentScript||document.querySelector('script[src*="carmen-widget.js"]');return t?{bu:t.getAttribute("data-bu"),user:t.getAttribute("data-user"),apiBase:t.getAttribute("data-api-base"),theme:t.getAttribute("data-theme"),title:t.getAttribute("data-title"),prompt_extend:t.getAttribute("data-prompt-extend")}:{}}async init(){this.ui.injectStyles(),this.ui.createDOM(),this.ui.setupGlobalFunctions(),this.events.attach(),this.ui.showLauncher(),await this.chat.loadRoomList(),this.ui.showWelcomeMessage(),this.ui.showTooltip(),this._restoreUIState()}_restoreUIState(){const t=localStorage.getItem(`carmen_open_${this.bu}`)==="true",e=localStorage.getItem(`carmen_expanded_${this.bu}`)==="true";if(t){const i=this.ui.findElement("carmenChatWindow");i&&i.classList.add("open")}if(e){const i=this.ui.findElement("carmenChatWindow");if(i){i.classList.add("expanded");const o=this.ui.findElement("carmenSidebar");o&&o.classList.add("sidebar-visible")}}}sendMessage(t){return this.chat.sendMessage(t)}bindCopyEvent(t){this.ui.bindCopyEvent(t)}}if(window.CarmenBot=S,"customElements"in window){class s extends HTMLElement{connectedCallback(){const e=this.getAttribute("bu"),i=this.getAttribute("user"),o=this.getAttribute("api-base");e&&i&&o&&new S({bu:e,user:i,apiBase:o,theme:this.getAttribute("theme"),title:this.getAttribute("title"),isCustomElement:!0})}}customElements.define("carmen-chatbot",s)}document.currentScript&&document.currentScript.hasAttribute("data-bu")&&new S,_.CarmenBot=S,Object.defineProperty(_,Symbol.toStringTag,{value:"Module"})}));
