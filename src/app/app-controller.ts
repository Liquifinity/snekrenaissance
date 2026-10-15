import {
  createRun as createGameRun,
  startRun as startGameRun,
  type RunState
} from '../game/run-state';
import { renderGameOverView } from '../ui/game-over-view';
import { renderHudView } from '../ui/hud-view';
import { renderIntroView } from '../ui/intro-view';
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
  private activeSessionId: string | null = null;

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
      this.renderGameOver();

      const sessionId = this.activeSessionId;
      if (!sessionId) return;

      const identity = this.identity();
      const finalResult = run.result;
      void this.gateway.submitResult(identity, sessionId, finalResult).then((submission) => {
        if (this.state.run?.result !== finalResult) return;
        this.state.ranked = submission.ranked;
        this.state.worldRank = submission.worldRank;
        if (this.state.screen === 'game-over') this.renderGameOver();
      });
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
    this.setScreen('username');
    renderUsernameView(this.ui, this.state.username, (username) => this.beginGame(username));
  }

  private beginGame(username = this.state.username): void {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      this.showUsername();
      return;
    }

    this.state.username = cleanUsername;
    saveUsername(this.storage, cleanUsername);
    this.state.ranked = false;
    this.state.worldRank = null;
    this.activeSessionId = null;
    this.state.run = startGameRun(createGameRun());
    this.setScreen('game');
    renderHudView(this.ui, this.state.run.snake.segmentCount);

    void this.gateway.startRun(this.identity()).then((session) => {
      this.state.ranked = session.ranked;
      this.activeSessionId = session.sessionId;
    });
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
        ranked: this.state.ranked
      },
      () => this.beginGame(),
      () => this.showRank()
    );
  }

  private showRank(): void {
    this.setScreen('rank');
    renderLocalRankView(this.ui, this.state.localBest, () => {
      if (this.state.run?.phase === 'game-over') this.renderGameOver();
      else this.showIntro();
    });
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
