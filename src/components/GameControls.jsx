import React, { useState, useEffect } from 'react';

export default function GameControls({ racers, onBoost }) {
    const [cooldowns, setCooldowns] = useState({});

    const handleBoost = (racerId) => {
        if (cooldowns[racerId]) {
            return;
        };
        onBoost(racerId);

        // Set local cooldown visual
        setCooldowns(prev => ({ ...prev, [racerId]: true }));
        setTimeout(() => {
            setCooldowns(prev => ({ ...prev, [racerId]: false }));
        }, 1000); // 1.5 second cooldown
    };

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
    }, [racers, cooldowns]); // Dependencies ensure fresh state access

    return (
        <div className="game-controls">
            <div className="boost-grid">
                {racers.map((racer, index) => (
                    <button
                        key={racer.id}
                        className="boost-btn"
                        disabled={cooldowns[racer.id] || racer.finished}
                        onClick={() => handleBoost(racer.id)}
                        style={{
                            backgroundColor: `hsl(${[0, 120, 240, 60, 300, 180, 30, 270][(racer.colorIndex !== undefined ? racer.colorIndex : (racer.id ? racer.id.charCodeAt(0) : 0)) % 8]}, 70%, 50%)`,
                            opacity: cooldowns[racer.id] ? 0.5 : 1
                        }}
                    >
                        {cooldowns[racer.id] ? 'Wait...' : `Boost ${racer.name}!`}
                    </button>
                ))}
            </div>
        </div>
    );
}
