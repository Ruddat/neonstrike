import { CONFIG } from './config.js';
import { state } from './state.js';

const HIGHSCORE_KEY = CONFIG.storageKey;
const MAX_ENTRIES = 10;

export function loadHighscore() {
    try {
        const data = JSON.parse(localStorage.getItem(HIGHSCORE_KEY) || '[]');
        state.highscores = Array.isArray(data) ? data : [];
    } catch {
        state.highscores = [];
    }
    state.highscore = state.highscores.length > 0 ? state.highscores[0].score : 0;
}

export function saveHighscoreIfNeeded() {
    const entry = {
        score: state.score,
        level: state.stageIndex + 1,
        combo: state.maxCombo,
        name: '', // Will be filled by name entry
        date: new Date().toLocaleDateString('de-DE'),
    };

    // Check if score qualifies for top 10
    if (state.highscores.length < MAX_ENTRIES || state.score > state.highscores[state.highscores.length - 1].score) {
        return entry;
    }
    return null;
}

export function addHighscoreEntry(entry) {
    state.highscores.push(entry);
    state.highscores.sort((a, b) => b.score - a.score);
    state.highscores = state.highscores.slice(0, MAX_ENTRIES);
    state.highscore = state.highscores[0].score;
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(state.highscores));
}
