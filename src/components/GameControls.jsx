import React, { useState, useEffect, useCallback } from 'react';
import { HOTKEYS, getHueForIndex } from '../constants/racers';

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
            const index = HOTKEYS.indexOf(key);
            if (index >= 0 && racers[index] && !racers[index].finished) {
                handleBoost(racers[index].id);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [racers, handleBoost]); // Dependencies ensure fresh state access

    return (
        <div className="game-controls">
            <div className="boost-grid">
                {racers.map((racer, idx) => {
                    const effect = boostEffects[racer.id];
                    const colorHue = getHueForIndex(racer.colorIndex !== undefined ? racer.colorIndex : (racer.id ? racer.id.charCodeAt(0) : 0));
                    const hotkey = HOTKEYS[idx];
                    return (
                        <button
                            key={racer.id}
                            className={`boost-btn ${effect ? 'boost-flash' : ''} ${effect === 'mega' ? 'boost-flash--mega' : ''}`}
                            disabled={racer.finished}
                            onClick={() => handleBoost(racer.id)}
                            style={{
                                backgroundColor: `hsl(${colorHue}, 70%, 50%)`
                            }}
                            title={hotkey ? `Press ${hotkey} to boost ${racer.name}` : `Boost ${racer.name}`}
                        >
                            {hotkey && (
                                <span className="boost-hotkey">{hotkey}</span>
                            )}
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
