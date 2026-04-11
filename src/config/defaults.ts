export interface CcConfig {
  github: {
    owner: string;
    repo: string;
    token_env: string;
  };
  branches: {
    pattern: string;
    base: string;
  };
  loop: {
    poll_interval: number;
    max_concurrent: number;
    auto_approve_refinements: boolean;
  };
  notifications: {
    on_blocked: string;
  };
}

export const DEFAULT_CONFIG: CcConfig = {
  github: {
    owner: '',
    repo: '',
    token_env: 'GITHUB_TOKEN',
  },
  branches: {
    pattern: 'cc/{issue}-{slug}',
    base: 'main',
  },
  loop: {
    poll_interval: 300,
    max_concurrent: 1,
    auto_approve_refinements: false,
  },
  notifications: {
    on_blocked: 'github_comment',
  },
};
