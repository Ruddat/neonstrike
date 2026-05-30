import { CONFIG } from './config.js';
import { state } from './state.js';

export function loadHighscore() {
    state.highscore = Number(localStorage.getItem(CONFIG.storageKey) || 0);
}

export function saveHighscoreIfNeeded() {
    if (state.score <= state.highscore) return false;

    state.highscore = state.score;
    localStorage.setItem(CONFIG.storageKey, String(state.highscore));

    return true;
}