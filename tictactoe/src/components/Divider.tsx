import { useMemo } from "react";

type DividerProps = {
    random?: boolean;
    divider?: "neon" | "holo" | "particle";
};

export default function Divider({ random = false, divider }: DividerProps) {
    const dividers = useMemo(
        () => ({
            neon: <div key="1neon-divider" className="neon-divider" />,
            holo: <div key="2holo-divider" className="holo-divider" />,
            particle: <div key="3neon-particle-divider" className="neon-particle-divider" />,
        }),
        []
    );

    // ----- RANDOM MODE -----
    const randomDivider = useMemo(() => {
        const keys = Object.keys(dividers) as (keyof typeof dividers)[];
        const idx = Math.floor(Math.random() * keys.length);
        return dividers[keys[idx]];
    }, [dividers]);

    // ----- SPECIFIC MODE -----
    if (divider) {
        return dividers[divider];
    }

    // ----- RANDOM MODE -----
    if (random) {
        return randomDivider;
    }

    // ----- DEFAULT (Fallback) -----
    return dividers.neon;
}
