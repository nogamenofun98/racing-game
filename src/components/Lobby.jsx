import React, { useState } from 'react';

export default function Lobby({ roomId, racers = [], isHost, onStartRace, isStarting = false }) {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        if (!roomId) return;
        const inviteUrl = `${window.location.origin}${window.location.pathname}?roomId=${roomId}`;

        try {
            await navigator.clipboard.writeText(inviteUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // Fallback prompt if clipboard API is unavailable (e.g. non-https)
            window.prompt('Copy this invite link and share it:', inviteUrl);
        }
    };

    return (
        <div className="setup-screen">
            <h1>Lobby</h1>
            <div className="room-info">
                <h2>Room ID: <span style={{ color: '#4facfe' }}>{roomId}</span></h2>
                <p>Share this ID with your friends!</p>
                <button
                    className={`share-btn ${copied ? 'share-btn--success' : ''}`}
                    onClick={handleCopyLink}
                    disabled={!roomId}
                >
                    {copied ? 'Invite link copied!' : 'Copy invite link'}
                </button>
            </div>

            <div className="racers-list">
                <h3>Racers ({racers.length}/6)</h3>
                <div className="racers-grid">
                    {racers.map((racer, index) => (
                        <div key={racer.id || index} className="racer-card" style={{
                            borderColor: racer.isHost ? '#FFD700' : '#ccc',
                            background: 'rgba(255, 255, 255, 0.1)'
                        }}>
                            <div className="racer-avatar" style={{ backgroundColor: `hsl(${[0, 120, 240, 60, 300, 180, 30, 270][(racer.colorIndex !== undefined ? racer.colorIndex : (racer.id ? racer.id.charCodeAt(0) : 0)) % 8]}, 70%, 50%)` }}></div>
                            <span className="racer-name">
                                {racer.name} {racer.isHost && '👑'}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {isHost ? (
                <button
                    className="start-btn"
                    disabled={racers.length < 2 || isStarting}
                    onClick={onStartRace}
                >
                    {isStarting ? 'Starting...' : 'Start Race!'}
                </button>
            ) : (
                <div className="waiting-msg">
                    Waiting for host to start...
                </div>
            )}
        </div>
    );
}
