import React, { useState, useEffect, useCallback } from 'react';

export default function GameControls({ racers, onBoost }) {
    const [boostEffects, setBoostEffects] = useState({});

    const handleBoost = useCallback((racerId) => {
        // No cooldown gate (user removed). Fire immediately.
        onBoost(racerId);

        // Local burst feedback (approx mirrors host-side randomness distribution)
        const roll = Math.random();
        const effect = roll > 0.8 ? 'mega' : roll > 0.55 ? 'strong' : 'light';
        setBoostEffects(prev => ({ ...prev, [racerId]: effect }));
        setTimeout(() => {
            setBoostEffects(prev => {
                const next = { ...prev };
                delete next[racerId];
                return next;
            });
        }, 650);
    }, [onBoost]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const key = e.key;
            // Check if key is '1' through '5'
            if (['1', '2', '3', '4', '5'].includes(key)) {
                const index = parseInt(key) - 1;
                // Check if racer exists at this index
                if (racers[index] && !racers[index].finished) {
                    handleBoost(racers[index].id);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [racers, handleBoost]); // Dependencies ensure fresh state access

    return (
        <div className="game-controls">
            <div className="boost-grid">
                {racers.map((racer) => {
                    const effect = boostEffects[racer.id];
                    const colorHue = [0, 120, 240, 60, 300, 180, 30, 270][(racer.colorIndex !== undefined ? racer.colorIndex : (racer.id ? racer.id.charCodeAt(0) : 0)) % 8];
                    return (
                        <button
                            key={racer.id}
                            className={`boost-btn ${effect ? 'boost-flash' : ''} ${effect === 'mega' ? 'boost-flash--mega' : ''}`}
                            disabled={racer.finished}
                            onClick={() => handleBoost(racer.id)}
                            style={{
                                backgroundColor: `hsl(${colorHue}, 70%, 50%)`
                            }}
                        >
                            {effect === 'mega'
                                ? 'Mega Burst!'
                                : effect === 'strong'
                                    ? 'Nice Boost!'
                                    : `Boost ${racer.name}!`}
                            {effect && (
                                <span className={`boost-chip boost-chip--${effect}`}>
                                    {effect === 'mega' ? 'MEGA!' : effect === 'strong' ? 'BOOST!' : 'GO!'}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
