import { MockProvider } from "./mock-provider.js";
import { GithubProvider } from "./github-provider.js";
import { YoutubeProvider } from "./youtube-provider.js";
import { BraveProvider } from "./brave-provider.js";
import { BooksProvider } from "./books-provider.js";
import { StackExchangeProvider } from "./stackexchange-provider.js";
import { RedditProvider } from "./reddit-provider.js";

const providers = new Map();

function register(provider) {
  providers.set(provider.name, provider);
}

register(new MockProvider());
register(new GithubProvider());
register(new YoutubeProvider());
register(new BraveProvider());
register(new BooksProvider());
register(new StackExchangeProvider());
register(new RedditProvider());

/**
 * @param {string[]} [names]
 */
export function getProviders(names) {
  if (!names || names.length === 0) {
    return [...providers.values()];
  }
  return names
    .map((n) => providers.get(n))
    .filter(Boolean);
}

export function listProviders() {
  return [...providers.values()].map((p) => ({
    name: p.name,
    label: p.label,
    description: p.description,
    requiresKey: p.requiresKey ?? false,
    envVar: p.envVar ?? null,
    configured: p.configured(),
  }));
}

export { providers };
