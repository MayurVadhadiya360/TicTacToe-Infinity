import "../styles.css";

type InfoCardProps = {
    open: boolean;
    onClose: () => void;
};

export default function InfoCard({ open, onClose }: InfoCardProps) {
    if (!open) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-card"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="info-title"
            >
                <div className="modal-header">
                    <span className="modal-title" id="info-title">
                        Game Rules & Info
                    </span>
                    <button
                        type="button"
                        className="modal-close"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className="modal-body">
                    <p className="small">
                        Real-time 2-player cyberpunk tic-tac-toe with a twist: each player can only keep <strong>3 marks</strong> on the board.
                    </p>

                    <ul className="rules-list">
                        <li>Players take turns placing a mark on any empty cell.</li>
                        <li>
                            Each player may have at most <strong>3 marks</strong> on the
                            board. When placing a 4th, their <strong>oldest</strong> mark is
                            automatically removed.
                        </li>
                        <li>
                            Win by forming 3 of your marks in a straight line (row, column,
                            or diagonal) at the same time.
                        </li>
                        <li>
                            You can play as a persistent player (saved ID) or as a guest
                            with a random ID.
                        </li>
                        <li>
                            Use <strong>Create Game</strong>, <strong>Join by ID</strong> or{" "}
                            <strong>Random Match</strong> from the lobby to find an
                            opponent.
                        </li>
                        <li>Click <strong>Leave</strong> to exit a game and return to the lobby.</li>
                    </ul>

                    <p className="small">
                        💡<strong>Tip</strong>: because old moves vanish, control the center and think ahead
                        about which mark will disappear next.
                    </p>
                </div>
            </div>
        </div>
    );
}
