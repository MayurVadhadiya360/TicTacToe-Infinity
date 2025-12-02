import { useEffect, useMemo, useState } from "react";

type WaitingCardProps = {
    startedAt?: number;
    className?: string;
    onCancel: () => void;
};

export default function WaitingCard({ startedAt, className, onCancel }: WaitingCardProps) {
    const start = useMemo(() => startedAt ?? Date.now(), [startedAt]);

    const [step, setStep] = useState(0); // 0,1,2,3 repeating
    const [elapsedSec, setElapsedSec] = useState(
        Math.floor((Date.now() - start) / 1000)
    );

    // dot step cycle
    useEffect(() => {
        const t = setInterval(() => {
            setStep((s) => (s + 1) % 4); // 4 states
        }, 400);
        return () => clearInterval(t);
    }, []);

    // timer
    useEffect(() => {
        const t = setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - start) / 1000));
        }, 1000);
        return () => clearInterval(t);
    }, [start]);

    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
    const ss = String(elapsedSec % 60).padStart(2, "0");

    return (
        <>
            <div className={`card neon-wait-card ${className ?? ""}`}>

                {/* PARTICLES */}
                <div className="wait-particles layer1"></div>
                <div className="wait-particles layer2"></div>

                <div className="neon-wait-title">
                    Waiting for game
                    <span className="dot-container neon-dots">
                        <span className={`dot ${step >= 1 ? "visible" : ""}`}>.</span>
                        <span className={`dot ${step >= 2 ? "visible" : ""}`}>.</span>
                        <span className={`dot ${step >= 3 ? "visible" : ""}`}>.</span>
                    </span>
                </div>

                <div className="neon-wait-timer">
                    {mm}:{ss}
                </div>

                {/* HOLOGRAM SCAN LINE */}
                <div className="wait-holo-scan"></div>
            </div>

            {/* Disconnect/Leave */}
            <div className="flex">
                <button className="btn-red" onClick={onCancel}>Cancel</button>
            </div>
        </>
    );
}
