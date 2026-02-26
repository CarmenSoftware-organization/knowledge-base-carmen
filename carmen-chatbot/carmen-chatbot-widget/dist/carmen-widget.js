(function(_,M){typeof exports=="object"&&typeof module<"u"?M(exports):typeof define=="function"&&define.amd?define(["exports"],M):(_=typeof globalThis<"u"?globalThis:_||self,M(_.CarmenBot={}))})(this,(function(_){"use strict";class M{constructor(t){this.baseUrl=t.replace(/\/$/,""),this.ROOMS_KEY="carmen_rooms"}async getRooms(t,e){try{const o=localStorage.getItem(this.ROOMS_KEY);return o?JSON.parse(o):[]}catch(o){return console.warn("getRooms Error:",o),[]}}async createRoom(t,e,o="บทสนทนาใหม่"){const n={room_id:"loc_"+Math.random().toString(36).substring(2,10),title:o||"บทสนทนาใหม่",updated_at:new Date().toISOString()};try{const r=await this.getRooms();return r.unshift(n),localStorage.setItem(this.ROOMS_KEY,JSON.stringify(r)),n}catch(r){return console.error("createRoom Error:",r),n}}async getRoomHistory(t){try{if(!t)return{messages:[]};const e=localStorage.getItem(`carmen_history_${t}`);return e?JSON.parse(e):{messages:[]}}catch(e){return console.warn("getRoomHistory Error:",e),{messages:[]}}}async _pruneOldestRoom(){try{const t=await this.getRooms();if(t.length===0)return!1;const e=t.pop();return localStorage.setItem(this.ROOMS_KEY,JSON.stringify(t)),localStorage.removeItem(`carmen_history_${e.room_id}`),!0}catch(t){return console.error("Prune error",t),!1}}async saveMessage(t,e){if(!t||!e)return;let o=!1,i=0;const n=10;for(;!o&&i<n;)try{const r=await this.getRoomHistory(t);r.messages.push(e),localStorage.setItem(`carmen_history_${t}`,JSON.stringify(r));const a=await this.getRooms(),p=a.findIndex(m=>m.room_id===t);if(p!==-1){const m=a.splice(p,1)[0];m.updated_at=new Date().toISOString(),a.unshift(m),localStorage.setItem(this.ROOMS_KEY,JSON.stringify(a))}o=!0}catch(r){if(r.name==="QuotaExceededError"||r.name==="NS_ERROR_DOM_QUOTA_REACHED"){if(console.warn(`LocalStorage is full. Auto-pruning oldest room (Attempt ${i+1})...`),!await this._pruneOldestRoom()){console.error("LocalStorage full and cannot prune any more rooms.");break}i++}else{console.warn("saveMessage Error:",r);break}}}async deleteRoom(t){try{if(!t)return{status:"success"};const o=(await this.getRooms()).filter(i=>i.room_id!==t);return localStorage.setItem(this.ROOMS_KEY,JSON.stringify(o)),localStorage.removeItem(`carmen_history_${t}`),await this.clearHistory(t),{status:"success"}}catch(e){return console.error("deleteRoom Error:",e),{status:"error"}}}async sendMessage(t){const e=await fetch(`${this.baseUrl}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!e.ok){let o="Unknown Error";try{const i=await e.json();o=i.detail||JSON.stringify(i)}catch{o=await e.text()}throw new Error(`API Error ${e.status}: ${o}`)}return await e.json()}async sendFeedback(t,e){try{await fetch(`${this.baseUrl}/api/chat/feedback/${t}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({score:e})})}catch(o){console.error("Feedback Error:",o)}}async clearHistory(t){try{if(!t)return;await fetch(`${this.baseUrl}/api/chat/clear/${t}`,{method:"DELETE"})}catch(e){console.warn("ClearHistory API Error:",e)}}async getHistory(t,e,o){try{const i=new URLSearchParams({bu:t,username:e,session_id:o||""}),n=await fetch(`${this.baseUrl}/chat/history?${i.toString()}`);return n.ok?await n.json():[]}catch(i){return console.warn("Legacy getHistory Error:",i),[]}}}function A(s="#34558b"){return`
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

    /* Floating Dropdown Menu (Replaced Sidebar) */
    .room-dropdown-container {
        position: relative !important;
        display: none !important; /* Hidden by default */
    }
    
    /* Show dropdown button ONLY when chat box is expanded */
    .chat-box.expanded .room-dropdown-container {
        display: block !important;
    }

    .room-dropdown-menu {
        position: absolute !important;
        top: 100% !important;
        right: 0 !important;
        width: 250px !important;
        margin-top: 12px !important;
        background: rgba(30, 41, 59, 0.98) !important;
        backdrop-filter: blur(16px) saturate(180%) !important;
        -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 16px !important;
        box-shadow: 0 20px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05) inset !important;
        overflow: hidden !important;
        display: none !important;
        flex-direction: column !important;
        max-height: 400px !important;
        z-index: 200 !important;
        animation: dropdownIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        transform-origin: top right !important;
    }

    .room-dropdown-menu.show {
        display: flex !important;
    }
    
    @keyframes dropdownIn {
        from { opacity: 0; transform: scale(0.9) translateY(-10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }

    .dropdown-header {
        padding: 16px !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        color: white !important;
        font-weight: 600 !important;
        font-size: 14px !important;
    }

    .new-chat-btn {
        width: 28px !important;
        height: 28px !important;
        background: var(--primary-gradient) !important;
        border: none !important;
        color: white !important;
        border-radius: 8px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 18px !important;
        transition: all 0.2s !important;
    }
    .new-chat-btn:hover {
        transform: scale(1.1) !important;
        box-shadow: 0 4px 12px rgba(52, 85, 139, 0.4) !important;
    }

    .room-list { 
        flex: 1 !important; 
        overflow-y: auto !important; 
        padding: 8px !important; 
        display: flex !important; flex-direction: column !important; gap: 4px !important;
    }
    .room-dropdown-item {
        padding: 12px 14px !important; border-radius: 10px !important;
        color: #94a3b8 !important; cursor: pointer !important;
        display: flex !important; align-items: center !important; justify-content: space-between !important;
        transition: all 0.2s !important; 
        background: transparent !important;
        border: 1px solid transparent !important;
    }
    .room-dropdown-item:hover { 
        background: rgba(255,255,255,0.08) !important; 
        color: white !important; 
        border-color: rgba(255,255,255,0.05) !important;
    }
    .room-dropdown-item.active { 
        background: rgba(52, 85, 139, 0.2) !important; 
        color: white !important; 
        border-color: rgba(52, 85, 139, 0.4) !important;
    }
    .room-title { font-size: 13.5px !important; font-weight: 500 !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; flex: 1 !important; margin-right: 8px !important; }
    .delete-room-btn { 
        opacity: 0; color: #f87171 !important; font-size: 18px !important; 
        border: none !important; background: transparent !important; 
        cursor: pointer !important; transition: 0.2s !important; 
        padding: 0 4px !important; line-height: 1 !important;
    }
    .room-dropdown-item:hover .delete-room-btn { opacity: 1 !important; }
    .delete-room-btn:hover { color: #ef4444 !important; transform: scale(1.2) !important; }

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
        background: rgba(255, 255, 255, 0.95) !important; width: 100% !important; max-width: 340px !important;
        padding: 28px !important; border-radius: 20px !important;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.5) inset !important;
        backdrop-filter: blur(20px) !important;
        text-align: center !important; transform: scale(1) !important;
        border: 1px solid rgba(0,0,0,0.05) !important;
        animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
        font-family: var(--font-inter) !important;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
    
    .alert-icon { 
        width: 56px !important; height: 56px !important; 
        background: #fee2e2 !important; color: #ef4444 !important; 
        border-radius: 50% !important; 
        display: flex !important; align-items: center !important; justify-content: center !important; 
        margin: 0 auto 16px auto !important; 
    }
    .alert-icon svg { width: 28px !important; height: 28px !important; }
    .alert-title { font-weight: 700 !important; font-size: 18px !important; margin-bottom: 8px !important; color: #0f172a !important; font-family: var(--font-sarabun) !important; }
    .alert-desc { color: var(--text-gray) !important; font-size: 14px !important; line-height: 1.5 !important; margin-bottom: 0 !important; font-family: var(--font-sarabun) !important; }
    .alert-actions {
        display: flex !important; gap: 12px !important; justify-content: center !important; margin-top: 24px !important;
    }
    .btn-alert { 
        padding: 12px 20px !important; border-radius: 12px !important; font-weight: 600 !important; cursor: pointer !important; transition: 0.2s !important; width: 100% !important; flex: 1 !important;
        display: flex !important; justify-content: center !important; align-items: center !important; border: transparent; font-family: var(--font-inter) !important;
    }
    .btn-confirm { background: #ef4444 !important; color: white !important; }
    .btn-confirm:hover { background: #dc2626 !important; transform: scale(1.02) !important; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3) !important; }
    .btn-cancel { background: transparent !important; color: var(--text-dark) !important; border: 1px solid #cbd5e1 !important; }
    .btn-cancel:hover { background: #f1f5f9 !important; }

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
        </div>`,clear:'<svg viewBox="0 0 24 24"><path d="M15 16h4v2h-4zm0-8h7v2h-7zm0 4h6v2h-6zM3 18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V8H3v10zM14 5h-3l-1-1H6L5 5H2v2h12z"/></svg>',close:'<svg viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>',send:'<svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>',copy:'<svg viewBox="0 0 24 24" width="14" height="14" style="display:block;"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="#64748b"/></svg>',check:'<svg viewBox="0 0 24 24" width="14" height="14"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" fill="#16a34a"/></svg>',thumbsUp:"👍",thumbsDown:"👎",clip:'<svg viewBox="0 0 24 24" width="24" height="24" fill="#64748b"><path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z"/></svg>'};function B(s,t=!1){return`
        <div class="room-dropdown-item ${t?"active":""}" data-id="${s.room_id}">
            <div class="room-title" title="${s.title||"บทสนทนาใหม่"}">
                ${s.title||"บทสนทนาใหม่"}
            </div>
            <button class="delete-room-btn" data-id="${s.room_id}" title="ลบห้อง">×</button>
        </div>
    `}function R(){return`
        <div class="msg bot-msg typing-indicator-container">
            <div class="typing-dots">
                <span></span><span></span><span></span>
            </div>
        </div>
    `}function z(s={showClear:!0,showAttach:!0}){const{showClear:t,showAttach:e}=s;return`
        <div class="chat-btn" id="carmen-launcher">${w.launcher}</div>
        
        <div class="chat-box" id="carmenChatWindow">

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
                        <!-- Dropdown button will only be displayed when parent has .carmen-expanded -->
                        <div class="room-dropdown-container" id="carmenRoomDropdownContainer">
                            <div class="icon-btn room-dropdown-btn" id="carmen-room-dropdown-btn" title="ประวัติการสนทนา">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z"></path>
                                    <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"></path>
                                </svg>
                            </div>
                            <div class="room-dropdown-menu" id="carmenRoomDropdownMenu" style="display: none;">
                                <div class="dropdown-header">
                                    <span>ประวัติแชท</span>
                                    <button id="new-chat-btn" class="new-chat-btn" title="เริ่มแชทใหม่">+</button>
                                </div>
                                <div class="room-list" id="carmenRoomList">
                                    <!-- Room items will be injected here -->
                                </div>
                            </div>
                        </div>

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
    `}function H(){return`
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
    `}function $(s,t,e){return s!=="bot"?"":`
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
    `}const N=Object.freeze(Object.defineProperty({__proto__:null,createMessageExtras:$,createRoomItemHTML:B,createTooltipHTML:H,createTypingIndicatorHTML:R,createWidgetHTML:z},Symbol.toStringTag,{value:"Module"}));function O(s){if(!s)return null;try{const t=/^.*((youtu.be\/)|(v\/)|(\/(u)\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/,e=s.match(t);return e&&e[7]&&e[7].trim()?e[7].trim():null}catch{return null}}function D(s){const t=/\[(.*?)\]\((https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)\)/g;s=s.replace(t,(o,i,n)=>{const r=O(n);return r?`<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${r}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`:o});const e=/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;return s=s.replace(e,(o,i,n,r)=>{const a=r.substring(Math.max(0,n-10),n);if(/src=['"]$|href=['"]$|\($/.test(a)||r.substring(Math.max(0,n-100),n).includes("carmen-processed-video"))return o;const m=O(o);return m?`<div class="carmen-processed-video" style="margin:8px 0; border-radius:10px; overflow:hidden; position:relative; width:100%; padding-bottom:56.25%; height:0;"><iframe src="https://www.youtube.com/embed/${m}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:none; border-radius:10px;" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>`:o}),s}function Y(s,t){const e=o=>{let i=o.trim();if(i.includes("youtube.com")||i.includes("youtu.be")||i.startsWith("data:"))return i;const n=r=>r.replace(/^https?:\/\/[^\/]+/,"").split("?")[0].replace(/^\/images\//,"").replace(/^\.\//,"").replace(/^\/+/,"");if(/^(http|https):/.test(i)){if(!(i.includes("127.0.0.1")||i.includes("localhost")||t&&i.startsWith(t))){const a=i.split("/").pop().split("?")[0];return`${t}/images/${a}`}return i.includes("/images/")?i:`${t}/images/${n(i)}`}return`${t}/images/${n(i)}`};return s=s.replace(/!\[(.*?)\]\((.*?)\)/g,(o,i,n)=>{if(n.includes("youtube.com")||n.includes("youtu.be"))return o;const r=e(n);return`<br><a href="${r}" target="_blank"><img src="${r}" alt="${i}" class="carmen-processed-img"></a><br>`}),s=s.replace(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi,(o,i)=>{if(o.includes("carmen-processed-img")||i.includes("youtube"))return o;const n=e(i);return`<br><a href="${n}" target="_blank"><img src="${n}" class="carmen-processed-img"></a><br>`}),s=s.replace(/(?:^|[\s>])(?:ดูรูป\s*)?`?((?:[\w\-\u2010\u2011\u2012\u2013]+\/)*[\w\-\u2010\u2011\u2012\u2013]+\.(?:png|jpg|jpeg|gif|svg|webp))`?/gi,(o,i)=>{const r=i.replace(/[\u2010\u2011\u2012\u2013\u2014]/g,"-").replace(/^carmen_cloud\//,""),a=`${t}/images/${r}`;return`<br><a href="${a}" target="_blank"><img src="${a}" alt="${r}" class="carmen-processed-img"></a><br>`}),s=s.replace(/<img[^>]*$/gi,""),s}function F(s){const t=/(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^\s<)"']+)/g;return s=s.replace(t,(e,o,i,n)=>{const r=n.substring(Math.max(0,i-10),i);return/src=['"]$|href=['"]$|>$/.test(r)?e:`<a href="${e}" target="_blank" style="color:#2563eb; text-decoration:underline;">${e}</a>`}),s}function U(s){const t=s.split(`
`);let e=[],o=!1,i=0,n=0;for(let r of t){let a=r.trim();if(/^---+$/.test(a)){o&&(e.push("</ul>"),o=!1),i=0,n=0,e.push('<hr style="border:none; border-top:1px solid #e2e8f0; margin:12px 0;">');continue}if(/^### (.+)$/.test(a)){o&&(e.push("</ul>"),o=!1),i=0,n=0,e.push(`<div style="font-weight:700; font-size:15px; margin:12px 0 6px 0;">${a.replace(/^### /,"")}</div>`);continue}if(/^## (.+)$/.test(a)){o&&(e.push("</ul>"),o=!1),i=0,n=0,e.push(`<div style="font-weight:700; font-size:16px; margin:14px 0 6px 0;">${a.replace(/^## /,"")}</div>`);continue}if(/^[-*] (.+)$/.test(a)){n=0,o||(e.push("<ul>"),o=!0),e.push(`<li>${a.replace(/^[-*] /,"")}</li>`);continue}const p=a.match(/^(\d+)\.\s+(.+)$/);if(p){o&&(e.push("</ul>"),o=!1),i++,n=0;const m=p[1],x=p[2];e.push(`<div style="display:flex; gap:8px; margin:6px 0 2px 0;"><b style="min-width:20px; color:#1e40af;">${m}.</b><span>${x}</span></div>`);continue}o&&!/^[-*] /.test(a)&&(e.push("</ul>"),o=!1),a===""?(n++,n>=2&&(i=0),e.length>0&&e[e.length-1]!=="<br>"&&e.push("<br>")):(n=0,/^\*\*.+\*\*/.test(a)&&(i=0),i>0?a.startsWith("<br><a href=")||a.startsWith("<img")||a.includes("carmen-processed-video")?e.push(`<div style="margin:2px 0 8px 28px;">${a}</div>`):e.push(`<div style="margin:2px 0 6px 28px; color:#475569;">${a}</div>`):e.push(a+"<br>"))}return o&&e.push("</ul>"),e.join("")}function P(s){return s=s.replace(/`([^`]+)`/g,'<code style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-size:13px;">$1</code>'),s=s.replace(/\*\*(.*?)\*\*/g,"<b>$1</b>"),s=s.replace(new RegExp("(?<!\\*)\\*([^*]+)\\*(?!\\*)","g"),"<i>$1</i>"),s}function j(s,t){if(!s)return"";let e=String(s);const o=t?t.replace(/\/$/,""):"";return e=D(e),e=Y(e,o),e=F(e),e=U(e),e=e.replace(/(<br>){3,}/g,"<br><br>"),e=P(e),e}const C={theme:"#34558b",title:"Carmen AI Specialist",showClearHistoryButton:!1,showAttachFileButton:!1,apiBase:""},V=["กดปุ่ม refresh ใน workbook ไม่ได้ ทำยังไง","บันทึกใบกำกับภาษีซื้อ ใน excel แล้ว import ได้หรือไม่","program carmen สามารถ upload file เข้า program RDPrep ของสรรพากรได้ หรือไม่","ฉันสามารถสร้าง ใบเสร็จรับเงิน โดยไม่เลือก Tax Invoice ได้หรือไม่","ฉันสามารถบันทึก JV โดยที่ debit และ credit ไม่เท่ากันได้หรือไม่"],f={error_missing_config:"❌ CarmenBot Error: กรุณาระบุ 'bu', 'user' และ 'apiBase' ใน Config ด้วยครับ (Required)",welcome_title:"สวัสดีค่ะ Carmen พร้อมช่วย!",welcome_desc:"สอบถามข้อมูลจากคู่มือบริษัท หรือเริ่มบทสนทนาใหม่ได้ทันทีด้านล่างนี้ค่ะ",history_loading:"⏳ กำลังโหลด...",alert_confirm:"ตกลง",alert_cancel:"ยกเลิก",delete_room_confirm_title:"ยืนยันลบห้องแชท?",delete_room_confirm_desc:"บทสนทนาที่เลือกจะถูกลบถาวร และไม่สามารถกู้คืนได้",clear_history_confirm_title:"ล้างประวัติห้องนี้?",clear_history_confirm_desc:"ข้อความในห้องนี้จะถูกลบทั้งหมด",file_too_large:"ไฟล์ใหญ่เกินไป",file_too_large_desc:"ไม่เกิน 5MB ครับ"};class W{constructor(t){this.bot=t,this.theme=t.theme,this.title=t.title||"Carmen AI Specialist",this.shadow=null}findElement(t){if(!this.shadow)return document.getElementById(t)||document.querySelector(t);if(!t.includes(" ")&&!t.includes(".")&&!t.startsWith("#")){const e=this.shadow.getElementById(t);return e||this.shadow.querySelector(`#${t}`)}return this.shadow.querySelector(t)}injectStyles(){if(this.shadow&&this.shadow.getElementById("carmen-style"))return;const t=document.createElement("link");t.href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sarabun:wght@300;400;500;600&display=swap",t.rel="stylesheet",document.head.appendChild(t);const e=document.createElement("style");e.id="carmen-style",e.innerText=A(this.theme),this.shadow?this.shadow.appendChild(e):document.head.appendChild(e)}createDOM(){if(document.getElementById("carmen-chat-widget"))return;const t=document.createElement("div");t.id="carmen-chat-widget",Object.assign(t.style,{position:"fixed",bottom:"32px",right:"32px",zIndex:"2000000",width:"0",height:"0",display:"block",pointerEvents:"none"}),document.body.appendChild(t),this.shadow=t.attachShadow({mode:"open"}),this.shadow.innerHTML=z({showClear:this.bot.showClearHistoryButton,showAttach:this.bot.showAttachFileButton}),this.injectStyles();const e=this.findElement(".title-wrapper h3");e&&(e.textContent=this.title)}showWelcomeMessage(){const t=this.findElement("carmenChatBody");if(!t)return;t.innerHTML="";const e=document.createElement("div");e.className="welcome-hero";const o=f.welcome_title;e.innerHTML=`
            <div class="hero-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>
            </div>
            <h2 id="welcome-typing-title"></h2>
            <p style="opacity: 0; transform: translateY(10px); transition: all 0.8s ease;" id="welcome-desc-text">${f.welcome_desc}</p>
        `,t.appendChild(e);const i=this.findElement("welcome-typing-title"),n=this.findElement("welcome-desc-text");let r=0;const a=()=>{r<o.length?(i.textContent+=o.charAt(r),r++,setTimeout(a,40)):n&&(n.style.opacity="1",n.style.transform="translateY(0)")};setTimeout(a,300),setTimeout(()=>this.addSuggestions(),1200)}showModal({title:t,text:e,icon:o="💡",confirmText:i=f.alert_confirm,cancelText:n=null,onConfirm:r=null}){const a=this.findElement("carmen-alert-overlay"),p=this.findElement("carmen-alert-icon"),m=this.findElement("carmen-alert-title"),x=this.findElement("carmen-alert-desc"),u=this.findElement("carmen-alert-actions");if(!a)return;if(p.innerHTML=o,m.textContent=t,x.innerHTML=e,u.innerHTML="",n){const d=document.createElement("button");d.className="btn-alert btn-cancel",d.textContent=n,d.onclick=()=>{a.style.display="none"},u.appendChild(d)}const l=document.createElement("button");l.className="btn-alert btn-confirm",l.textContent=i,l.onclick=()=>{a.style.display="none",r&&r()},u.appendChild(l),a.style.display="flex"}scrollToBottom(){const t=this.findElement("carmenChatBody");t&&(t.scrollTop=t.scrollHeight)}addMessage(t,e,o=null,i=null){const n=this.findElement("carmenChatBody");if(!n)return;const r=document.createElement("div");r.className=`msg ${e}`;const a=j(t||"",this.bot.apiBase),p=typeof $=="function"?$(e,o):"";r.innerHTML=a+p,n.appendChild(r),this.scrollToBottom(),e==="bot"&&this.bot.bindCopyEvent(r)}addStreamingMessage(){const t=this.findElement("carmenChatBody");if(!t)return{};const e=document.createElement("div");e.className="msg bot";const o=Date.now();return e.innerHTML=`
            <div class="typing-indicator" id="loading-${o}">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
            <span id="streaming-content-${o}" style="display:none;"></span>
        `,t.appendChild(e),this.scrollToBottom(),{container:e,loader:e.querySelector(`#loading-${o}`),span:e.querySelector(`#streaming-content-${o}`)}}addSuggestions(t){this.shadow&&this.shadow.querySelectorAll(".suggestions-container").forEach(n=>n.remove());const e=t||this.bot.suggestedQuestions;if(!e||e.length===0)return;const o=this.findElement("carmenChatBody"),i=document.createElement("div");i.className="suggestions-container",e.forEach((n,r)=>{const a=document.createElement("button");a.innerText=n,a.className="suggestion-chip",a.style.animationDelay=`${r*.1}s`,a.onclick=()=>{this.bot.sendMessage(n),i.remove()},i.appendChild(a)}),o.appendChild(i),this.scrollToBottom()}clearImageSelection(){this.bot.currentImageBase64=null;const t=this.findElement("carmen-file-input");t&&(t.value="");const e=this.findElement("carmenImagePreview");e&&(e.style.display="none")}renderRoomList(t,e){const o=this.findElement("carmenRoomList");o&&(t&&t.length>0?(o.innerHTML="",t.forEach(i=>{const n=i.room_id===e,r=document.createElement("div");r.innerHTML=B(i,n),o.appendChild(r.firstElementChild)})):o.innerHTML='<div style="padding:16px; text-align:center; color:#64748b; font-size:13px;">ไม่มีประวัติการสนทนา</div>')}showTooltip(){if(localStorage.getItem(`carmen_tooltip_seen_${this.bot.bu}`))return;const e=document.getElementById("carmen-chat-widget"),o=document.createElement("div");o.className="chat-tooltip",o.id="carmen-tooltip",o.innerHTML=H(),this.shadow?this.shadow.appendChild(o):e.appendChild(o),setTimeout(()=>o.classList.add("show"),2e3);const i=this.findElement("carmen-tooltip-close"),n=this.findElement("carmen-launcher"),r=()=>{o.classList.remove("show"),setTimeout(()=>o.remove(),500),localStorage.setItem(`carmen_tooltip_seen_${this.bot.bu}`,"true")};i&&(i.onclick=a=>{a.stopPropagation(),r()}),o&&(o.onclick=()=>{n&&n.click(),r()}),n&&n.addEventListener("click",r)}setupGlobalFunctions(){window.carmenRate=async(t,e,o)=>{const i=o.parentElement;i.innerHTML=e===1?'<span style="font-size:11px; color:#16a34a;">ขอบคุณค่ะ ❤️</span>':'<span style="font-size:11px; color:#991b1b;">ขอบคุณค่ะ 🙏</span>',await this.bot.api.sendFeedback(t,e)}}bindCopyEvent(t){const e=t.querySelector(".copy-btn");if(!e)return;e.onclick=()=>{const i=t.querySelector(".msg-bubble span")||t.querySelector(".msg-bubble")||t,n=i.innerText||i.textContent,r=()=>{const a=e.innerHTML;e.innerHTML=w.check,setTimeout(()=>{e.innerHTML=a},2e3)};navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(n).then(r).catch(()=>o(n,r)):o(n,r)};function o(i,n){const r=document.createElement("textarea");r.value=i,r.style.cssText="position:fixed;left:-9999px",document.body.appendChild(r),r.select();try{document.execCommand("copy"),n()}catch(a){console.error("Fallback copy failed",a)}document.body.removeChild(r)}}showLauncher(){const t=this.findElement("carmen-launcher");t&&(t.style.display="flex")}}class J{constructor(t){this.bot=t,this.api=t.api,this.roomKey="carmen_current_room",this.typingBuffer="",this.isTyping=!1}async createNewChat(){this.bot.currentRoomId&&await this.api.clearHistory(this.bot.currentRoomId),this.bot.currentRoomId=null,localStorage.removeItem(this.roomKey),this.bot.ui.showWelcomeMessage(),await this.loadRoomList()}async switchRoom(t){this.bot.currentRoomId!==t&&(this.bot.currentRoomId=t,localStorage.setItem(this.roomKey,t),await this.loadHistory(t),await this.loadRoomList())}async deleteChatRoom(t){this.bot.ui.showModal({icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',title:f.delete_room_confirm_title,text:f.delete_room_confirm_desc,confirmText:"ลบทิ้ง",cancelText:f.alert_cancel,onConfirm:async()=>{try{await this.api.deleteRoom(t),this.bot.currentRoomId===t?this.createNewChat():await this.loadRoomList()}catch(e){console.error("Delete Error:",e)}}})}async loadRoomList(){try{const t=await this.api.getRooms();this.bot.ui.renderRoomList(t,this.bot.currentRoomId)}catch(t){console.error("Room List Error:",t)}}async loadHistory(t){const e=this.bot.ui.findElement("carmenChatBody");if(e){e.children.length===0&&(e.innerHTML=`<div style="text-align:center; padding:20px; color:#94a3b8;">${f.history_loading}</div>`);try{const o=await this.api.getRoomHistory(t);e.innerHTML="",o.messages&&o.messages.length>0?(o.messages.forEach(i=>{this.bot.ui.addMessage(i.message,i.sender,i.id,i.sources)}),setTimeout(()=>this.bot.ui.scrollToBottom(),100)):this.bot.ui.showWelcomeMessage()}catch(o){console.warn("History Load Error:",o),this.createNewChat()}}}async sendMessage(t=null){const e=this.bot.ui.findElement("carmenUserInput"),o=t||e.value.trim();if(!o&&!this.bot.currentImageBase64)return;if(!this.bot.currentRoomId)try{const d=o.substring(0,30)+(o.length>30?"...":""),y=await this.api.createRoom(this.bot.bu,this.bot.username,d);this.bot.currentRoomId=y.room_id,localStorage.setItem(this.roomKey,this.bot.currentRoomId),await this.loadRoomList()}catch{this.bot.ui.addMessage("⚠️ สร้างห้องสนทนาไม่สำเร็จ","bot");return}let i=o;this.bot.currentImageBase64&&(i=`<img src="${this.bot.currentImageBase64}" style="max-width:100%; border-radius:8px; margin-bottom:5px;"><br>${o}`),this.bot.ui.addMessage(i,"user"),await this.api.saveMessage(this.bot.currentRoomId,{sender:"user",message:o,image:!!this.bot.currentImageBase64,timestamp:new Date().toISOString()}),e.value="";const n=this.bot.currentImageBase64;this.bot.ui.clearImageSelection(),this.bot.ui.shadow&&this.bot.ui.shadow.querySelectorAll(".suggestions-container").forEach(d=>d.remove());const r=this.bot.ui.addStreamingMessage();r.loader&&(r.loader.style.display="none");const a=R(),p=document.createElement("div");p.innerHTML=a;const m=p.firstElementChild;r.container.appendChild(m),this.bot.ui.scrollToBottom();let x="",u=null,l=null;try{const y=(await fetch(`${this.bot.apiBase}/api/chat/stream`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:o,image:n,bu:this.bot.bu,username:this.bot.username,room_id:this.bot.currentRoomId,prompt_extend:this.bot.prompt_extend})})).body.getReader(),v=new TextDecoder("utf-8");this.typingBuffer="";let c="",h=!0;const b=()=>{if(this.typingBuffer.length>0){h&&(m&&m.remove(),r.span&&(r.span.style.display="block"),h=!1);const g=this.typingBuffer.length>50?5:this.typingBuffer.length>10?2:1;c+=this.typingBuffer.substring(0,g),this.typingBuffer=this.typingBuffer.substring(g),r.span&&(r.span.innerHTML=j(c,this.bot.apiBase),this.bot.ui.scrollToBottom())}(this.isTyping||this.typingBuffer.length>0)&&requestAnimationFrame(()=>setTimeout(b,15))};for(this.isTyping=!0,b();;){const{done:g,value:E}=await y.read();if(g)break;const S=v.decode(E,{stream:!0}).split(`
`);for(const I of S)if(I.trim())try{const k=JSON.parse(I);k.type==="chunk"?(this.typingBuffer+=k.data,x+=k.data):k.type==="sources"?u=k.data:k.type==="done"&&(l=k.id,this.loadRoomList())}catch{}}if(this.isTyping=!1,r.loader&&r.loader.remove(),l&&r.container){const{createMessageExtras:g}=await Promise.resolve().then(()=>N),E=g("bot",l,u);r.container.insertAdjacentHTML("beforeend",E),this.bot.bindCopyEvent(r.container),await this.api.saveMessage(this.bot.currentRoomId,{id:l,sender:"bot",message:x,sources:u,timestamp:new Date().toISOString()})}}catch(d){console.error("Stream Error:",d)}}}class q{constructor(t){this.bot=t,this.closeTimeout=null}attach(){const t=this.bot.ui.findElement("carmenChatWindow"),e=this.bot.ui.findElement("carmen-launcher"),o=this.bot.ui.findElement("carmen-close-btn"),i=this.bot.ui.findElement("carmen-expand-btn"),n=this.bot.ui.findElement("new-chat-btn"),r=this.bot.ui.findElement("carmenRoomList"),a=this.bot.ui.findElement("carmen-room-dropdown-btn"),p=this.bot.ui.findElement("carmenRoomDropdownMenu"),m=this.bot.ui.findElement(".chat-header");this.bot.ui.shadow&&this.bot.ui.shadow.addEventListener("click",c=>{p&&p.classList.contains("show")&&(c.target.closest("#carmenRoomDropdownContainer")||p.classList.remove("show"))});const x=()=>{t.classList.contains("closing")||(t.classList.add("closing"),p&&p.classList.remove("show"),localStorage.setItem(`carmen_open_${this.bot.bu}`,"false"),localStorage.setItem(`carmen_expanded_${this.bot.bu}`,"false"),this.closeTimeout=setTimeout(()=>{t.classList.remove("open","expanded","closing"),this.closeTimeout=null},800))};if(e&&(e.onclick=()=>{const c=t.classList.contains("open"),h=t.classList.contains("closing");c&&!h?x():(this.closeTimeout&&(clearTimeout(this.closeTimeout),this.closeTimeout=null),t.classList.remove("closing"),t.classList.add("open"),localStorage.setItem(`carmen_open_${this.bot.bu}`,"true"),p&&p.classList.remove("show"),setTimeout(()=>this.bot.ui.scrollToBottom(),100))}),m&&t){const c=localStorage.getItem(`carmen_chat_pos_${this.bot.bu}`);if(c)try{const h=JSON.parse(c);t.style.bottom=h.bottom,t.style.right=h.right}catch{}this._setupDraggable(m,t)}o&&(o.onclick=x),i&&(i.onclick=()=>{const c=!t.classList.contains("expanded");if(t.classList.add("resizing"),t.classList.toggle("expanded"),localStorage.setItem(`carmen_expanded_${this.bot.bu}`,c?"true":"false"),c)t.style.bottom="",t.style.right="";else{const h=localStorage.getItem(`carmen_chat_pos_${this.bot.bu}`);if(h)try{const b=JSON.parse(h);t.style.bottom=b.bottom,t.style.right=b.right}catch{}}!c&&p&&p.classList.remove("show"),setTimeout(()=>{t.classList.remove("resizing"),this.bot.ui.scrollToBottom()},600)}),n&&(n.onclick=()=>{p&&p.classList.remove("show"),this.bot.chat.createNewChat()}),a&&p&&(a.onclick=c=>{c.stopPropagation(),p.classList.toggle("show")}),r&&(r.onclick=async c=>{const h=c.target.closest(".delete-room-btn"),b=c.target.closest(".room-dropdown-item");if(h){c.stopPropagation();const g=h.getAttribute("data-id");this.bot.chat.deleteChatRoom(g);return}if(b){const g=b.getAttribute("data-id");this.bot.chat.switchRoom(g),p&&p.classList.remove("show")}});const u=this.bot.ui.findElement("carmen-clear-btn");u&&(u.onclick=()=>{this.bot.currentRoomId&&this.bot.ui.showModal({icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>',title:f.clear_history_confirm_title,text:f.clear_history_confirm_desc,confirmText:"ลบเลย",cancelText:f.alert_cancel,onConfirm:async()=>{await this.bot.api.clearHistory(this.bot.bu,this.bot.username,this.bot.currentRoomId),await this.bot.chat.loadHistory(this.bot.currentRoomId)}})});const l=this.bot.ui.findElement("carmen-attach-btn");if(l){const c=this.bot.ui.findElement("carmen-file-input");l.onclick=()=>c.click(),c.onchange=h=>{const b=h.target.files[0];if(!b)return;if(b.size>5*1024*1024){this.bot.ui.showModal({icon:"⚠️",title:f.file_too_large,text:f.file_too_large_desc}),c.value="";return}const g=new FileReader;g.onload=E=>{this.bot.currentImageBase64=E.target.result;const T=this.bot.ui.findElement("carmenImagePreview"),S=this.bot.ui.findElement("preview-img-element");T&&S&&(S.src=this.bot.currentImageBase64,T.style.display="flex")},g.readAsDataURL(b)}}const d=this.bot.ui.findElement("clear-image-btn");d&&(d.onclick=()=>this.bot.ui.clearImageSelection());const y=this.bot.ui.findElement("carmen-send-btn"),v=this.bot.ui.findElement("carmenUserInput");y&&(y.onclick=()=>{this.bot.chat.sendMessage(),v&&(v.style.height="auto")}),v&&(v.addEventListener("input",function(){this.style.height="auto",this.style.height=this.scrollHeight+"px"}),v.addEventListener("keydown",c=>{c.key==="Enter"&&!c.shiftKey&&(c.preventDefault(),this.bot.chat.sendMessage(),v.style.height="auto")}))}_setupDraggable(t,e){let o=0,i=0,n=0,r=0,a=!1,p=null;const m=l=>{if(e.classList.contains("expanded"))return;const d=l.type.startsWith("touch")?l.touches[0]:l;o=d.clientX,i=d.clientY;const y=window.getComputedStyle(e);n=parseInt(y.bottom)||84,r=parseInt(y.right)||0,window.addEventListener("mousemove",x,{passive:!1}),window.addEventListener("mouseup",u),window.addEventListener("touchmove",x,{passive:!1}),window.addEventListener("touchend",u),a=!1,e.style.transition="none",document.body.style.userSelect="none",document.body.style.webkitUserSelect="none"},x=l=>{const d=l.type.startsWith("touch")?l.touches[0]:l,y=d.clientX,v=d.clientY;!a&&Math.abs(y-o)<5&&Math.abs(v-i)<5||(a||(a=!0,e.style.top="auto",e.style.left="auto"),l.cancelable&&l.preventDefault(),p&&cancelAnimationFrame(p),p=requestAnimationFrame(()=>{const c=o-y,h=i-v,b=n+h,g=r+c,E=e.getBoundingClientRect(),T=-22,S=window.innerHeight-E.height-42,I=-22,k=window.innerWidth-E.width-42;e.style.bottom=Math.min(Math.max(T,b),S)+"px",e.style.right=Math.min(Math.max(I,g),k)+"px"}))},u=()=>{window.removeEventListener("mousemove",x),window.removeEventListener("mouseup",u),window.removeEventListener("touchmove",x),window.removeEventListener("touchend",u),p&&cancelAnimationFrame(p),e.style.transition="",document.body.style.userSelect="",document.body.style.webkitUserSelect="",a&&localStorage.setItem(`carmen_chat_pos_${this.bot.bu}`,JSON.stringify({bottom:e.style.bottom,right:e.style.right}))};t.addEventListener("mousedown",m),t.addEventListener("touchstart",m,{passive:!0}),t.style.cursor="move"}}class L{constructor(t={}){if(Object.keys(t).length===0&&(t=this._getConfigFromScript()),!t.bu||!t.user||!t.apiBase){console.error(f.error_missing_config),t.isCustomElement||alert(f.error_missing_config);return}this.apiBase=(t.apiBase||C.apiBase).replace(/\/$/,""),this.bu=t.bu,this.username=t.user,this.theme=t.theme||C.theme,this.title=t.title||C.title,this.prompt_extend=t.prompt_extend||null,this.showClearHistoryButton=t.showClearHistoryButton??C.showClearHistoryButton,this.showAttachFileButton=t.showAttachFileButton??C.showAttachFileButton,this.suggestedQuestions=V,this.currentImageBase64=null,this.currentRoomId=null,localStorage.removeItem(`carmen_room_${this.bu}_${this.username}`),this.api=new M(this.apiBase),this.ui=new W(this),this.chat=new J(this),this.events=new q(this),this.init()}_getConfigFromScript(){const t=document.currentScript||document.querySelector('script[src*="carmen-widget.js"]');return t?{bu:t.getAttribute("data-bu"),user:t.getAttribute("data-user"),apiBase:t.getAttribute("data-api-base"),theme:t.getAttribute("data-theme"),title:t.getAttribute("data-title"),prompt_extend:t.getAttribute("data-prompt-extend")}:{}}async init(){this.ui.injectStyles(),this.ui.createDOM(),this.ui.setupGlobalFunctions(),this.events.attach(),this.ui.showLauncher(),await this.chat.loadRoomList(),this.ui.showWelcomeMessage(),this.ui.showTooltip(),this._restoreUIState()}_restoreUIState(){const t=localStorage.getItem(`carmen_open_${this.bu}`)==="true",e=localStorage.getItem(`carmen_expanded_${this.bu}`)==="true";if(t){const o=this.ui.findElement("carmenChatWindow");o&&o.classList.add("open")}if(e){const o=this.ui.findElement("carmenChatWindow");if(o){o.classList.add("expanded");const i=this.ui.findElement("carmenSidebar");i&&i.classList.add("sidebar-visible")}}}sendMessage(t){return this.chat.sendMessage(t)}bindCopyEvent(t){this.ui.bindCopyEvent(t)}}if(window.CarmenBot=L,"customElements"in window){class s extends HTMLElement{connectedCallback(){const e=this.getAttribute("bu"),o=this.getAttribute("user"),i=this.getAttribute("api-base");e&&o&&i&&new L({bu:e,user:o,apiBase:i,theme:this.getAttribute("theme"),title:this.getAttribute("title"),isCustomElement:!0})}}customElements.define("carmen-chatbot",s)}document.currentScript&&document.currentScript.hasAttribute("data-bu")&&new L,_.CarmenBot=L,Object.defineProperty(_,Symbol.toStringTag,{value:"Module"})}));
