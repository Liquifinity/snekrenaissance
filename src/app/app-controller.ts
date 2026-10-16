import {
  createRun as createGameRun,
  startRun as startGameRun,
  type RunResult,
  type RunState
} from '../game/run-state';
import { renderGameOverView } from '../ui/game-over-view';
import { renderHudView } from '../ui/hud-view';
import { renderIntroView } from '../ui/intro-view';
import { renderLeaderboardView } from '../ui/leaderboard-view';
import { renderLocalRankView } from '../ui/local-rank-view';
import { renderUsernameView } from '../ui/username-view';
import type { AppScreen, AppState } from './app-state';
import {
  getOrCreatePlayerId,
  loadLocalBest,
  loadUsername,
  saveLocalBest,
  saveUsername,
  type PlayerIdentity,
  type StorageLike
} from './identity';
import {
  LocalSessionGateway,
  type SessionGateway
} from './session-gateway';

export type AppControllerOptions = {
  root: HTMLElement;
  storage?: StorageLike;
  gateway?: SessionGateway;
};

export class AppController {
  private readonly root: HTMLElement;
  private readonly storage: StorageLike;
  private readonly gateway: SessionGateway;
  private readonly ui: HTMLDivElement;
  private state: AppState;
  private runAttempt = 0;
  private rankViewAttempt = 0;

  constructor({ root, storage = localStorage, gateway = new LocalSessionGateway() }: AppControllerOptions) {
    this.root = root;
    this.storage = storage;
    this.gateway = gateway;

    const existingUi = root.querySelector<HTMLDivElement>('[data-app-ui]');
    this.ui = existingUi ?? document.createElement('div');
    this.ui.dataset.appUi = '';
    this.ui.className = 'app-ui';
    if (!existingUi) root.append(this.ui);

    this.state = {
      screen: 'intro',
      playerId: getOrCreatePlayerId(this.storage),
      username: loadUsername(this.storage),
      localBest: loadLocalBest(this.storage),
      worldRank: null,
      ranked: false,
      activeSessionId: null,
      sessionStatus: 'idle',
      submissionStatus: 'idle',
      submissionError: null,
      run: null
    };
  }

  get screen(): AppScreen {
    return this.state.screen;
  }

  get currentRun(): RunState | null {
    return this.state.run;
  }

  get username(): string {
    return this.state.username;
  }

  mount(): void {
    this.showIntro();
  }

  handleRunState(run: RunState): void {
    this.state.run = run;

    if (run.phase === 'game-over' && run.result) {
      this.state.localBest = saveLocalBest(this.storage, run.result.maxLength);
      this.state.screen = 'game-over';

      if (
        this.state.ranked
        && this.state.activeSessionId
        && this.state.submissionStatus === 'idle'
      ) {
        this.submitRankedResult(run.result, this.runAttempt);
      } else {
        this.renderGameOver();
      }
      return;
    }

    if (this.state.screen === 'game') {
      renderHudView(this.ui, run.snake.segmentCount);
    }
  }

  private showIntro(): void {
    this.setScreen('intro');
    renderIntroView(this.ui, () => this.showUsername());
  }

  private showUsername(): void {
    this.state.sessionStatus = 'idle';
    this.state.submissionError = null;
    this.renderUsername();
  }

  private renderUsername(): void {
    this.setScreen('username');
    const status = this.state.sessionStatus === 'starting' || this.state.sessionStatus === 'failed'
      ? this.state.sessionStatus
      : 'idle';
    const error = status === 'failed'
      ? 'ranking unavailable. retry to start a ranked game.'
      : null;

    renderUsernameView(
      this.ui,
      this.state.username,
      (username) => this.beginGame(username),
      { sessionStatus: status, error }
    );
  }

  private beginGame(username = this.state.username): void {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      this.showUsername();
      return;
    }

    const attempt = ++this.runAttempt;
    this.rankViewAttempt += 1;
    this.state.username = cleanUsername;
    saveUsername(this.storage, cleanUsername);
    this.state.ranked = false;
    this.state.worldRank = null;
    this.state.activeSessionId = null;
    this.state.submissionStatus = 'idle';
    this.state.submissionError = null;
    this.state.run = null;

    if (this.gateway instanceof LocalSessionGateway) {
      this.state.sessionStatus = 'unranked';
      this.startGameplay();
      return;
    }

    this.state.sessionStatus = 'starting';
    this.renderUsername();
    const identity = this.identity();

    void this.gateway.startRun(identity).then((session) => {
      if (attempt !== this.runAttempt) return;
      if (!session.ranked || !session.sessionId) {
        throw new Error('Ranked gateway did not return a ranked session.');
      }

      this.state.ranked = true;
      this.state.activeSessionId = session.sessionId;
      this.state.sessionStatus = 'ranked';
      this.startGameplay();
    }).catch(() => {
      if (attempt !== this.runAttempt) return;
      this.state.ranked = false;
      this.state.activeSessionId = null;
      this.state.sessionStatus = 'failed';
      this.state.run = null;
      this.renderUsername();
    });
  }

  private startGameplay(): void {
    this.state.run = startGameRun(createGameRun());
    this.setScreen('game');
    renderHudView(this.ui, this.state.run.snake.segmentCount);
  }

  private submitRankedResult(result: RunResult, attempt: number): void {
    const sessionId = this.state.activeSessionId;
    if (!sessionId) return;

    const identity = this.identity();
    this.state.submissionStatus = 'submitting';
    this.state.submissionError = null;
    this.renderGameOver();

    void this.gateway.submitResult(identity, sessionId, result).then((submission) => {
      if (!this.isCurrentSubmission(attempt, sessionId, result)) return;
      this.state.ranked = submission.ranked;
      this.state.worldRank = submission.worldRank;
      this.state.submissionStatus = submission.ranked ? 'accepted' : 'idle';
      this.state.submissionError = null;
      if (this.state.screen === 'game-over') this.renderGameOver();
    }).catch(() => {
      if (!this.isCurrentSubmission(attempt, sessionId, result)) return;
      this.state.submissionStatus = 'failed';
      this.state.submissionError = 'ranking submission failed. retry when ready.';
      if (this.state.screen === 'game-over') this.renderGameOver();
    });
  }

  private isCurrentSubmission(attempt: number, sessionId: string, result: RunResult): boolean {
    return attempt === this.runAttempt
      && sessionId === this.state.activeSessionId
      && this.state.run?.result === result;
  }

  private retryRankSubmission(): void {
    const result = this.state.run?.result;
    if (!result || !this.state.ranked || !this.state.activeSessionId) return;
    this.submitRankedResult(result, this.runAttempt);
  }

  private renderGameOver(): void {
    const result = this.state.run?.result;
    if (!result) return;

    this.setScreen('game-over');
    renderGameOverView(
      this.ui,
      {
        length: result.maxLength,
        best: this.state.localBest,
        worldRank: this.state.worldRank,
        ranked: this.state.ranked,
        submissionStatus: this.state.submissionStatus,
        submissionError: this.state.submissionError
      },
      () => this.beginGame(),
      () => this.showRank(),
      this.state.submissionStatus === 'failed' ? () => this.retryRankSubmission() : undefined
    );
  }

  private showRank(): void {
    if (this.gateway instanceof LocalSessionGateway) {
      this.setScreen('rank');
      renderLocalRankView(this.ui, this.state.localBest, () => this.backFromRank());
      return;
    }

    const request = ++this.rankViewAttempt;
    this.setScreen('rank');
    renderLeaderboardView(this.ui, { status: 'loading' }, { onBack: () => this.backFromRank() });

    void Promise.all([
      this.gateway.getLeaderboard(50),
      this.gateway.getPlayerRank(this.state.playerId)
    ]).then(([leaderboard, playerRank]) => {
      if (request !== this.rankViewAttempt || this.state.screen !== 'rank') return;
      if (leaderboard.entries.length === 0) {
        renderLeaderboardView(this.ui, { status: 'empty' }, { onBack: () => this.backFromRank() });
        return;
      }
      renderLeaderboardView(
        this.ui,
        { status: 'ready', entries: leaderboard.entries, playerRank },
        { onBack: () => this.backFromRank() }
      );
    }).catch(() => {
      if (request !== this.rankViewAttempt || this.state.screen !== 'rank') return;
      renderLeaderboardView(
        this.ui,
        { status: 'error', message: 'leaderboard unavailable. try again later.' },
        { onBack: () => this.backFromRank() }
      );
    });
  }

  private backFromRank(): void {
    this.rankViewAttempt += 1;
    if (this.state.run?.phase === 'game-over') {
      this.renderGameOver();
    } else {
      this.showIntro();
    }
  }

  private identity(): PlayerIdentity {
    return {
      playerId: this.state.playerId,
      username: this.state.username
    };
  }

  private setScreen(screen: AppScreen): void {
    this.state.screen = screen;
    this.root.dataset.screen = screen;
  }
}
