import {
  createRun as createGameRun,
  startRun as startGameRun,
  type RunState
} from '../game/run-state';
import { renderCompletionView } from '../ui/completion-view';
import { renderGameOverView } from '../ui/game-over-view';
import { renderHudView } from '../ui/hud-view';
import { renderIntroView } from '../ui/intro-view';
import { renderPersonalBestView } from '../ui/personal-best-view';
import { renderUsernameView } from '../ui/username-view';
import type { AppScreen, AppState } from './app-state';
import {
  loadLocalBest,
  loadUsername,
  saveLocalBest,
  saveUsername,
  type StorageLike
} from './persistence';

export type AppControllerOptions = {
  root: HTMLElement;
  storage?: StorageLike;
};

export class AppController {
  private readonly root: HTMLElement;
  private readonly storage: StorageLike;
  private readonly ui: HTMLDivElement;
  private state: AppState;

  constructor({ root, storage = localStorage }: AppControllerOptions) {
    this.root = root;
    this.storage = storage;

    const existingUi = root.querySelector<HTMLDivElement>('[data-app-ui]');
    this.ui = existingUi ?? document.createElement('div');
    this.ui.dataset.appUi = '';
    this.ui.className = 'app-ui';
    if (!existingUi) root.append(this.ui);

    this.state = {
      screen: 'intro',
      username: loadUsername(this.storage),
      localBest: loadLocalBest(this.storage),
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

    if (run.phase === 'completed' && run.result) {
      this.state.localBest = saveLocalBest(this.storage, run.result.score);
      this.setScreen('complete');
      renderCompletionView(this.ui, () => this.beginGame());
      return;
    }

    if (run.phase === 'game-over' && run.result) {
      this.state.localBest = saveLocalBest(this.storage, run.result.score);
      this.renderGameOver();
      return;
    }

    if (this.state.screen === 'game') {
      renderHudView(this.ui, run.score, run.snake.segments.length);
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
    this.state.run = startGameRun(createGameRun());
    this.setScreen('game');
    renderHudView(this.ui, this.state.run.score, this.state.run.snake.segments.length);
  }

  private renderGameOver(): void {
    const result = this.state.run?.result;
    if (!result) return;

    this.setScreen('game-over');
    renderGameOverView(
      this.ui,
      { score: result.score, best: this.state.localBest },
      () => this.beginGame(),
      () => this.showBest()
    );
  }

  private showBest(): void {
    this.setScreen('best');
    renderPersonalBestView(this.ui, this.state.localBest, () => this.backFromBest());
  }

  private backFromBest(): void {
    if (this.state.run?.phase === 'game-over') {
      this.renderGameOver();
    } else {
      this.showIntro();
    }
  }

  private setScreen(screen: AppScreen): void {
    this.state.screen = screen;
    this.root.dataset.screen = screen;
  }
}
