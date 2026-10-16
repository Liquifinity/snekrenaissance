import type { LeaderboardEntry, PlayerRankResponse } from '../shared/ranking-api';

export type LeaderboardViewState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; entries: LeaderboardEntry[]; playerRank: PlayerRankResponse | null };

export type LeaderboardViewActions = {
  onBack: () => void;
};

export function renderLeaderboardView(
  container: HTMLElement,
  state: LeaderboardViewState,
  actions: LeaderboardViewActions
): void {
  container.replaceChildren();

  const section = document.createElement('section');
  section.className = 'screen leaderboard';
  section.dataset.view = 'leaderboard';
  section.dataset.leaderboardState = state.status;

  const title = document.createElement('h1');
  title.textContent = 'RANK';
  section.append(title);

  if (state.status === 'loading') {
    const loading = document.createElement('p');
    loading.className = 'rank-status';
    loading.textContent = 'loading leaderboard…';
    section.append(loading);
  }

  if (state.status === 'empty') {
    const empty = document.createElement('p');
    empty.className = 'rank-status';
    empty.textContent = 'no ranked runs yet.';
    section.append(empty);
  }

  if (state.status === 'error') {
    const error = document.createElement('p');
    error.className = 'form-error';
    error.setAttribute('role', 'alert');
    error.textContent = state.message;
    section.append(error);
  }

  if (state.status === 'ready') {
    const list = document.createElement('div');
    list.className = 'leaderboard-list';
    list.setAttribute('role', 'list');

    for (const entry of state.entries) {
      const row = document.createElement('div');
      row.className = 'leaderboard-row';
      row.dataset.leaderboardRow = '';
      row.setAttribute('role', 'listitem');
      if (state.playerRank?.rank === entry.rank) row.dataset.self = 'true';

      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = `#${entry.rank}`;

      const username = document.createElement('span');
      username.className = 'leaderboard-username';
      username.textContent = entry.username;

      const length = document.createElement('strong');
      length.className = 'leaderboard-length';
      length.textContent = String(entry.maxLength);

      row.append(rank, username, length);
      list.append(row);
    }

    section.append(list);
  }

  const back = document.createElement('button');
  back.type = 'button';
  back.dataset.action = 'back';
  back.textContent = 'BACK';
  back.addEventListener('click', actions.onBack);
  section.append(back);

  container.append(section);
}
